import React, { useState } from 'react'
import { UserPlus, Link2, Copy, Check, Trash2, KeyRound } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/common/Avatar'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { useEchoStore } from '../store/useEchoStore'
import { getModeConfig } from '../config/modeConfig'

export function MembersPage() {
  const mode = useEchoStore((s) => s.mode)
  const user = useEchoStore((s) => s.user)
  const activeWorkspaceRole = useEchoStore((s) => s.activeWorkspaceRole)
  const members = useEchoStore((s) => s.members)
  const invitations = useEchoStore((s) => s.invitations)
  const inviteMember = useEchoStore((s) => s.inviteMember)
  const removeMember = useEchoStore((s) => s.removeMember)
  const createInvitation = useEchoStore((s) => s.createInvitation)
  const revokeInvitation = useEchoStore((s) => s.revokeInvitation)
  const cfg = getModeConfig(mode)

  const canManage = ['OWNER', 'ADMIN'].includes(activeWorkspaceRole)
  const isOwner = activeWorkspaceRole === 'OWNER'

  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('MEMBER')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Invitation Link / Code generator state
  const [inviteRole, setInviteRole] = useState('MEMBER')
  const [expiresHours, setExpiresHours] = useState('168') // 7 days
  const [creatingLink, setCreatingLink] = useState(false)
  const [generatedInvite, setGeneratedInvite] = useState(null)
  const [copiedField, setCopiedField] = useState('')

  const copyText = (text, field) => {
    navigator.clipboard?.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(''), 1800)
  }

  const handleGenerateInvite = async () => {
    try {
      setCreatingLink(true)
      setError('')
      const res = await createInvitation({
        role: inviteRole,
        expiresInHours: expiresHours ? Number(expiresHours) : null,
      })
      setGeneratedInvite({
        url: `${window.location.origin}/join/${res.inviteToken}`,
        code: res.invitation.code,
        role: res.invitation.role,
      })
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to generate invitation.'
      )
    } finally {
      setCreatingLink(false)
    }
  }

  const handleInviteByEmail = async (e) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setError('A valid registered user email is required.')
      return
    }
    try {
      setSubmitting(true)
      setError('')
      await inviteMember({ email: email.trim(), role })
      setEmail('')
      setRole('MEMBER')
      setInviteOpen(false)
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Could not add member.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge tone={mode === 'study' ? 'cyan' : 'primary'}>{cfg.name}</Badge>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mt-2">
            Members &amp; Invitations
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Collaborators with access to recordings, annotations, and clips.
          </p>
        </div>

        {canManage && (
          <Button
            variant={mode === 'study' ? 'cyan' : 'primary'}
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            Add by Email
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* Invite Link & Code Generator (OWNER / ADMIN) */}
      {canManage && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Invite Members via Link or Code
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Share an invitation link or code so teammates can join this
                workspace directly.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Invited Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)]"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="EDITOR">EDITOR</option>
                <option value="VIEWER">VIEWER</option>
                {isOwner && <option value="ADMIN">ADMIN</option>}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Expiration
              </label>
              <select
                value={expiresHours}
                onChange={(e) => setExpiresHours(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)]"
              >
                <option value="24">24 hours</option>
                <option value="168">7 days</option>
                <option value="">Never expires</option>
              </select>
            </div>

            <Button
              onClick={handleGenerateInvite}
              disabled={creatingLink}
              variant={mode === 'study' ? 'cyan' : 'primary'}
            >
              <Link2 className="w-4 h-4" />
              {creatingLink ? 'Generating...' : 'Generate Invite Link'}
            </Button>
          </div>

          {generatedInvite && (
            <div className="p-3.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--accent-study)]/30 space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-[var(--accent-study)] font-medium">
                  Invitation Ready ({generatedInvite.role})
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={generatedInvite.url}
                  className="flex-1 h-8 px-2.5 rounded bg-[var(--surface)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)]"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copyText(generatedInvite.url, 'link')}
                >
                  {copiedField === 'link' ? (
                    <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedField === 'link' ? 'Copied Link' : 'Copy Link'}
                </Button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <KeyRound className="w-3.5 h-3.5 text-[var(--accent-creator)]" />
                  Invite Code:{' '}
                  <strong className="font-mono text-[var(--text-primary)]">
                    {generatedInvite.code}
                  </strong>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copyText(generatedInvite.code, 'code')}
                >
                  {copiedField === 'code' ? (
                    <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedField === 'code' ? 'Copied Code' : 'Copy Code'}
                </Button>
              </div>
            </div>
          )}

          {/* Active Invitations */}
          {invitations.length > 0 && (
            <div className="pt-2 border-t border-[var(--border)] space-y-2">
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                Active Invitations ({invitations.length})
              </p>
              <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="px-3 py-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono font-semibold text-[var(--text-primary)]">
                        {inv.code}
                      </span>
                      <Badge tone="neutral">{inv.role}</Badge>
                      <span className="text-[var(--text-muted)] hidden sm:inline">
                        Used {inv.usedCount}x
                        {inv.expiresAt
                          ? ` · Expires ${new Date(inv.expiresAt).toLocaleDateString()}`
                          : ' · No expiry'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyText(inv.code, inv.id)}
                        className="px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {copiedField === inv.id ? 'Copied' : 'Copy Code'}
                      </button>
                      <button
                        type="button"
                        onClick={() => revokeInvitation(inv.id).catch((e) => setError(e.message))}
                        className="px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--danger)] hover:border-rose-500/40 cursor-pointer"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Existing Members List */}
      <Card className="divide-y divide-[var(--border)]">
        {members.map((m) => {
          const canRemove =
            canManage &&
            m.role !== 'OWNER' &&
            (isOwner || m.role !== 'ADMIN') &&
            user?.id !== m.id

          return (
            <div
              key={m.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <Avatar name={m.name} color={m.avatarColor} size="md" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {m.name}
                    {user?.id === m.id && (
                      <span className="ml-1.5 text-[11px] text-[var(--text-muted)]">
                        (You)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">{m.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge tone={m.role === 'OWNER' ? 'primary' : 'neutral'}>
                  {m.role}
                </Badge>
                <Badge tone="emerald">{m.status}</Badge>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Remove ${m.name} from this workspace?`)) {
                        removeMember(m.id).catch((e) =>
                          setError(e.response?.data?.error?.message || e.message)
                        )
                      }
                    }}
                    className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                    title="Remove member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {members.length === 0 && (
          <div className="p-6 text-center text-xs text-[var(--text-secondary)]">
            No members found in this workspace yet.
          </div>
        )}
      </Card>

      <Modal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Add Collaborator by Email"
        subtitle="Add an existing registered EchoSpace user to this workspace."
      >
        <form onSubmit={handleInviteByEmail} className="space-y-4">
          <Input
            label="User Email Address"
            type="email"
            placeholder="teammate@echospace.app"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Workspace Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)]"
            >
              <option value="MEMBER">MEMBER (Annotate, reply &amp; upload)</option>
              <option value="EDITOR">EDITOR (Upload &amp; manage content)</option>
              <option value="VIEWER">VIEWER (Read &amp; listen only)</option>
              {isOwner && <option value="ADMIN">ADMIN (Manage members &amp; invites)</option>}
            </select>
          </div>
          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
