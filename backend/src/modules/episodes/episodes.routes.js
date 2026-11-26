import fs from 'fs'
import os from 'os'
import path from 'path'
import { Router } from 'express'
import multer from 'multer'
import { env } from '../../config/env.js'
import { requireAuth } from '../../middleware/auth.js'
import { createRateLimiter } from '../../middleware/rateLimit.js'
import {
  createExternalEpisode,
  deleteEpisode,
  getEpisode,
  lookupEpisodeByUrl,
  streamEpisodeAudio,
  uploadEpisode,
} from './episodes.controller.js'

const tempUploadDir = path.join(os.tmpdir(), 'echospace-uploads')
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true })
}

const upload = multer({
  dest: tempUploadDir,
  limits: {
    fileSize: env.maxFileSizeBytes,
  },
})

const router = Router()
const uploadLimiter = createRateLimiter({ windowMs: 60_000, max: 20 })

router.use(requireAuth)

router.post('/upload', uploadLimiter, upload.single('audio'), uploadEpisode)
router.post('/external', createExternalEpisode)
router.get('/lookup', lookupEpisodeByUrl)
router.get('/:id', getEpisode)
router.get('/:id/audio', streamEpisodeAudio)
router.delete('/:id', deleteEpisode)

export default router
