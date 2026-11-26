import React from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Mic } from 'lucide-react'
import { Logo } from '../components/common/Logo'
import { WorkspaceCard } from '../components/workspace/WorkspaceCard'
import { MODES } from '../config/modeConfig'
import { useEchoStore } from '../store/useEchoStore'

export function WorkspaceSelectPage() {
  const navigate = useNavigate()
  const activeMode = useEchoStore((s) => s.mode)
  const setMode = useEchoStore((s) => s.setMode)

  const handleSelect = (modeId) => {
    setMode(modeId)
    navigate(modeId === 'study' ? '/app/study' : '/app/creator')
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <Logo to="/" />
        <span className="text-xs text-[var(--text-secondary)]">
          Select a collaborative mode
        </span>
      </div>

      <div className="max-w-4xl w-full mx-auto my-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Choose your EchoSpace workspace
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Both modes share the same waveform, annotation, and clip engine —
            tailored to your workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WorkspaceCard
            modeConfig={MODES.study}
            icon={BookOpen}
            isActive={activeMode === 'study'}
            highlights={[
              'Timestamped questions & doubt resolution',
              'Important insights & revision highlights',
              'Subject-based lecture playlists',
            ]}
            onSelect={() => handleSelect('study')}
          />

          <WorkspaceCard
            modeConfig={MODES.creator}
            icon={Mic}
            isActive={activeMode === 'creator'}
            highlights={[
              'Timestamped feedback & correction markers',
              'Improvement suggestions & review status',
              'Shows, episodes & RSS feed management',
            ]}
            onSelect={() => handleSelect('creator')}
          />
        </div>
      </div>

      <div className="text-center text-xs text-[var(--text-muted)]">
        You can switch between Study and Creator modes anytime from the sidebar.
      </div>
    </div>
  )
}
