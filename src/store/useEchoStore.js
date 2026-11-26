import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient, setAuthToken, setOnUnauthorized } from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'

function formatRelativeTime(dateInput) {
  if (!dateInput) return 'Just now'
  const diffSec = Math.floor((Date.now() - new Date(dateInput).getTime()) / 1000)
  if (diffSec < 60) return 'Just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return new Date(dateInput).toLocaleDateString()
}

function normalizeEpisode(ep, mode) {
  const sourceType = ep.sourceType || 'UPLOAD'
  return {
    id: ep.id,
    workspaceId: ep.workspaceId,
    mode: (ep.workspace?.mode || mode || 'study').toLowerCase(),
    title: ep.title,
    description: ep.description || '',
    sourceType,
    sourceUrl: ep.sourceUrl || null,
    audioUrl:
      sourceType === 'UPLOAD' ? apiClient.getEpisodeAudioUrl(ep.id) : null,
    duration: ep.duration || 0,
    createdAt: formatRelativeTime(ep.createdAt),
    createdAtRaw: ep.createdAt,
    authorId: ep.uploaderId,
    authorName: ep.uploader?.name || 'Member',
    tags: ep.tags || [],
    chapters: ep.chapters || [],
  }
}

function normalizeAnnotation(ann, mode) {
  const modeLower = (mode || 'study').toLowerCase()
  const rawCat = ann.category
  const category =
    modeLower === 'study' && (rawCat === 'INSIGHT' || rawCat === 'REVISION')
      ? 'NOTE'
      : rawCat
  return {
    id: ann.id,
    recordingId: ann.episodeId,
    mode: modeLower,
    timestamp: ann.timestamp,
    category,
    status: (ann.status || 'OPEN').toUpperCase(),
    authorId: ann.userId,
    authorName: ann.user?.name || 'Member',
    createdAt: formatRelativeTime(ann.createdAt),
    createdAtRaw: ann.createdAt,
    content: ann.content,
    replies: (ann.replies || []).map((r) => ({
      id: r.id,
      authorId: r.userId,
      authorName: r.user?.name || 'Member',
      createdAt: formatRelativeTime(r.createdAt),
      content: r.content,
    })),
  }
}

function normalizeClip(clip, mode, recordingTitle = '') {
  return {
    id: clip.id,
    shareToken: clip.shareToken,
    mode: (mode || 'study').toLowerCase(),
    recordingId: clip.episodeId,
    recordingTitle: clip.episode?.title || recordingTitle || 'Recording',
    title: clip.title,
    startTime: clip.startTime,
    endTime: clip.endTime,
    authorId: clip.creatorId,
    authorName: clip.creator?.name || 'Member',
    createdAt: formatRelativeTime(clip.createdAt),
    createdAtRaw: clip.createdAt,
    views: clip.views ?? 0,
    notes: clip.description || '',
  }
}

function buildWorkspaceActivity(episodes, annotations, clips, modeLower) {
  const items = []
  episodes.forEach((ep) => {
    items.push({
      id: `act-ep-${ep.id}`,
      mode: modeLower,
      actor: ep.authorName,
      action:
        ep.sourceType === 'EXTERNAL_LINK'
          ? 'linked media'
          : modeLower === 'study'
            ? 'uploaded lecture'
            : 'uploaded episode',
      target: ep.title,
      time: ep.createdAt,
      ts: new Date(ep.createdAtRaw || 0).getTime(),
    })
  })
  annotations.forEach((ann) => {
    items.push({
      id: `act-ann-${ann.id}`,
      mode: modeLower,
      actor: ann.authorName,
      action: `added ${ann.category.toLowerCase()}`,
      target: ann.content.slice(0, 48),
      time: ann.createdAt,
      ts: new Date(ann.createdAtRaw || 0).getTime(),
    })
  })
  clips.forEach((c) => {
    items.push({
      id: `act-clip-${c.id}`,
      mode: modeLower,
      actor: c.authorName,
      action: 'created clip',
      target: c.title,
      time: c.createdAt,
      ts: new Date(c.createdAtRaw || 0).getTime(),
    })
  })
  return items.sort((a, b) => b.ts - a.ts).slice(0, 10)
}

export const useEchoStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      mode: 'study',
      workspaces: [],
      activeWorkspaceId: null,
      activeWorkspaceRole: 'OWNER',
      shows: [],

      recordings: [],
      annotations: [],
      clips: [],
      playlists: [],
      members: [],
      invitations: [],
      activity: [],
      notifications: [],
      unreadNotifications: 0,

      workspaceSettings: {
        studyName: 'Study Workspace',
        creatorName: 'Creator Workspace',
        defaultPlaybackSpeed: 1,
        autoPauseOnAnnotate: true,
        emailNotifications: true,
        chromeExtensionSync: true,
      },

      registerWithBackend: async ({ name, email, password }) => {
        const { user, token } = await apiClient.register({
          name,
          email,
          password,
        })
        setAuthToken(token)
        connectSocket(token)
        set({ token, user, isAuthenticated: true })
        await get().loadWorkspaces()
        return user
      },

      loginWithBackend: async ({ email, password }) => {
        const { user, token } = await apiClient.login({ email, password })
        setAuthToken(token)
        connectSocket(token)
        set({ token, user, isAuthenticated: true })
        await get().loadWorkspaces()
        return user
      },

      logout: () => {
        setAuthToken(null)
        disconnectSocket()
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          workspaces: [],
          activeWorkspaceId: null,
          shows: [],
          recordings: [],
          annotations: [],
          clips: [],
          playlists: [],
          members: [],
          invitations: [],
          activity: [],
          notifications: [],
          unreadNotifications: 0,
        })
      },

      logoutDemo: () => get().logout(),

      loadWorkspaces: async () => {
        const { token } = get()
        if (!token) return []
        const workspaces = await apiClient.listWorkspaces()
        set({ workspaces })

        const currentId = get().activeWorkspaceId
        const target =
          workspaces.find((w) => w.id === currentId) || workspaces[0]
        if (target) {
          await get().selectWorkspace(target.id)
        } else {
          set({
            activeWorkspaceId: null,
            recordings: [],
            annotations: [],
            clips: [],
            playlists: [],
            members: [],
            activity: [],
          })
        }
        return workspaces
      },

      createAndSelectWorkspace: async ({ name, description = '', mode }) => {
        const apiMode = mode.toUpperCase()
        const ws = await apiClient.createWorkspace({ name, description, mode: apiMode })
        await get().loadWorkspaces()
        await get().selectWorkspace(ws.id)
        return ws
      },

      joinWorkspaceByCode: async (code) => {
        const res = await apiClient.joinWorkspaceByCode(code)
        await get().loadWorkspaces()
        await get().selectWorkspace(res.workspace.id)
        return res
      },

      acceptInvitation: async (token) => {
        const res = await apiClient.acceptInvitation(token)
        await get().loadWorkspaces()
        await get().selectWorkspace(res.workspace.id)
        return res
      },

      deleteWorkspace: async (workspaceId) => {
        await apiClient.deleteWorkspace(workspaceId)
        set({ activeWorkspaceId: null, invitations: [] })
        await get().loadWorkspaces()
      },

      selectWorkspace: async (workspaceId) => {
        const { token } = get()
        if (!token || !workspaceId) return null
        const ws = await apiClient.getWorkspace(workspaceId)
        const modeLower = ws.mode.toLowerCase()

        const mappedRecordings = (ws.episodes || []).map((ep) =>
          normalizeEpisode(ep, modeLower)
        )
        const mappedAnnotations = (ws.episodes || []).flatMap((ep) =>
          (ep.annotations || []).map((a) => normalizeAnnotation(a, modeLower))
        )
        const mappedClips = (ws.episodes || []).flatMap((ep) =>
          (ep.clips || []).map((c) => normalizeClip(c, modeLower, ep.title))
        )
        const mappedPlaylists = (ws.playlists || []).map((pl) => ({
          id: pl.id,
          mode: modeLower,
          title: pl.title,
          description: pl.description || '',
          rssUrl: pl.rssUrl || '',
          recordingIds: (pl.episodes || []).map((pe) => pe.episodeId),
          updatedAt: formatRelativeTime(pl.updatedAt),
        }))
        const mappedMembers = (ws.members || []).map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          modes: [modeLower],
          status: 'Active',
          avatarColor: m.user.avatarColor || '#D9532F',
        }))

        const activity = buildWorkspaceActivity(
          mappedRecordings,
          mappedAnnotations,
          mappedClips,
          modeLower
        )

        set((state) => ({
          activeWorkspaceId: ws.id,
          activeWorkspaceRole: ws.myRole || 'MEMBER',
          mode: modeLower,
          shows: ws.shows || [],
          recordings: mappedRecordings,
          annotations: mappedAnnotations,
          clips: mappedClips,
          playlists: mappedPlaylists,
          members: mappedMembers,
          invitations: ws.invitations || [],
          activity,
          workspaceSettings: {
            ...state.workspaceSettings,
            ...(modeLower === 'study'
              ? { studyName: ws.name }
              : { creatorName: ws.name }),
          },
        }))
        return ws
      },

      setMode: (mode) => {
        if (mode !== 'study' && mode !== 'creator') return
        const { workspaces, token } = get()
        set({ mode })
        if (token && workspaces.length > 0) {
          const matching = workspaces.find(
            (w) => w.mode.toLowerCase() === mode
          )
          if (matching && matching.id !== get().activeWorkspaceId) {
            get().selectWorkspace(matching.id)
          }
        }
      },

      loadEpisodeDetail: async (episodeId) => {
        const { token } = get()
        if (!token || !episodeId) return null
        const { episode, myRole } = await apiClient.getEpisode(episodeId)
        const modeLower = (episode.workspace?.mode || get().mode).toLowerCase()
        const normEp = normalizeEpisode(episode, modeLower)
        const normAnns = (episode.annotations || []).map((a) =>
          normalizeAnnotation(a, modeLower)
        )
        const normClips = (episode.clips || []).map((c) =>
          normalizeClip(c, modeLower, episode.title)
        )

        set((state) => ({
          activeWorkspaceId: episode.workspaceId || state.activeWorkspaceId,
          mode: modeLower || state.mode,
          activeWorkspaceRole: myRole || state.activeWorkspaceRole,
          recordings: state.recordings.some((r) => r.id === normEp.id)
            ? state.recordings.map((r) => (r.id === normEp.id ? normEp : r))
            : [normEp, ...state.recordings],
          annotations: [
            ...normAnns,
            ...state.annotations.filter((a) => a.recordingId !== normEp.id),
          ],
          clips: [
            ...normClips,
            ...state.clips.filter((c) => c.recordingId !== normEp.id),
          ],
        }))
        return normEp
      },

      uploadEpisode: async ({
        file,
        title,
        description,
        tags = '',
        playlistId = '',
        duration = 0,
        onProgress,
      }) => {
        const { activeWorkspaceId, mode, shows } = get()
        if (!activeWorkspaceId) {
          throw new Error('No active workspace selected.')
        }
        const fd = new FormData()
        fd.append('audio', file)
        fd.append('workspaceId', activeWorkspaceId)
        fd.append('title', title)
        fd.append('description', description || '')
        fd.append('tags', Array.isArray(tags) ? tags.join(',') : tags)
        fd.append('duration', String(duration || 0))
        if (playlistId) fd.append('playlistId', playlistId)
        if (mode === 'creator' && shows[0]?.id) {
          fd.append('showId', shows[0].id)
        }

        const ep = await apiClient.uploadEpisode(fd, onProgress)
        const norm = normalizeEpisode(ep, mode)
        set((state) => ({
          recordings: [norm, ...state.recordings],
        }))
        return norm
      },

      createExternalEpisode: async ({
        sourceUrl,
        title,
        description = '',
        tags = [],
        playlistId = '',
        duration = 0,
      }) => {
        const { activeWorkspaceId, mode, shows } = get()
        if (!activeWorkspaceId) {
          throw new Error('No active workspace selected.')
        }
        const parsedTags = Array.isArray(tags)
          ? tags
          : String(tags)
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)

        const ep = await apiClient.createExternalEpisode({
          workspaceId: activeWorkspaceId,
          title,
          description,
          sourceUrl,
          duration,
          tags: parsedTags,
          playlistId: playlistId || undefined,
          showId: mode === 'creator' && shows[0]?.id ? shows[0].id : undefined,
        })
        const norm = normalizeEpisode(ep, mode)
        set((state) => ({
          recordings: state.recordings.some((r) => r.id === norm.id)
            ? state.recordings
            : [norm, ...state.recordings],
        }))
        return norm
      },

      deleteRecording: async (episodeId) => {
        await apiClient.deleteEpisode(episodeId)
        set((state) => ({
          recordings: state.recordings.filter((r) => r.id !== episodeId),
          annotations: state.annotations.filter((a) => a.recordingId !== episodeId),
          clips: state.clips.filter((c) => c.recordingId !== episodeId),
        }))
      },

      loadNotifications: async () => {
        const { token } = get()
        if (!token) return
        const { notifications, unreadCount } = await apiClient.listNotifications()
        set({ notifications, unreadNotifications: unreadCount })
      },

      markNotificationRead: async (id) => {
        await apiClient.markNotificationRead(id)
        set((state) => {
          const next = state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          )
          return {
            notifications: next,
            unreadNotifications: next.filter((n) => !n.isRead).length,
          }
        })
      },

      markAllNotificationsRead: async () => {
        await apiClient.markAllNotificationsRead()
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadNotifications: 0,
        }))
      },

      addSocketNotification: (notification) => {
        set((state) => {
          if (state.notifications.some((n) => n.id === notification.id)) {
            return state
          }
          const next = [notification, ...state.notifications]
          return {
            notifications: next,
            unreadNotifications: next.filter((n) => !n.isRead).length,
          }
        })
      },

      addAnnotation: async ({ recordingId, timestamp, category, content }) => {
        const { mode, recordings } = get()
        const rec = recordings.find((r) => r.id === recordingId)
        const created = await apiClient.createAnnotation(recordingId, {
          timestamp,
          category,
          content,
        })
        const norm = normalizeAnnotation(created, rec?.mode || mode)
        set((state) => ({
          annotations: state.annotations.some((a) => a.id === norm.id)
            ? state.annotations
            : [norm, ...state.annotations],
        }))
        return norm
      },

      updateAnnotationStatus: async (annotationId, status) => {
        const upper = String(status).toUpperCase()
        await apiClient.updateAnnotation(annotationId, { status: upper })
        set((state) => ({
          annotations: state.annotations.map((ann) =>
            ann.id === annotationId ? { ...ann, status: upper } : ann
          ),
        }))
      },

      editAnnotation: async (annotationId, content) => {
        await apiClient.updateAnnotation(annotationId, { content })
        set((state) => ({
          annotations: state.annotations.map((ann) =>
            ann.id === annotationId ? { ...ann, content } : ann
          ),
        }))
      },

      deleteAnnotation: async (annotationId) => {
        await apiClient.deleteAnnotation(annotationId)
        set((state) => ({
          annotations: state.annotations.filter((a) => a.id !== annotationId),
        }))
      },

      addReply: async (annotationId, content) => {
        const { user } = get()
        const created = await apiClient.createReply(annotationId, content)
        const normReply = {
          id: created.id,
          authorId: created.userId || user?.id,
          authorName: created.user?.name || user?.name || 'Member',
          createdAt: 'Just now',
          content: created.content,
        }
        set((state) => ({
          annotations: state.annotations.map((ann) =>
            ann.id === annotationId &&
            !ann.replies.some((r) => r.id === normReply.id)
              ? { ...ann, replies: [...ann.replies, normReply] }
              : ann
          ),
        }))
        return normReply
      },

      deleteReply: async (annotationId, replyId) => {
        await apiClient.deleteReply(replyId)
        set((state) => ({
          annotations: state.annotations.map((ann) =>
            ann.id === annotationId
              ? {
                  ...ann,
                  replies: ann.replies.filter((r) => r.id !== replyId),
                }
              : ann
          ),
        }))
      },

      addClip: async ({ recordingId, title, startTime, endTime, notes }) => {
        const { mode, recordings } = get()
        const rec = recordings.find((r) => r.id === recordingId)
        const created = await apiClient.createClip(recordingId, {
          title,
          description: notes || '',
          startTime,
          endTime,
          visibility: 'PUBLIC',
        })
        const norm = normalizeClip(created, rec?.mode || mode, rec?.title)
        set((state) => ({
          clips: state.clips.some((c) => c.id === norm.id)
            ? state.clips
            : [norm, ...state.clips],
        }))
        return norm
      },

      deleteClip: async (clipId) => {
        await apiClient.deleteClip(clipId)
        set((state) => ({
          clips: state.clips.filter((c) => c.id !== clipId),
        }))
      },

      addChapter: async ({ episodeId, title, startTime }) => {
        const chapter = await apiClient.createChapter(episodeId, {
          title,
          startTime,
        })
        set((state) => ({
          recordings: state.recordings.map((r) =>
            r.id === episodeId
              ? {
                  ...r,
                  chapters: [...(r.chapters || []), chapter].sort(
                    (a, b) => a.startTime - b.startTime
                  ),
                }
              : r
          ),
        }))
        return chapter
      },

      deleteChapter: async (episodeId, chapterId) => {
        await apiClient.deleteChapter(chapterId)
        set((state) => ({
          recordings: state.recordings.map((r) =>
            r.id === episodeId
              ? {
                  ...r,
                  chapters: (r.chapters || []).filter((c) => c.id !== chapterId),
                }
              : r
          ),
        }))
      },

      addPlaylist: async ({
        title,
        description,
        rssUrl = '',
        recordingIds = [],
      }) => {
        const { activeWorkspaceId, mode } = get()
        if (!activeWorkspaceId) {
          throw new Error('No active workspace selected.')
        }
        const pl = await apiClient.createPlaylist(activeWorkspaceId, {
          title,
          description,
          rssUrl: rssUrl || null,
          episodeIds: recordingIds,
        })
        const norm = {
          id: pl.id,
          mode,
          title: pl.title,
          description: pl.description || '',
          rssUrl: pl.rssUrl || '',
          recordingIds: (pl.episodes || []).map((pe) => pe.episodeId),
          updatedAt: 'Just now',
        }
        set((state) => ({
          playlists: [norm, ...state.playlists],
        }))
        return norm
      },

      reorderPlaylistRecordings: async (playlistId, recordingIds) => {
        await apiClient.reorderPlaylist(playlistId, recordingIds)
        set((state) => ({
          playlists: state.playlists.map((pl) =>
            pl.id === playlistId
              ? { ...pl, recordingIds, updatedAt: 'Just now' }
              : pl
          ),
        }))
      },

      deletePlaylist: async (playlistId) => {
        await apiClient.deletePlaylist(playlistId)
        set((state) => ({
          playlists: state.playlists.filter((pl) => pl.id !== playlistId),
        }))
      },

      inviteMember: async ({ email, role }) => {
        const { activeWorkspaceId, mode } = get()
        if (!activeWorkspaceId) {
          throw new Error('No active workspace selected.')
        }
        const member = await apiClient.addWorkspaceMember(activeWorkspaceId, {
          email,
          role: role.toUpperCase(),
        })
        const norm = {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          role: member.role,
          modes: [mode],
          status: 'Active',
          avatarColor: member.user.avatarColor || '#3F6A58',
        }
        set((state) => ({
          members: state.members.some((m) => m.id === norm.id)
            ? state.members.map((m) => (m.id === norm.id ? norm : m))
            : [...state.members, norm],
        }))
        return norm
      },

      removeMember: async (memberId) => {
        const { activeWorkspaceId } = get()
        if (!activeWorkspaceId) throw new Error('No active workspace selected.')
        await apiClient.removeWorkspaceMember(activeWorkspaceId, memberId)
        set((state) => ({
          members: state.members.filter((m) => m.id !== memberId),
        }))
      },

      createInvitation: async ({ role, expiresInHours }) => {
        const { activeWorkspaceId } = get()
        if (!activeWorkspaceId) throw new Error('No active workspace selected.')
        const res = await apiClient.createInvitation(activeWorkspaceId, {
          role,
          expiresInHours,
        })
        set((state) => ({
          invitations: [res.invitation, ...state.invitations],
        }))
        return res
      },

      revokeInvitation: async (invitationId) => {
        const { activeWorkspaceId } = get()
        if (!activeWorkspaceId) throw new Error('No active workspace selected.')
        await apiClient.revokeInvitation(activeWorkspaceId, invitationId)
        set((state) => ({
          invitations: state.invitations.filter((i) => i.id !== invitationId),
        }))
      },

      applySocketMemberJoined: (member) => {
        if (!member?.user) return
        const mode = get().mode
        const norm = {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          role: member.role,
          modes: [mode],
          status: 'Active',
          avatarColor: member.user.avatarColor || '#3F6A58',
        }
        set((state) => ({
          members: state.members.some((m) => m.id === norm.id)
            ? state.members.map((m) => (m.id === norm.id ? norm : m))
            : [...state.members, norm],
        }))
      },

      applySocketMemberRemoved: (userId) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== userId),
        }))
      },

      updateProfile: async (updates) => {
        const { user } = await apiClient.updateProfile(updates)
        set({ user })
      },

      updateWorkspaceSettings: async (updates) => {
        const { activeWorkspaceId, mode } = get()
        if (activeWorkspaceId) {
          const nextName =
            mode === 'study' ? updates.studyName : updates.creatorName
          if (nextName) {
            await apiClient.updateWorkspace(activeWorkspaceId, { name: nextName })
          }
        }
        set((state) => ({
          workspaceSettings: { ...state.workspaceSettings, ...updates },
        }))
      },

      applySocketAnnotationCreated: (ann) => {
        const mode = get().mode
        const norm = normalizeAnnotation(ann, mode)
        set((state) => ({
          annotations: state.annotations.some((a) => a.id === norm.id)
            ? state.annotations
            : [norm, ...state.annotations],
        }))
      },

      applySocketAnnotationUpdated: (ann) => {
        const mode = get().mode
        const norm = normalizeAnnotation(ann, mode)
        set((state) => ({
          annotations: state.annotations.map((a) =>
            a.id === norm.id ? norm : a
          ),
        }))
      },

      applySocketAnnotationDeleted: (annotationId) => {
        set((state) => ({
          annotations: state.annotations.filter((a) => a.id !== annotationId),
        }))
      },

      applySocketReplyCreated: ({ annotationId, reply }) => {
        const normReply = {
          id: reply.id,
          authorName: reply.user?.name || 'Member',
          createdAt: formatRelativeTime(reply.createdAt),
          content: reply.content,
        }
        set((state) => ({
          annotations: state.annotations.map((ann) =>
            ann.id === annotationId &&
            !ann.replies.some((r) => r.id === normReply.id)
              ? { ...ann, replies: [...ann.replies, normReply] }
              : ann
          ),
        }))
      },

      applySocketClipCreated: (clip) => {
        const mode = get().mode
        const norm = normalizeClip(clip, mode)
        set((state) => ({
          clips: state.clips.some((c) => c.id === norm.id)
            ? state.clips
            : [norm, ...state.clips],
        }))
      },

      applySocketReplyDeleted: ({ annotationId, replyId }) => {
        set((state) => ({
          annotations: state.annotations.map((ann) =>
            ann.id === annotationId
              ? {
                  ...ann,
                  replies: ann.replies.filter((r) => r.id !== replyId),
                }
              : ann
          ),
        }))
      },

      applySocketClipDeleted: (clipId) => {
        set((state) => ({
          clips: state.clips.filter((c) => c.id !== clipId),
        }))
      },

      completeHandoff: async (code) => {
        const existingToken = get().token
        if (existingToken) {
          try {
            setAuthToken(existingToken)
            const { user } = await apiClient.getMe()
            set({ user, isAuthenticated: true })
            connectSocket(existingToken)
            return { reused: true }
          } catch {
            // Existing web token is invalid/expired; fall through to exchange handoff code
          }
        }
        const { user, token } = await apiClient.exchangeHandoff(code)
        setAuthToken(token)
        connectSocket(token)
        set({ user, token, isAuthenticated: true })
        await get().loadWorkspaces().catch(() => {})
        return { reused: false }
      },
    }),
    {
      name: 'echospace-store-v2',
      onRehydrateStorage: () => (state) => {
        setOnUnauthorized(() => {
          useEchoStore.getState().logout()
        })
        if (state?.token) {
          setAuthToken(state.token)
          connectSocket(state.token)
        }
      },
    }
  )
)
