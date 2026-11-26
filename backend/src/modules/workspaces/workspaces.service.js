import crypto from 'crypto'
import { prisma } from '../../config/prisma.js'
import { AppError } from '../../utils/errors.js'
import {
  ADMIN_ROLES,
  ALL_ROLES,
  assertWorkspaceMember,
  OWNER_ROLES,
} from '../../middleware/workspaceAuth.js'
import { emitWorkspaceEvent } from '../../sockets/index.js'
import { storage } from '../../utils/storage.js'

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex')
}

function generateInviteCode() {
  return `ECHO-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

export async function createWorkspace({ name, description = '', mode, ownerId }) {
  const workspace = await prisma.workspace.create({
    data: {
      name: name.trim(),
      description: description.trim(),
      mode,
      ownerId,
      members: {
        create: {
          userId: ownerId,
          role: 'OWNER',
        },
      },
      ...(mode === 'CREATOR'
        ? {
            shows: {
              create: {
                title: `${name.trim()} Show`,
                description: description.trim() || `Podcast feed for ${name.trim()}`,
                rssSlug: `show-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              },
            },
          }
        : {}),
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatarColor: true } },
        },
      },
      shows: true,
      _count: {
        select: { episodes: true, members: true, playlists: true },
      },
    },
  })

  return { ...workspace, myRole: 'OWNER' }
}

export async function listUserWorkspaces(userId) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          _count: {
            select: { episodes: true, members: true, playlists: true },
          },
          shows: true,
        },
      },
    },
    orderBy: { workspace: { createdAt: 'desc' } },
  })

  return memberships.map((m) => ({
    ...m.workspace,
    myRole: m.role,
  }))
}

export async function getWorkspaceDetail(workspaceId, userId) {
  const membership = await assertWorkspaceMember(workspaceId, userId, ALL_ROLES)
  const canManageInvites = ADMIN_ROLES.includes(membership.role)

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatarColor: true } },
        },
        orderBy: { joinedAt: 'asc' },
      },
      ...(canManageInvites
        ? {
            invitations: {
              where: { revokedAt: null },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                code: true,
                role: true,
                expiresAt: true,
                usedCount: true,
                createdAt: true,
              },
            },
          }
        : {}),
      shows: true,
      episodes: {
        where: { deletedAt: null },
        include: {
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
              episode: { select: { id: true, title: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: { select: { annotations: true, clips: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      playlists: {
        include: {
          episodes: {
            orderBy: { position: 'asc' },
            include: {
              episode: {
                select: { id: true, title: true, duration: true, createdAt: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  return { ...workspace, myRole: membership.role }
}

export async function updateWorkspace(workspaceId, userId, updates) {
  await assertWorkspaceMember(workspaceId, userId, ADMIN_ROLES)

  return prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      ...(updates.name ? { name: updates.name.trim() } : {}),
      ...(updates.description !== undefined
        ? { description: updates.description.trim() }
        : {}),
    },
  })
}

export async function deleteWorkspace(workspaceId, userId) {
  await assertWorkspaceMember(workspaceId, userId, OWNER_ROLES)

  const uploadedEpisodes = await prisma.episode.findMany({
    where: { workspaceId, sourceType: 'UPLOAD', audioKey: { not: null } },
    select: { id: true, audioKey: true },
  })

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { workspaceId } })
    await tx.workspace.delete({ where: { id: workspaceId } })
  })

  for (const ep of uploadedEpisodes) {
    if (!ep.audioKey) continue
    const stillReferenced = await prisma.episode.count({
      where: { audioKey: ep.audioKey },
    })
    if (stillReferenced === 0) {
      await storage.remove(ep.audioKey).catch((err) => {
        console.error(`[WorkspaceDelete] Failed to remove ${ep.audioKey}:`, err.message)
      })
    }
  }
}

export async function listWorkspaceMembers(workspaceId, userId) {
  await assertWorkspaceMember(workspaceId, userId, ALL_ROLES)
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarColor: true } },
    },
    orderBy: { joinedAt: 'asc' },
  })
}

export async function addWorkspaceMember(workspaceId, actorId, { email, role }) {
  const actorMembership = await assertWorkspaceMember(workspaceId, actorId, ADMIN_ROLES)

  if (role === 'OWNER') {
    throw new AppError(403, 'Cannot assign OWNER role via member invite.', 'FORBIDDEN')
  }
  if (role === 'ADMIN' && actorMembership.role !== 'OWNER') {
    throw new AppError(403, 'Only the workspace OWNER can assign ADMIN role.', 'FORBIDDEN')
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, name: true, email: true, avatarColor: true },
  })

  if (!targetUser) {
    throw new AppError(
      404,
      'No registered user found with that email.',
      'USER_NOT_FOUND'
    )
  }

  const member = await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId: targetUser.id } },
    update: { role },
    create: {
      workspaceId,
      userId: targetUser.id,
      role,
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatarColor: true } },
    },
  })

  emitWorkspaceEvent(workspaceId, 'workspace:member_joined', { member })
  return member
}

export async function removeWorkspaceMember(workspaceId, actorId, targetMemberOrUserId) {
  const actorMembership = await assertWorkspaceMember(workspaceId, actorId, ADMIN_ROLES)

  const target = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      OR: [{ id: targetMemberOrUserId }, { userId: targetMemberOrUserId }],
    },
  })

  if (!target) {
    throw new AppError(404, 'Workspace member not found.', 'NOT_FOUND')
  }
  if (target.role === 'OWNER') {
    throw new AppError(403, 'Cannot remove the workspace OWNER.', 'FORBIDDEN')
  }
  if (target.role === 'ADMIN' && actorMembership.role !== 'OWNER') {
    throw new AppError(403, 'Only the OWNER can remove an ADMIN.', 'FORBIDDEN')
  }

  await prisma.workspaceMember.delete({ where: { id: target.id } })
  emitWorkspaceEvent(workspaceId, 'workspace:member_removed', {
    userId: target.userId,
    workspaceId,
  })
}

export async function createWorkspaceInvitation(
  workspaceId,
  actorId,
  { role = 'MEMBER', expiresInHours = null }
) {
  const actorMembership = await assertWorkspaceMember(workspaceId, actorId, ADMIN_ROLES)

  if (role === 'OWNER') {
    throw new AppError(403, 'Cannot create an invitation for OWNER role.', 'FORBIDDEN')
  }
  if (role === 'ADMIN' && actorMembership.role !== 'OWNER') {
    throw new AppError(403, 'Only the workspace OWNER can invite an ADMIN.', 'FORBIDDEN')
  }

  const rawToken = crypto.randomBytes(24).toString('hex')
  const tokenHash = hashToken(rawToken)
  const code = generateInviteCode()
  const expiresAt =
    expiresInHours && Number(expiresInHours) > 0
      ? new Date(Date.now() + Number(expiresInHours) * 3600 * 1000)
      : null

  const invitation = await prisma.workspaceInvitation.create({
    data: {
      workspaceId,
      invitedById: actorId,
      tokenHash,
      code,
      role,
      expiresAt,
    },
    select: {
      id: true,
      workspaceId: true,
      code: true,
      role: true,
      expiresAt: true,
      usedCount: true,
      createdAt: true,
    },
  })

  return { invitation, inviteToken: rawToken }
}

export async function listWorkspaceInvitations(workspaceId, actorId) {
  await assertWorkspaceMember(workspaceId, actorId, ADMIN_ROLES)
  return prisma.workspaceInvitation.findMany({
    where: { workspaceId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      role: true,
      expiresAt: true,
      usedCount: true,
      createdAt: true,
    },
  })
}

export async function revokeWorkspaceInvitation(workspaceId, actorId, invitationId) {
  await assertWorkspaceMember(workspaceId, actorId, ADMIN_ROLES)

  const existing = await prisma.workspaceInvitation.findFirst({
    where: { id: invitationId, workspaceId },
  })
  if (!existing) {
    throw new AppError(404, 'Invitation not found.', 'NOT_FOUND')
  }

  await prisma.workspaceInvitation.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  })
}

function assertInvitationUsable(inv) {
  if (!inv) {
    throw new AppError(404, 'Invitation not found or invalid.', 'INVALID_INVITATION')
  }
  if (inv.revokedAt) {
    throw new AppError(410, 'This invitation has been revoked.', 'INVITATION_REVOKED')
  }
  if (inv.expiresAt && inv.expiresAt.getTime() < Date.now()) {
    throw new AppError(410, 'This invitation has expired.', 'INVITATION_EXPIRED')
  }
}

export async function getInvitationPreview(rawTokenOrCode) {
  const trimmed = String(rawTokenOrCode || '').trim()
  if (!trimmed) {
    throw new AppError(404, 'Invalid invitation.', 'INVALID_INVITATION')
  }

  const tokenHash = hashToken(trimmed)
  const inv = await prisma.workspaceInvitation.findFirst({
    where: {
      OR: [{ tokenHash }, { code: trimmed.toUpperCase() }],
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          description: true,
          mode: true,
          _count: { select: { members: true, episodes: true } },
        },
      },
      invitedBy: { select: { name: true } },
    },
  })

  assertInvitationUsable(inv)

  return {
    id: inv.id,
    role: inv.role,
    expiresAt: inv.expiresAt,
    workspace: inv.workspace,
    invitedByName: inv.invitedBy?.name || 'Workspace Owner',
  }
}

export async function acceptWorkspaceInvitation({ token, code }, userId) {
  const lookup = token
    ? { tokenHash: hashToken(token.trim()) }
    : { code: String(code || '').trim().toUpperCase() }

  const inv = await prisma.workspaceInvitation.findFirst({
    where: lookup,
    include: { workspace: true },
  })

  assertInvitationUsable(inv)

  // Safety: Never allow invitation acceptance to assign OWNER or escalate existing roles
  const safeRole = inv.role === 'OWNER' ? 'MEMBER' : inv.role

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: inv.workspaceId, userId },
      },
    })

    if (existing) {
      return { member: existing, alreadyMember: true }
    }

    const created = await tx.workspaceMember.create({
      data: {
        workspaceId: inv.workspaceId,
        userId,
        role: safeRole,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarColor: true } },
      },
    })

    await tx.workspaceInvitation.update({
      where: { id: inv.id },
      data: { usedCount: { increment: 1 } },
    })

    return { member: created, alreadyMember: false }
  })

  if (!result.alreadyMember) {
    emitWorkspaceEvent(inv.workspaceId, 'workspace:member_joined', {
      member: result.member,
    })
  }

  return {
    workspace: inv.workspace,
    role: result.member.role,
    alreadyMember: result.alreadyMember,
  }
}
