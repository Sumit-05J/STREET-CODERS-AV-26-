import React from 'react'
import { Link } from 'react-router-dom'
import { Play, Share2, Clock, Eye, Trash2 } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { formatTime } from '../../utils/time'

export function ClipCard({ clip, onPlayClip, onDeleteClip }) {
  const clipDuration = Math.max(1, Math.round(clip.endTime - clip.startTime))
  const shareId = clip.shareToken || clip.id

  return (
    <Card interactive className="p-4 flex flex-col justify-between gap-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Badge tone={clip.mode === 'study' ? 'cyan' : 'primary'}>
            {formatTime(clip.startTime)} – {formatTime(clip.endTime)}
          </Badge>
          <span className="text-[11px] text-[var(--text-muted)] font-mono">
            {clipDuration}s
          </span>
        </div>

        <h4 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1">
          {clip.title}
        </h4>

        <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
          From: {clip.recordingTitle}
        </p>

        {clip.notes && (
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {clip.notes}
          </p>
        )}
      </div>

      <div className="pt-2.5 border-t border-[var(--border)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {clip.createdAt}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {clip.views ?? 0}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onPlayClip && (
            <button
              type="button"
              onClick={() => onPlayClip(clip)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--bg-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3" />
              Play
            </button>
          )}
          <Link
            to={`/clips/${shareId}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Share2 className="w-3 h-3" />
            Share
          </Link>
          {onDeleteClip && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete clip "${clip.title}"?`)) {
                  onDeleteClip(clip.id)
                }
              }}
              className="p-1.5 rounded-md bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors cursor-pointer"
              title="Delete clip"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
