import { z } from 'zod'
import { prisma } from '../../config/prisma.js'
import { AppError, asyncHandler } from '../../utils/errors.js'
import {
  ALL_ROLES,
  assertEpisodeMember,
  WRITE_ROLES,
} from '../../middleware/workspaceAuth.js'

export const createBookmarkSchema = z.object({
  timestamp: z.number().min(0),
  label: z.string().max(120).optional().nullable(),
})

export const listBookmarks = asyncHandler(async (req, res) => {
  const { episode } = await assertEpisodeMember(
    req.params.id,
    req.user.id,
    ALL_ROLES
  )

  const bookmarks = await prisma.bookmark.findMany({
    where: { episodeId: episode.id, userId: req.user.id },
    orderBy: { timestamp: 'asc' },
  })

  res.json({ bookmarks })
})

export const createBookmark = asyncHandler(async (req, res) => {
  const { episode } = await assertEpisodeMember(
    req.params.id,
    req.user.id,
    WRITE_ROLES
  )

  const bookmark = await prisma.bookmark.create({
    data: {
      episodeId: episode.id,
      userId: req.user.id,
      timestamp: req.body.timestamp,
      label: req.body.label?.trim() || null,
    },
  })

  res.status(201).json({ bookmark })
})

export const deleteBookmark = asyncHandler(async (req, res) => {
  const existing = await prisma.bookmark.findUnique({
    where: { id: req.params.id },
  })
  if (!existing) {
    throw new AppError(404, 'Bookmark not found.', 'NOT_FOUND')
  }
  await assertEpisodeMember(existing.episodeId, req.user.id, ALL_ROLES)

  if (existing.userId !== req.user.id) {
    throw new AppError(403, 'You can only delete your own bookmarks.', 'FORBIDDEN')
  }

  await prisma.bookmark.delete({ where: { id: existing.id } })
  res.status(204).end()
})
