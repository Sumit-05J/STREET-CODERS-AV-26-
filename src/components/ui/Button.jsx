import React from 'react'

const VARIANTS = {
  primary:
    'bg-[var(--accent-creator)] hover:bg-[var(--accent-creator-hover)] active:bg-[#AE3C1D] text-white border border-[var(--accent-creator-hover)] shadow-[0_1px_2px_rgba(24,24,22,0.08)]',
  secondary:
    'bg-[var(--surface)] hover:bg-[var(--bg-secondary)] active:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-strong)]',
  cyan:
    'bg-[var(--accent-study)] hover:bg-[var(--accent-study-hover)] active:bg-[#2A483C] text-white border border-[var(--accent-study-hover)] shadow-[0_1px_2px_rgba(24,24,22,0.08)]',
  ghost:
    'bg-transparent hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent',
  danger:
    'bg-[#B93829]/10 hover:bg-[#B93829]/18 text-[var(--danger)] border border-[#B93829]/30',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#D9532F]/35 ${
        VARIANTS[variant] || VARIANTS.primary
      } ${SIZES[size] || SIZES.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
