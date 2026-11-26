import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import {
  addMember,
  addMemberSchema,
  create,
  createInvitation,
  createInvitationSchema,
  createWorkspaceSchema,
  getOne,
  joinByCode,
  joinByCodeSchema,
  list,
  listInvitations,
  listMembers,
  remove,
  removeMember,
  revokeInvitation,
  update,
  updateWorkspaceSchema,
} from './workspaces.controller.js'

const router = Router()

router.use(requireAuth)

router.post('/', validate(createWorkspaceSchema), create)
router.get('/', list)
router.post('/join', validate(joinByCodeSchema), joinByCode)
router.get('/:id', getOne)
router.patch('/:id', validate(updateWorkspaceSchema), update)
router.delete('/:id', remove)
router.get('/:id/members', listMembers)
router.post('/:id/members', validate(addMemberSchema), addMember)
router.delete('/:id/members/:memberId', removeMember)
router.get('/:id/invitations', listInvitations)
router.post(
  '/:id/invitations',
  validate(createInvitationSchema),
  createInvitation
)
router.delete('/:id/invitations/:invitationId', revokeInvitation)

export default router
