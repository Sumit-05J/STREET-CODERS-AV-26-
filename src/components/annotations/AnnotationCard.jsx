import React, { useState } from 'react'
import { Clock, MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { Avatar } from '../common/Avatar'
import { ReplyThread } from '../discussions/ReplyThread'
import { getCategoryMeta, getModeConfig, getStatusMeta } from '../../config/modeConfig'
import { formatTime } from '../../utils/time'

export function AnnotationCard({
  annotation,
  mode,
  isActive = false,
  canModify = false,
  currentUserId = null,
  isManager = false,
  onSeek,
  onStatusChange,
  onEdit,
  onDelete,
  onAddReply,
  onDeleteReply,
  defaultExpanded = false,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(annotation.content)
  const cfg = getModeConfig(mode)
  const cat = getCategoryMeta(mode, annotation.category)
  const statusMeta = getStatusMeta(mode, annotation.status)

  const handleCardClick = (e) => {
    if (!onSeek) return
    if (e.target.closest('button, select, input, textarea, a, form')) return
    onSeek(annotation)
  }

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-lg border p-3.5 transition-all ${
        onSeek ? 'cursor-pointer' : ''
      } ${
        isActive
          ? mode === 'study'
            ? 'bg-[var(--accent-study)]/6 border-[var(--accent-study)] shadow-[0_2px_10px_rgba(63,106,88,0.08)]'
            : 'bg-[var(--accent-creator)]/6 border-[var(--accent-creator)] shadow-[0_2px_10px_rgba(217,83,47,0.08)]'
          : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-strong)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={annotation.authorName} size="sm" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
              {annotation.authorName}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">{annotation.createdAt}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSeek?.(annotation)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[#181816] font-mono text-[11px] text-[var(--text-primary)] shrink-0 cursor-pointer"
          title="Jump to timestamp"
        >
          <Clock className="w-3 h-3 text-[var(--text-secondary)]" />
          {formatTime(annotation.timestamp)}
        </button>
      </div>

      {/* Category & Status */}
      <div className="flex items-center justify-between gap-2 mt-2.5">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-semibold tracking-wide ${cat.badgeClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${cat.dotClass}`} />
          {cat.label.toUpperCase()}
        </span>

        {onStatusChange ? (
          <select
            value={annotation.status}
            onChange={(e) => onStatusChange(annotation.id, e.target.value)}
            className={`px-2 py-0.5 rounded border text-[11px] font-medium bg-[var(--surface)] focus:outline-none cursor-pointer ${statusMeta.badgeClass}`}
            aria-label="Annotation status"
          >
            {Object.entries(cfg.statusLabels).map(([key, meta]) => (
              <option key={key} value={key} className="bg-[var(--surface)] text-[var(--text-primary)]">
                {meta.label}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`px-2 py-0.5 rounded border text-[11px] font-medium ${statusMeta.badgeClass}`}
          >
            {statusMeta.label}
          </span>
        )}
      </div>

      {/* Body or Inline Edit */}
      {editing ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!editText.trim()) return
            await onEdit?.(annotation.id, editText.trim())
            setEditing(false)
          }}
          className="mt-2.5 space-y-2"
        >
          <textarea
            rows={2}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-creator)]"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setEditText(annotation.content)
                setEditing(false)
              }}
              className="px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2.5 py-1 rounded bg-[var(--accent-creator)] text-white text-[11px] font-medium cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-[var(--text-primary)] mt-2.5 leading-relaxed">
          {annotation.content}
        </p>
      )}

      {/* Footer toggle & edit/delete */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>
            {annotation.replies.length}{' '}
            {annotation.replies.length === 1 ? 'reply' : 'replies'}
          </span>
          <span className="text-[var(--text-muted)]">· {expanded ? 'Hide' : 'Discuss'}</span>
        </button>

        {canModify && (onEdit || onDelete) && (
          <div className="flex items-center gap-1.5">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditText(annotation.content)
                  setEditing((p) => !p)
                }}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                title="Edit annotation"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete this annotation and its replies?')) {
                    onDelete(annotation.id)
                  }
                }}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                title="Delete annotation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <ReplyThread
          replies={annotation.replies}
          currentUserId={currentUserId}
          isManager={isManager}
          onAddReply={
            onAddReply
              ? (text) => onAddReply(annotation.id, text)
              : undefined
          }
          onDeleteReply={
            onDeleteReply
              ? (replyId) => onDeleteReply(annotation.id, replyId)
              : undefined
          }
        />
      )}
    </div>
  )
}
