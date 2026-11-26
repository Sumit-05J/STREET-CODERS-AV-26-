import axios from 'axios'

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const http = axios.create({
  baseURL: API_BASE_URL,
})

let authToken = null
let onUnauthorizedHandler = null

export function setAuthToken(token) {
  authToken = token || null
}

export function setOnUnauthorized(handler) {
  onUnauthorizedHandler = typeof handler === 'function' ? handler : null
}

export function getAuthToken() {
  return authToken
}

http.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = String(err.config?.url || '')
    const isAuthAttempt =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/handoff/exchange')
    if (err.response?.status === 401 && authToken && !isAuthAttempt) {
      onUnauthorizedHandler?.()
    }
    return Promise.reject(err)
  }
)

export const apiClient = {
  async healthCheck() {
    const { data } = await http.get('/health')
    return data
  },

  // Auth
  async register({ name, email, password }) {
    const { data } = await http.post('/auth/register', { name, email, password })
    return data
  },

  async login({ email, password }) {
    const { data } = await http.post('/auth/login', { email, password })
    return data
  },

  async getMe() {
    const { data } = await http.get('/auth/me')
    return data
  },

  async exchangeHandoff(code) {
    const { data } = await http.post('/auth/handoff/exchange', { code })
    return data
  },

  async updateProfile(updates) {
    const { data } = await http.patch('/users/me', updates)
    return data
  },

  // Workspaces
  async listWorkspaces() {
    const { data } = await http.get('/workspaces')
    return data.workspaces
  },

  async createWorkspace({ name, description = '', mode }) {
    const { data } = await http.post('/workspaces', { name, description, mode })
    return data.workspace
  },

  async getWorkspace(id) {
    const { data } = await http.get(`/workspaces/${id}`)
    return data.workspace
  },

  async updateWorkspace(id, updates) {
    const { data } = await http.patch(`/workspaces/${id}`, updates)
    return data.workspace
  },

  async deleteWorkspace(id) {
    await http.delete(`/workspaces/${id}`)
  },

  async addWorkspaceMember(workspaceId, { email, role }) {
    const { data } = await http.post(`/workspaces/${workspaceId}/members`, {
      email,
      role,
    })
    return data.member
  },

  async removeWorkspaceMember(workspaceId, memberId) {
    await http.delete(`/workspaces/${workspaceId}/members/${memberId}`)
  },

  async createInvitation(workspaceId, { role, expiresInHours }) {
    const { data } = await http.post(`/workspaces/${workspaceId}/invitations`, {
      role,
      expiresInHours,
    })
    return data
  },

  async listInvitations(workspaceId) {
    const { data } = await http.get(`/workspaces/${workspaceId}/invitations`)
    return data.invitations
  },

  async revokeInvitation(workspaceId, invitationId) {
    await http.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`)
  },

  async getInvitation(token) {
    const { data } = await http.get(`/invitations/${encodeURIComponent(token)}`)
    return data.invitation
  },

  async acceptInvitation(token) {
    const { data } = await http.post(
      `/invitations/${encodeURIComponent(token)}/accept`
    )
    return data
  },

  async joinWorkspaceByCode(code) {
    const { data } = await http.post('/workspaces/join', { code })
    return data
  },

  // Episodes & Audio
  async uploadEpisode(formData, onUploadProgress) {
    const { data } = await http.post('/episodes/upload', formData, {
      onUploadProgress: (evt) => {
        if (evt.total && onUploadProgress) {
          onUploadProgress(Math.round((evt.loaded * 100) / evt.total))
        }
      },
    })
    return data.episode
  },

  async createExternalEpisode(payload) {
    const { data } = await http.post('/episodes/external', payload)
    return data.episode
  },

  async getEpisode(id) {
    const { data } = await http.get(`/episodes/${id}`)
    return data
  },

  async deleteEpisode(id) {
    await http.delete(`/episodes/${id}`)
  },

  getEpisodeAudioUrl(episodeId, explicitToken = null) {
    const base = `${API_BASE_URL}/episodes/${episodeId}/audio`
    const t = explicitToken || authToken
    return t ? `${base}?token=${encodeURIComponent(t)}` : base
  },

  // Annotations
  async listAnnotations(episodeId) {
    const { data } = await http.get(`/episodes/${episodeId}/annotations`)
    return data.annotations
  },

  async createAnnotation(episodeId, payload) {
    const { data } = await http.post(
      `/episodes/${episodeId}/annotations`,
      payload
    )
    return data.annotation
  },

  async updateAnnotation(annotationId, payload) {
    const { data } = await http.patch(`/annotations/${annotationId}`, payload)
    return data.annotation
  },

  async deleteAnnotation(annotationId) {
    await http.delete(`/annotations/${annotationId}`)
  },

  // Replies
  async listReplies(annotationId) {
    const { data } = await http.get(`/annotations/${annotationId}/replies`)
    return data.replies
  },

  async createReply(annotationId, content) {
    const { data } = await http.post(`/annotations/${annotationId}/replies`, {
      content,
    })
    return data.reply
  },

  async deleteReply(replyId) {
    await http.delete(`/replies/${replyId}`)
  },

  // Clips
  async createClip(episodeId, payload) {
    const { data } = await http.post(`/episodes/${episodeId}/clips`, payload)
    return data.clip
  },

  async deleteClip(clipId) {
    await http.delete(`/clips/${clipId}`)
  },

  async getClipByToken(token) {
    const { data } = await http.get(`/clips/${token}`)
    return data.clip
  },

  getClipAudioUrl(token, explicitToken = null) {
    const base = `${API_BASE_URL}/clips/${token}/audio`
    const t = explicitToken || authToken
    return t ? `${base}?token=${encodeURIComponent(t)}` : base
  },

  // Chapters
  async createChapter(episodeId, payload) {
    const { data } = await http.post(`/episodes/${episodeId}/chapters`, payload)
    return data.chapter
  },

  async updateChapter(chapterId, payload) {
    const { data } = await http.patch(`/chapters/${chapterId}`, payload)
    return data.chapter
  },

  async deleteChapter(chapterId) {
    await http.delete(`/chapters/${chapterId}`)
  },

  // Playlists
  async listPlaylists(workspaceId) {
    const { data } = await http.get(`/workspaces/${workspaceId}/playlists`)
    return data.playlists
  },

  async createPlaylist(workspaceId, payload) {
    const { data } = await http.post(
      `/workspaces/${workspaceId}/playlists`,
      payload
    )
    return data.playlist
  },

  async reorderPlaylist(playlistId, episodeIds) {
    const { data } = await http.patch(`/playlists/${playlistId}/reorder`, {
      episodeIds,
    })
    return data.playlist
  },

  async deletePlaylist(playlistId) {
    await http.delete(`/playlists/${playlistId}`)
  },

  getShowRssUrl(showId) {
    return `${API_BASE_URL}/shows/${showId}/feed.xml`
  },

  // Notifications
  async listNotifications() {
    const { data } = await http.get('/notifications')
    return data
  },

  async markNotificationRead(id) {
    const { data } = await http.patch(`/notifications/${id}/read`)
    return data.notification
  },

  async markAllNotificationsRead() {
    await http.post('/notifications/read-all')
  },

  // Imports (Direct Audio & Podcast RSS)
  async previewRss(url) {
    const { data } = await http.post('/imports/rss/preview', { url })
    return data.feed
  },

  async createImport(payload) {
    const { data } = await http.post('/imports', payload)
    return data
  },

  async importRssEpisode(payload) {
    const { data } = await http.post('/imports/rss/episode', payload)
    return data
  },

  async getImportJob(id) {
    const { data } = await http.get(`/imports/${id}`)
    return data.job
  },

  async retryImportJob(id) {
    const { data } = await http.post(`/imports/${id}/retry`)
    return data.job
  },

  async cancelImportJob(id) {
    const { data } = await http.post(`/imports/${id}/cancel`)
    return data.job
  },

  async uploadVideoImport({ workspaceId, file, title, description, tags, duration, onProgress }) {
    const form = new FormData()
    form.append('video', file)
    form.append('workspaceId', workspaceId)
    if (title) form.append('title', title)
    if (description) form.append('description', description)
    if (tags) form.append('tags', tags)
    if (duration) form.append('duration', String(duration))

    const { data } = await http.post('/imports/video', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (evt.total && onProgress) {
          onProgress(Math.round((evt.loaded / evt.total) * 100))
        }
      },
    })
    return data
  },

  // Bookmarks
  async listBookmarks(episodeId) {
    const { data } = await http.get(`/episodes/${episodeId}/bookmarks`)
    return data.bookmarks
  },

  async createBookmark(episodeId, payload) {
    const { data } = await http.post(`/episodes/${episodeId}/bookmarks`, payload)
    return data.bookmark
  },

  async deleteBookmark(bookmarkId) {
    await http.delete(`/bookmarks/${bookmarkId}`)
  },
}
