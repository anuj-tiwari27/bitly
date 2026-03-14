'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Link2, Mail, Lock, User, Loader2, Building2, Eye, EyeOff, Globe } from 'lucide-react'
import { authApi } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
  })
  const [accountType, setAccountType] = useState<'individual' | 'organization'>('individual')
  const [organization, setOrganization] = useState({
    name: '',
    website: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleOrgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrganization({ ...organization, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setOtpError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (accountType === 'organization' && !organization.name.trim()) {
      setError('Organization name is required for organization registration')
      return
    }

    if (!otpVerified) {
      setOtpError('Please verify your email with the one-time code before creating your account')
      return
    }

    setLoading(true)

    try {
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        account_type: accountType,
        organization_name: accountType === 'organization' ? organization.name : undefined,
        organization_website:
          accountType === 'organization' ? organization.website || undefined : undefined,
      })
      localStorage.setItem('access_token', response.data.access_token)
      localStorage.setItem('refresh_token', response.data.refresh_token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async () => {
    setOtpError('')
    if (!formData.email) {
      setOtpError('Please enter your email first')
      return
    }
    setOtpSending(true)
    try {
      await authApi.requestOtp({ email: formData.email, purpose: 'signup' })
      setOtpSent(true)
    } catch (err: any) {
      setOtpError(err.response?.data?.detail || 'Failed to send verification code')
    } finally {
      setOtpSending(false)
    }
  }

  const handleVerifyOtp = async () => {
    setOtpError('')
    if (!formData.email || !otpCode.trim()) {
      setOtpError('Enter your email and the code you received')
      return
    }
    setOtpVerifying(true)
    try {
      await authApi.verifyOtp({ email: formData.email, purpose: 'signup', code: otpCode.trim() })
      setOtpVerified(true)
    } catch (err: any) {
      setOtpVerified(false)
      setOtpError(err.response?.data?.detail || 'Invalid or expired code')
    } finally {
      setOtpVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="flex items-center justify-center space-x-2">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-sm font-semibold text-white">tl</span>
            </div>
            <div className="flex flex-col leading-tight text-left">
              <span className="text-2xl font-bold text-foreground">The Little URL</span>
              <span className="text-xs text-muted-foreground">
                Pixel transformation for links.
              </span>
            </div>
          </Link>
          <h2 className="mt-6 text-2xl font-bold text-foreground">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start creating short links and tracking analytics
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
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Account type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType('individual')}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg border text-sm transition ${
                    accountType === 'individual'
                      ? 'border-primary bg-primary/10 text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  <User className="h-4 w-4 mr-2" />
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('organization')}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg border text-sm transition ${
                    accountType === 'organization'
                      ? 'border-primary bg-primary/10 text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Organization
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-muted-foreground mb-1">
                  First name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-5 w-5 text-[#738194] pointer-events-none" />
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="glass-input w-full rounded-lg px-4 py-3 pl-10"
                    placeholder="John"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-muted-foreground mb-1">
                  Last name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-5 w-5 text-[#738194] pointer-events-none" />
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="glass-input w-full rounded-lg px-4 py-3 pl-10"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            {accountType === 'organization' && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">
                    Organization name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-5 w-5 text-[#738194] pointer-events-none" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={organization.name}
                      onChange={handleOrgChange}
                      required
                      className="glass-input w-full rounded-lg px-4 py-3 pl-10"
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-muted-foreground mb-1">
                    Website (optional)
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-5 w-5 text-[#738194] pointer-events-none" />
                    <input
                      id="website"
                      name="website"
                      type="text"
                      value={organization.website}
                      onChange={handleOrgChange}
                      className="glass-input w-full rounded-lg px-4 py-3 pl-10"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">
                Email address
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-5 w-5 text-[#738194] pointer-events-none" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="glass-input w-full rounded-lg px-4 py-3 pl-10"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2 rounded-lg border border-dashed border-border/60 bg-slate-900/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll send a one-time code to verify your email.
                    </p>
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
                        Enter the code sent to your email
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
                          {otpVerified ? 'Verified' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  )}
                  {otpVerified && (
                    <p className="text-xs text-emerald-300">
                      Email verified. You can now create your account.
                    </p>
                  )}
                </div>
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
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
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
              <p className="mt-1 text-xs text-muted-foreground">
                At least 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted-foreground mb-1">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-5 w-5 text-[#738194] pointer-events-none" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-primary-foreground bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Create account'
            )}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:opacity-90">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
