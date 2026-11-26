import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Info } from 'lucide-react'
import { Logo } from '../components/common/Logo'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useEchoStore } from '../store/useEchoStore'

export function AuthPage({ mode = 'login' }) {
  const navigate = useNavigate()
  const loginDemo = useEchoStore((s) => s.loginDemo)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('aarav@echospace.app')
  const [password, setPassword] = useState('••••••••')
  const [errors, setErrors] = useState({})
  const [resetSent, setResetSent] = useState(false)

  const validate = () => {
    const next = {}
    if (mode === 'register' && !name.trim()) {
      next.name = 'Full name is required.'
    }
    if (!email.trim() || !email.includes('@')) {
      next.email = 'Please enter a valid email address.'
    }
    if (mode !== 'forgot' && password.length < 4) {
      next.password = 'Password must be at least 4 characters.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    if (mode === 'forgot') {
      setResetSent(true)
      return
    }

    loginDemo(email.trim(), name.trim() || undefined)
    navigate('/workspaces')
  }

  const titles = {
    login: {
      heading: 'Welcome back',
      sub: 'Sign in to your EchoSpace audio workspace.',
      cta: 'Sign In to Demo',
    },
    register: {
      heading: 'Create your account',
      sub: 'Start collaborating on lectures and episodes.',
      cta: 'Create Demo Account',
    },
    forgot: {
      heading: 'Reset password',
      sub: 'Enter your email to simulate a password reset link.',
      cta: 'Send Reset Link',
    },
  }

  const copy = titles[mode] || titles.login

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-6xl w-full mx-auto">
        <Logo to="/" />
      </div>

      <div className="w-full max-w-md mx-auto my-8 space-y-4">
        <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--accent-study)]/30 flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
          <Info className="w-4 h-4 text-[var(--accent-study)] shrink-0 mt-0.5" />
          <span>
            <strong className="text-[var(--text-primary)]">Frontend Demo State:</strong>{' '}
            Authentication is simulated locally in your browser via{' '}
            <code className="text-[var(--accent-study)]">localStorage</code>. No backend is
            connected yet.
          </span>
        </div>

        <Card className="p-6 space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              {copy.heading}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{copy.sub}</p>
          </div>

          {resetSent ? (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--success)]">
                <CheckCircle2 className="w-4 h-4" />
                Demo reset instructions prepared
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                In production, a reset email would be sent to{' '}
                <span className="font-mono text-[var(--text-primary)]">{email}</span>.
              </p>
              <Link
                to="/login"
                className="inline-block text-xs font-medium text-[var(--accent-study)] hover:underline pt-1"
              >
                Return to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <Input
                  label="Full Name"
                  placeholder="Aarav Mehta"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={errors.name}
                />
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />

              {mode !== 'forgot' && (
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                />
              )}

              {mode === 'login' && (
                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-study)]"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              <Button type="submit" className="w-full">
                <span>{copy.cta}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          <div className="pt-3 border-t border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">
            {mode === 'login' && (
              <>
                New to EchoSpace?{' '}
                <Link to="/register" className="text-[var(--text-primary)] hover:text-[var(--accent-study)] font-medium">
                  Create an account
                </Link>
              </>
            )}
            {mode === 'register' && (
              <>
                Already have an account?{' '}
                <Link to="/login" className="text-[var(--text-primary)] hover:text-[var(--accent-study)] font-medium">
                  Sign in
                </Link>
              </>
            )}
            {mode === 'forgot' && (
              <Link to="/login" className="text-[var(--text-primary)] hover:text-[var(--accent-study)] font-medium">
                Back to Sign In
              </Link>
            )}
          </div>
        </Card>
      </div>

      <div className="text-center text-xs text-[var(--text-muted)]">
        EchoSpace · Listen. Understand. Discuss. Create.
      </div>
    </div>
  )
}
