'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Megaphone, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { campaignsApi, storesApi } from '@/lib/api'

export default function EditCampaignPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.id as string

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    store_id: '',
    status: 'draft',
    start_date: '',
    end_date: '',
  })
  const [error, setError] = useState('')

  const { data: campaignRes, isLoading } = useQuery<{ data: any }>({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignsApi.get(campaignId),
  })

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesApi.list(),
  })

  const stores = storesData?.data || []

  useEffect(() => {
    if (campaignRes?.data) {
      const c = campaignRes.data
      setFormData({
        name: c.name || '',
        description: c.description || '',
        store_id: c.store_id || '',
        status: c.status || 'draft',
        start_date: c.start_date ? c.start_date.slice(0, 10) : '',
        end_date: c.end_date ? c.end_date.slice(0, 10) : '',
      })
    }
  }, [campaignRes])

  const updateMutation = useMutation({
    mutationFn: (data: any) => campaignsApi.update(campaignId, data),
    onSuccess: () => {
      router.push(`/dashboard/campaigns/${campaignId}`)
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to update campaign')
    },
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
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

    data.description = formData.description || null
    data.store_id = formData.store_id || null
    data.start_date = formData.start_date || null
    data.end_date = formData.end_date || null

    updateMutation.mutate(data)
  }

  if (isLoading && !campaignRes?.data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (!campaignRes?.data) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Campaign not found</p>
        <Link
          href="/dashboard/campaigns"
          className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
        >
          Back to campaigns
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/campaigns/${campaignId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Campaign
        </Link>
      </div>

      <div className="glass-card rounded-xl p-6 text-card-foreground">
        <div className="mb-6 flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
            <Megaphone className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Edit Campaign</h1>
            <p className="text-sm text-muted-foreground">
              Update campaign details and status
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
              className="glass-input w-full rounded-lg px-4 py-3"
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
              className="glass-input w-full rounded-lg px-4 py-3"
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
                className="glass-input w-full rounded-lg px-4 py-3"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
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
                className="glass-input w-full rounded-lg px-4 py-3"
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
                className="glass-input w-full rounded-lg px-4 py-3"
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
                className="glass-input w-full rounded-lg px-4 py-3"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Link
              href={`/dashboard/campaigns/${campaignId}`}
              className="rounded-lg border border-border px-6 py-3 text-sm hover:bg-muted"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center rounded-lg bg-primary px-6 py-3 text-sm text-primary-foreground transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

