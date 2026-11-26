import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/errors.js'

export const ALL_ROLES = ['OWNER', 'ADMIN', 'EDITOR', 'MEMBER', 'VIEWER']
export const WRITE_ROLES = ['OWNER', 'ADMIN', 'EDITOR', 'MEMBER']
export const MANAGE_ROLES = ['OWNER', 'ADMIN', 'EDITOR']
export const ADMIN_ROLES = ['OWNER', 'ADMIN']
export const OWNER_ROLES = ['OWNER']

export async function assertWorkspaceMember(
  workspaceId,
  userId,
  allowedRoles = ALL_ROLES
) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: true },
  })

  if (!membership) {
    throw new AppError(
      403,
      'You do not have access to this workspace.',
      'FORBIDDEN'
    )
  }

  if (!allowedRoles.includes(membership.role)) {
    throw new AppError(
      403,
      'Your workspace role does not permit this action.',
      'INSUFFICIENT_ROLE'
    )
  }

  return membership
}

export async function assertEpisodeMember(
  episodeId,
  userId,
  allowedRoles = ALL_ROLES
) {
  const episode = await prisma.episode.findFirst({
    where: { id: episodeId, deletedAt: null },
    include: { workspace: true },
  })

  if (!episode) {
    throw new AppError(404, 'Episode not found.', 'NOT_FOUND')
  }

  const membership = await assertWorkspaceMember(
    episode.workspaceId,
    userId,
    allowedRoles
  )

  return { episode, membership }
}
