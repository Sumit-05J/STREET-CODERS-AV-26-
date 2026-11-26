import React, { useEffect, useState } from 'react'
import { Clock, Send } from 'lucide-react'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Input'
import { getModeConfig } from '../../config/modeConfig'
import { formatTime, parseTimeInput } from '../../utils/time'

export function AnnotationForm({
  mode,
  currentTime = 0,
  onSubmit,
  onCancel,
}) {
  const cfg = getModeConfig(mode)
  const [category, setCategory] = useState(cfg.annotationCategories[0].id)
  const [timeInput, setTimeInput] = useState(formatTime(currentTime))
  const [content, setContent] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setCategory(cfg.annotationCategories[0].id)
  }, [mode])

  useEffect(() => {
    setTimeInput(formatTime(currentTime))
  }, [currentTime])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!content.trim()) {
      setError('Please enter your note or question.')
      return
    }
    onSubmit({
      timestamp: parseTimeInput(timeInput),
      category,
      content: content.trim(),
    })
    setContent('')
    setError('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-3.5 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {cfg.annotationCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                category === cat.id
                  ? cat.badgeClass
                  : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md px-2 py-1">
          <Clock className="w-3 h-3 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            className="w-12 bg-transparent font-mono text-xs text-[var(--text-primary)] focus:outline-none text-center"
            aria-label="Timestamp"
          />
        </div>
      </div>

      <Textarea
        rows={2}
        placeholder={
          mode === 'study'
            ? 'Ask a question, capture an insight, or mark for revision...'
            : 'Leave timestamped feedback, a correction marker, or an edit suggestion...'
        }
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          setError('')
        }}
        error={error}
      />

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          variant={mode === 'study' ? 'cyan' : 'primary'}
        >
          <Send className="w-3.5 h-3.5" />
          Post Annotation
        </Button>
      </div>
    </form>
  )
}
