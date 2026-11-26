import React from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../../utils/theme'

const OPTIONS = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
]

export function ThemeSwitcher({ showLabels = false, className = '' }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label="Color theme"
      className={`inline-flex items-center p-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border)] ${className}`}
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon
        const active = theme === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            title={`${opt.label} theme`}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
              active
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {showLabels && <span>{opt.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
