import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { prisma } from './config/prisma.js'
import { errorHandler } from './middleware/errorHandler.js'
import authRoutes from './modules/auth/auth.routes.js'
import usersRoutes from './modules/users/users.routes.js'
import workspacesRoutes from './modules/workspaces/workspaces.routes.js'
import invitationsRoutes from './modules/invitations/invitations.routes.js'
import episodesRoutes from './modules/episodes/episodes.routes.js'
import annotationsRoutes from './modules/annotations/annotations.routes.js'
import repliesRoutes from './modules/replies/replies.routes.js'
import clipsRoutes from './modules/clips/clips.routes.js'
import chaptersRoutes from './modules/chapters/chapters.routes.js'
import playlistsRoutes from './modules/playlists/playlists.routes.js'
import rssRoutes from './modules/rss/rss.routes.js'
import notificationsRoutes from './modules/notifications/notifications.routes.js'
import importsRoutes from './modules/imports/imports.routes.js'
import bookmarksRoutes from './modules/bookmarks/bookmarks.routes.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true)
        if (env.corsOrigins.includes(origin)) return callback(null, true)
        if (env.allowExtensionCors && origin.startsWith('chrome-extension://')) {
          return callback(null, true)
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`))
      },
      credentials: true,
      exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
    })
  )
  app.use(express.json({ limit: '2mb' }))

  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.json({
        status: 'ok',
        service: 'echospace-backend',
        database: 'connected',
      })
    } catch {
      res.status(503).json({
        status: 'error',
        service: 'echospace-backend',
        database: 'disconnected',
      })
    }
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/users', usersRoutes)
  app.use('/api/workspaces', workspacesRoutes)
  app.use('/api/invitations', invitationsRoutes)
  app.use('/api/episodes', episodesRoutes)
  app.use('/api', annotationsRoutes)
  app.use('/api', repliesRoutes)
  app.use('/api', clipsRoutes)
  app.use('/api', chaptersRoutes)
  app.use('/api', playlistsRoutes)
  app.use('/api', rssRoutes)
  app.use('/api/notifications', notificationsRoutes)
  app.use('/api', importsRoutes)
  app.use('/api', bookmarksRoutes)

  app.use((_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'API route not found.' },
    })
  })

  app.use(errorHandler)

  return app
}
