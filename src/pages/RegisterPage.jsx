import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Info } from 'lucide-react'
import { Logo } from '../components/common/Logo'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useEchoStore } from '../store/useEchoStore'

export function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTarget = searchParams.get('redirect')
  const registerWithBackend = useEchoStore((s) => s.registerWithBackend)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    const nextErrors = {}
    if (!name.trim()) nextErrors.name = 'Please enter your full name.'
    if (!email.trim() || !email.includes('@')) {
      nextErrors.email = 'Please enter a valid email address.'
    }
    if (!password || password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    try {
      setLoading(true)
      await registerWithBackend({
        name: name.trim(),
        email: email.trim(),
        password,
      })
      navigate(redirectTarget || '/workspaces')
    } catch (err) {
      setApiError(
        err.response?.data?.error?.message ||
          'Registration failed. Please try again.'
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
              Create your account
            </h1>
            <p className="text-xs text-[#A1A1AA]">
              Start collaborating on lectures, interviews, and podcasts.
            </p>
          </div>

          {apiError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Aarav Mehta"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors((prev) => ({ ...prev, name: '' }))
              }}
              error={errors.name}
            />

            <Input
              label="Work or Student Email"
              type="email"
              placeholder="you@domain.com"
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
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrors((prev) => ({ ...prev, password: '' }))
              }}
              error={errors.password}
            />

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-[#A1A1AA]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#F4F4F5] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
