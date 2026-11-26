import React from 'react'

export function Card({
  children,
  className = '',
  elevated = false,
  interactive = false,
  ...props
}) {
  return (
    <div
      className={`rounded-lg border border-[var(--border)] ${
        elevated ? 'bg-[var(--bg-secondary)]/75' : 'bg-[var(--surface)]'
      } ${
        interactive
          ? 'transition-all duration-150 hover:border-[var(--border-strong)] hover:shadow-[0_4px_14px_rgba(24,24,22,0.05)]'
          : 'shadow-[0_1px_2px_rgba(24,24,22,0.03)]'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
