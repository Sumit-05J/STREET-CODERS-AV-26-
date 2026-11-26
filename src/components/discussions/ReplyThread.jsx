import React, { useState } from 'react'
import { CornerDownRight, Trash2 } from 'lucide-react'
import { Avatar } from '../common/Avatar'
import { Button } from '../ui/Button'

export function ReplyThread({
  replies = [],
  currentUserId = null,
  isManager = false,
  onAddReply,
  onDeleteReply,
}) {
  const [replyText, setReplyText] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) return
    await onAddReply?.(replyText.trim())
    setReplyText('')
  }

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border)]/80 space-y-2.5">
      {replies.map((rep) => {
        const canDelete =
          onDeleteReply &&
          (isManager || (currentUserId && rep.authorId === currentUserId))
        return (
          <div key={rep.id} className="flex items-start gap-2.5 pl-2 group">
            <CornerDownRight className="w-3.5 h-3.5 text-[#52525B] mt-1 shrink-0" />
            <Avatar name={rep.authorName} color="#3F3F46" size="xs" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">
                    {rep.authorName}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {rep.createdAt}
                  </span>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this reply?')) {
                        onDeleteReply(rep.id)
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-opacity cursor-pointer"
                    title="Delete reply"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                {rep.content}
              </p>
            </div>
          </div>
        )
      })}

      {onAddReply && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 h-8 px-2.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-creator)]"
          />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={!replyText.trim()}
          >
            Reply
          </Button>
        </form>
      )}
    </div>
  )
}
