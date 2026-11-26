import React from 'react'
import { Link } from 'react-router-dom'
import { ListMusic, Rss, ArrowUpRight } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'

export function PlaylistCard({ playlist }) {
  const isCreator = playlist.mode === 'creator'

  return (
    <Card interactive className="p-4 flex flex-col justify-between gap-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)]">
              <ListMusic className="w-3.5 h-3.5" />
            </div>
            <Badge tone={isCreator ? 'primary' : 'cyan'}>
              {playlist.recordingIds.length}{' '}
              {isCreator ? 'episodes' : 'lectures'}
            </Badge>
          </div>
          {playlist.rssUrl && (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-[var(--success)]"
              title={playlist.rssUrl}
            >
              <Rss className="w-3 h-3" />
              RSS
            </span>
          )}
        </div>

        <Link
          to="/app/playlists"
          className="block text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent-study)] transition-colors"
        >
          {playlist.title}
        </Link>
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
          {playlist.description}
        </p>
      </div>

      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>Updated {playlist.updatedAt}</span>
        <Link
          to="/app/playlists"
          className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Open <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </Card>
  )
}
