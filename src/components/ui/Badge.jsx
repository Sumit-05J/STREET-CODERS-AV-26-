import React from 'react'

const TONES = {
  neutral: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)]',
  primary: 'bg-[var(--accent-creator)]/10 text-[var(--accent-creator)] border-[var(--accent-creator)]/25',
  cyan: 'bg-[var(--accent-study)]/10 text-[var(--accent-study)] border-[var(--accent-study)]/25',
  amber: 'bg-[#B7791F]/10 text-[var(--warning)] border-[#B7791F]/25',
  emerald: 'bg-[var(--accent-study)]/12 text-[var(--success)] border-[var(--accent-study)]/30',
  rose: 'bg-[#B93829]/10 text-[var(--danger)] border-[#B93829]/25',
}

export function Badge({ children, tone = 'neutral', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium tracking-wide ${
        TONES[tone] || TONES.neutral
      } ${className}`}
    >
      {children}
    </span>
  )
}
