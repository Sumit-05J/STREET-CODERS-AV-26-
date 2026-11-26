import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../config/prisma.js'
import { env } from '../../config/env.js'
import { AppError } from '../../utils/errors.js'

const HANDOFF_TTL_MS = 60_000
const handoffCodes = new Map()

const AVATAR_COLORS = ['#8B5CF6', '#22D3EE', '#F59E0B', '#10B981', '#EC4899']

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  })
}

function sanitizeUser(user) {
  const { passwordHash: _removed, ...rest } = user
  return rest
}

export async function registerUser({ name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim()
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })
  if (existing) {
    throw new AppError(409, 'An account with this email already exists.', 'EMAIL_EXISTS')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const avatarColor =
    AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      avatarColor,
    },
  })

  const token = signToken(user)
  return { user: sanitizeUser(user), token }
}

export async function loginUser({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim()
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user) {
    throw new AppError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS')
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    throw new AppError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS')
  }

  const token = signToken(user)
  return { user: sanitizeUser(user), token }
}

export function createHandoffCode(userId) {
  const now = Date.now()
  for (const [k, entry] of handoffCodes.entries()) {
    if (entry.expiresAt <= now) handoffCodes.delete(k)
  }
  const code = crypto.randomBytes(24).toString('hex')
  handoffCodes.set(code, { userId, expiresAt: now + HANDOFF_TTL_MS })
  return { code, expiresIn: Math.floor(HANDOFF_TTL_MS / 1000) }
}

export async function exchangeHandoffCode(code) {
  const entry = handoffCodes.get(code)
  handoffCodes.delete(code) // Single-use: always consume immediately

  if (!entry || entry.expiresAt <= Date.now()) {
    throw new AppError(
      401,
      'Handoff code is invalid or expired. Please sign in again.',
      'INVALID_HANDOFF'
    )
  }

  const user = await prisma.user.findUnique({ where: { id: entry.userId } })
  if (!user) {
    throw new AppError(401, 'User account not found.', 'UNAUTHORIZED')
  }

  return { user: sanitizeUser(user), token: signToken(user) }
}
