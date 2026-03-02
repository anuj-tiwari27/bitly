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
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">Organize your links into campaigns</p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaigns..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Campaigns Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
          <p className="text-gray-500 mb-4">Create your first campaign to organize your links</p>
          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign: any) => (
            <div
              key={campaign.id}
              className="bg-white rounded-xl border hover:shadow-md transition"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Link
                    href={`/dashboard/campaigns/${campaign.id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-blue-600"
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
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {campaign.description}
                  </p>
                )}

                <div className="flex items-center space-x-4 text-sm text-gray-500">
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

              <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between rounded-b-xl">
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  {formatDate(campaign.created_at)}
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/dashboard/campaigns/${campaign.id}`}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this campaign?')) {
                        deleteMutation.mutate(campaign.id)
                      }
                    }}
                    className="p-1 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
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
