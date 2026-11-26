import { z } from 'zod'
import { asyncHandler } from '../../utils/errors.js'
import {
  acceptWorkspaceInvitation,
  addWorkspaceMember,
  createWorkspace,
  createWorkspaceInvitation,
  deleteWorkspace,
  getWorkspaceDetail,
  listUserWorkspaces,
  listWorkspaceInvitations,
  listWorkspaceMembers,
  removeWorkspaceMember,
  revokeWorkspaceInvitation,
  updateWorkspace,
} from './workspaces.service.js'

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  mode: z.enum(['STUDY', 'CREATOR']),
})

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
})

export const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'EDITOR', 'MEMBER', 'VIEWER']).default('MEMBER'),
})

export const createInvitationSchema = z.object({
  role: z.enum(['ADMIN', 'EDITOR', 'MEMBER', 'VIEWER']).default('MEMBER'),
  expiresInHours: z.coerce.number().positive().max(720).nullable().optional(),
})

export const joinByCodeSchema = z.object({
  code: z.string().min(3).max(64),
})

export const create = asyncHandler(async (req, res) => {
  const workspace = await createWorkspace({
    ...req.body,
    ownerId: req.user.id,
  })
  res.status(201).json({ workspace })
})

export const list = asyncHandler(async (req, res) => {
  const workspaces = await listUserWorkspaces(req.user.id)
  res.json({ workspaces })
})

export const getOne = asyncHandler(async (req, res) => {
  const workspace = await getWorkspaceDetail(req.params.id, req.user.id)
  res.json({ workspace })
})

export const update = asyncHandler(async (req, res) => {
  const workspace = await updateWorkspace(req.params.id, req.user.id, req.body)
  res.json({ workspace })
})

export const remove = asyncHandler(async (req, res) => {
  await deleteWorkspace(req.params.id, req.user.id)
  res.status(204).end()
})

export const listMembers = asyncHandler(async (req, res) => {
  const members = await listWorkspaceMembers(req.params.id, req.user.id)
  res.json({ members })
})

export const addMember = asyncHandler(async (req, res) => {
  const member = await addWorkspaceMember(req.params.id, req.user.id, req.body)
  res.status(201).json({ member })
})

export const removeMember = asyncHandler(async (req, res) => {
  await removeWorkspaceMember(req.params.id, req.user.id, req.params.memberId)
  res.status(204).end()
})

export const createInvitation = asyncHandler(async (req, res) => {
  const result = await createWorkspaceInvitation(
    req.params.id,
    req.user.id,
    req.body
  )
  res.status(201).json(result)
})

export const listInvitations = asyncHandler(async (req, res) => {
  const invitations = await listWorkspaceInvitations(req.params.id, req.user.id)
  res.json({ invitations })
})

export const revokeInvitation = asyncHandler(async (req, res) => {
  await revokeWorkspaceInvitation(
    req.params.id,
    req.user.id,
    req.params.invitationId
  )
  res.status(204).end()
})

export const joinByCode = asyncHandler(async (req, res) => {
  const result = await acceptWorkspaceInvitation(
    { code: req.body.code },
    req.user.id
  )
  res.json(result)
})
