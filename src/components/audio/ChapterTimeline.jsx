import React from 'react'
import { Trash2 } from 'lucide-react'
import { formatTime } from '../../utils/time'

export function ChapterTimeline({
  chapters = [],
  currentTime = 0,
  onSelectChapter,
  onDeleteChapter,
}) {
  if (!chapters.length) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Chapters
        </span>
        <span className="text-[11px] text-[var(--text-muted)]">
          {chapters.length} sections
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {chapters.map((ch, idx) => {
          const next = chapters[idx + 1]
          const isCurrent =
            currentTime >= ch.startTime &&
            (!next || currentTime < next.startTime)

          return (
            <div
              key={ch.id}
              className={`group relative rounded-lg border transition-colors ${
                isCurrent
                  ? 'bg-[var(--bg-secondary)] border-[var(--accent-creator)]/50 text-[var(--text-primary)]'
                  : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectChapter?.(ch.startTime)}
                className="w-full text-left px-3 py-2 pr-7 cursor-pointer"
              >
                <span className="block font-mono text-[10px] text-[var(--accent-study)]">
                  {formatTime(ch.startTime)}
                </span>
                <span className="block text-xs font-medium truncate mt-0.5">
                  {ch.title}
                </span>
              </button>
              {onDeleteChapter && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete chapter "${ch.title}"?`)) {
                      onDeleteChapter(ch.id)
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 text-[var(--text-muted)] hover:text-[var(--danger)] transition-opacity cursor-pointer"
                  title="Delete chapter"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
