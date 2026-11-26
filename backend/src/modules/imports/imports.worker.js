import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../../config/prisma.js'
import { env } from '../../config/env.js'
import { safeDownloadToFile } from '../../utils/ssrf.js'
import { storage } from '../../utils/storage.js'
import { transcribeAudio } from './transcription.provider.js'

const execFileAsync = promisify(execFile)
const MAX_CONCURRENT = 2
const MAX_IMPORT_DURATION_SEC = 4 * 3600 // 4 hours
let activeWorkers = 0
const tempDir = path.join(os.tmpdir(), 'echospace-imports')

function ensureTempDir() {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
}

async function detectAudioFromBytes(filePath) {
  const fd = await fs.promises.open(filePath, 'r')
  try {
    const buf = Buffer.alloc(16)
    const { bytesRead } = await fd.read(buf, 0, 16, 0)
    if (bytesRead < 4) return null

    const a0 = buf.toString('ascii', 0, 4)
    const a4 = buf.toString('ascii', 4, 8)
    const a8 = buf.toString('ascii', 8, 12)

    if (buf.toString('ascii', 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) {
      return { ext: '.mp3', mime: 'audio/mpeg' }
    }
    if (a0 === 'RIFF' && a8 === 'WAVE') {
      return { ext: '.wav', mime: 'audio/wav' }
    }
    if (a0 === 'OggS') return { ext: '.ogg', mime: 'audio/ogg' }
    if (a0 === 'fLaC') return { ext: '.flac', mime: 'audio/flac' }
    if (a4 === 'ftyp') return { ext: '.m4a', mime: 'audio/mp4' }
    if (buf[0] === 0xff && (buf[1] & 0xf0) === 0xf0) {
      return { ext: '.aac', mime: 'audio/aac' }
    }
    if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
      return { ext: '.webm', mime: 'audio/webm' }
    }
    return null
  } finally {
    await fd.close()
  }
}

async function probeDuration(filePath) {
  try {
    const { stdout } = await execFileAsync(
      env.ffprobePath || 'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      { timeout: 10000 }
    )
    const val = parseFloat(stdout.trim())
    return Number.isFinite(val) && val > 0 ? Math.round(val) : 0
  } catch {
    return 0
  }
}

async function extractAudioWithFfmpeg(videoPath, outputMp3Path) {
  try {
    await execFileAsync(
      env.ffmpegPath || 'ffmpeg',
      ['-y', '-i', videoPath, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', outputMp3Path],
      { timeout: 10 * 60 * 1000 }
    )
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        'FFmpeg is not installed on the server. Install FFmpeg or set FFMPEG_PATH to extract audio from uploaded video files.'
      )
    }
    throw new Error(`FFmpeg audio extraction failed: ${err.message}`)
  }
}

async function isJobCancelled(jobId) {
  const row = await prisma.importJob.findUnique({
    where: { id: jobId },
    select: { status: true },
  })
  return !row || row.status === 'CANCELLED'
}

async function processJob(job) {
  ensureTempDir()
  const rawTempPath = path.join(tempDir, `${uuidv4()}.tmp`)
  const videoTempPath =
    job.sourceKind === 'VIDEO_UPLOAD' ? job.metadata?.tempVideoPath || null : null

  try {
    if (await isJobCancelled(job.id)) return

    let detected = null
    let fileSize = 0
    let workingAudioPath = rawTempPath

    if (job.sourceKind === 'VIDEO_UPLOAD') {
      if (!videoTempPath || !fs.existsSync(videoTempPath)) {
        throw new Error('Uploaded video temp file is missing.')
      }
      await prisma.importJob
        .update({
          where: { id: job.id },
          data: {
            progress: 25,
            metadata: { ...(job.metadata || {}), stage: 'EXTRACTING_AUDIO' },
          },
        })
        .catch(() => {})

      workingAudioPath = path.join(tempDir, `${uuidv4()}.mp3`)
      await extractAudioWithFfmpeg(videoTempPath, workingAudioPath)
      const stat = await fs.promises.stat(workingAudioPath)
      fileSize = stat.size
      detected = { ext: '.mp3', mime: 'audio/mpeg' }
    } else {
      let lastPct = 5
      const { cancelled, downloaded } = await safeDownloadToFile(
        job.sourceUrl,
        rawTempPath,
        {
          maxBytes: env.maxFileSizeBytes,
          timeoutMs: 30000,
          shouldCancel: () => isJobCancelled(job.id),
          onProgress: async (bytes, total) => {
            const pct = Math.min(75, 10 + Math.round((bytes / total) * 65))
            if (pct - lastPct >= 10) {
              lastPct = pct
              await prisma.importJob
                .update({
                  where: { id: job.id },
                  data: {
                    progress: pct,
                    metadata: { ...(job.metadata || {}), stage: 'DOWNLOADING' },
                  },
                })
                .catch(() => {})
            }
          },
        }
      )

      if (cancelled || (await isJobCancelled(job.id))) return
      fileSize = downloaded
      detected = await detectAudioFromBytes(rawTempPath)
      if (!detected) {
        throw new Error(
          'Downloaded file is not a supported audio format (MP3, WAV, M4A, OGG, FLAC, AAC, WebM).'
        )
      }
    }

    const probedDuration = await probeDuration(workingAudioPath)
    const metaDuration = Number(job.metadata?.duration || 0)
    const duration = probedDuration > 0 ? probedDuration : metaDuration

    if (duration > MAX_IMPORT_DURATION_SEC) {
      throw new Error('Audio duration exceeds the 4-hour import limit.')
    }

    if (await isJobCancelled(job.id)) return

    await prisma.importJob
      .update({
        where: { id: job.id },
        data: {
          progress: 85,
          metadata: { ...(job.metadata || {}), stage: 'TRANSCRIBING' },
        },
      })
      .catch(() => {})

    const transcription = await transcribeAudio({
      filePath: workingAudioPath,
      mimeType: detected.mime,
      duration,
    }).catch((err) => ({
      status: 'FAILED',
      reason: err.message,
      segments: [],
      chapters: [],
    }))

    const targetKey = `${uuidv4()}${detected.ext}`
    await storage.saveLocalFile(workingAudioPath, targetKey, detected.mime)

    if (await isJobCancelled(job.id)) {
      await storage.remove(targetKey).catch(() => {})
      return
    }

    const episode = await prisma.episode.create({
      data: {
        workspaceId: job.workspaceId,
        uploaderId: job.userId,
        title: job.title,
        description:
          job.metadata?.description ||
          (job.sourceKind === 'VIDEO_UPLOAD'
            ? `Extracted audio from ${job.metadata?.originalName || 'uploaded video'}`
            : `Imported from ${new URL(job.sourceUrl).hostname}`),
        sourceType: 'UPLOAD',
        sourceUrl:
          job.sourceKind === 'VIDEO_UPLOAD' ? null : job.sourceUrl,
        audioKey: targetKey,
        mimeType: detected.mime,
        fileSize,
        duration,
        tags: Array.isArray(job.metadata?.tags) ? job.metadata.tags : [],
      },
    })

    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        progress: 100,
        episodeId: episode.id,
        metadata: {
          ...(job.metadata || {}),
          tempVideoPath: undefined,
          stage: 'COMPLETED',
          transcription,
        },
      },
    })
  } catch (err) {
    const cancelledNow = await isJobCancelled(job.id).catch(() => false)
    if (!cancelledNow) {
      await prisma.importJob
        .update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            error: err.message || 'Import failed.',
            metadata: { ...(job.metadata || {}), stage: 'FAILED' },
          },
        })
        .catch(() => {})
    }
  } finally {
    await fs.promises.unlink(rawTempPath).catch(() => {})
    if (videoTempPath) {
      await fs.promises.unlink(videoTempPath).catch(() => {})
    }
  }
}

export async function drainImportQueue() {
  if (activeWorkers >= MAX_CONCURRENT) return

  while (activeWorkers < MAX_CONCURRENT) {
    const candidate = await prisma.importJob.findFirst({
      where: { status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
    })
    if (!candidate) break

    // Atomic claim prevents duplicate execution across concurrent drain calls
    const claimed = await prisma.importJob.updateMany({
      where: { id: candidate.id, status: 'QUEUED' },
      data: { status: 'PROCESSING', progress: 5, error: null },
    })
    if (claimed.count === 0) continue

    activeWorkers += 1
    processJob(candidate).finally(() => {
      activeWorkers -= 1
      drainImportQueue().catch(() => {})
    })
  }
}

export async function recoverImportJobs() {
  await prisma.importJob.updateMany({
    where: { status: 'PROCESSING' },
    data: { status: 'QUEUED', progress: 0 },
  })
  await drainImportQueue()
}
