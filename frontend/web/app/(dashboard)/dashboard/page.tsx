'use client'

import { useQuery } from '@tanstack/react-query'
import { Link2, MousePointerClick, Users, TrendingUp } from 'lucide-react'
import { linksApi, analyticsApi } from '@/lib/api'
import { formatNumber, formatDate, truncateUrl } from '@/lib/utils'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: linksData } = useQuery({
    queryKey: ['links', { page: 1, page_size: 5 }],
    queryFn: () => linksApi.list({ page: 1, page_size: 5 }),
  })

  const { data: analyticsData } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsApi.overview(),
  })

  const links = linksData?.data?.items || []
  const analytics = analyticsData?.data || { 
    total_clicks: 0, 
    unique_visitors: 0, 
    clicks_today: 0,
    clicks_growth: 0,
    visitors_growth: 0,
    today_growth: 0
  }

  const formatGrowth = (value: number) => {
    if (value === 0) return '0%'
    const sign = value > 0 ? '+' : ''
    return `${sign}${value}%`
  }

  const totalLinks = linksData?.data?.total || 0

  const stats = [
    {
      name: 'Total Clicks',
      value: formatNumber(analytics.total_clicks),
      icon: MousePointerClick,
      change: formatGrowth(analytics.clicks_growth || 0),
      changeType: (analytics.clicks_growth || 0) >= 0 ? 'positive' : 'negative',
    },
    {
      name: 'Unique Visitors',
      value: formatNumber(analytics.unique_visitors),
      icon: Users,
      change: formatGrowth(analytics.visitors_growth || 0),
      changeType: (analytics.visitors_growth || 0) >= 0 ? 'positive' : 'negative',
    },
    {
      name: 'Clicks Today',
      value: formatNumber(analytics.clicks_today),
      icon: TrendingUp,
      change: formatGrowth(analytics.today_growth || 0),
      changeType: (analytics.today_growth || 0) >= 0 ? 'positive' : 'negative',
    },
    {
      name: 'Active Links',
      value: totalLinks,
      icon: Link2,
      change: totalLinks > 0 ? `${totalLinks} total` : 'None yet',
      changeType: 'neutral',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back! Here&apos;s your overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="rounded-xl border bg-card p-6 text-card-foreground hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <span
                className={`text-sm font-medium ${
                  stat.changeType === 'positive'
                    ? 'text-emerald-400'
                    : stat.changeType === 'negative'
                      ? 'text-red-400'
                      : 'text-muted-foreground'
                }`}
              >
                {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Links */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b border-border p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Recent Links</h2>
          <Link
            href="/dashboard/links"
            className="text-sm font-medium text-primary hover:opacity-90"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-border">
          {links.length === 0 ? (
            <div className="p-8 text-center">
              <Link2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No links yet</p>
              <Link
                href="/dashboard/links/new"
                className="mt-4 inline-block text-sm font-medium text-primary hover:opacity-90"
              >
                Create your first link
              </Link>
            </div>
          ) : (
            links.map((link: any) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-4 transition hover:bg-muted"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/dashboard/links/${link.id}`}
                    className="text-sm font-medium text-card-foreground hover:text-primary"
                  >
                    {link.title || truncateUrl(link.destination_url, 40)}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {link.short_url}
                  </p>
                </div>
                <div className="flex items-center space-x-6 ml-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-card-foreground">
                      {formatNumber(link.click_count)}
                    </p>
                    <p className="text-xs text-muted-foreground">clicks</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-muted-foreground">
                      {formatDate(link.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Link
          href="/dashboard/links/new"
          className="rounded-xl bg-primary p-6 text-primary-foreground transition hover:opacity-90"
        >
          <Link2 className="h-8 w-8 mb-4" />
          <h3 className="text-lg font-semibold">Create Link</h3>
          <p className="mt-1 text-sm text-primary-foreground/80">
            Shorten a new URL and track its performance
          </p>
        </Link>
        <Link
          href="/dashboard/campaigns/new"
          className="rounded-xl border bg-card p-6 text-card-foreground hover:shadow-md transition"
        >
          <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
            <span className="text-lg text-secondary-foreground">📢</span>
          </div>
          <h3 className="text-lg font-semibold">New Campaign</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize your links into campaigns
          </p>
        </Link>
        <Link
          href="/dashboard/analytics"
          className="rounded-xl border bg-card p-6 text-card-foreground hover:shadow-md transition"
        >
          <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <span className="text-lg text-emerald-400">📊</span>
          </div>
          <h3 className="text-lg font-semibold">View Analytics</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Deep dive into your link performance
          </p>
        </Link>
      </div>
    </div>
  )
}
