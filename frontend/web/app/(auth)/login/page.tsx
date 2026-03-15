'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Link2, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/lib/api'
import { Logo } from '../../components/Logo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authApi.login({ email, password })
      localStorage.setItem('access_token', response.data.access_token)
      localStorage.setItem('refresh_token', response.data.refresh_token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async () => {
    setOtpError('')
    if (!email) {
      setOtpError('Please enter your email first')
      return
    }
    setOtpSending(true)
    try {
      await authApi.requestOtp({ email, purpose: 'login' })
      setOtpSent(true)
    } catch (err: any) {
      setOtpError(err.response?.data?.detail || 'Failed to send code')
    } finally {
      setOtpSending(false)
    }
  }

  const handleVerifyOtp = async () => {
    setOtpError('')
    if (!email || !otpCode.trim()) {
      setOtpError('Enter your email and the code you received')
      return
    }
    setOtpVerifying(true)
    try {
      const res = await authApi.verifyOtp({ email, purpose: 'login', code: otpCode.trim() })
      localStorage.setItem('access_token', res.data.access_token)
      localStorage.setItem('refresh_token', res.data.refresh_token)
      router.push('/dashboard')
    } catch (err: any) {
      setOtpError(err.response?.data?.detail || 'Invalid or expired code')
    } finally {
      setOtpVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Logo variant="lg" href="/" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-foreground">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-300 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {otpError && (
            <div className="bg-amber-500/10 border border-amber-500/40 text-amber-200 p-3 rounded-lg text-sm">
              {otpError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-5 w-5 text-[#738194] pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="glass-input w-full rounded-lg px-4 py-3 pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-5 w-5 text-[#738194] pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="glass-input w-full rounded-lg px-4 py-3 pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[#738194] hover:text-[#738194] focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-primary-foreground bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Sign in'
              )}
            </button>
            <div className="space-y-2 rounded-lg border border-dashed border-border/60 bg-slate-900/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  Prefer a one-time code instead of password?
                </span>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSending}
                  className="inline-flex items-center rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-60"
                >
                  {otpSending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  Send code
                </button>
              </div>
              {otpSent && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Enter the 6-digit code sent to your email
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="glass-input w-full rounded-lg px-3 py-2 text-sm tracking-[0.4em] text-center"
                      placeholder="••••••"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpVerifying}
                      className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                    >
                      {otpVerifying ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                      Verify & sign in
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-950 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <a
            href="/api/auth/oauth/google"
            className="w-full flex items-center justify-center py-3 px-4 rounded-lg border border-border bg-card hover:bg-card/80 transition text-foreground"
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </a>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-primary hover:opacity-90">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
