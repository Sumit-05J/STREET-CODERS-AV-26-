import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { AnnotationCard } from '../components/annotations/AnnotationCard'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { useEchoStore } from '../store/useEchoStore'
import { getModeConfig } from '../config/modeConfig'

export function DiscussionsPage() {
  const navigate = useNavigate()
  const mode = useEchoStore((s) => s.mode)
  const annotations = useEchoStore((s) => s.annotations)
  const recordings = useEchoStore((s) => s.recordings)
  const updateAnnotationStatus = useEchoStore((s) => s.updateAnnotationStatus)
  const addReply = useEchoStore((s) => s.addReply)
  const cfg = getModeConfig(mode)

  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const modeAnnotations = annotations.filter((a) => {
    if (a.mode !== mode) return false
    if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false
    return true
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Badge tone={mode === 'study' ? 'cyan' : 'primary'}>{cfg.name}</Badge>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mt-2">
          Discussions &amp; Annotations
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          All timestamped threads across your {cfg.recordingPlural.toLowerCase()}.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {cfg.filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setCategoryFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                categoryFilter === f
                  ? 'bg-[var(--bg-secondary)] border-[var(--border-strong)] text-[var(--text-primary)]'
                  : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {f === 'ALL' ? 'All Categories' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 px-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          {Object.entries(cfg.statusLabels).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>
      </div>

      {/* Threads */}
      <div className="space-y-4">
        {modeAnnotations.map((ann) => {
          const rec = recordings.find((r) => r.id === ann.recordingId)
          return (
            <div key={ann.id} className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/app/recordings/${ann.recordingId}?t=${Math.floor(ann.timestamp)}&ann=${ann.id}&autoplay=1`
                    )
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <span>{rec?.title || 'Recording'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <AnnotationCard
                annotation={ann}
                mode={mode}
                onSeek={() =>
                  navigate(
                    `/app/recordings/${ann.recordingId}?t=${Math.floor(ann.timestamp)}&ann=${ann.id}&autoplay=1`
                  )
                }
                onStatusChange={updateAnnotationStatus}
                onAddReply={addReply}
                defaultExpanded
              />
            </div>
          )
        })}

        {modeAnnotations.length === 0 && (
          <Card className="p-8 text-center text-sm text-[var(--text-secondary)]">
            {cfg.emptyStateText}
          </Card>
        )}
      </div>
    </div>
  )
}
