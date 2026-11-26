import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function Dropdown({
  trigger,
  items = [],
  align = 'right',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <div onClick={() => setOpen((v) => !v)} className="cursor-pointer">
        {trigger || (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)]"
          >
            Options <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          </button>
        )}
      </div>

      {open && (
        <div
          className={`absolute z-40 mt-1.5 min-w-44 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-[0_12px_32px_rgba(24,24,22,0.12)] py-1 ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {items.map((item, idx) => (
            <button
              key={item.id || idx}
              type="button"
              onClick={() => {
                item.onClick?.()
                setOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                item.active
                  ? 'bg-[var(--accent-creator)]/10 text-[var(--accent-creator)] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {item.icon && <item.icon className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
