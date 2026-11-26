import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Play,
  ArrowUp,
  ArrowDown,
  Rss,
  Copy,
  Check,
  ListMusic,
  Trash2,
} from 'lucide-react'
import { PlaylistCard } from '../components/workspace/PlaylistCard'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input, Textarea } from '../components/ui/Input'
import { useEchoStore } from '../store/useEchoStore'
import { getModeConfig } from '../config/modeConfig'
import { formatTime } from '../utils/time'

export function PlaylistsPage() {
  const navigate = useNavigate()
  const mode = useEchoStore((s) => s.mode)
  const playlists = useEchoStore((s) => s.playlists)
  const recordings = useEchoStore((s) => s.recordings)
  const addPlaylist = useEchoStore((s) => s.addPlaylist)
  const deletePlaylist = useEchoStore((s) => s.deletePlaylist)
  const reorderPlaylistRecordings = useEchoStore(
    (s) => s.reorderPlaylistRecordings
  )

  const cfg = getModeConfig(mode)
  const modePlaylists = playlists.filter((p) => p.mode === mode)
  const modeRecordings = recordings.filter((r) => r.mode === mode)

  const [selectedId, setSelectedId] = useState(modePlaylists[0]?.id || null)
  const [createOpen, setCreateOpen] = useState(false)
  const [copiedRss, setCopiedRss] = useState(false)

  // Create form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [rssUrl, setRssUrl] = useState('')
  const [error, setError] = useState('')

  const activePlaylist =
    modePlaylists.find((p) => p.id === selectedId) || modePlaylists[0] || null

  const orderedRecordings = (activePlaylist?.recordingIds || [])
    .map((rid) => recordings.find((r) => r.id === rid))
    .filter(Boolean)

  const handleMove = (index, direction) => {
    if (!activePlaylist) return
    const next = [...activePlaylist.recordingIds]
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= next.length) return
    ;[next[index], next[targetIdx]] = [next[targetIdx], next[index]]
    reorderPlaylistRecordings(activePlaylist.id, next)
  }

  const handleCreate = (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError(`Please enter a ${cfg.collectionNoun.toLowerCase()} name.`)
      return
    }
    const created = addPlaylist({
      title: title.trim(),
      description:
        description.trim() ||
        `Curated ${cfg.collectionNoun.toLowerCase()} in ${cfg.name}.`,
      rssUrl: mode === 'creator' ? rssUrl.trim() : '',
      recordingIds: modeRecordings.slice(0, 1).map((r) => r.id),
    })
    setSelectedId(created.id)
    setTitle('')
    setDescription('')
    setRssUrl('')
    setError('')
    setCreateOpen(false)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge tone={mode === 'study' ? 'cyan' : 'primary'}>{cfg.name}</Badge>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mt-2">
            {cfg.collectionPlural}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {mode === 'study'
              ? 'Organize lectures into structured subject playlists for revision.'
              : 'Manage podcast shows, episode ordering, and RSS syndication feeds.'}
          </p>
        </div>

        <Button
          variant={mode === 'study' ? 'cyan' : 'primary'}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-4 h-4" />
          {cfg.secondaryAction.label}
        </Button>
      </div>

      {/* Playlist cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modePlaylists.map((pl) => (
          <PlaylistCard
            key={pl.id}
            playlist={pl}
            onSelect={(p) => setSelectedId(p.id)}
          />
        ))}
      </div>

      {/* Selected Playlist Detail + Episode Ordering */}
      {activePlaylist && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[var(--border)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-[var(--text-secondary)]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {activePlaylist.title}
                </h2>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {activePlaylist.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {orderedRecordings[0] && (
                <Button
                  size="sm"
                  variant={mode === 'study' ? 'cyan' : 'primary'}
                  onClick={() =>
                    navigate(`/app/recordings/${orderedRecordings[0].id}`)
                  }
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Play First
                </Button>
              )}
              <Button
                size="sm"
                variant="danger"
                onClick={async () => {
                  if (
                    window.confirm(
                      `Delete "${activePlaylist.title}"? Recordings will remain in your workspace.`
                    )
                  ) {
                    await deletePlaylist(activePlaylist.id)
                    setSelectedId(null)
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </div>
          </div>

          {/* RSS Feed bar in Creator Mode */}
          {mode === 'creator' && (
            <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs min-w-0">
                <Rss className="w-4 h-4 text-[var(--accent-creator)] shrink-0" />
                <span className="text-[var(--text-secondary)] shrink-0">RSS Feed:</span>
                <span className="font-mono text-[var(--text-primary)] truncate">
                  {activePlaylist.rssUrl ||
                    `https://feeds.echospace.app/${activePlaylist.id}.xml`}
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    activePlaylist.rssUrl ||
                      `https://feeds.echospace.app/${activePlaylist.id}.xml`
                  )
                  setCopiedRss(true)
                  setTimeout(() => setCopiedRss(false), 1800)
                }}
              >
                {copiedRss ? (
                  <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedRss ? 'Copied' : 'Copy RSS'}
              </Button>
            </div>
          )}

          {/* Ordered Recording List */}
          <div className="space-y-2">
            {orderedRecordings.map((rec, idx) => (
              <div
                key={rec.id}
                className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center font-mono text-xs text-[var(--text-secondary)] shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/app/recordings/${rec.id}`)}
                      className="text-sm font-medium text-[var(--text-primary)] hover:underline truncate block text-left cursor-pointer"
                    >
                      {rec.title}
                    </button>
                    <p className="text-xs text-[var(--text-muted)]">
                      {rec.authorName} ·{' '}
                      <span className="font-mono">{formatTime(rec.duration)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, -1)}
                    className="p-1.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === orderedRecordings.length - 1}
                    onClick={() => handleMove(idx, 1)}
                    className="p-1.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/app/recordings/${rec.id}`)}
                  >
                    <Play className="w-3 h-3" />
                    Open
                  </Button>
                </div>
              </div>
            ))}

            {orderedRecordings.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                No {cfg.recordingPlural.toLowerCase()} in this{' '}
                {cfg.collectionNoun.toLowerCase()} yet.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Create Playlist / Show Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title={cfg.secondaryAction.label}
        subtitle={`Create a new ${cfg.collectionNoun.toLowerCase()} in ${cfg.name}.`}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label={`${cfg.collectionNoun} Title`}
            placeholder={
              mode === 'study'
                ? 'e.g. CS-510 Compilers & Runtime'
                : 'e.g. Founder Audio Diaries'
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
            placeholder="What belongs in this collection?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {mode === 'creator' && (
            <Input
              label="RSS Feed URL (optional)"
              placeholder="https://feeds.echospace.app/my-show.xml"
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
            />
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={mode === 'study' ? 'cyan' : 'primary'}
            >
              Create {cfg.collectionNoun}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
