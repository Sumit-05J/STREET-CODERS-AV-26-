import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { io } from 'socket.io-client'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8080/api'
const SOCKET_URL = process.env.E2E_SOCKET_URL || 'http://localhost:8080'

async function api(method, endpoint, { token, body, isForm } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body && !isForm) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  })

  const contentType = res.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await res.json()
    : await res.text()

  return { status: res.status, headers: res.headers, data }
}

function createFakeMp3Blob() {
  // Valid ID3v2 header + MPEG1 Layer3 frame sync bytes
  const header = Buffer.from([
    0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0xff, 0xfb, 0x90, 0x64,
  ])
  const padding = Buffer.alloc(2048, 0x00)
  return new Blob([Buffer.concat([header, padding])], { type: 'audio/mpeg' })
}

async function run() {
  console.log('1. Registering two users...')
  const suffix = Date.now()
  const u1Email = `study.owner.${suffix}@echospace.test`
  const u2Email = `study.member.${suffix}@echospace.test`

  const reg1 = await api('POST', '/auth/register', {
    body: { name: 'Aarav Owner', email: u1Email, password: 'Password123!' },
  })
  assert.equal(reg1.status, 201, `reg1 failed: ${JSON.stringify(reg1.data)}`)

  const reg2 = await api('POST', '/auth/register', {
    body: { name: 'Elena Member', email: u2Email, password: 'Password123!' },
  })
  assert.equal(reg2.status, 201, `reg2 failed: ${JSON.stringify(reg2.data)}`)

  console.log('2. Logging in both users...')
  const login1 = await api('POST', '/auth/login', {
    body: { email: u1Email, password: 'Password123!' },
  })
  assert.equal(login1.status, 200)
  const token1 = login1.data.token

  const login2 = await api('POST', '/auth/login', {
    body: { email: u2Email, password: 'Password123!' },
  })
  assert.equal(login2.status, 200)
  const token2 = login2.data.token

  const me1 = await api('GET', '/auth/me', { token: token1 })
  assert.equal(me1.status, 200)
  assert.equal(me1.data.user.email, u1Email)

  console.log('3. Creating Study workspace...')
  const studyWsRes = await api('POST', '/workspaces', {
    token: token1,
    body: { name: 'CS-402 Distributed Systems', mode: 'STUDY' },
  })
  assert.equal(studyWsRes.status, 201)
  const studyWsId = studyWsRes.data.workspace.id

  console.log('4. Adding second user as MEMBER...')
  const addMemberRes = await api('POST', `/workspaces/${studyWsId}/members`, {
    token: token1,
    body: { email: u2Email, role: 'MEMBER' },
  })
  assert.equal(addMemberRes.status, 201)

  // Verify unauthorized user check / member access
  const wsCheck2 = await api('GET', `/workspaces/${studyWsId}`, {
    token: token2,
  })
  assert.equal(wsCheck2.status, 200)
  assert.equal(wsCheck2.data.workspace.myRole, 'MEMBER')

  console.log('5. Uploading MP3 to Study workspace...')
  const mp3Form = new FormData()
  mp3Form.append('audio', createFakeMp3Blob(), 'raft-lecture.mp3')
  mp3Form.append('workspaceId', studyWsId)
  mp3Form.append('title', 'Raft Consensus Lecture')
  mp3Form.append('description', 'Leader election and log replication')
  mp3Form.append('duration', '42')
  mp3Form.append('tags', 'Systems,Raft')

  const uploadRes = await api('POST', '/episodes/upload', {
    token: token1,
    body: mp3Form,
    isForm: true,
  })
  assert.equal(uploadRes.status, 201, `upload failed: ${JSON.stringify(uploadRes.data)}`)
  const studyEpId = uploadRes.data.episode.id

  console.log('6. Streaming audio with HTTP Range request (206 Partial Content)...')
  const rangeRes = await fetch(`${BASE_URL}/episodes/${studyEpId}/audio?token=${encodeURIComponent(token2)}`, {
    headers: {
      Origin: 'http://localhost:5173',
      Range: 'bytes=0-511',
    },
  })
  assert.equal(rangeRes.status, 206)
  assert.equal(rangeRes.headers.get('accept-ranges'), 'bytes')
  assert.ok(rangeRes.headers.get('content-range')?.startsWith('bytes 0-511/'))
  assert.ok(rangeRes.headers.get('content-type')?.startsWith('audio/'))
  assert.equal(rangeRes.headers.get('access-control-allow-origin'), 'http://localhost:5173')

  console.log('   Connecting Socket.IO for user2 in episode room...')
  const socket2 = io(SOCKET_URL, { auth: { token: token2 } })
  await new Promise((resolve, reject) => {
    socket2.on('connect', () => {
      socket2.emit('episode:join', { episodeId: studyEpId }, (ack) => {
        if (ack?.ok) resolve()
        else reject(new Error(ack?.error || 'Failed to join room'))
      })
    })
    socket2.on('connect_error', reject)
  })

  const socket1 = io(SOCKET_URL, { auth: { token: token1 } })
  await new Promise((resolve, reject) => {
    socket1.on('connect', resolve)
    socket1.on('connect_error', reject)
  })

  const annCreatedPromise = new Promise((resolve) => {
    socket2.once('annotation:created', resolve)
  })
  const notifPromise = new Promise((resolve) => {
    socket1.once('notification:created', resolve)
  })

  console.log('7. Adding QUESTION & NOTE annotations (and verifying mode validation)...')
  const invalidCatRes = await api('POST', `/episodes/${studyEpId}/annotations`, {
    token: token1,
    body: { timestamp: 14, category: 'FEEDBACK', content: 'Should fail in study mode' },
  })
  assert.equal(invalidCatRes.status, 400)

  const annRes = await api('POST', `/episodes/${studyEpId}/annotations`, {
    token: token1,
    body: {
      timestamp: 14,
      category: 'QUESTION',
      content: 'Does Raft increment currentTerm on split votes?',
    },
  })
  assert.equal(annRes.status, 201)
  const annId = annRes.data.annotation.id

  const noteRes = await api('POST', `/episodes/${studyEpId}/annotations`, {
    token: token1,
    body: {
      timestamp: 20,
      category: 'NOTE',
      content: 'Unified Study Note at 0:20.',
    },
  })
  assert.equal(noteRes.status, 201)
  assert.equal(noteRes.data.annotation.category, 'NOTE')

  const socketAnnEvent = await annCreatedPromise
  assert.equal(socketAnnEvent.annotation.id, annId)

  console.log('8. Replying using second user & verifying real-time + persistent notification...')
  const replyRes = await api('POST', `/annotations/${annId}/replies`, {
    token: token2,
    body: { content: 'Yes, currentTerm increments before RequestVote RPCs.' },
  })
  assert.equal(replyRes.status, 201)

  const notifEvent = await notifPromise
  assert.equal(notifEvent.notification.annotationId, annId)

  // Self-reply must NOT create a notification
  const selfReplyRes = await api('POST', `/annotations/${annId}/replies`, {
    token: token1,
    body: { content: 'Thanks for clarifying!' },
  })
  assert.equal(selfReplyRes.status, 201)

  const notifsRes = await api('GET', '/notifications', { token: token1 })
  assert.equal(notifsRes.status, 200)
  assert.equal(notifsRes.data.unreadCount, 1)

  const markReadRes = await api('PATCH', `/notifications/${notifsRes.data.notifications[0].id}/read`, {
    token: token1,
  })
  assert.equal(markReadRes.status, 200)
  assert.equal(markReadRes.data.notification.isRead, true)

  socket1.disconnect()

  console.log('9. Resolving the question...')
  const resolveRes = await api('PATCH', `/annotations/${annId}`, {
    token: token1,
    body: { status: 'RESOLVED' },
  })
  assert.equal(resolveRes.status, 200)
  assert.equal(resolveRes.data.annotation.status, 'RESOLVED')

  console.log('10. Creating a revision clip...')
  const clipRes = await api('POST', `/episodes/${studyEpId}/clips`, {
    token: token1,
    body: {
      title: 'Split-Vote Term Increment',
      description: 'Key exam takeaway',
      startTime: 10,
      endTime: 25,
      visibility: 'PUBLIC',
    },
  })
  assert.equal(clipRes.status, 201)
  const shareToken = clipRes.data.clip.shareToken

  console.log('11. Opening public clip link & streaming clip audio...')
  const publicClipRes = await api('GET', `/clips/${shareToken}`)
  assert.equal(publicClipRes.status, 200)
  assert.equal(publicClipRes.data.clip.title, 'Split-Vote Term Increment')
  assert.equal(publicClipRes.data.clip.annotations.length, 2)

  const clipAudioRes = await fetch(`${BASE_URL}/clips/${shareToken}/audio`, {
    headers: { Range: 'bytes=0-255' },
  })
  assert.equal(clipAudioRes.status, 206)

  socket2.disconnect()

  console.log('12. Repeating workflow in CREATOR mode (FEEDBACK + CORRECTION + Chapters + Playlists + RSS)...')
  const creatorWsRes = await api('POST', '/workspaces', {
    token: token1,
    body: { name: 'EchoSpace Podcast Studio', mode: 'CREATOR' },
  })
  assert.equal(creatorWsRes.status, 201)
  const creatorWsId = creatorWsRes.data.workspace.id
  const showId = creatorWsRes.data.workspace.shows[0].id

  const epForm = new FormData()
  epForm.append('audio', createFakeMp3Blob(), 'ep48-rough-cut.mp3')
  epForm.append('workspaceId', creatorWsId)
  epForm.append('showId', showId)
  epForm.append('title', 'Ep. 48 — Audio-First Dev Tools')
  epForm.append('duration', '42')

  const creatorEpRes = await api('POST', '/episodes/upload', {
    token: token1,
    body: epForm,
    isForm: true,
  })
  assert.equal(creatorEpRes.status, 201)
  const creatorEpId = creatorEpRes.data.episode.id

  const fbRes = await api('POST', `/episodes/${creatorEpId}/annotations`, {
    token: token1,
    body: { timestamp: 8, category: 'FEEDBACK', content: 'Tighten cold open pacing.' },
  })
  assert.equal(fbRes.status, 201)

  const corrRes = await api('POST', `/episodes/${creatorEpId}/annotations`, {
    token: token1,
    body: { timestamp: 21, category: 'CORRECTION', content: 'Trim mic bump at 0:21.' },
  })
  assert.equal(corrRes.status, 201)

  const chRes = await api('POST', `/episodes/${creatorEpId}/chapters`, {
    token: token1,
    body: { title: 'Cold Open', startTime: 0 },
  })
  assert.equal(chRes.status, 201)

  const plRes = await api('POST', `/workspaces/${creatorWsId}/playlists`, {
    token: token1,
    body: { title: 'Season 2', episodeIds: [creatorEpId] },
  })
  assert.equal(plRes.status, 201)

  const rssRes = await api('GET', `/shows/${showId}/feed.xml`)
  assert.equal(rssRes.status, 200)
  assert.ok(rssRes.data.includes('<rss version="2.0"'))
  assert.ok(rssRes.data.includes('<enclosure '))
  assert.ok(rssRes.data.includes('Ep. 48 — Audio-First Dev Tools'))

  console.log('13. Testing Chrome Extension EXTERNAL_LINK workflow & health check...')
  const healthRes = await api('GET', '/health')
  assert.equal(healthRes.status, 200)
  assert.equal(healthRes.data.database, 'connected')

  const extRes = await api('POST', '/episodes/external', {
    token: token1,
    body: {
      workspaceId: studyWsId,
      title: 'MIT 6.824 Lecture 6: Raft',
      description: 'Captured from HTML5 <video>',
      sourceUrl: 'https://example.com/lectures/raft',
      duration: 3600,
    },
  })
  assert.equal(extRes.status, 201)
  assert.equal(extRes.data.episode.sourceType, 'EXTERNAL_LINK')

  const extAudioRes = await api('GET', `/episodes/${extRes.data.episode.id}/audio`, {
    token: token1,
  })
  assert.equal(extAudioRes.status, 400)

  const extAnnRes = await api('POST', `/episodes/${extRes.data.episode.id}/annotations`, {
    token: token1,
    body: {
      timestamp: 420,
      category: 'INSIGHT',
      content: 'Important Raft figure 2 invariant explanation.',
    },
  })
  assert.equal(extAnnRes.status, 201)

  console.log('14. Testing edit/delete & unauthorized RBAC enforcement...')
  // User 2 (MEMBER) cannot delete User 1's annotation (403)
  const unauthDelAnn = await api('DELETE', `/annotations/${extAnnRes.data.annotation.id}`, {
    token: token2,
  })
  assert.equal(unauthDelAnn.status, 403)

  // User 1 (OWNER) can edit and delete their annotation
  const editAnnRes = await api('PATCH', `/annotations/${extAnnRes.data.annotation.id}`, {
    token: token1,
    body: { content: 'Updated Raft invariant note.' },
  })
  assert.equal(editAnnRes.status, 200)
  assert.equal(editAnnRes.data.annotation.content, 'Updated Raft invariant note.')

  const delAnnRes = await api('DELETE', `/annotations/${extAnnRes.data.annotation.id}`, {
    token: token1,
  })
  assert.equal(delAnnRes.status, 204)

  // Delete reply, clip, chapter, playlist
  const delReplyRes = await api('DELETE', `/replies/${replyRes.data.reply.id}`, {
    token: token2,
  })
  assert.equal(delReplyRes.status, 204)

  const delClipRes = await api('DELETE', `/clips/${clipRes.data.clip.id}`, {
    token: token1,
  })
  assert.equal(delClipRes.status, 204)

  const delChapterRes = await api('DELETE', `/chapters/${chRes.data.chapter.id}`, {
    token: token1,
  })
  assert.equal(delChapterRes.status, 204)

  const delPlaylistRes = await api('DELETE', `/playlists/${plRes.data.playlist.id}`, {
    token: token1,
  })
  assert.equal(delPlaylistRes.status, 204)

  console.log('15. Testing SSRF blocking & secure recording deletion...')
  const ssrfLocal = await api('POST', '/imports', {
    token: token1,
    body: { workspaceId: studyWsId, url: 'http://127.0.0.1:8080/secret.mp3' },
  })
  assert.equal(ssrfLocal.status, 400)

  const ssrfMeta = await api('POST', '/imports', {
    token: token1,
    body: { workspaceId: studyWsId, url: 'http://169.254.169.254/latest/meta-data/' },
  })
  assert.equal(ssrfMeta.status, 400)

  // Unauthorized user2 cannot delete user1's episode
  const unauthDelEp = await api('DELETE', `/episodes/${studyEpId}`, { token: token2 })
  assert.equal(unauthDelEp.status, 403)

  // Authorized owner can delete episode and physical file
  const delEpRes = await api('DELETE', `/episodes/${studyEpId}`, { token: token1 })
  assert.equal(delEpRes.status, 204)

  const getDeletedEp = await api('GET', `/episodes/${studyEpId}`, { token: token1 })
  assert.equal(getDeletedEp.status, 404)

  console.log('16. Testing multi-user Workspace Invitations, Join Link/Code, Socket rooms & RBAC...')
  const collabWsRes = await api('POST', '/workspaces', {
    token: token1,
    body: {
      name: 'Hackathon Demo Collab',
      description: 'Multi-user audio review room',
      mode: 'STUDY',
    },
  })
  assert.equal(collabWsRes.status, 201)
  const collabWsId = collabWsRes.data.workspace.id
  assert.equal(collabWsRes.data.workspace.myRole, 'OWNER')

  // Unauthorized user2 cannot access collabWsId before joining
  const unauthWs = await api('GET', `/workspaces/${collabWsId}`, { token: token2 })
  assert.equal(unauthWs.status, 403)

  // User1 connects to workspace:<collabWsId> Socket.IO room
  const wsSocket1 = io(SOCKET_URL, { auth: { token: token1 } })
  await new Promise((resolve, reject) => {
    wsSocket1.on('connect', () => {
      wsSocket1.emit('workspace:join', { workspaceId: collabWsId }, (ack) => {
        if (ack?.ok) resolve()
        else reject(new Error(ack?.error || 'Failed to join workspace room'))
      })
    })
    wsSocket1.on('connect_error', reject)
  })
  const memberJoinedPromise = new Promise((resolve) => {
    wsSocket1.once('workspace:member_joined', resolve)
  })

  // User1 generates invitation link & code
  const invRes = await api('POST', `/workspaces/${collabWsId}/invitations`, {
    token: token1,
    body: { role: 'MEMBER', expiresInHours: 24 },
  })
  assert.equal(invRes.status, 201)
  const { inviteToken, invitation } = invRes.data

  // Preview invitation
  const previewRes = await api('GET', `/invitations/${inviteToken}`)
  assert.equal(previewRes.status, 200)
  assert.equal(previewRes.data.invitation.workspace.name, 'Hackathon Demo Collab')

  // User2 accepts invitation via link token
  const acceptRes = await api('POST', `/invitations/${inviteToken}/accept`, {
    token: token2,
  })
  assert.equal(acceptRes.status, 200)
  assert.equal(acceptRes.data.alreadyMember, false)
  assert.equal(acceptRes.data.role, 'MEMBER')

  const joinedEvent = await memberJoinedPromise
  assert.equal(joinedEvent.member.user.email, u2Email)
  wsSocket1.disconnect()

  // Accepting again must not duplicate membership
  const acceptAgain = await api('POST', `/invitations/${inviteToken}/accept`, {
    token: token2,
  })
  assert.equal(acceptAgain.status, 200)
  assert.equal(acceptAgain.data.alreadyMember, true)

  // User2 (MEMBER) cannot create invitations or delete workspace
  const memberCreateInv = await api('POST', `/workspaces/${collabWsId}/invitations`, {
    token: token2,
    body: { role: 'MEMBER' },
  })
  assert.equal(memberCreateInv.status, 403)

  const memberDelWs = await api('DELETE', `/workspaces/${collabWsId}`, {
    token: token2,
  })
  assert.equal(memberDelWs.status, 403)

  // Revoke invitation & verify 410 on preview/join
  const revokeRes = await api(
    'DELETE',
    `/workspaces/${collabWsId}/invitations/${invitation.id}`,
    { token: token1 }
  )
  assert.equal(revokeRes.status, 204)

  const revokedPreview = await api('GET', `/invitations/${inviteToken}`)
  assert.equal(revokedPreview.status, 410)

  const invalidJoin = await api('POST', '/workspaces/join', {
    token: token2,
    body: { code: 'ECHO-INVALID1' },
  })
  assert.equal(invalidJoin.status, 404)

  // User1 removes User2 & verifies User2 loses access
  const membersRes = await api('GET', `/workspaces/${collabWsId}/members`, {
    token: token1,
  })
  const u2Member = membersRes.data.members.find((m) => m.user.email === u2Email)
  assert.ok(u2Member)

  const removeRes = await api(
    'DELETE',
    `/workspaces/${collabWsId}/members/${u2Member.userId}`,
    { token: token1 }
  )
  assert.equal(removeRes.status, 204)

  const afterRemoveWs = await api('GET', `/workspaces/${collabWsId}`, { token: token2 })
  assert.equal(afterRemoveWs.status, 403)

  // Upload an MP3 into collabWsId and verify workspace deletion removes it from disk
  const collabUploadForm = new FormData()
  collabUploadForm.append('audio', createFakeMp3Blob(), 'collab-delete-check.mp3')
  collabUploadForm.append('workspaceId', collabWsId)
  collabUploadForm.append('title', 'Workspace Delete Cleanup Check')
  const collabEpRes = await api('POST', '/episodes/upload', {
    token: token1,
    body: collabUploadForm,
    isForm: true,
  })
  assert.equal(collabEpRes.status, 201)
  const collabAudioKey = collabEpRes.data.episode.audioKey
  const collabAudioPath = path.resolve(process.cwd(), 'backend', 'uploads', collabAudioKey)
  assert.ok(fs.existsSync(collabAudioPath), `Expected uploaded file at ${collabAudioPath}`)

  // Cleanup workspace (OWNER only) & verify physical audio cleanup
  const delCollabWs = await api('DELETE', `/workspaces/${collabWsId}`, { token: token1 })
  assert.equal(delCollabWs.status, 204)

  const afterDelWs = await api('GET', `/workspaces/${collabWsId}`, { token: token1 })
  assert.equal(afterDelWs.status, 403)
  assert.ok(!fs.existsSync(collabAudioPath), `Expected uploaded file to be removed: ${collabAudioPath}`)

  // 17. Test Bookmarks, Canonical URL Lookup & Video Upload ImportJob
  console.log('17. Testing Bookmarks, Canonical URL Lookup & Video ImportJob...')
  const ytCreate = await api('POST', '/episodes/external', {
    token: token1,
    body: {
      workspaceId: studyWsId,
      title: 'Canonical YouTube Test',
      sourceUrl: 'https://youtu.be/dQw4w9WgXcQ?utm_source=share',
      duration: 60,
    },
  })
  assert.equal(ytCreate.status, 201)
  const ytEpId = ytCreate.data.episode.id

  const bmCreate = await api('POST', `/episodes/${ytEpId}/bookmarks`, {
    token: token1,
    body: { timestamp: 12, label: 'Key Raft point' },
  })
  assert.equal(bmCreate.status, 201)
  const bmList = await api('GET', `/episodes/${ytEpId}/bookmarks`, { token: token1 })
  assert.equal(bmList.status, 200)
  assert.ok(bmList.data.bookmarks.some((b) => b.id === bmCreate.data.bookmark.id))
  const bmDel = await api('DELETE', `/bookmarks/${bmCreate.data.bookmark.id}`, { token: token1 })
  assert.equal(bmDel.status, 204)

  const ytLookup = await api(
    'GET',
    `/episodes/lookup?workspaceId=${studyWsId}&url=${encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}`,
    { token: token1 }
  )
  assert.equal(ytLookup.status, 200)
  assert.equal(ytLookup.data.episode?.id, ytEpId)

  const badVideoForm = new FormData()
  badVideoForm.append('video', new Blob(['not video'], { type: 'text/plain' }), 'bad.txt')
  badVideoForm.append('workspaceId', studyWsId)
  const badVideoRes = await api('POST', '/imports/video', {
    token: token1,
    body: badVideoForm,
    isForm: true,
  })
  assert.equal(badVideoRes.status, 400)

  const mp4Form = new FormData()
  mp4Form.append('video', new Blob([Buffer.from('00000018667479706d703432', 'hex')], { type: 'video/mp4' }), 'sample.mp4')
  mp4Form.append('workspaceId', studyWsId)
  mp4Form.append('title', 'Sample Video Extraction')
  const mp4Res = await api('POST', '/imports/video', {
    token: token1,
    body: mp4Form,
    isForm: true,
  })
  assert.equal(mp4Res.status, 202)
  assert.equal(mp4Res.data.job.sourceKind, 'VIDEO_UPLOAD')

  console.log('\nALL 17 END-TO-END WORKFLOW CHECKS PASSED!')
}

run().catch((err) => {
  console.error('E2E FAILED:', err)
  process.exit(1)
})
