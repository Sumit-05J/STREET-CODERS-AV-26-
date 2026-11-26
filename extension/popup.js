const MODE_CATEGORIES = {
  STUDY: [
    { id: 'QUESTION', label: 'Question' },
    { id: 'NOTE', label: 'Note' },
  ],
  CREATOR: [
    { id: 'FEEDBACK', label: 'Feedback' },
    { id: 'CORRECTION', label: 'Correction' },
    { id: 'SUGGESTION', label: 'Suggestion' },
  ],
}

const DIRECT_AUDIO_RE = /\.(mp3|wav|ogg|m4a|aac|flac|webm)(\?.*)?$/i

let state = {
  apiBaseUrl: 'http://localhost:8080/api',
  webAppUrl: 'http://localhost:5173',
  token: null,
  user: null,
  mode: 'STUDY',
  workspaces: [],
  activeWorkspaceId: '',
  workspaceEpisodes: [],
  selectedEpisodeId: '__TAB__',
  matchedEpisode: null,
  media: null,
}

let wsInstance = null
let audioElement = null
let currentPlayerTime = 0

const el = (id) => document.getElementById(id)

function formatSec(sec) {
  const s = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function destroyWaveform() {
  if (wsInstance) {
    try {
      wsInstance.destroy()
    } catch {
      // Ignore WaveSurfer cleanup errors
    }
    wsInstance = null
  }
  if (audioElement) {
    try {
      audioElement.pause()
      audioElement.removeAttribute('src')
      audioElement.load()
    } catch {
      // Ignore audio element cleanup errors
    }
    audioElement = null
  }
  currentPlayerTime = 0
  el('wf-play-btn').textContent = 'Play'
  el('wf-time').textContent = '0:00 / 0:00'
  el('waveform').innerHTML = ''
}

async function handleSessionExpired() {
  destroyWaveform()
  await chrome.storage.local.remove(['token', 'user'])
  state.token = null
  state.user = null
  showLoginView('Session expired. Please sign in again.')
}

async function apiFetch(endpoint, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (state.token) headers.Authorization = `Bearer ${state.token}`
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${state.apiBaseUrl}${endpoint}`, {
    ...options,
    headers,
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && state.token && !endpoint.startsWith('/auth/login')) {
    await handleSessionExpired()
    throw new Error('Session expired. Please sign in again.')
  }
  if (!res.ok) {
    throw new Error(data?.error?.message || `Request failed (${res.status})`)
  }
  return data
}

function renderCategories() {
  const cats = MODE_CATEGORIES[state.mode] || MODE_CATEGORIES.STUDY
  const select = el('category-select')
  select.innerHTML = cats
    .map((c) => `<option value="${c.id}">${c.label}</option>`)
    .join('')
}

function renderWorkspaces() {
  const select = el('workspace-select')
  const filtered = state.workspaces.filter((w) => w.mode === state.mode)
  const list = filtered.length > 0 ? filtered : state.workspaces

  if (list.length === 0) {
    select.innerHTML = '<option value="">No workspaces found</option>'
    state.activeWorkspaceId = ''
    el('open-workspace-link').href = `${state.webAppUrl}/workspaces`
    return
  }

  const stillValid = list.some((w) => w.id === state.activeWorkspaceId)
  if (!stillValid) {
    state.activeWorkspaceId = list[0].id
  }

  select.innerHTML = list
    .map(
      (w) =>
        `<option value="${w.id}" ${w.id === state.activeWorkspaceId ? 'selected' : ''}>${escapeHtml(w.name)} (${w.mode})</option>`
    )
    .join('')

  el('open-workspace-link').href = `${state.webAppUrl}/app/recordings`
}

function renderEpisodeOptions() {
  const select = el('episode-select')
  const options = ['<option value="__TAB__">Active Tab Media</option>']
  for (const ep of state.workspaceEpisodes) {
    options.push(
      `<option value="${ep.id}" ${ep.id === state.selectedEpisodeId ? 'selected' : ''}>${escapeHtml(ep.title)} (${ep.sourceType === 'UPLOAD' ? 'Audio' : 'Link'})</option>`
    )
  }
  select.innerHTML = options.join('')
  if (
    state.selectedEpisodeId !== '__TAB__' &&
    !state.workspaceEpisodes.some((e) => e.id === state.selectedEpisodeId)
  ) {
    state.selectedEpisodeId = '__TAB__'
    select.value = '__TAB__'
  }
}

async function loadWorkspaceContext(workspaceId) {
  state.workspaceEpisodes = []
  state.matchedEpisode = null
  if (!workspaceId) {
    renderEpisodeOptions()
    return
  }

  try {
    const { workspace } = await apiFetch(`/workspaces/${workspaceId}`)
    state.workspaceEpisodes = workspace?.episodes || []
  } catch {
    state.workspaceEpisodes = []
  }
  renderEpisodeOptions()

  if (state.media?.canonicalUrl || state.media?.pageUrl) {
    const lookupUrl = state.media.canonicalUrl || state.media.pageUrl
    try {
      const { episode } = await apiFetch(
        `/episodes/lookup?workspaceId=${encodeURIComponent(workspaceId)}&url=${encodeURIComponent(lookupUrl)}`
      )
      state.matchedEpisode = episode || null
    } catch {
      state.matchedEpisode = null
    }
  }
  renderMediaAndWaveform()
}

function setMode(nextMode, persist = true) {
  state.mode = nextMode
  el('mode-study').classList.toggle('active', nextMode === 'STUDY')
  el('mode-creator').classList.toggle('active', nextMode === 'CREATOR')
  if (persist) {
    chrome.storage.local.set({ lastMode: nextMode }).catch(() => {})
  }
  renderCategories()
  renderWorkspaces()
}

function loadWaveform(audioUrl, sourceLabel) {
  destroyWaveform()
  const controlsEl = el('waveform-controls')
  const msgEl = el('waveform-message')

  if (!window.WaveSurfer) {
    controlsEl.classList.add('hidden')
    msgEl.textContent = 'WaveSurfer library failed to load.'
    return
  }

  controlsEl.classList.remove('hidden')
  msgEl.textContent = `Loading waveform (${sourceLabel})...`

  const audioEl = new Audio()
  audioEl.crossOrigin = 'anonymous'
  audioEl.preload = 'metadata'
  audioElement = audioEl

  const ws = window.WaveSurfer.create({
    container: el('waveform'),
    waveColor: '#3f3f46',
    progressColor: '#8b5cf6',
    cursorColor: '#22d3ee',
    height: 38,
    barWidth: 2,
    barGap: 2,
    barRadius: 2,
    normalize: true,
    media: audioEl,
    url: audioUrl,
  })
  wsInstance = ws

  ws.on('ready', (dur) => {
    msgEl.textContent = ''
    el('wf-time').textContent = `${formatSec(currentPlayerTime)} / ${formatSec(dur)}`
  })

  ws.on('timeupdate', (t) => {
    currentPlayerTime = t
    const dur = ws.getDuration() || 0
    el('wf-time').textContent = `${formatSec(t)} / ${formatSec(dur)}`
  })

  ws.on('interaction', (t) => {
    currentPlayerTime = t
    el('timestamp-input').value = String(Math.floor(t))
  })

  ws.on('play', () => {
    el('wf-play-btn').textContent = 'Pause'
  })

  ws.on('pause', () => {
    el('wf-play-btn').textContent = 'Play'
    el('timestamp-input').value = String(Math.floor(ws.getCurrentTime() || 0))
  })

  ws.on('error', (err) => {
    destroyWaveform()
    controlsEl.classList.add('hidden')
    const rawMsg = typeof err === 'string' ? err : err?.message || ''
    if (sourceLabel === 'external') {
      msgEl.textContent =
        'Cannot render waveform: external media blocked by CORS or unsupported format. Timestamp capture is still available.'
    } else {
      msgEl.textContent =
        rawMsg || 'Failed to load EchoSpace audio stream. Check connection or sign in again.'
    }
  })
}

function renderDiscussionBox(episode) {
  const box = el('existing-discussion')
  const badge = el('linked-badge')
  const addBtn = el('add-workspace-btn')

  if (!episode) {
    box.classList.add('hidden')
    badge.classList.add('hidden')
    if (state.selectedEpisodeId === '__TAB__' && state.media?.pageUrl?.startsWith('http')) {
      addBtn.classList.remove('hidden')
    } else {
      addBtn.classList.add('hidden')
    }
    return
  }

  addBtn.classList.add('hidden')
  badge.classList.remove('hidden')
  box.classList.remove('hidden')

  const count = episode._count?.annotations ?? episode.annotations?.length ?? 0
  el('discussion-count').textContent = `${count} existing ${count === 1 ? 'discussion' : 'discussions'}`
  const ts = Number(el('timestamp-input').value || 0)
  el('open-discussion-link').href = `${state.webAppUrl}/app/recordings/${episode.id}?t=${ts}`

  const list = el('discussion-list')
  const items = episode.annotations || []
  if (items.length === 0) {
    list.innerHTML = '<span class="muted">No annotations yet. Add the first one below.</span>'
  } else {
    list.innerHTML = items
      .map(
        (ann) =>
          `<button type="button" class="discussion-item" data-ts="${Math.floor(ann.timestamp)}" data-id="${ann.id}">
            <span class="mono">[${formatSec(ann.timestamp)}]</span>
            <span class="truncate">${escapeHtml(ann.content)}</span>
          </button>`
      )
      .join('')
    list.querySelectorAll('.discussion-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const jumpTs = Number(btn.getAttribute('data-ts') || 0)
        el('timestamp-input').value = String(jumpTs)
        if (wsInstance) {
          wsInstance.setTime(jumpTs)
        }
      })
    })
  }
}

function renderMediaAndWaveform() {
  const selectedEp =
    state.selectedEpisodeId !== '__TAB__'
      ? state.workspaceEpisodes.find((e) => e.id === state.selectedEpisodeId) || null
      : null

  if (selectedEp) {
    el('media-title').textContent = selectedEp.title
    el('media-url').textContent =
      selectedEp.sourceType === 'UPLOAD'
        ? 'EchoSpace Uploaded Audio'
        : selectedEp.sourceUrl || ''
    const pill = el('media-status')
    pill.classList.remove('warn')
    pill.textContent = `EchoSpace Episode · ${formatSec(selectedEp.duration || 0)}`

    renderDiscussionBox(selectedEp)

    if (selectedEp.sourceType === 'UPLOAD' && state.token) {
      const streamUrl = `${state.apiBaseUrl}/episodes/${selectedEp.id}/audio?token=${encodeURIComponent(state.token)}`
      loadWaveform(streamUrl, 'echospace')
    } else if (
      selectedEp.sourceUrl &&
      DIRECT_AUDIO_RE.test(selectedEp.sourceUrl)
    ) {
      loadWaveform(selectedEp.sourceUrl, 'external')
    } else {
      destroyWaveform()
      el('waveform-controls').classList.add('hidden')
      el('waveform-message').textContent =
        'Waveform unavailable for linked webpage/embedded player. Timestamped discussion is active.'
    }
    return
  }

  const m = state.media
  if (!m) return
  el('media-title').textContent = m.pageTitle || 'Untitled Page'
  el('media-url').textContent = m.canonicalUrl || m.pageUrl || ''

  const pill = el('media-status')
  if (m.supported) {
    pill.classList.remove('warn')
    const durText = m.hasFiniteDuration
      ? ` / ${formatSec(m.duration)}`
      : ' (duration unavailable)'
    const siteLabel = m.siteType && m.siteType !== 'html5' ? `${m.siteType} · ` : ''
    pill.textContent = `${siteLabel}HTML5 <${m.tagName}> · ${formatSec(m.currentTime)}${durText}`
    el('timestamp-input').value = String(m.currentTime || 0)
  } else {
    pill.classList.add('warn')
    pill.textContent = m.reason || 'No accessible HTML5 media detected.'
  }

  renderDiscussionBox(state.matchedEpisode)

  if (state.matchedEpisode?.sourceType === 'UPLOAD' && state.token) {
    const streamUrl = `${state.apiBaseUrl}/episodes/${state.matchedEpisode.id}/audio?token=${encodeURIComponent(state.token)}`
    loadWaveform(streamUrl, 'echospace')
  } else if (m.waveformSupport === 'direct' && m.mediaSrc) {
    loadWaveform(m.mediaSrc, 'external')
  } else {
    destroyWaveform()
    el('waveform-controls').classList.add('hidden')
    el('waveform-message').textContent =
      m.waveformSupport === 'restricted'
        ? 'Waveform unavailable for YouTube / embedded / DRM media. Current playback timestamp is captured above.'
        : 'No direct audio stream found on this page for waveform rendering.'
  }
}

async function detectMediaInActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url?.startsWith('http')) {
      state.media = {
        supported: false,
        waveformSupport: 'none',
        reason: 'Open an http/https webpage to capture media.',
        pageTitle: tab?.title || 'Unsupported tab',
        pageUrl: tab?.url || '',
        canonicalUrl: '',
      }
      await loadWorkspaceContext(state.activeWorkspaceId)
      return
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    })

    state.media = results?.[0]?.result || {
      supported: false,
      waveformSupport: 'none',
      reason: 'Could not inspect media on this page.',
      pageTitle: tab.title,
      pageUrl: tab.url,
      canonicalUrl: tab.url,
    }
  } catch (err) {
    state.media = {
      supported: false,
      waveformSupport: 'none',
      reason: err.message || 'Page blocked script inspection.',
      pageTitle: 'Unavailable',
      pageUrl: '',
      canonicalUrl: '',
    }
  }
  await loadWorkspaceContext(state.activeWorkspaceId)
}

async function showAuthenticatedView() {
  el('auth-view').classList.add('hidden')
  el('capture-view').classList.remove('hidden')
  el('logout-btn').classList.remove('hidden')
  el('user-name').textContent = state.user?.name || state.user?.email || ''

  setMode(state.mode, false)

  try {
    const { workspaces } = await apiFetch('/workspaces')
    state.workspaces = workspaces || []
    renderWorkspaces()
  } catch (err) {
    el('capture-error').textContent = err.message
    el('capture-error').classList.remove('hidden')
  }

  await detectMediaInActiveTab()
}

function showLoginView(message = '') {
  el('auth-view').classList.remove('hidden')
  el('capture-view').classList.add('hidden')
  el('logout-btn').classList.add('hidden')
  const errEl = el('login-error')
  if (message) {
    errEl.textContent = message
    errEl.classList.remove('hidden')
  } else {
    errEl.classList.add('hidden')
  }
}

async function init() {
  const stored = await chrome.storage.local.get([
    'apiBaseUrl',
    'webAppUrl',
    'token',
    'user',
    'lastWorkspaceId',
    'lastMode',
  ])
  if (stored.apiBaseUrl) state.apiBaseUrl = stored.apiBaseUrl
  if (stored.webAppUrl) state.webAppUrl = stored.webAppUrl
  if (stored.lastWorkspaceId) state.activeWorkspaceId = stored.lastWorkspaceId
  if (stored.lastMode === 'STUDY' || stored.lastMode === 'CREATOR') {
    state.mode = stored.lastMode
  }

  if (stored.token) {
    state.token = stored.token
    state.user = stored.user
    try {
      const me = await apiFetch('/auth/me')
      state.user = me.user
      await chrome.storage.local.set({ user: me.user })
      await showAuthenticatedView()
      return
    } catch {
      await handleSessionExpired()
      return
    }
  }
  showLoginView()
}

el('options-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage()
})

el('logout-btn').addEventListener('click', async () => {
  destroyWaveform()
  await chrome.storage.local.remove(['token', 'user'])
  state.token = null
  state.user = null
  showLoginView()
})

el('mode-study').addEventListener('click', async () => {
  setMode('STUDY')
  await loadWorkspaceContext(state.activeWorkspaceId)
})

el('mode-creator').addEventListener('click', async () => {
  setMode('CREATOR')
  await loadWorkspaceContext(state.activeWorkspaceId)
})

el('workspace-select').addEventListener('change', async (e) => {
  state.activeWorkspaceId = e.target.value
  state.selectedEpisodeId = '__TAB__'
  await chrome.storage.local.set({ lastWorkspaceId: state.activeWorkspaceId })
  await loadWorkspaceContext(state.activeWorkspaceId)
})

el('episode-select').addEventListener('change', async (e) => {
  state.selectedEpisodeId = e.target.value
  if (state.selectedEpisodeId !== '__TAB__') {
    try {
      const { episode } = await apiFetch(`/episodes/${state.selectedEpisodeId}`)
      const idx = state.workspaceEpisodes.findIndex((x) => x.id === episode.id)
      if (idx >= 0) state.workspaceEpisodes[idx] = episode
    } catch {
      // Keep existing summary
    }
  }
  renderMediaAndWaveform()
})

el('refresh-media').addEventListener('click', () => {
  state.selectedEpisodeId = '__TAB__'
  detectMediaInActiveTab()
})

el('wf-play-btn').addEventListener('click', () => {
  wsInstance?.playPause()
})

el('wf-sync-btn').addEventListener('click', () => {
  const t = wsInstance
    ? Math.floor(wsInstance.getCurrentTime() || 0)
    : Number(state.media?.currentTime || 0)
  el('timestamp-input').value = String(t)
})

el('add-workspace-btn').addEventListener('click', async () => {
  if (!state.activeWorkspaceId || !state.media?.pageUrl) return
  const errEl = el('capture-error')
  errEl.classList.add('hidden')
  el('add-workspace-btn').disabled = true
  try {
    const epRes = await apiFetch('/episodes/external', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: state.activeWorkspaceId,
        title: state.media.pageTitle || 'Web Recording',
        description: state.media.supported
          ? `Captured from <${state.media.tagName}> on ${state.media.pageUrl}`
          : `Linked webpage: ${state.media.pageUrl}`,
        sourceUrl: state.media.canonicalUrl || state.media.pageUrl,
        duration: state.media.duration || 0,
      }),
    })
    state.matchedEpisode = epRes.episode
    await loadWorkspaceContext(state.activeWorkspaceId)
  } catch (err) {
    errEl.textContent = err.message
    errEl.classList.remove('hidden')
  } finally {
    el('add-workspace-btn').disabled = false
  }
})

el('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const errEl = el('login-error')
  errEl.classList.add('hidden')
  el('login-submit').disabled = true

  try {
    const email = el('login-email').value.trim()
    const password = el('login-password').value
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    state.token = data.token
    state.user = data.user
    await chrome.storage.local.set({ token: data.token, user: data.user })
    await showAuthenticatedView()
  } catch (err) {
    errEl.textContent = err.message
    errEl.classList.remove('hidden')
  } finally {
    el('login-submit').disabled = false
  }
})

el('annotate-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const errEl = el('capture-error')
  const okEl = el('capture-success')
  errEl.classList.add('hidden')
  okEl.classList.add('hidden')

  const workspaceId = el('workspace-select').value
  const category = el('category-select').value
  const timestamp = Number(el('timestamp-input').value || 0)
  const content = el('note-input').value.trim()

  if (!workspaceId) {
    errEl.textContent = 'Create or select a workspace in EchoSpace first.'
    errEl.classList.remove('hidden')
    return
  }

  el('save-btn').disabled = true
  try {
    let episodeId =
      state.selectedEpisodeId !== '__TAB__' ? state.selectedEpisodeId : null

    if (!episodeId) {
      if (!state.media?.pageUrl) {
        throw new Error('No webpage URL available to link.')
      }
      const epRes = await apiFetch('/episodes/external', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId,
          title: state.media.pageTitle || 'Web Recording',
          description: state.media.supported
            ? `Captured from <${state.media.tagName}> on ${state.media.pageUrl}`
            : `Linked webpage: ${state.media.pageUrl}`,
          sourceUrl: state.media.canonicalUrl || state.media.pageUrl,
          duration: state.media.duration || 0,
        }),
      })
      episodeId = epRes.episode.id
    }

    await apiFetch(`/episodes/${episodeId}/annotations`, {
      method: 'POST',
      body: JSON.stringify({ timestamp, category, content }),
    })

    el('note-input').value = ''
    el('success-text').textContent = `Saved at ${formatSec(timestamp)}`
    el('open-app-link').href = `${state.webAppUrl}/app/recordings/${episodeId}?t=${timestamp}`
    okEl.classList.remove('hidden')
    await loadWorkspaceContext(workspaceId)
  } catch (err) {
    errEl.textContent = err.message
    errEl.classList.remove('hidden')
  } finally {
    el('save-btn').disabled = false
  }
})

window.addEventListener('pagehide', destroyWaveform)
window.addEventListener('unload', destroyWaveform)

init()
