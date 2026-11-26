import React from 'react'
import { formatTime } from '../../utils/time'
import { getCategoryMeta } from '../../config/modeConfig'

export function TimelineMarker({
  annotation,
  duration,
  mode,
  isActive,
  onSelect,
}) {
  if (!duration || duration <= 0) return null
  const percent = Math.min(98, Math.max(2, (annotation.timestamp / duration) * 100))
  const cat = getCategoryMeta(mode, annotation.category)

  return (
    <button
      type="button"
      onClick={() => onSelect?.(annotation)}
      style={{ left: `${percent}%` }}
      title={`${formatTime(annotation.timestamp)} • ${cat.label}: ${annotation.content}`}
      className={`group absolute -translate-x-1/2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center cursor-pointer focus:outline-none`}
    >
      <span
        className={`w-3 h-3 rounded-full border-2 border-[#09090B] transition-transform duration-150 ${
          isActive ? 'scale-125 ring-2 ring-white/40' : 'group-hover:scale-125'
        }`}
        style={{ backgroundColor: cat.color }}
      />
      <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-[10px] text-[var(--text-primary)] whitespace-nowrap shadow-lg">
        {formatTime(annotation.timestamp)} · {cat.label}
      </span>
    </button>
  )
}
