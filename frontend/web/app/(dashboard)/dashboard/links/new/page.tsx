'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link2, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { linksApi, campaignsApi } from '@/lib/api'

export default function NewLinkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    destination_url: '',
    title: '',
    description: '',
    custom_code: '',
    campaign_id: '',
    expires_at: '',
    password: '',
    max_clicks: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    const campaign_id = searchParams.get('campaign_id')
    if (campaign_id) {
      setFormData((prev) => ({ ...prev, campaign_id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsApi.list({ page_size: 100 }),
  })

  const campaigns = campaignsData?.data?.items || []

  const createMutation = useMutation({
    mutationFn: (data: any) => linksApi.create(data),
    onSuccess: (response) => {
      router.push(`/dashboard/links/${response.data.id}`)
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create link')
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.destination_url) {
      setError('Destination URL is required')
      return
    }

    if (formData.password) {
      const bytes = new TextEncoder().encode(formData.password).length
      if (bytes > 72) {
        setError('Password cannot be longer than 72 bytes. Please use a shorter password.')
        return
      }
    }

    const data: any = {
      destination_url: formData.destination_url,
    }

    if (formData.title) data.title = formData.title
    if (formData.description) data.description = formData.description
    if (formData.custom_code) data.custom_code = formData.custom_code
    if (formData.campaign_id) data.campaign_id = formData.campaign_id
    if (formData.expires_at) data.expires_at = formData.expires_at
    if (formData.password) data.password = formData.password
    if (formData.max_clicks) data.max_clicks = parseInt(formData.max_clicks)

    if (typeof window !== 'undefined') {
      const orgId = localStorage.getItem('current_organization_id')
      if (orgId) {
        data.organization_id = orgId
      }
    }

    createMutation.mutate(data)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/links"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Links
        </Link>
      </div>

      <div className="glass-card rounded-xl p-6 text-card-foreground">
        <div className="mb-6 flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Link2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Create Link</h1>
            <p className="text-sm text-muted-foreground">
              Shorten a URL and track its performance
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Destination URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              name="destination_url"
              value={formData.destination_url}
              onChange={handleChange}
              placeholder="https://example.com/your-long-url"
              className="glass-input w-full rounded-lg px-4 py-3"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Title (optional)
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="My awesome link"
              className="glass-input w-full rounded-lg px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Description (optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              placeholder="A brief description of this link"
              className="glass-input w-full rounded-lg px-4 py-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Custom Short Code (optional)
              </label>
              <input
                type="text"
                name="custom_code"
                value={formData.custom_code}
                onChange={handleChange}
                placeholder="my-link"
                className="glass-input w-full rounded-lg px-4 py-3"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave empty for auto-generated code
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Campaign (optional)
              </label>
              <select
                name="campaign_id"
                value={formData.campaign_id}
                onChange={handleChange}
                className="glass-input w-full rounded-lg px-4 py-3"
              >
                <option value="">No campaign</option>
                {campaigns.map((campaign: any) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Expiration Date (optional)
              </label>
              <input
                type="datetime-local"
                name="expires_at"
                value={formData.expires_at}
                onChange={handleChange}
                className="glass-input w-full rounded-lg px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Max Clicks (optional)
              </label>
              <input
                type="number"
                name="max_clicks"
                value={formData.max_clicks}
                onChange={handleChange}
                placeholder="Unlimited"
                min="1"
                className="glass-input w-full rounded-lg px-4 py-3"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Password Protection (optional)
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password to protect link"
            className="glass-input w-full rounded-lg px-4 py-3"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Link
              href="/dashboard/links"
              className="rounded-lg border border-border px-6 py-3 text-sm hover:bg-muted"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center rounded-lg bg-primary px-6 py-3 text-sm text-primary-foreground transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Link'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
