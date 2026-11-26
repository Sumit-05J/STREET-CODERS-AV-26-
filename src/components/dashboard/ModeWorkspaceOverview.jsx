import React from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import {
  Play,
  Plus,
  MessageSquareText,
  Scissors,
  ListMusic,
  Clock,
  ArrowRight,
  Sparkles,
  Users,
  KeyRound,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Input'
import { ClipCard } from '../clips/ClipCard'
import { PlaylistCard } from '../workspace/PlaylistCard'
import { useEchoStore } from '../../store/useEchoStore'
import {
  getCategoryMeta,
  getModeConfig,
  getStatusMeta,
} from '../../config/modeConfig'
import { formatTime } from '../../utils/time'

export function ModeWorkspaceOverview({ targetMode, titleOverride, subtitleOverride }) {
  const navigate = useNavigate()
  const outletContext = useOutletContext() || {}
  const storeMode = useEchoStore((s) => s.mode)
  const setMode = useEchoStore((s) => s.setMode)
  const user = useEchoStore((s) => s.user)
  const workspaces = useEchoStore((s) => s.workspaces)
  const activeWorkspaceId = useEchoStore((s) => s.activeWorkspaceId)
  const selectWorkspace = useEchoStore((s) => s.selectWorkspace)
  const createAndSelectWorkspace = useEchoStore((s) => s.createAndSelectWorkspace)
  const joinWorkspaceByCode = useEchoStore((s) => s.joinWorkspaceByCode)
  const recordings = useEchoStore((s) => s.recordings)
  const annotations = useEchoStore((s) => s.annotations)
  const clips = useEchoStore((s) => s.clips)
  const playlists = useEchoStore((s) => s.playlists)
  const activity = useEchoStore((s) => s.activity)

  const [createWsOpen, setCreateWsOpen] = React.useState(false)
  const [joinWsOpen, setJoinWsOpen] = React.useState(false)
  const [wsName, setWsName] = React.useState('')
  const [wsDesc, setWsDesc] = React.useState('')
  const [wsMode, setWsMode] = React.useState(targetMode || storeMode || 'study')
  const [joinCode, setJoinCode] = React.useState('')
  const [wsError, setWsError] = React.useState('')
  const [wsBusy, setWsBusy] = React.useState(false)

  const activeMode = targetMode || storeMode
  const cfg = getModeConfig(activeMode)
  const isStudy = activeMode === 'study'

  const modeRecordings = recordings.filter((r) => r.mode === activeMode)
  const modeAnnotations = annotations.filter((a) => a.mode === activeMode)
  const openAnnotations = modeAnnotations.filter((a) => a.status !== 'resolved')
  const modeClips = clips.filter((c) => c.mode === activeMode)
  const modePlaylists = playlists.filter((p) => p.mode === activeMode)
  const modeActivity = activity.filter((act) => act.mode === activeMode).slice(0, 5)

  const sectionTitle = (id) =>
    cfg.dashboardSections.find((s) => s.id === id)?.title || id

  const handleModeSwitch = (nextMode) => {
    setMode(nextMode)
    if (targetMode) {
      navigate(nextMode === 'study' ? '/app/study' : '/app/creator')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={isStudy ? 'cyan' : 'primary'}>{cfg.name}</Badge>
            <span className="text-xs text-[var(--text-muted)]">{cfg.tagline}</span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-[var(--text-primary)] tracking-tight mt-2">
            {titleOverride || `Welcome back, ${user.name.split(' ')[0]}`}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {subtitleOverride || cfg.description}
          </p>
        </div>

        {/* Workspace Switcher & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-[var(--surface)] border border-[var(--border)] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => handleModeSwitch('study')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeMode === 'study'
                  ? 'bg-[var(--accent-study)]/15 text-[var(--accent-study)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Study Mode
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('creator')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeMode === 'creator'
                  ? 'bg-[var(--accent-creator)]/15 text-[var(--accent-creator)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Creator Mode
            </button>
          </div>

          <Button
            size="sm"
            variant={isStudy ? 'cyan' : 'primary'}
            onClick={() => outletContext.openUploadModal?.()}
          >
            <Plus className="w-3.5 h-3.5" />
            {cfg.primaryAction.label}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setWsError('')
              setJoinWsOpen(true)
            }}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Join Workspace
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setWsError('')
              setWsMode(activeMode)
              setCreateWsOpen(true)
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            New Workspace
          </Button>
        </div>
      </div>

      {/* My Workspaces */}
      {workspaces.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              My Workspaces ({workspaces.length})
            </h2>
            <Link
              to="/app/members"
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
            >
              Manage members &amp; invites <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {workspaces.map((ws) => (
              <Card
                key={ws.id}
                interactive
                onClick={() => {
                  selectWorkspace(ws.id)
                  navigate(ws.mode === 'STUDY' ? '/app/study' : '/app/creator')
                }}
                className={`p-3.5 cursor-pointer flex items-center justify-between gap-3 ${
                  ws.id === activeWorkspaceId ? 'border-[var(--accent-creator)]/60 bg-[#141418]' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Badge tone={ws.mode === 'STUDY' ? 'cyan' : 'primary'}>
                      {ws.mode}
                    </Badge>
                    <Badge tone="neutral">{ws.myRole}</Badge>
                  </div>
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate mt-1.5">
                    {ws.name}
                  </p>
                </div>
                <span className="text-[11px] text-[var(--text-muted)] inline-flex items-center gap-1 shrink-0">
                  <Users className="w-3 h-3" />
                  {ws._count?.members ?? 1}
                </span>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-[var(--text-secondary)]">{cfg.recordingPlural}</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">
            {modeRecordings.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--text-secondary)]">{sectionTitle('openItems')}</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">
            {openAnnotations.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--text-secondary)]">{sectionTitle('highlights')}</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">
            {modeClips.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--text-secondary)]">{cfg.collectionPlural}</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">
            {modePlaylists.length}
          </p>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 columns: Recent Recordings + Open Annotations + Clips */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Recordings */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {sectionTitle('recentRecordings')}
              </h2>
              <Link
                to="/app/recordings"
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {modeRecordings.map((rec) => {
                const recAnnCount = modeAnnotations.filter(
                  (a) => a.recordingId === rec.id
                ).length
                return (
                  <Card
                    key={rec.id}
                    interactive
                    onClick={() => navigate(`/app/recordings/${rec.id}`)}
                    className="p-4 cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${
                          isStudy
                            ? 'bg-[var(--accent-study)]/10 border-[var(--accent-study)]/30 text-[var(--accent-study)]'
                            : 'bg-[var(--accent-creator)]/10 border-[var(--accent-creator)]/30 text-[var(--accent-creator)]'
                        }`}
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {rec.title}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                          {rec.authorName} · {rec.createdAt} ·{' '}
                          <span className="font-mono">{formatTime(rec.duration)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] border border-[var(--border)] px-2 py-1 rounded-md">
                        <MessageSquareText className="w-3 h-3" />
                        {recAnnCount}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>

          {/* Unresolved Questions / Pending Feedback */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {sectionTitle('openItems')}
              </h2>
              <Link
                to="/app/discussions"
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
              >
                All discussions <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {openAnnotations.slice(0, 3).map((ann) => {
                const cat = getCategoryMeta(activeMode, ann.category)
                const statusMeta = getStatusMeta(activeMode, ann.status)
                return (
                  <Card
                    key={ann.id}
                    interactive
                    onClick={() => navigate(`/app/recordings/${ann.recordingId}`)}
                    className="p-3.5 cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${cat.badgeClass}`}
                        >
                          {cat.label}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                          {formatTime(ann.timestamp)}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-medium ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-primary)] line-clamp-2">
                      {ann.content}
                    </p>
                  </Card>
                )
              })}
              {openAnnotations.length === 0 && (
                <Card className="p-4 text-xs text-[var(--text-secondary)]">
                  All caught up — no open items right now.
                </Card>
              )}
            </div>
          </section>

          {/* Recent Clips */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {sectionTitle('highlights')}
              </h2>
              <Link
                to="/app/highlights"
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
              >
                All clips <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {modeClips.slice(0, 2).map((clip) => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  onPlayClip={(c) => navigate(`/app/recordings/${c.recordingId}`)}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Right column: Playlists + Activity */}
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {sectionTitle('collections')}
              </h2>
              <Link
                to="/app/playlists"
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
              >
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {modePlaylists.map((pl) => (
                <PlaylistCard
                  key={pl.id}
                  playlist={pl}
                  onSelect={() => navigate('/app/playlists')}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {sectionTitle('activity')}
            </h2>
            <Card className="p-4 divide-y divide-[var(--border)]">
              {modeActivity.map((act) => (
                <div key={act.id} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="text-xs text-[var(--text-primary)]">
                    <span className="font-medium text-[var(--text-primary)]">
                      {act.actor}
                    </span>{' '}
                    <span className="text-[var(--text-secondary)]">{act.action}</span>{' '}
                    <span className="font-medium text-[var(--text-primary)]">
                      {act.target}
                    </span>
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {act.time}
                  </p>
                </div>
              ))}
            </Card>
          </section>

          <Card elevated className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary)]">
              <Sparkles className="w-4 h-4 text-[var(--accent-study)]" />
              Quick Tip
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Open any {cfg.recordingNoun.toLowerCase()} to drop timestamped{' '}
              {cfg.annotationCategories.map((c) => c.label.toLowerCase()).join(', ')}{' '}
              markers directly on the interactive waveform.
            </p>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={createWsOpen}
        onClose={() => setCreateWsOpen(false)}
        title="Create Workspace"
        subtitle="Create a collaborative Study or Creator workspace."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!wsName.trim()) {
              setWsError('Workspace name is required.')
              return
            }
            try {
              setWsBusy(true)
              setWsError('')
              const created = await createAndSelectWorkspace({
                name: wsName.trim(),
                description: wsDesc.trim(),
                mode: wsMode,
              })
              setWsName('')
              setWsDesc('')
              setCreateWsOpen(false)
              navigate(created.mode === 'STUDY' ? '/app/study' : '/app/creator')
            } catch (err) {
              setWsError(err.response?.data?.error?.message || err.message)
            } finally {
              setWsBusy(false)
            }
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-1 bg-[var(--bg-primary)] p-1 rounded-lg border border-[var(--border)]">
            {['study', 'creator'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setWsMode(m)}
                className={`py-1.5 text-xs font-medium rounded-md capitalize cursor-pointer ${
                  wsMode === m
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {m} Mode
              </button>
            ))}
          </div>
          <Input
            label="Workspace Name"
            placeholder="e.g. Distributed Systems Study Group"
            value={wsName}
            onChange={(e) => setWsName(e.target.value)}
          />
          <Textarea
            label="Description (optional)"
            placeholder="Workspace description..."
            value={wsDesc}
            onChange={(e) => setWsDesc(e.target.value)}
          />
          {wsError && <p className="text-xs text-[var(--danger)]">{wsError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCreateWsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={wsBusy}>
              {wsBusy ? 'Creating...' : 'Create Workspace'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={joinWsOpen}
        onClose={() => setJoinWsOpen(false)}
        title="Join Workspace"
        subtitle="Enter an invitation code or paste an invitation link."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const raw = joinCode.trim()
            if (!raw) {
              setWsError('Enter an invitation code or link.')
              return
            }
            const tokenMatch = raw.match(/\/join\/([^/?#]+)/)
            if (tokenMatch) {
              setJoinWsOpen(false)
              navigate(`/join/${tokenMatch[1]}`)
              return
            }
            try {
              setWsBusy(true)
              setWsError('')
              const res = await joinWorkspaceByCode(raw)
              setJoinCode('')
              setJoinWsOpen(false)
              navigate(
                res.workspace.mode === 'STUDY' ? '/app/study' : '/app/creator'
              )
            } catch (err) {
              setWsError(err.response?.data?.error?.message || err.message)
            } finally {
              setWsBusy(false)
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Invitation Code or Link"
            placeholder="ECHO-XXXXXX or http://localhost:5173/join/..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          {wsError && <p className="text-xs text-[var(--danger)]">{wsError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setJoinWsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={wsBusy}>
              {wsBusy ? 'Joining...' : 'Join Workspace'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
