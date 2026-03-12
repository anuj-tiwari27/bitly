'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import Link from 'next/link'
import { Link2, Loader2, Lock, Mail, User } from 'lucide-react'
import { inviteApi } from '@/lib/api'

export default function InviteAcceptPage() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [invite, setInvite] = useState<any | null>(null)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) return
      try {
        const res = await inviteApi.get(token)
        setInvite(res.data)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Invitation not found or expired')
      } finally {
        setLoading(false)
      }
    }
    loadInvite()
  }, [token])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setSubmitting(true)
    try {
      const res = await inviteApi.accept(token, {
        password: form.password,
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
      })
      localStorage.setItem('access_token', res.data.access_token)
      localStorage.setItem('refresh_token', res.data.refresh_token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to accept invitation')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="w-full max-w-md space-y-6 text-center">
          <p className="text-lg font-semibold text-foreground">Invitation not found</p>
          <p className="text-sm text-muted-foreground">
            This invite may have expired or already been used. Please contact your organization
            owner or admin.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
          >
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-card/70 p-6 shadow-xl backdrop-blur">
        <div className="text-center">
          <Link href="/" className="flex items-center justify-center space-x-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary">
              <span className="text-sm font-semibold text-white">tl</span>
            </div>
            <div className="flex flex-col leading-tight text-left">
              <span className="text-xl font-bold text-foreground">thelittleurl.com</span>
              <span className="text-xs text-muted-foreground">
                Pixel transformation for links.
              </span>
            </div>
          </Link>
          <h2 className="mt-6 text-2xl font-bold text-foreground">
            Join {invite.organization_id ? 'the organization' : 'thelittleurl.com'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;ve been invited as <span className="font-semibold">{invite.role}</span> for
            this organization. Complete your account to continue.
          </p>
          <p className="mt-1 flex items-center justify-center text-xs text-muted-foreground">
            <Mail className="mr-1 h-3 w-3" />
            {invite.email}
          </p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                First name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  type="text"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 pl-9 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-transparent focus:ring-2 focus:ring-primary"
                  placeholder="John"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Last name
              </label>
              <input
                type="text"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-border bg-card px-3 py-2 pl-9 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              At least 8 characters with uppercase, lowercase, and numbers.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-border bg-card px-3 py-2 pl-9 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Accept invitation'}
          </button>
        </form>
      </div>
    </div>
  )
}

