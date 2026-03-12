'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Megaphone, Plus, Search, MoreHorizontal, Link2,
  MousePointerClick, Trash2, Calendar
} from 'lucide-react'
import { campaignsApi } from '@/lib/api'
import { formatNumber, formatDate } from '@/lib/utils'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  archived: 'bg-red-100 text-red-800',
}

export default function CampaignsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', { search }],
    queryFn: () => campaignsApi.list({ search: search || undefined, page_size: 50 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const campaigns = data?.data?.items || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize your links into campaigns
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="flex items-center rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaigns..."
          className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:border-transparent focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Campaigns Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-card-foreground">
          <Megaphone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No campaigns yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Create your first campaign to organize your links
          </p>
          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign: any) => (
            <div
              key={campaign.id}
              className="rounded-xl border bg-card text-card-foreground transition hover:shadow-md"
            >
              <div className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <Link
                    href={`/dashboard/campaigns/${campaign.id}`}
                    className="text-lg font-semibold hover:text-primary"
                  >
                    {campaign.name}
                  </Link>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      statusColors[campaign.status] || statusColors.draft
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>

                {campaign.description && (
                  <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                    {campaign.description}
                  </p>
                )}

                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Link2 className="h-4 w-4 mr-1" />
                    {campaign.link_count} links
                  </div>
                  <div className="flex items-center">
                    <MousePointerClick className="h-4 w-4 mr-1" />
                    {formatNumber(campaign.total_clicks)} clicks
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-b-xl border-t border-border bg-muted/40 px-6 py-3">
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="mr-1 h-3.5 w-3.5" />
                  {formatDate(campaign.created_at)}
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/dashboard/campaigns/${campaign.id}`}
                    className="text-xs font-medium text-primary hover:opacity-90"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this campaign?')) {
                        deleteMutation.mutate(campaign.id)
                      }
                    }}
                    className="rounded p-1 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
