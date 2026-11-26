import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Users, AlertCircle, BookOpen, Mic2 } from 'lucide-react'
import { Logo } from '../components/common/Logo'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { apiClient } from '../services/api'
import { useEchoStore } from '../store/useEchoStore'

export function JoinWorkspacePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const authToken = useEchoStore((s) => s.token)
  const isAuthenticated = useEchoStore((s) => s.isAuthenticated)
  const acceptInvitation = useEchoStore((s) => s.acceptInvitation)

  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError('')
    apiClient
      .getInvitation(token)
      .then((inv) => setInvitation(inv))
      .catch((err) => {
        setError(
          err.response?.data?.error?.message ||
            'This invitation link is invalid, expired, or revoked.'
        )
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleJoin = async () => {
    if (!authToken || !isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/join/${token}`)}`)
      return
    }
    try {
      setJoining(true)
      setError('')
      const res = await acceptInvitation(token)
      const modeLower = res.workspace.mode.toLowerCase()
      navigate(modeLower === 'study' ? '/app/study' : '/app/creator')
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to join workspace.'
      )
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F4F4F5] flex flex-col">
      <header className="h-16 px-4 sm:px-8 border-b border-[#27272F] flex items-center justify-between">
        <Logo to="/" />
        <Link to="/app" className="text-xs text-[#A1A1AA] hover:text-[#F4F4F5]">
          Go to Dashboard
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 space-y-5">
          {loading ? (
            <p className="text-sm text-[#A1A1AA] text-center py-6">
              Verifying workspace invitation...
            </p>
          ) : error && !invitation ? (
            <div className="text-center space-y-4 py-2">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <div className="space-y-1">
                <h1 className="text-lg font-semibold text-[#F4F4F5]">
                  Invitation Unavailable
                </h1>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">{error}</p>
              </div>
              <Link to="/workspaces" className="inline-block">
                <Button size="sm" variant="secondary">
                  View My Workspaces
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Badge
                  tone={
                    invitation.workspace.mode === 'STUDY' ? 'cyan' : 'primary'
                  }
                >
                  {invitation.workspace.mode === 'STUDY' ? (
                    <BookOpen className="w-3 h-3" />
                  ) : (
                    <Mic2 className="w-3 h-3" />
                  )}
                  {invitation.workspace.mode} MODE
                </Badge>
                <Badge tone="neutral">Role: {invitation.role}</Badge>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-[#A1A1AA]">
                  {invitation.invitedByName} invited you to join
                </p>
                <h1 className="text-2xl font-semibold text-[#F4F4F5]">
                  {invitation.workspace.name}
                </h1>
                {invitation.workspace.description && (
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">
                    {invitation.workspace.description}
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-[#09090B] border border-[#27272F] flex items-center justify-between text-xs text-[#A1A1AA]">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#22D3EE]" />
                  {invitation.workspace._count?.members ?? 1} members
                </span>
                <span>
                  {invitation.workspace._count?.episodes ?? 0} recordings
                </span>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                  {error}
                </div>
              )}

              {isAuthenticated && authToken ? (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleJoin}
                  disabled={joining}
                >
                  {joining ? 'Joining...' : 'Join Workspace'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <div className="space-y-2.5">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() =>
                      navigate(
                        `/login?redirect=${encodeURIComponent(`/join/${token}`)}`
                      )
                    }
                  >
                    Sign In to Join Workspace
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Link
                    to={`/register?redirect=${encodeURIComponent(`/join/${token}`)}`}
                    className="block text-center text-xs text-[#A1A1AA] hover:text-[#F4F4F5]"
                  >
                    New to EchoSpace? Create an account
                  </Link>
                </div>
              )}
            </>
          )}
        </Card>
      </main>
    </div>
  )
}
