import { Router } from 'express'
import { optionalAuth, requireAuth } from '../../middleware/auth.js'
import { asyncHandler } from '../../utils/errors.js'
import {
  acceptWorkspaceInvitation,
  getInvitationPreview,
} from '../workspaces/workspaces.service.js'

const router = Router()

router.get(
  '/:token',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const invitation = await getInvitationPreview(req.params.token)
    res.json({ invitation })
  })
)

router.post(
  '/:token/accept',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await acceptWorkspaceInvitation(
      { token: req.params.token },
      req.user.id
    )
    res.json(result)
  })
)

export default router
