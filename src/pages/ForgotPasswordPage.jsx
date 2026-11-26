import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Logo } from '../components/common/Logo'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo to="/" />
        </div>

        <Card className="p-6 space-y-5">
          {!sent ? (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                  Reset your password
                </h1>
                <p className="text-xs text-[var(--text-secondary)]">
                  Enter your email and we will simulate a password reset link
                  (demo UI).
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="aarav@echospace.app"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  error={error}
                />

                <Button type="submit" size="lg" className="w-full">
                  Send Reset Instructions
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-3 py-2">
              <CheckCircle2 className="w-9 h-9 text-[var(--success)] mx-auto" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Demo reset link prepared
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                If a backend email service were connected, instructions would be
                sent to <span className="text-[var(--text-primary)]">{email}</span>.
              </p>
              <Link to="/login" className="inline-block pt-2">
                <Button variant="secondary" size="sm">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          )}
        </Card>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
