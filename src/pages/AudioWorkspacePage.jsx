import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  MessageSquarePlus,
  Scissors,
  Clock,
  Tag,
  Plus,
  ExternalLink,
  Trash2,
  Bookmark,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { AudioPlayer } from '../components/audio/AudioPlayer'
import { ChapterTimeline } from '../components/audio/ChapterTimeline'
import { AnnotationCard } from '../components/annotations/AnnotationCard'
import { AnnotationForm } from '../components/annotations/AnnotationForm'
import { ClipCard } from '../components/clips/ClipCard'
import { ClipModal } from '../components/clips/ClipModal'
import { useEchoStore } from '../store/useEchoStore'
import { getModeConfig } from '../config/modeConfig'
import { formatTime } from '../utils/time'
import {
  getSocket,
  joinEpisodeRoom,
  leaveEpisodeRoom,
} from '../services/socket'
import { apiClient } from '../services/api'

const DIRECT_AUDIO_EXT_RE = /\.(mp3|wav|ogg|m4a|aac|flac|webm)(\?.*)?$/i

function getOfficialEmbedUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl)
    const host = parsed.hostname.toLowerCase()
    if (host.includes('youtube.com')) {
      const v = parsed.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${encodeURIComponent(v)}`
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (parts[0] === 'embed' && parts[1]) {
        return `https://www.youtube.com/embed/${encodeURIComponent(parts[1])}`
      }
    }
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}`
    }
    if (host.includes('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean).pop()
      if (id && /^\d+$/.test(id)) {
        return `https://player.vimeo.com/video/${id}`
      }
    }
  } catch {
    return null
  }
  return null
}

export function AudioWorkspacePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = useEchoStore((s) => s.token)
  const user = useEchoStore((s) => s.user)
  const activeWorkspaceRole = useEchoStore((s) => s.activeWorkspaceRole)
  const recordings = useEchoStore((s) => s.recordings)
  const annotations = useEchoStore((s) => s.annotations)
  const clips = useEchoStore((s) => s.clips)
  const workspaceSettings = useEchoStore((s) => s.workspaceSettings)

  const loadEpisodeDetail = useEchoStore((s) => s.loadEpisodeDetail)
  const deleteRecording = useEchoStore((s) => s.deleteRecording)
  const addAnnotation = useEchoStore((s) => s.addAnnotation)
  const updateAnnotationStatus = useEchoStore((s) => s.updateAnnotationStatus)
  const editAnnotation = useEchoStore((s) => s.editAnnotation)
  const deleteAnnotation = useEchoStore((s) => s.deleteAnnotation)
  const addReply = useEchoStore((s) => s.addReply)
  const deleteReply = useEchoStore((s) => s.deleteReply)
  const addClip = useEchoStore((s) => s.addClip)
  const deleteClip = useEchoStore((s) => s.deleteClip)
  const addChapter = useEchoStore((s) => s.addChapter)
  const deleteChapter = useEchoStore((s) => s.deleteChapter)

  const applySocketAnnotationCreated = useEchoStore(
    (s) => s.applySocketAnnotationCreated
  )
  const applySocketAnnotationUpdated = useEchoStore(
    (s) => s.applySocketAnnotationUpdated
  )
  const applySocketAnnotationDeleted = useEchoStore(
    (s) => s.applySocketAnnotationDeleted
  )
  const applySocketReplyCreated = useEchoStore(
    (s) => s.applySocketReplyCreated
  )
  const applySocketReplyDeleted = useEchoStore(
    (s) => s.applySocketReplyDeleted
  )
  const applySocketClipCreated = useEchoStore(
    (s) => s.applySocketClipCreated
  )
  const applySocketClipDeleted = useEchoStore(
    (s) => s.applySocketClipDeleted
  )

  const recording = recordings.find((r) => r.id === id) || null
  const isManager = ['OWNER', 'EDITOR'].includes(activeWorkspaceRole)
  const canWrite = ['OWNER', 'EDITOR', 'MEMBER'].includes(activeWorkspaceRole)

  const [loadingEpisode, setLoadingEpisode] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(recording?.duration || 0)
  const [seekTarget, setSeekTarget] = useState(null)
  const [activeClipRange, setActiveClipRange] = useState(null)

  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null)
  const [showAnnotationForm, setShowAnnotationForm] = useState(false)
  const [clipModalOpen, setClipModalOpen] = useState(false)
  const [highlightStart, setHighlightStart] = useState(null)
  const [clipInitialRange, setClipInitialRange] = useState({ start: null, end: null })
  const [clipToast, setClipToast] = useState(null)

  // Deep-link timestamp & annotation selection from Notifications (?t=...&ann=...)
  useEffect(() => {
    const tParam = searchParams.get('t')
    const annParam = searchParams.get('ann')
    if (annParam) setSelectedAnnotationId(annParam)
    if (tParam !== null && !Number.isNaN(Number(tParam))) {
      setSeekTarget({ time: Math.max(0, Number(tParam)), autoplay: false, ts: Date.now() })
    }
  }, [id, searchParams])

  const [showChapterForm, setShowChapterForm] = useState(false)
  const [chapterTitle, setChapterTitle] = useState('')
  const [chapterError, setChapterError] = useState('')
  const [bookmarks, setBookmarks] = useState([])
  const [bookmarkLabel, setBookmarkLabel] = useState('')

  useEffect(() => {
    if (!token || !id) {
      setBookmarks([])
      return
    }
    apiClient
      .listBookmarks(id)
      .then((list) => setBookmarks(list || []))
      .catch(() => setBookmarks([]))
  }, [token, id])

  useEffect(() => {
    if (!token || !id) return
    let active = true
    setLoadingEpisode(true)
    setLoadError('')
    setActiveClipRange(null)

    loadEpisodeDetail(id)
      .then((ep) => {
        if (active && ep) {
          setDuration(ep.duration || 0)
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(
            err.response?.data?.error?.message ||
              'Could not load this recording.'
          )
        }
      })
      .finally(() => {
        if (active) setLoadingEpisode(false)
      })

    joinEpisodeRoom(id)

    const socket = getSocket()
    if (!socket) {
      return () => {
        active = false
        leaveEpisodeRoom(id)
      }
    }

    const onAnnCreated = ({ annotation }) =>
      applySocketAnnotationCreated(annotation)
    const onAnnUpdated = ({ annotation }) =>
      applySocketAnnotationUpdated(annotation)
    const onAnnDeleted = ({ annotationId }) =>
      applySocketAnnotationDeleted(annotationId)
    const onReplyCreated = (payload) => applySocketReplyCreated(payload)
    const onReplyDeleted = (payload) => applySocketReplyDeleted(payload)
    const onClipCreated = ({ clip }) => applySocketClipCreated(clip)
    const onClipDeleted = ({ clipId }) => applySocketClipDeleted(clipId)

    socket.on('annotation:created', onAnnCreated)
    socket.on('annotation:updated', onAnnUpdated)
    socket.on('annotation:deleted', onAnnDeleted)
    socket.on('reply:created', onReplyCreated)
    socket.on('reply:deleted', onReplyDeleted)
    socket.on('clip:created', onClipCreated)
    socket.on('clip:deleted', onClipDeleted)

    return () => {
      active = false
      leaveEpisodeRoom(id)
      socket.off('annotation:created', onAnnCreated)
      socket.off('annotation:updated', onAnnUpdated)
      socket.off('annotation:deleted', onAnnDeleted)
      socket.off('reply:created', onReplyCreated)
      socket.off('reply:deleted', onReplyDeleted)
      socket.off('clip:created', onClipCreated)
      socket.off('clip:deleted', onClipDeleted)
    }
  }, [token, id])

  const mode = recording?.mode || 'study'
  const cfg = getModeConfig(mode)

  const recordingAnnotations = useMemo(() => {
    if (!recording) return []
    const list = annotations.filter((a) => a.recordingId === recording.id)
    const sorted = [...list].sort((a, b) => a.timestamp - b.timestamp)
    if (categoryFilter === 'ALL') return sorted
    return sorted.filter((a) => a.category === categoryFilter)
  }, [annotations, recording, categoryFilter])

  const recordingClips = useMemo(() => {
    if (!recording) return []
    return clips.filter((c) => c.recordingId === recording.id)
  }, [clips, recording])

  if (loadingEpisode && !recording) {
    return (
      <div className="p-8 text-center text-sm text-[var(--text-secondary)]">
        Loading recording workspace...
      </div>
    )
  }

  if (loadError && !recording) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center space-y-4">
        <p className="text-sm text-[var(--danger)]">{loadError}</p>
        <Link to="/app/recordings">
          <Button size="sm" variant="secondary">
            Back to Recordings
          </Button>
        </Link>
      </div>
    )
  }

  if (!recording) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">Recording not found.</p>
        <Link to="/app/recordings">
          <Button size="sm" variant="secondary">
            Back to Recordings
          </Button>
        </Link>
      </div>
    )
  }

  const isExternalDirectAudio =
    recording.sourceType === 'EXTERNAL_LINK' &&
    Boolean(recording.sourceUrl && DIRECT_AUDIO_EXT_RE.test(recording.sourceUrl))

  const playableRecording =
    recording.sourceType === 'UPLOAD'
      ? token
        ? {
            ...recording,
            audioUrl: apiClient.getEpisodeAudioUrl(recording.id, token),
          }
        : null
      : isExternalDirectAudio
        ? { ...recording, audioUrl: recording.sourceUrl }
        : null

  const seekTo = (time, autoplay = false) => {
    const safe = Math.max(0, time)
    setSeekTarget({ time: safe, autoplay, ts: Date.now() })
    setCurrentTime(safe)
  }

  const handlePlayClipInterval = (startTime, endTime) => {
    setActiveClipRange({ startTime, endTime })
    seekTo(startTime, true)
  }

  const handleCreateAnnotation = async ({ timestamp, category, content }) => {
    try {
      setActionError('')
      const created = await addAnnotation({
        recordingId: recording.id,
        timestamp,
        category,
        content,
      })
      setSelectedAnnotationId(created.id)
      setShowAnnotationForm(false)
    } catch (err) {
      setActionError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to create annotation.'
      )
    }
  }

  const handleAction = async (fn, fallbackMsg) => {
    try {
      setActionError('')
      await fn()
    } catch (err) {
      setActionError(
        err.response?.data?.error?.message || err.message || fallbackMsg
      )
    }
  }

  const handleSaveClip = async (clipInput) => {
    const created = await addClip({
      recordingId: recording.id,
      ...clipInput,
    })
    setClipToast(created)
    setTimeout(() => setClipToast(null), 6000)
  }

  const handleCreateChapter = async (e) => {
    e.preventDefault()
    if (!chapterTitle.trim()) {
      setChapterError('Chapter title is required.')
      return
    }
    try {
      setChapterError('')
      await addChapter({
        episodeId: recording.id,
        title: chapterTitle.trim(),
        startTime: Math.floor(currentTime),
      })
      setChapterTitle('')
      setShowChapterForm(false)
    } catch (err) {
      setChapterError(
        err.response?.data?.error?.message ||
          err.message ||
          'Could not add chapter.'
      )
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Top breadcrumb & metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/app/recordings"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All {cfg.recordingPlural}
          </Link>
          <span className="text-[#27272F]">/</span>
          <Badge tone={mode === 'study' ? 'cyan' : 'primary'}>
            {cfg.name}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
          <span>By {recording.authorName}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-[var(--accent-study)]" />
            {formatTime(duration || recording.duration)}
          </span>
          {(isManager || (user && recording.authorId === user.id)) && (
            <button
              type="button"
              onClick={() =>
                handleAction(async () => {
                  if (
                    !window.confirm(
                      `Delete "${recording.title}"? This action cannot be undone.`
                    )
                  ) {
                    return
                  }
                  await deleteRecording(recording.id)
                  navigate('/app/recordings')
                }, 'Failed to delete recording.')
              }
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--danger)] hover:border-rose-500/40 transition-colors cursor-pointer"
              title="Delete recording"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-[var(--danger)]">
          {actionError}
        </div>
      )}

      {clipToast && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
          <span className="text-[var(--success)]">
            Highlight clip <strong>{clipToast.title}</strong> saved (
            {formatTime(clipToast.startTime)} – {formatTime(clipToast.endTime)}).
          </span>
          <Link
            to={`/clips/${clipToast.shareToken || clipToast.id}`}
            className="font-medium text-[var(--accent-study)] hover:underline shrink-0"
          >
            Open Share Page →
          </Link>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left/Main Audio Workspace (8 cols) */}
        <div className="xl:col-span-8 space-y-5">
          <Card className="p-5 space-y-3">
            <div className="space-y-1.5">
              <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                {recording.title}
              </h1>
              {recording.description && (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {recording.description}
                </p>
              )}
              {recording.tags?.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Tag className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  {recording.tags.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Authoritative AudioPlayer for UPLOAD or direct audio EXTERNAL_LINK */}
          {playableRecording ? (
            <AudioPlayer
              recording={playableRecording}
              mode={mode}
              annotations={recordingAnnotations}
              clips={recordingClips}
              activeAnnotationId={selectedAnnotationId}
              clipRange={activeClipRange}
              seekToTime={seekTarget}
              defaultSpeed={workspaceSettings.defaultPlaybackSpeed || 1}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
              onSelectAnnotation={(ann) => {
                setSelectedAnnotationId(ann.id)
                setCurrentTime(ann.timestamp)
              }}
              onSelectClip={(clip) =>
                setActiveClipRange({
                  startTime: clip.startTime,
                  endTime: clip.endTime,
                })
              }
              onClearClipRange={() => setActiveClipRange(null)}
              onCreateAnnotation={
                canWrite
                  ? (t) => {
                      setCurrentTime(t)
                      setShowAnnotationForm(true)
                    }
                  : undefined
              }
              onCreateClip={
                canWrite
                  ? (t) => {
                      setCurrentTime(t)
                      setClipInitialRange({ start: null, end: null })
                      setClipModalOpen(true)
                    }
                  : undefined
              }
              highlightStart={highlightStart}
              onStartHighlight={
                canWrite ? (t) => setHighlightStart(Math.floor(t)) : undefined
              }
              onStopHighlight={
                canWrite
                  ? (t) => {
                      const start = highlightStart ?? Math.floor(t)
                      const end = Math.max(start + 1, Math.floor(t))
                      setHighlightStart(null)
                      setClipInitialRange({ start, end })
                      setClipModalOpen(true)
                    }
                  : undefined
              }
              onCancelHighlight={() => setHighlightStart(null)}
            />
          ) : (
            <Card className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    External Media Link
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {recording.sourceUrl}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    This link points to an external webpage rather than a direct
                    audio stream. Open the original source to listen, and record
                    timestamped notes below.
                  </p>
                </div>
                {recording.sourceUrl && (
                  <a
                    href={recording.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs font-medium text-[var(--accent-study)] hover:border-[var(--accent-study)]/40"
                  >
                    Open Source Media
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {getOfficialEmbedUrl(recording.sourceUrl) && (
                <div className="aspect-video w-full overflow-hidden rounded-lg border border-[var(--border)] bg-black">
                  <iframe
                    src={getOfficialEmbedUrl(recording.sourceUrl)}
                    title={recording.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {canWrite && (
                <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={mode === 'study' ? 'cyan' : 'primary'}
                    onClick={() => setShowAnnotationForm(true)}
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    Create Annotation
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setClipModalOpen(true)}
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    Create Clip
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Chapters Card */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Chapter Timeline
              </span>
              {canWrite && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowChapterForm((p) => !p)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Chapter ({formatTime(currentTime)})
                </Button>
              )}
            </div>

            {showChapterForm && (
              <form
                onSubmit={handleCreateChapter}
                className="flex flex-col sm:flex-row gap-2 pt-1"
              >
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => {
                    setChapterTitle(e.target.value)
                    setChapterError('')
                  }}
                  placeholder="Chapter title at current timestamp..."
                  className="flex-1 h-9 px-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-creator)]"
                />
                <Button type="submit" size="sm">
                  Save Chapter
                </Button>
              </form>
            )}
            {chapterError && (
              <p className="text-xs text-[var(--danger)]">{chapterError}</p>
            )}

            {recording.chapters?.length > 0 ? (
              <ChapterTimeline
                chapters={recording.chapters}
                currentTime={currentTime}
                onSelectChapter={(start) => seekTo(start)}
                onDeleteChapter={
                  canWrite
                    ? (chapterId) =>
                        handleAction(
                          () => deleteChapter(recording.id, chapterId),
                          'Failed to delete chapter.'
                        )
                    : undefined
                }
              />
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                No chapters added yet. Seek to a moment and click Add Chapter.
              </p>
            )}
          </Card>

          {/* Bookmarks Card */}
          <Card className="p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] inline-flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-[var(--accent-study)]" />
                Bookmarks ({bookmarks.length})
              </span>
              {canWrite && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    await handleAction(async () => {
                      const created = await apiClient.createBookmark(recording.id, {
                        timestamp: Math.floor(currentTime),
                        label: bookmarkLabel.trim() || null,
                      })
                      setBookmarks((prev) =>
                        [...prev, created].sort((a, b) => a.timestamp - b.timestamp)
                      )
                      setBookmarkLabel('')
                    }, 'Failed to save bookmark.')
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={bookmarkLabel}
                    onChange={(e) => setBookmarkLabel(e.target.value)}
                    placeholder="Optional label..."
                    className="h-8 px-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-study)]"
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    <Bookmark className="w-3.5 h-3.5" />
                    Save ({formatTime(currentTime)})
                  </Button>
                </form>
              )}
            </div>

            {bookmarks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-primary)] border border-[var(--border)] text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => seekTo(bm.timestamp, true)}
                      className="inline-flex items-center gap-1.5 text-[var(--text-primary)] hover:text-[var(--accent-study)] cursor-pointer"
                    >
                      <span className="font-mono text-[var(--accent-study)]">
                        {formatTime(bm.timestamp)}
                      </span>
                      {bm.label && <span>{bm.label}</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleAction(async () => {
                          await apiClient.deleteBookmark(bm.id)
                          setBookmarks((prev) => prev.filter((x) => x.id !== bm.id))
                        }, 'Failed to delete bookmark.')
                      }
                      className="text-[var(--text-muted)] hover:text-[var(--danger)] cursor-pointer"
                      title="Remove bookmark"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                Save personal timestamp bookmarks to quickly revisit key moments.
              </p>
            )}
          </Card>

          {/* Highlight Clips Section */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Highlight Clips ({recordingClips.length})
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Play exact intervals or share public clip links
                </p>
              </div>
              {canWrite && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setClipModalOpen(true)}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  Create Clip
                </Button>
              )}
            </div>

            {recordingClips.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recordingClips.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    onPlayClip={
                      playableRecording
                        ? (c) => handlePlayClipInterval(c.startTime, c.endTime)
                        : undefined
                    }
                    onDeleteClip={
                      isManager || (user && clip.authorId === user.id)
                        ? (clipId) =>
                            handleAction(
                              () => deleteClip(clipId),
                              'Failed to delete clip.'
                            )
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                No highlight clips saved for this recording yet.
              </p>
            )}
          </Card>
        </div>

        {/* Right Discussion Panel (4 cols) */}
        <div className="xl:col-span-4 space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  {mode === 'study' ? 'Study Notes & Doubts' : 'Review Notes'}
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Click any timestamp to jump in the waveform
                </p>
              </div>
              {canWrite && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowAnnotationForm(true)}
                >
                  + Note
                </Button>
              )}
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-1.5">
              {cfg.filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setCategoryFilter(f)}
                  className={`px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors cursor-pointer ${
                    categoryFilter === f
                      ? 'bg-[var(--bg-secondary)] border-[var(--accent-creator)]/50 text-[var(--text-primary)]'
                      : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* New Annotation Form */}
            {showAnnotationForm && (
              <AnnotationForm
                mode={mode}
                currentTime={currentTime}
                onSubmit={handleCreateAnnotation}
                onCancel={() => setShowAnnotationForm(false)}
              />
            )}

            {/* Annotation Thread List */}
            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {recordingAnnotations.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  {cfg.emptyStateText}
                </div>
              ) : (
                recordingAnnotations.map((ann) => {
                  const canModify =
                    isManager || (user && ann.authorId === user.id)
                  return (
                    <AnnotationCard
                      key={ann.id}
                      annotation={ann}
                      mode={mode}
                      isActive={selectedAnnotationId === ann.id}
                      canModify={canModify}
                      currentUserId={user?.id}
                      isManager={isManager}
                      onSeek={(target) => {
                        setSelectedAnnotationId(target.id)
                        seekTo(target.timestamp)
                      }}
                      onStatusChange={
                        canWrite
                          ? (annId, status) =>
                              handleAction(
                                () => updateAnnotationStatus(annId, status),
                                'Failed to update status.'
                              )
                          : undefined
                      }
                      onEdit={
                        canModify
                          ? (annId, content) =>
                              handleAction(
                                () => editAnnotation(annId, content),
                                'Failed to edit annotation.'
                              )
                          : undefined
                      }
                      onDelete={
                        canModify
                          ? (annId) =>
                              handleAction(
                                () => deleteAnnotation(annId),
                                'Failed to delete annotation.'
                              )
                          : undefined
                      }
                      onAddReply={
                        canWrite
                          ? (annId, text) =>
                              handleAction(
                                () => addReply(annId, text),
                                'Failed to post reply.'
                              )
                          : undefined
                      }
                      onDeleteReply={(annId, replyId) =>
                        handleAction(
                          () => deleteReply(annId, replyId),
                          'Failed to delete reply.'
                        )
                      }
                    />
                  )
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      <ClipModal
        isOpen={clipModalOpen}
        onClose={() => {
          setClipModalOpen(false)
          setClipInitialRange({ start: null, end: null })
        }}
        currentTime={currentTime}
        initialStart={clipInitialRange.start}
        initialEnd={clipInitialRange.end}
        duration={duration || recording.duration || 0}
        onSaveClip={handleSaveClip}
        onPreviewInterval={
          playableRecording
            ? (start, end) => handlePlayClipInterval(start, end)
            : undefined
        }
      />
    </div>
  )
}
