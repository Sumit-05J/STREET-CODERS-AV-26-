import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Info } from 'lucide-react'
import { Logo } from '../components/common/Logo'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useEchoStore } from '../store/useEchoStore'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTarget = searchParams.get('redirect')
  const loginWithBackend = useEchoStore((s) => s.loginWithBackend)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    const nextErrors = {}
    if (!email.trim() || !email.includes('@')) {
      nextErrors.email = 'Please enter a valid email address.'
    }
    if (!password || password.length < 4) {
      nextErrors.password = 'Password must be at least 4 characters.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    try {
      setLoading(true)
      await loginWithBackend({ email: email.trim(), password })
      navigate(redirectTarget || '/workspaces')
    } catch (err) {
      setApiError(
        err.response?.data?.error?.message ||
          'Sign in failed. Check your credentials or backend connection.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F4F4F5] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo to="/" />
        </div>

        <Card className="p-6 space-y-5">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-[#F4F4F5]">
              Sign in to EchoSpace
            </h1>
            <p className="text-xs text-[#A1A1AA]">
              Access your Study and Creator audio workspaces.
            </p>
          </div>

          {apiError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrors((prev) => ({ ...prev, email: '' }))
              }}
              error={errors.email}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrors((prev) => ({ ...prev, password: '' }))
              }}
              error={errors.password}
            />

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-[#A78BFA] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-[#A1A1AA]">
          New to EchoSpace?{' '}
          <Link
            to={
              redirectTarget
                ? `/register?redirect=${encodeURIComponent(redirectTarget)}`
                : '/register'
            }
            className="text-[#F4F4F5] hover:underline font-medium"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
