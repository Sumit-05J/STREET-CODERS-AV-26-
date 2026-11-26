import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import {
  createBookmark,
  createBookmarkSchema,
  deleteBookmark,
  listBookmarks,
} from './bookmarks.controller.js'

const router = Router()
router.use(requireAuth)

router.get('/episodes/:id/bookmarks', listBookmarks)
router.post('/episodes/:id/bookmarks', validate(createBookmarkSchema), createBookmark)
router.delete('/bookmarks/:id', deleteBookmark)

export default router
