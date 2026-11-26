import React from 'react'
import { Link } from 'react-router-dom'

export function Logo({ to = '/', size = 'md', showTagline = false }) {
  const iconSize = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'
  const textSize = size === 'sm' ? 'text-base' : 'text-lg'

  return (
    <Link to={to} className="inline-flex items-center gap-2.5 group">
      <div
        className={`${iconSize} rounded-md bg-[#181816] border border-[#181816] group-hover:bg-[var(--accent-creator)] group-hover:border-[var(--accent-creator)] flex items-center justify-center transition-colors`}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 text-[#F6F4EF]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <path d="M4 12v0" />
          <path d="M8 8v8" />
          <path d="M12 5v14" className="text-[#F4A261]" stroke="currentColor" />
          <path d="M16 9v6" />
          <path d="M20 12v0" />
        </svg>
      </div>
      <div className="leading-none">
        <span className={`${textSize} font-display font-semibold tracking-tight text-[var(--text-primary)]`}>
          EchoSpace
        </span>
        {showTagline && (
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Listen. Understand. Discuss. Create.
          </p>
        )}
      </div>
    </Link>
  )
}
