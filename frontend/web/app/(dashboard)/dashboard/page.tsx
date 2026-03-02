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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here&apos;s your overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl border p-6 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <stat.icon className="h-6 w-6 text-blue-600" />
              </div>
              <span
                className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 
                  stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
                }`}
              >
                {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Links */}
      <div className="bg-white rounded-xl border">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Links</h2>
          <Link
            href="/dashboard/links"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all
          </Link>
        </div>
        <div className="divide-y">
          {links.length === 0 ? (
            <div className="p-8 text-center">
              <Link2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No links yet</p>
              <Link
                href="/dashboard/links/new"
                className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first link
              </Link>
            </div>
          ) : (
            links.map((link: any) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/dashboard/links/${link.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600"
                  >
                    {link.title || truncateUrl(link.destination_url, 40)}
                  </Link>
                  <p className="text-xs text-gray-500 mt-1">
                    {link.short_url}
                  </p>
                </div>
                <div className="flex items-center space-x-6 ml-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatNumber(link.click_count)}
                    </p>
                    <p className="text-xs text-gray-500">clicks</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-gray-600">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/dashboard/links/new"
          className="bg-blue-600 text-white rounded-xl p-6 hover:bg-blue-700 transition"
        >
          <Link2 className="h-8 w-8 mb-4" />
          <h3 className="text-lg font-semibold">Create Link</h3>
          <p className="text-blue-100 text-sm mt-1">
            Shorten a new URL and track its performance
          </p>
        </Link>
        <Link
          href="/dashboard/campaigns/new"
          className="bg-white border rounded-xl p-6 hover:shadow-md transition"
        >
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-purple-600 text-lg">📢</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">New Campaign</h3>
          <p className="text-gray-500 text-sm mt-1">
            Organize your links into campaigns
          </p>
        </Link>
        <Link
          href="/dashboard/analytics"
          className="bg-white border rounded-xl p-6 hover:shadow-md transition"
        >
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-green-600 text-lg">📊</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">View Analytics</h3>
          <p className="text-gray-500 text-sm mt-1">
            Deep dive into your link performance
          </p>
        </Link>
      </div>
    </div>
  )
}
