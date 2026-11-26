import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Music2, Link2, Rss, RefreshCw } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { useEchoStore } from '../../store/useEchoStore'
import { getModeConfig } from '../../config/modeConfig'
import { apiClient } from '../../services/api'
import { formatTime } from '../../utils/time'

export function UploadRecordingModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const mode = useEchoStore((s) => s.mode)
  const activeWorkspaceId = useEchoStore((s) => s.activeWorkspaceId)
  const playlists = useEchoStore((s) => s.playlists)
  const uploadEpisode = useEchoStore((s) => s.uploadEpisode)
  const createExternalEpisode = useEchoStore((s) => s.createExternalEpisode)
  const loadWorkspaces = useEchoStore((s) => s.loadWorkspaces)
  const cfg = getModeConfig(mode)

  const modePlaylists = playlists.filter((p) => p.mode === mode)

  const [sourceTab, setSourceTab] = useState('upload') // 'upload' | 'import' | 'external'
  const [file, setFile] = useState(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [playlistId, setPlaylistId] = useState('')
  const [progress, setProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Import & RSS state
  const [importUrl, setImportUrl] = useState('')
  const [rssFeed, setRssFeed] = useState(null)
  const [previewingRss, setPreviewingRss] = useState(false)
  const [importJob, setImportJob] = useState(null)

  useEffect(() => {
    if (!importJob || ['COMPLETED', 'FAILED', 'CANCELLED'].includes(importJob.status)) {
      return
    }
    const timer = setInterval(async () => {
      try {
        const latest = await apiClient.getImportJob(importJob.id)
        setImportJob(latest)
        if (latest.status === 'COMPLETED' && latest.episodeId) {
          clearInterval(timer)
          await loadWorkspaces().catch(() => {})
          onClose()
          navigate(`/app/recordings/${latest.episodeId}`)
        }
      } catch {
        // Keep polling on transient error
      }
    }, 1500)
    return () => clearInterval(timer)
  }, [importJob, navigate, onClose, loadWorkspaces])

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setError('')
    if (!title) {
      setTitle(selected.name.replace(/\.[^/.]+$/, ''))
    }
    const objUrl = URL.createObjectURL(selected)
    const isVideo =
      selected.type?.startsWith('video/') ||
      /\.(mp4|mov|mkv|m4v|avi)$/i.test(selected.name)
    const mediaEl = document.createElement(isVideo ? 'video' : 'audio')
    mediaEl.src = objUrl
    mediaEl.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(mediaEl.duration)) {
        setDuration(Math.round(mediaEl.duration))
      }
      URL.revokeObjectURL(objUrl)
    })
  }

  const handlePreviewRss = async () => {
    if (!importUrl.trim()) {
      setError('Enter a podcast RSS feed URL first.')
      return
    }
    try {
      setError('')
      setPreviewingRss(true)
      const feed = await apiClient.previewRss(importUrl.trim())
      setRssFeed(feed)
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Could not parse RSS feed.'
      )
    } finally {
      setPreviewingRss(false)
    }
  }

  const handleImportRssEpisode = async (ep) => {
    if (!activeWorkspaceId) {
      setError('No active workspace selected.')
      return
    }
    try {
      setError('')
      const res = await apiClient.importRssEpisode({
        workspaceId: activeWorkspaceId,
        enclosureUrl: ep.enclosureUrl,
        title: ep.title,
        description: ep.description || '',
        duration: ep.duration || 0,
      })
      setImportJob(res.job)
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to queue RSS episode import.'
      )
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (sourceTab === 'import') {
      if (!activeWorkspaceId) {
        setError('No active workspace selected.')
        return
      }
      if (!importUrl.trim()) {
        setError('Please enter a direct audio URL or RSS feed URL.')
        return
      }
      try {
        setSubmitting(true)
        setError('')
        const parsedTags = tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
        const res = await apiClient.createImport({
          workspaceId: activeWorkspaceId,
          url: importUrl.trim(),
          title: title.trim() || undefined,
          description: description.trim(),
          tags: parsedTags,
        })
        if (res.mode === 'EXTERNAL_LINK' && res.episode?.id) {
          await loadWorkspaces().catch(() => {})
          onClose()
          navigate(`/app/recordings/${res.episode.id}`)
          return
        }
        if (res.job) {
          setImportJob(res.job)
        }
      } catch (err) {
        setError(
          err.response?.data?.error?.message ||
            err.message ||
            'Failed to start import.'
        )
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (!title.trim()) {
      setError(`Please enter a ${cfg.recordingNoun.toLowerCase()} title.`)
      return
    }

    if (sourceTab === 'upload' && !file) {
      setError('Please select an audio file (.mp3, .wav, .ogg, .m4a, .webm).')
      return
    }

    if (sourceTab === 'external') {
      try {
        const parsed = new URL(sourceUrl.trim())
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          setError('Please enter a valid http/https URL.')
          return
        }
      } catch {
        setError('Please enter a valid external media URL.')
        return
      }
    }

    try {
      setSubmitting(true)
      setProgress(0)
      const isVideoFile =
        sourceTab === 'upload' &&
        file &&
        (file.type?.startsWith('video/') ||
          /\.(mp4|mov|mkv|m4v|avi)$/i.test(file.name))

      if (isVideoFile) {
        if (!activeWorkspaceId) {
          setError('No active workspace selected.')
          return
        }
        const res = await apiClient.uploadVideoImport({
          workspaceId: activeWorkspaceId,
          file,
          title: title.trim(),
          description: description.trim(),
          tags,
          duration,
          onProgress: setProgress,
        })
        if (res.job) {
          setImportJob(res.job)
        }
        return
      }

      const created =
        sourceTab === 'upload'
          ? await uploadEpisode({
              file,
              title: title.trim(),
              description: description.trim(),
              tags,
              playlistId,
              duration,
              onProgress: setProgress,
            })
          : await createExternalEpisode({
              sourceUrl: sourceUrl.trim(),
              title: title.trim(),
              description: description.trim(),
              tags,
              playlistId,
              duration,
            })

      setFile(null)
      setSourceUrl('')
      setDuration(0)
      setTitle('')
      setDescription('')
      setTags('')
      setPlaylistId('')
      setProgress(0)
      setError('')
      onClose()
      navigate(`/app/recordings/${created.id}`)
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError(
          'Backend server is unavailable. Please ensure the API server is running.'
        )
      } else if (err.response?.status === 401) {
        setError('Authentication expired. Please sign in again.')
      } else {
        setError(
          err.response?.data?.error?.message ||
            err.message ||
            'Failed to save recording.'
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cfg.primaryAction.label}
      subtitle={`Add a new ${cfg.recordingNoun.toLowerCase()} to your ${cfg.name} workspace.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-1 bg-[#09090B] p-1 rounded-lg border border-[#27272F]">
          {[
            { id: 'upload', label: 'Upload File' },
            { id: 'import', label: 'Import URL / RSS' },
            { id: 'external', label: 'External Link' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSourceTab(tab.id)
                setError('')
                setRssFeed(null)
              }}
              className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                sourceTab === tab.id
                  ? 'bg-[#18181D] text-[#F4F4F5]'
                  : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {sourceTab === 'upload' && (
          <label className="block p-3.5 rounded-lg bg-[#09090B] border border-dashed border-[#27272F] hover:border-[#8B5CF6]/60 transition-colors cursor-pointer">
            <input
              type="file"
              accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,.webm,.mp4,.mov,.mkv,.m4v,.avi,audio/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#18181D] border border-[#27272F] flex items-center justify-center text-[#8B5CF6] shrink-0">
                <Music2 className="w-4 h-4" />
              </div>
              <div className="text-xs min-w-0">
                <p className="font-medium text-[#F4F4F5] truncate">
                  {file
                    ? `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
                    : 'Click to select audio (.mp3, .wav, .m4a, .ogg) or video (.mp4, .mov, .mkv)'}
                </p>
                <p className="text-[#A1A1AA]">
                  {duration > 0
                    ? `Detected duration: ${duration}s`
                    : 'Max 100 MB · Validated on server'}
                </p>
              </div>
            </div>
          </label>
        )}

        {sourceTab === 'import' && (
          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label="Direct Audio URL or Podcast RSS Feed"
                  placeholder="https://example.com/episode.mp3 or /feed.xml"
                  value={importUrl}
                  onChange={(e) => {
                    setImportUrl(e.target.value)
                    setError('')
                  }}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handlePreviewRss}
                disabled={previewingRss}
              >
                <Rss className="w-3.5 h-3.5" />
                {previewingRss ? 'Loading...' : 'Preview RSS'}
              </Button>
            </div>

            {rssFeed && (
              <div className="p-3 rounded-lg bg-[#09090B] border border-[#27272F] space-y-2 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-[#F4F4F5]">
                  {rssFeed.title} ({rssFeed.episodes.length} episodes)
                </p>
                {rssFeed.episodes.map((ep, idx) => (
                  <div
                    key={`${ep.enclosureUrl}-${idx}`}
                    className="flex items-center justify-between gap-2 py-1.5 border-t border-[#27272F]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {ep.artworkUrl && (
                        <img
                          src={ep.artworkUrl}
                          alt=""
                          className="w-8 h-8 rounded object-cover shrink-0 border border-[#27272F]"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-[#E4E4E7] truncate">
                          {ep.title}
                        </p>
                        <p className="text-[10px] text-[#71717A] font-mono">
                          {ep.duration > 0 ? formatTime(ep.duration) : 'Audio'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="cyan"
                      onClick={() => handleImportRssEpisode(ep)}
                    >
                      Import
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {importJob && (
              <div className="p-3 rounded-lg bg-[#09090B] border border-[#27272F] space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[#F4F4F5]">
                    Status: {importJob.status}
                    {importJob.metadata?.stage && importJob.metadata.stage !== importJob.status
                      ? ` (${importJob.metadata.stage})`
                      : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[#A1A1AA]">
                      {importJob.progress}%
                    </span>
                    {['QUEUED', 'PROCESSING'].includes(importJob.status) && (
                      <button
                        type="button"
                        onClick={async () => {
                          const cancelled = await apiClient.cancelImportJob(importJob.id)
                          setImportJob(cancelled)
                        }}
                        className="text-rose-400 hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                {importJob.error && (
                  <div className="flex items-center justify-between gap-2 text-rose-400">
                    <span>{importJob.error}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const retried = await apiClient.retryImportJob(importJob.id)
                        setImportJob(retried)
                      }}
                      className="inline-flex items-center gap-1 text-[#22D3EE] hover:underline cursor-pointer shrink-0"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {sourceTab === 'external' && (
          <div className="space-y-2">
            <Input
              label="Source Webpage or Media URL"
              placeholder="https://example.com/lecture-or-episode"
              value={sourceUrl}
              onChange={(e) => {
                setSourceUrl(e.target.value)
                setError('')
              }}
            />
            <p className="text-[11px] text-[#71717A] flex items-center gap-1.5">
              <Link2 className="w-3 h-3 shrink-0" />
              Stored as an external media link with timestamped annotations (no
              media downloading).
            </p>
          </div>
        )}

        {submitting && sourceTab === 'upload' && (
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-[#18181D] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#8B5CF6] transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-[#A1A1AA] text-right">
              Uploading... {progress}%
            </p>
          </div>
        )}

        <Input
          label={
            sourceTab === 'import'
              ? `${cfg.recordingNoun} Title (optional for direct URL)`
              : `${cfg.recordingNoun} Title`
          }
          placeholder={
            mode === 'study'
              ? 'e.g. Week 6: Operating Systems Scheduling'
              : 'e.g. Ep. 49 — Building Real-Time Audio Sync'
          }
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setError('')
          }}
          error={error}
        />

        <Textarea
          label="Description"
          placeholder="Context, agenda, or topics covered in this recording..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {sourceTab !== 'import' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Tags (comma-separated)"
              placeholder="e.g. Systems, Review"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#A1A1AA]">
                {cfg.collectionNoun}
              </label>
              <select
                value={playlistId}
                onChange={(e) => setPlaylistId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#09090B] border border-[#27272F] text-sm text-[#F4F4F5] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="">None</option>
                {modePlaylists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {!(sourceTab === 'import' && rssFeed) && (
            <Button
              type="submit"
              variant={mode === 'study' ? 'cyan' : 'primary'}
              disabled={submitting}
            >
              <Upload className="w-3.5 h-3.5" />
              {submitting
                ? 'Processing...'
                : sourceTab === 'import'
                  ? 'Start Import'
                  : 'Create & Open'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}
