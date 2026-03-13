'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Calendar,
  MousePointerClick,
  Users,
  Link2,
  Clock,
} from 'lucide-react'
import { campaignsApi, analyticsApi } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type DateRange = 7 | 14 | 30 | 90

export default function CampaignDetailPage() {
  const params = useParams()
  const campaignId = params.id as string
  const [days, setDays] = useState<DateRange>(30)

  const { data: campaignRes, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignsApi.get(campaignId),
  })

  const { data: analyticsRes } = useQuery({
    queryKey: ['campaign-analytics', campaignId, days],
    queryFn: () => analyticsApi.campaignAnalytics(campaignId, days),
    enabled: !!campaignId,
  })

  const campaign = campaignRes?.data
  const analytics = analyticsRes?.data || analyticsRes || {
    overview: {
      total_clicks: 0,
      unique_visitors: 0,
      total_links: 0,
      clicks_today: 0,
      clicks_this_week: 0,
      clicks_this_month: 0,
    },
    clicks_over_time: [],
    top_links: [],
    devices: [],
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (!campaign) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Campaigns
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Overall performance and links inside this campaign.
            </p>
          </div>
        </div>
        <div className="glass-card flex flex-wrap items-center gap-2 rounded-lg p-1 text-card-foreground">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d as DateRange)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Summary + meta */}
      <div className="glass-card grid gap-4 rounded-xl p-6 text-card-foreground md:grid-cols-[2fr,1.2fr]">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {campaign.description || 'No description provided.'}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center rounded-full bg-slate-900/70 px-3 py-1 capitalize">
              <span
                className={`mr-2 h-2 w-2 rounded-full ${
                  campaign.status === 'active'
                    ? 'bg-emerald-400'
                    : campaign.status === 'paused'
                    ? 'bg-amber-400'
                    : 'bg-slate-500'
                }`}
              />
              {campaign.status}
            </span>
            {campaign.start_date && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-3 py-1">
                <Calendar className="h-3 w-3" />
                Starts {formatDate(campaign.start_date)}
              </span>
            )}
            {campaign.end_date && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-3 py-1">
                <Clock className="h-3 w-3" />
                Ends {formatDate(campaign.end_date)}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-900/70 p-4">
            <p className="text-xs text-muted-foreground">Links in campaign</p>
            <p className="mt-1 text-2xl font-semibold">
              {formatNumber(analytics.overview?.total_links || campaign.link_count || 0)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-900/70 p-4">
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="mt-1 text-sm">{formatDate(campaign.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="glass-card rounded-xl p-4 text-card-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MousePointerClick className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatNumber(analytics.overview?.total_clicks || 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Clicks</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 text-card-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatNumber(analytics.overview?.unique_visitors || 0)}
              </p>
              <p className="text-xs text-muted-foreground">Unique Visitors</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 text-card-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900/70">
              <Link2 className="h-5 w-5 text-slate-100" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatNumber(analytics.overview?.total_links || campaign.link_count || 0)}
              </p>
              <p className="text-xs text-muted-foreground">Links</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 text-card-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatNumber(analytics.overview?.clicks_today || 0)}
              </p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 text-card-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-500/10">
              <Calendar className="h-5 w-5 text-fuchsia-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatNumber(analytics.overview?.clicks_this_month || 0)}
              </p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clicks over time */}
      <div className="glass-card rounded-xl p-6 text-card-foreground">
        <h2 className="mb-4 text-lg font-semibold">Clicks Over Time</h2>
        <div className="h-72">
          {analytics.clicks_over_time?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.clicks_over_time}>
                <defs>
                  <linearGradient id="campaignClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                  }}
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  }
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#campaignClicks)"
                  name="Clicks"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No click data yet
            </div>
          )}
        </div>
      </div>

      {/* Top links in campaign */}
      <div className="glass-card rounded-xl p-6 text-card-foreground">
        <h2 className="mb-4 text-lg font-semibold">Top Links in This Campaign</h2>
        {analytics.top_links?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-4 text-left">Short Code</th>
                  <th className="py-2 pr-4 text-left">Clicks</th>
                  <th className="py-2 pr-4 text-left">Unique</th>
                  <th className="py-2 text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {analytics.top_links.map((link: any) => (
                  <tr key={link.link_id || link.short_code} className="border-b border-slate-800 last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs text-primary sm:text-sm">
                      {link.short_code}
                    </td>
                    <td className="py-2 pr-4 text-sm">
                      {formatNumber(link.clicks || 0)}
                    </td>
                    <td className="py-2 pr-4 text-sm text-muted-foreground">
                      {formatNumber(link.unique_visitors || 0)}
                    </td>
                    <td className="py-2 text-right text-xs">
                      {link.link_id ? (
                        <Link
                          href={`/dashboard/links/${link.link_id}`}
                          className="text-primary hover:underline"
                        >
                          View link
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No link activity yet for this campaign.
          </div>
        )}
      </div>
    </div>
  )
}

