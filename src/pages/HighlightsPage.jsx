import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors } from 'lucide-react'
import { ClipCard } from '../components/clips/ClipCard'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { useEchoStore } from '../store/useEchoStore'
import { getModeConfig } from '../config/modeConfig'

export function HighlightsPage() {
  const navigate = useNavigate()
  const mode = useEchoStore((s) => s.mode)
  const clips = useEchoStore((s) => s.clips)
  const cfg = getModeConfig(mode)

  const modeClips = clips.filter((c) => c.mode === mode)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge tone={mode === 'study' ? 'cyan' : 'primary'}>{cfg.name}</Badge>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mt-2">
            {mode === 'study' ? 'Revision Highlights' : 'Approved Highlights'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Shareable audio moments extracted from your{' '}
            {cfg.recordingPlural.toLowerCase()}.
          </p>
        </div>
      </div>

      {modeClips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modeClips.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              onPlayClip={(c) => navigate(`/app/recordings/${c.recordingId}`)}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center space-y-2">
          <Scissors className="w-6 h-6 text-[var(--text-muted)] mx-auto" />
          <p className="text-sm text-[var(--text-secondary)]">
            No highlight clips created in {cfg.name} yet.
          </p>
        </Card>
      )}
    </div>
  )
}
