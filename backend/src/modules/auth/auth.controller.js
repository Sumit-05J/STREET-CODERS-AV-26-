import { z } from 'zod'
import { asyncHandler } from '../../utils/errors.js'
import {
  createHandoffCode,
  exchangeHandoffCode,
  loginUser,
  registerUser,
} from './auth.service.js'

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
})

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
})

export const register = asyncHandler(async (req, res) => {
  const result = await registerUser(req.body)
  res.status(201).json(result)
})

export const login = asyncHandler(async (req, res) => {
  const result = await loginUser(req.body)
  res.json(result)
})

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user })
})

export const handoffSchema = z.object({
  code: z.string().min(16).max(128),
})

export const createHandoff = asyncHandler(async (req, res) => {
  const result = createHandoffCode(req.user.id)
  res.status(201).json(result)
})

export const exchangeHandoff = asyncHandler(async (req, res) => {
  const result = await exchangeHandoffCode(req.body.code)
  res.json(result)
})
