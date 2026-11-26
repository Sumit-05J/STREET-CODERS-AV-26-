import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Trash2 } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/common/Avatar'
import { Badge } from '../components/ui/Badge'
import { useEchoStore } from '../store/useEchoStore'

export function SettingsPage() {
  const navigate = useNavigate()
  const user = useEchoStore((s) => s.user)
  const mode = useEchoStore((s) => s.mode)
  const activeWorkspaceId = useEchoStore((s) => s.activeWorkspaceId)
  const activeWorkspaceRole = useEchoStore((s) => s.activeWorkspaceRole)
  const members = useEchoStore((s) => s.members)
  const workspaceSettings = useEchoStore((s) => s.workspaceSettings)
  const updateProfile = useEchoStore((s) => s.updateProfile)
  const updateWorkspaceSettings = useEchoStore((s) => s.updateWorkspaceSettings)
  const deleteWorkspace = useEchoStore((s) => s.deleteWorkspace)

  const [name, setName] = useState(user?.name || '')
  const [studyName, setStudyName] = useState(workspaceSettings.studyName)
  const [creatorName, setCreatorName] = useState(workspaceSettings.creatorName)
  const [saving, setSaving] = useState(false)
  const [deletingWs, setDeletingWs] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError('')
      await updateProfile({ name: name.trim() || user?.name })
      await updateWorkspaceSettings({
        studyName: studyName.trim() || workspaceSettings.studyName,
        creatorName: creatorName.trim() || workspaceSettings.creatorName,
      })
      setSavedNotice(true)
      setTimeout(() => setSavedNotice(false), 2000)
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to save settings.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F4F4F5]">Settings</h1>
          <p className="text-sm text-[#A1A1AA] mt-0.5">
            Manage your profile, workspace labels, members, and playback
            preferences.
          </p>
        </div>
        {savedNotice && (
          <Badge tone="emerald">
            <Check className="w-3 h-3" />
            Saved
          </Badge>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#F4F4F5]">Profile</h2>
          <div className="flex items-center gap-3">
            <Avatar
              name={user?.name || 'User'}
              color={user?.avatarColor || '#8B5CF6'}
              size="lg"
            />
            <div>
              <p className="text-sm font-medium text-[#F4F4F5]">{user?.name}</p>
              <p className="text-xs text-[#A1A1AA]">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Display Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email Address"
              type="email"
              value={user?.email || ''}
              disabled
            />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#F4F4F5]">
            Workspace Settings
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Study Workspace Name"
              value={studyName}
              onChange={(e) => setStudyName(e.target.value)}
            />
            <Input
              label="Creator Workspace Name"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F4F4F5]">
              Members ({members.length})
            </h2>
            <Link
              to="/app/members"
              className="text-xs text-[#A78BFA] hover:underline"
            >
              Manage Members
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#09090B] border border-[#27272F] text-xs"
              >
                <Avatar name={m.name} color={m.avatarColor} size="xs" />
                <span className="text-[#F4F4F5]">{m.name}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#F4F4F5]">Preferences</h2>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#F4F4F5]">Default Playback Speed</p>
              <p className="text-xs text-[#A1A1AA]">
                Applied when opening a recording in the Audio Workspace.
              </p>
            </div>
            <select
              value={workspaceSettings.defaultPlaybackSpeed}
              onChange={(e) =>
                updateWorkspaceSettings({
                  defaultPlaybackSpeed: Number(e.target.value),
                })
              }
              className="h-9 px-3 rounded-lg bg-[#09090B] border border-[#27272F] text-sm text-[#F4F4F5]"
            >
              {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>
          </div>

          {[
            {
              key: 'autoPauseOnAnnotate',
              title: 'Auto-pause when creating annotations',
              desc: 'Pauses playback automatically when you click Create Annotation.',
            },
            {
              key: 'emailNotifications',
              title: 'Discussion reply notifications',
              desc: 'Receive updates when teammates reply to your markers.',
            },
          ].map((pref) => (
            <label
              key={pref.key}
              className="flex items-center justify-between gap-4 pt-3 border-t border-[#27272F] cursor-pointer"
            >
              <div>
                <p className="text-sm text-[#F4F4F5]">{pref.title}</p>
                <p className="text-xs text-[#A1A1AA]">{pref.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(workspaceSettings[pref.key])}
                onChange={(e) =>
                  updateWorkspaceSettings({ [pref.key]: e.target.checked })
                }
                className="w-4 h-4 accent-[#8B5CF6] cursor-pointer"
              />
            </label>
          ))}
        </Card>

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {activeWorkspaceId && activeWorkspaceRole === 'OWNER' && (
        <Card className="p-5 border-rose-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-rose-400">
                Danger Zone — Delete Workspace
              </h2>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Permanently delete{' '}
                <strong className="text-[#F4F4F5]">
                  {mode === 'study'
                    ? workspaceSettings.studyName
                    : workspaceSettings.creatorName}
                </strong>{' '}
                and all its recordings, annotations, clips, playlists,
                invitations, and memberships.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              disabled={deletingWs}
              onClick={async () => {
                const wsLabel =
                  mode === 'study'
                    ? workspaceSettings.studyName
                    : workspaceSettings.creatorName
                if (
                  !window.confirm(
                    `Permanently delete "${wsLabel}" and all its associated workspace data? This cannot be undone.`
                  )
                ) {
                  return
                }
                try {
                  setDeletingWs(true)
                  setError('')
                  await deleteWorkspace(activeWorkspaceId)
                  navigate('/workspaces')
                } catch (err) {
                  setError(
                    err.response?.data?.error?.message ||
                      err.message ||
                      'Failed to delete workspace.'
                  )
                } finally {
                  setDeletingWs(false)
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deletingWs ? 'Deleting...' : 'Delete Workspace'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
