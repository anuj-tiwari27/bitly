'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Link2, Mail, Lock, User, Loader2, Building2, Eye, EyeOff } from 'lucide-react'
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
    industry: '',
    team_size: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleOrgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrganization({ ...organization, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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

    setLoading(true)

    try {
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        account_type: accountType,
        organization_name: accountType === 'organization' ? organization.name : undefined,
        organization_website: accountType === 'organization' ? organization.website || undefined : undefined,
        organization_industry: accountType === 'organization' ? organization.industry || undefined : undefined,
        organization_team_size: accountType === 'organization' ? organization.team_size || undefined : undefined,
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="flex items-center justify-center space-x-2">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-sm font-semibold text-white">tl</span>
            </div>
            <div className="flex flex-col leading-tight text-left">
              <span className="text-2xl font-bold text-foreground">thelittleurl.com</span>
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
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="pl-10 w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="John"
                  />
                </div>
              </div>
              <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-muted-foreground mb-1">
                  Last name
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Doe"
                />
              </div>
            </div>

            {accountType === 'organization' && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">
                    Organization name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={organization.name}
                    onChange={handleOrgChange}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Acme Inc."
                  />
                </div>
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-muted-foreground mb-1">
                    Website (optional)
                  </label>
                  <input
                    id="website"
                    name="website"
                    type="text"
                    value={organization.website}
                    onChange={handleOrgChange}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="https://example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="industry" className="block text-sm font-medium text-muted-foreground mb-1">
                      Industry (optional)
                    </label>
                    <input
                      id="industry"
                      name="industry"
                      type="text"
                      value={organization.industry}
                      onChange={handleOrgChange}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Retail, SaaS, etc."
                    />
                  </div>
                  <div>
                    <label htmlFor="team_size" className="block text-sm font-medium text-muted-foreground mb-1">
                      Team size (optional)
                    </label>
                    <input
                      id="team_size"
                      name="team_size"
                      type="text"
                      value={organization.team_size}
                      onChange={handleOrgChange}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="1-10, 11-50..."
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="pl-10 w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="pl-10 pr-10 w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground focus:outline-none"
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
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="pl-10 pr-10 w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
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
