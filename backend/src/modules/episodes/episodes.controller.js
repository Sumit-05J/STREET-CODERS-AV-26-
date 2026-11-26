import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { prisma } from '../../config/prisma.js'
import { AppError, asyncHandler } from '../../utils/errors.js'
import { storage } from '../../utils/storage.js'
import { canonicalizeUrl } from '../../utils/url.js'
import {
  ALL_ROLES,
  assertEpisodeMember,
  assertWorkspaceMember,
  MANAGE_ROLES,
  WRITE_ROLES,
} from '../../middleware/workspaceAuth.js'

const ALLOWED_EXT_MIME = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm',
}

async function detectAudioSignature(filePath, ext) {
  const fd = await fs.promises.open(filePath, 'r')
  try {
    const buf = Buffer.alloc(16)
    const { bytesRead } = await fd.read(buf, 0, 16, 0)
    if (bytesRead < 4) return false

    const ascii0_4 = buf.toString('ascii', 0, 4)
    const ascii4_8 = buf.toString('ascii', 4, 8)
    const ascii8_12 = buf.toString('ascii', 8, 12)

    if (ext === '.mp3') {
      const isId3 = buf.toString('ascii', 0, 3) === 'ID3'
      const isFrameSync = buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0
      return isId3 || isFrameSync
    }
    if (ext === '.wav') {
      return ascii0_4 === 'RIFF' && ascii8_12 === 'WAVE'
    }
    if (ext === '.ogg') return ascii0_4 === 'OggS'
    if (ext === '.flac') return ascii0_4 === 'fLaC'
    if (ext === '.m4a') return ascii4_8 === 'ftyp'
    if (ext === '.aac') return buf[0] === 0xff && (buf[1] & 0xf0) === 0xf0
    if (ext === '.webm') {
      return buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3
    }
    return false
  } finally {
    await fd.close()
  }
}

const uploadBodySchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  duration: z.coerce.number().min(0).optional().default(0),
  showId: z.string().uuid().optional().or(z.literal('')),
  playlistId: z.string().uuid().optional().or(z.literal('')),
  tags: z.string().optional().default(''),
})

export const createExternalEpisodeSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  sourceUrl: z.string().url('A valid http/https URL is required'),
  duration: z.coerce.number().min(0).optional().default(0),
  showId: z.string().uuid().optional().or(z.literal('')),
  playlistId: z.string().uuid().optional().or(z.literal('')),
  tags: z.array(z.string()).optional().default([]),
  reuseExisting: z.boolean().optional().default(true),
})

export const createExternalEpisode = asyncHandler(async (req, res) => {
  const body = createExternalEpisodeSchema.parse(req.body)
  await assertWorkspaceMember(body.workspaceId, req.user.id, WRITE_ROLES)

  const parsedUrl = new URL(body.sourceUrl)
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new AppError(400, 'Only http/https URLs are supported.', 'INVALID_URL')
  }

  const canonicalUrl = canonicalizeUrl(body.sourceUrl)
  const candidateUrls = Array.from(new Set([canonicalUrl, body.sourceUrl]))

  if (body.reuseExisting) {
    const existing = await prisma.episode.findFirst({
      where: {
        workspaceId: body.workspaceId,
        deletedAt: null,
        sourceUrl: { in: candidateUrls },
      },
      include: {
        uploader: { select: { id: true, name: true, avatarColor: true } },
        chapters: true,
        _count: { select: { annotations: true, clips: true } },
      },
    })
    if (existing) {
      return res.json({ episode: existing, reused: true })
    }
  }

  const episode = await prisma.episode.create({
    data: {
      workspaceId: body.workspaceId,
      showId: body.showId || null,
      uploaderId: req.user.id,
      title: body.title.trim(),
      description: body.description.trim(),
      sourceType: 'EXTERNAL_LINK',
      sourceUrl: canonicalUrl,
      duration: body.duration || 0,
      tags: body.tags,
    },
    include: {
      uploader: { select: { id: true, name: true, avatarColor: true } },
      chapters: true,
      _count: { select: { annotations: true, clips: true } },
    },
  })

  if (body.playlistId) {
    const count = await prisma.playlistEpisode.count({
      where: { playlistId: body.playlistId },
    })
    await prisma.playlistEpisode.create({
      data: {
        playlistId: body.playlistId,
        episodeId: episode.id,
        position: count,
      },
    })
  }

  res.status(201).json({ episode, reused: false })
})

export const lookupEpisodeByUrl = asyncHandler(async (req, res) => {
  const workspaceId = String(req.query.workspaceId || '').trim()
  const rawUrl = String(req.query.url || '').trim()
  if (!workspaceId || !rawUrl) {
    throw new AppError(
      400,
      'workspaceId and url query parameters are required.',
      'INVALID_QUERY'
    )
  }

  await assertWorkspaceMember(workspaceId, req.user.id, ALL_ROLES)

  const canonicalUrl = canonicalizeUrl(rawUrl)
  const candidateUrls = Array.from(new Set([canonicalUrl, rawUrl]))

  const episode = await prisma.episode.findFirst({
    where: {
      workspaceId,
      deletedAt: null,
      sourceUrl: { in: candidateUrls },
    },
    include: {
      _count: { select: { annotations: true, clips: true } },
      annotations: {
        orderBy: { timestamp: 'asc' },
        take: 5,
        include: {
          user: { select: { id: true, name: true, avatarColor: true } },
        },
      },
    },
  })

  res.json({ episode: episode || null, canonicalUrl })
})

export const uploadEpisode = asyncHandler(async (req, res) => {
  const file = req.file
  if (!file) {
    throw new AppError(400, 'Audio file is required.', 'MISSING_FILE')
  }

  let savedKey = null
  try {
    const body = uploadBodySchema.parse(req.body)
    await assertWorkspaceMember(body.workspaceId, req.user.id, WRITE_ROLES)

    const ext = path.extname(file.originalname || '').toLowerCase()
    const canonicalMime = ALLOWED_EXT_MIME[ext]
    if (!canonicalMime) {
      throw new AppError(
        400,
        'Unsupported audio extension. Allowed: .mp3, .wav, .ogg, .m4a, .aac, .flac, .webm',
        'INVALID_FILE_TYPE'
      )
    }

    const validMagic = await detectAudioSignature(file.path, ext)
    if (!validMagic) {
      throw new AppError(
        400,
        'File content does not match a valid audio format.',
        'INVALID_AUDIO_SIGNATURE'
      )
    }

    const targetKey = `${uuidv4()}${ext}`
    await storage.saveLocalFile(file.path, targetKey, canonicalMime)
    savedKey = targetKey

    const parsedTags = body.tags
      ? body.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : []

    const episode = await prisma.episode.create({
      data: {
        workspaceId: body.workspaceId,
        showId: body.showId || null,
        uploaderId: req.user.id,
        title: body.title.trim(),
        description: body.description.trim(),
        audioKey: targetKey,
        mimeType: canonicalMime,
        fileSize: file.size,
        duration: body.duration || 0,
        tags: parsedTags,
      },
      include: {
        uploader: { select: { id: true, name: true, avatarColor: true } },
        chapters: true,
      },
    })

    if (body.playlistId) {
      const count = await prisma.playlistEpisode.count({
        where: { playlistId: body.playlistId },
      })
      await prisma.playlistEpisode.create({
        data: {
          playlistId: body.playlistId,
          episodeId: episode.id,
          position: count,
        },
      })
    }

    res.status(201).json({ episode })
  } catch (err) {
    if (file?.path && fs.existsSync(file.path)) {
      await fs.promises.unlink(file.path).catch(() => {})
    }
    if (savedKey) {
      await storage.remove(savedKey).catch(() => {})
    }
    throw err
  }
})

export const getEpisode = asyncHandler(async (req, res) => {
  const { episode, membership } = await assertEpisodeMember(
    req.params.id,
    req.user.id,
    ALL_ROLES
  )

  const fullEpisode = await prisma.episode.findUnique({
    where: { id: episode.id },
    include: {
      workspace: { select: { id: true, name: true, mode: true } },
      uploader: { select: { id: true, name: true, avatarColor: true } },
      chapters: { orderBy: { startTime: 'asc' } },
      annotations: {
        include: {
          user: { select: { id: true, name: true, avatarColor: true } },
          replies: {
            include: {
              user: { select: { id: true, name: true, avatarColor: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { timestamp: 'asc' },
      },
      clips: {
        include: {
          creator: { select: { id: true, name: true, avatarColor: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  res.json({ episode: fullEpisode, myRole: membership.role })
})

export const streamEpisodeAudio = asyncHandler(async (req, res) => {
  const { episode } = await assertEpisodeMember(
    req.params.id,
    req.user.id,
    ALL_ROLES
  )

  if (episode.sourceType === 'EXTERNAL_LINK' || !episode.audioKey) {
    throw new AppError(
      400,
      'This recording is an external media link and does not have a locally hosted audio stream.',
      'EXTERNAL_LINK_NO_LOCAL_AUDIO'
    )
  }

  let stat
  try {
    stat = await storage.stat(episode.audioKey)
  } catch {
    throw new AppError(404, 'Audio file not found in storage.', 'AUDIO_MISSING')
  }

  const fileSize = stat.size
  const range = req.headers.range

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start >= fileSize ||
      end >= fileSize ||
      start > end
    ) {
      res.status(416).set({ 'Content-Range': `bytes */${fileSize}` }).end()
      return
    }

    const chunkSize = end - start + 1
    const stream = await storage.createReadStream(episode.audioKey, { start, end })
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': episode.mimeType,
    })
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).end()
      else res.end()
    })
    res.on('close', () => stream.destroy?.())
    stream.pipe(res)
  } else {
    const stream = await storage.createReadStream(episode.audioKey)
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Accept-Ranges': 'bytes',
      'Content-Type': episode.mimeType,
    })
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).end()
      else res.end()
    })
    res.on('close', () => stream.destroy?.())
    stream.pipe(res)
  }
})

export const deleteEpisode = asyncHandler(async (req, res) => {
  const { episode, membership } = await assertEpisodeMember(
    req.params.id,
    req.user.id,
    ALL_ROLES
  )

  const canDelete =
    MANAGE_ROLES.includes(membership.role) || episode.uploaderId === req.user.id
  if (!canDelete) {
    throw new AppError(
      403,
      'Only workspace managers or the uploader can delete this episode.',
      'FORBIDDEN'
    )
  }

  // Stage 1: Atomically soft-delete in PostgreSQL so concurrent deletes or
  // partial storage failures never leave a valid Episode pointing to missing audio.
  const marked = await prisma.episode.updateMany({
    where: { id: episode.id, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  if (marked.count === 0) {
    throw new AppError(404, 'Episode already deleted.', 'NOT_FOUND')
  }

  // Stage 2: Remove physical/S3 audio for UPLOAD episodes (never remote EXTERNAL_LINK).
  if (episode.sourceType === 'UPLOAD' && episode.audioKey) {
    await storage.remove(episode.audioKey)
  }

  // Stage 3: Hard-delete Episode record (cascades annotations, replies, clips, chapters).
  await prisma.episode.delete({ where: { id: episode.id } })

  res.status(204).end()
})

export async function cleanupPendingDeletedEpisodes() {
  const pending = await prisma.episode.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true, sourceType: true, audioKey: true },
  })
  for (const ep of pending) {
    try {
      if (ep.sourceType === 'UPLOAD' && ep.audioKey) {
        await storage.remove(ep.audioKey)
      }
      await prisma.episode.delete({ where: { id: ep.id } })
    } catch (err) {
      console.error(`[Cleanup] Failed pending delete for episode ${ep.id}:`, err.message)
    }
  }
}
