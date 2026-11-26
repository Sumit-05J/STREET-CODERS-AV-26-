import fs from 'fs'
import os from 'os'
import path from 'path'
import { Router } from 'express'
import multer from 'multer'
import { env } from '../../config/env.js'
import { requireAuth } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { createRateLimiter } from '../../middleware/rateLimit.js'
import {
  cancelImportJob,
  createImport,
  createImportSchema,
  getImportJob,
  importRssEpisode,
  importRssEpisodeSchema,
  listWorkspaceImports,
  previewRss,
  previewRssSchema,
  retryImportJob,
  uploadVideoForExtraction,
} from './imports.controller.js'

const tempVideoDir = path.join(os.tmpdir(), 'echospace-video-uploads')
if (!fs.existsSync(tempVideoDir)) {
  fs.mkdirSync(tempVideoDir, { recursive: true })
}

const videoUpload = multer({
  dest: tempVideoDir,
  limits: {
    fileSize: env.maxFileSizeBytes,
  },
})

const router = Router()
const importLimiter = createRateLimiter({ windowMs: 60_000, max: 20 })

router.post(
  '/imports/video',
  requireAuth,
  importLimiter,
  videoUpload.single('video'),
  uploadVideoForExtraction
)

router.post(
  '/imports/rss/preview',
  requireAuth,
  importLimiter,
  validate(previewRssSchema),
  previewRss
)
router.post(
  '/imports/rss/episode',
  requireAuth,
  importLimiter,
  validate(importRssEpisodeSchema),
  importRssEpisode
)
router.post(
  '/imports',
  requireAuth,
  importLimiter,
  validate(createImportSchema),
  createImport
)
router.get('/imports/:id', requireAuth, getImportJob)
router.get('/workspaces/:id/imports', requireAuth, listWorkspaceImports)
router.post('/imports/:id/retry', requireAuth, retryImportJob)
router.post('/imports/:id/cancel', requireAuth, cancelImportJob)

export default router
