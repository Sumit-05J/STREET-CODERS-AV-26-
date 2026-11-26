import { io } from 'socket.io-client'

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080'

let socket = null

export function connectSocket(token) {
  if (!token) return null
  if (socket && socket.connected) return socket

  if (socket) {
    socket.disconnect()
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
  })

  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function joinEpisodeRoom(episodeId) {
  if (!socket || !episodeId) return
  socket.emit('episode:join', { episodeId })
}

export function leaveEpisodeRoom(episodeId) {
  if (!socket || !episodeId) return
  socket.emit('episode:leave', { episodeId })
}

export function joinWorkspaceRoom(workspaceId) {
  if (!socket || !workspaceId) return
  socket.emit('workspace:join', { workspaceId })
}

export function leaveWorkspaceRoom(workspaceId) {
  if (!socket || !workspaceId) return
  socket.emit('workspace:leave', { workspaceId })
}
