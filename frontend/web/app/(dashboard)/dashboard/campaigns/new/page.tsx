'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Megaphone, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { campaignsApi, storesApi } from '@/lib/api'

export default function NewCampaignPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    store_id: '',
    status: 'draft',
    start_date: '',
    end_date: '',
  })
  const [error, setError] = useState('')

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesApi.list(),
  })

  const stores = storesData?.data || []

  const createMutation = useMutation({
    mutationFn: (data: any) => campaignsApi.create(data),
    onSuccess: (response) => {
      router.push(`/dashboard/campaigns/${response.data.id}`)
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create campaign')
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name) {
      setError('Campaign name is required')
      return
    }

    const data: any = {
      name: formData.name,
      status: formData.status,
    }

    if (formData.description) data.description = formData.description
    if (formData.store_id) data.store_id = formData.store_id
    if (formData.start_date) data.start_date = formData.start_date
    if (formData.end_date) data.end_date = formData.end_date

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
          href="/dashboard/campaigns"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Campaigns
        </Link>
      </div>

      <div className="glass-card rounded-xl p-6 text-card-foreground">
        <div className="mb-6 flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
            <Megaphone className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Create Campaign</h1>
            <p className="text-sm text-muted-foreground">
              Organize your links into a campaign
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
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Summer Sale 2024"
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:border-transparent focus:ring-2 focus:ring-primary"
              required
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
              rows={3}
              placeholder="Describe your campaign..."
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:border-transparent focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground focus:border-transparent focus:ring-2 focus:ring-primary"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Store (optional)
              </label>
              <select
                name="store_id"
                value={formData.store_id}
                onChange={handleChange}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground focus:border-transparent focus:ring-2 focus:ring-primary"
              >
                <option value="">No store</option>
                {stores.map((store: any) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Start Date (optional)
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground focus:border-transparent focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                End Date (optional)
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground focus:border-transparent focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Link
              href="/dashboard/campaigns"
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
                'Create Campaign'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
