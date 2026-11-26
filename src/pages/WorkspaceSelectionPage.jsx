import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Mic2, Plus, KeyRound, Users, ArrowRight } from 'lucide-react'
import { Logo } from '../components/common/Logo'
import { WorkspaceCard } from '../components/workspace/WorkspaceCard'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Textarea } from '../components/ui/Input'
import { MODES } from '../config/modeConfig'
import { useEchoStore } from '../store/useEchoStore'

export function WorkspaceSelectionPage() {
  const navigate = useNavigate()
  const activeMode = useEchoStore((s) => s.mode)
  const token = useEchoStore((s) => s.token)
  const workspaces = useEchoStore((s) => s.workspaces)
  const loadWorkspaces = useEchoStore((s) => s.loadWorkspaces)
  const selectWorkspace = useEchoStore((s) => s.selectWorkspace)
  const createAndSelectWorkspace = useEchoStore(
    (s) => s.createAndSelectWorkspace
  )
  const joinWorkspaceByCode = useEchoStore((s) => s.joinWorkspaceByCode)
  const setMode = useEchoStore((s) => s.setMode)

  const [busyMode, setBusyMode] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [wsName, setWsName] = useState('')
  const [wsDesc, setWsDesc] = useState('')
  const [wsMode, setWsMode] = useState('study')
  const [joinCode, setJoinCode] = useState('')
  const [modalError, setModalError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (token) {
      loadWorkspaces().catch(() => {})
    }
  }, [token, loadWorkspaces])

  const handleEnter = async (modeId) => {
    if (!token) {
      setMode(modeId)
      navigate('/login')
      return
    }

    try {
      setBusyMode(modeId)
      const existing = workspaces.find(
        (w) => w.mode.toLowerCase() === modeId
      )
      if (existing) {
        await selectWorkspace(existing.id)
        navigate(modeId === 'study' ? '/app/study' : '/app/creator')
      } else {
        setWsMode(modeId)
        setCreateOpen(true)
      }
    } finally {
      setBusyMode(null)
    }
  }

  const handleOpenWorkspace = async (ws) => {
    await selectWorkspace(ws.id)
    const modeLower = ws.mode.toLowerCase()
    navigate(modeLower === 'study' ? '/app/study' : '/app/creator')
  }

  const handleCreateWorkspace = async (e) => {
    e.preventDefault()
    if (!wsName.trim()) {
      setModalError('Workspace name is required.')
      return
    }
    try {
      setSubmitting(true)
      setModalError('')
      const created = await createAndSelectWorkspace({
        name: wsName.trim(),
        description: wsDesc.trim(),
        mode: wsMode,
      })
      setWsName('')
      setWsDesc('')
      setCreateOpen(false)
      navigate(created.mode === 'STUDY' ? '/app/study' : '/app/creator')
    } catch (err) {
      setModalError(err.response?.data?.error?.message || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoinByCode = async (e) => {
    e.preventDefault()
    const raw = joinCode.trim()
    if (!raw) {
      setModalError('Enter an invitation code or link.')
      return
    }
    // Extract token if user pasted full /join/<token> URL
    const tokenMatch = raw.match(/\/join\/([^/?#]+)/)
    if (tokenMatch) {
      setJoinOpen(false)
      navigate(`/join/${tokenMatch[1]}`)
      return
    }
    try {
      setSubmitting(true)
      setModalError('')
      const res = await joinWorkspaceByCode(raw)
      setJoinCode('')
      setJoinOpen(false)
      navigate(res.workspace.mode === 'STUDY' ? '/app/study' : '/app/creator')
    } catch (err) {
      setModalError(err.response?.data?.error?.message || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F4F4F5] flex flex-col">
      <header className="h-16 px-4 sm:px-8 border-b border-[#27272F] flex items-center justify-between">
        <Logo to="/" />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setModalError('')
              setJoinOpen(true)
            }}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Join Workspace
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setModalError('')
              setCreateOpen(true)
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Create Workspace
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-5xl w-full mx-auto space-y-10">
        {workspaces.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#F4F4F5]">
                My Workspaces ({workspaces.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((ws) => (
                <Card
                  key={ws.id}
                  interactive
                  onClick={() => handleOpenWorkspace(ws)}
                  className="p-4 cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={ws.mode === 'STUDY' ? 'cyan' : 'primary'}>
                        {ws.mode}
                      </Badge>
                      <Badge tone="neutral">{ws.myRole}</Badge>
                    </div>
                    <h3 className="text-sm font-semibold text-[#F4F4F5] truncate">
                      {ws.name}
                    </h3>
                    {ws.description && (
                      <p className="text-xs text-[#A1A1AA] line-clamp-2">
                        {ws.description}
                      </p>
                    )}
                  </div>
                  <div className="pt-2.5 border-t border-[#27272F] flex items-center justify-between text-xs text-[#71717A]">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {ws._count?.members ?? 1} members
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#A1A1AA]">
                      Open <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8B5CF6]">
              Choose Your Mode
            </span>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F4F4F5]">
              How are you using EchoSpace today?
            </h1>
            {busyMode && (
              <p className="text-xs text-[#22D3EE]">
                Loading {busyMode === 'study' ? 'Study' : 'Creator'} workspace...
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <WorkspaceCard
              modeConfig={MODES.study}
              icon={BookOpen}
              isActive={activeMode === 'study'}
              features={[
                'Timestamped questions & unified notes',
                'Manual highlight recording & clips',
                'Subject-based playlists & notifications',
              ]}
              onEnter={handleEnter}
            />

            <WorkspaceCard
              modeConfig={MODES.creator}
              icon={Mic2}
              isActive={activeMode === 'creator'}
              features={[
                'Timestamped feedback & correction markers',
                'Collaborative review & approved highlight clips',
                'Shows, episodes & RSS feed management',
              ]}
              onEnter={handleEnter}
            />
          </div>
        </section>
      </main>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Workspace"
        subtitle="You will automatically become the workspace OWNER."
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <div className="grid grid-cols-2 gap-1 bg-[#09090B] p-1 rounded-lg border border-[#27272F]">
            {['study', 'creator'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setWsMode(m)}
                className={`py-1.5 text-xs font-medium rounded-md capitalize cursor-pointer ${
                  wsMode === m
                    ? 'bg-[#18181D] text-[#F4F4F5]'
                    : 'text-[#A1A1AA]'
                }`}
              >
                {m} Mode
              </button>
            ))}
          </div>
          <Input
            label="Workspace Name"
            placeholder="e.g. CS-402 Systems Study Group"
            value={wsName}
            onChange={(e) => {
              setWsName(e.target.value)
              setModalError('')
            }}
          />
          <Textarea
            label="Description (optional)"
            placeholder="What is this workspace for?"
            value={wsDesc}
            onChange={(e) => setWsDesc(e.target.value)}
          />
          {modalError && <p className="text-xs text-rose-400">{modalError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Workspace'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={joinOpen}
        onClose={() => setJoinOpen(false)}
        title="Join Workspace"
        subtitle="Enter an invitation code (e.g. ECHO-7A9C2F) or paste an invite link."
      >
        <form onSubmit={handleJoinByCode} className="space-y-4">
          <Input
            label="Invitation Code or Link"
            placeholder="ECHO-XXXXXX or http://localhost:5173/join/..."
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value)
              setModalError('')
            }}
          />
          {modalError && <p className="text-xs text-rose-400">{modalError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setJoinOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Joining...' : 'Join Workspace'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
