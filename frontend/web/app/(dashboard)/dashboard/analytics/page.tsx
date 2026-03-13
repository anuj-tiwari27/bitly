'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  MousePointerClick, Users, TrendingUp, Globe, Calendar,
  Monitor, Smartphone, Tablet, Activity, BarChart3, Share2,
  Clock, Zap
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { analyticsApi } from '@/lib/api'
import { formatNumber } from '@/lib/utils'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

const deviceIcons: Record<string, any> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  other: Monitor,
  unknown: Monitor,
}

type DateRange = '7d' | '14d' | '30d' | '90d'

function formatHourLabel(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24
  const displayHour = ((normalized + 11) % 12) + 1
  const suffix = normalized < 12 ? 'AM' : 'PM'
  return `${displayHour}${suffix}`
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  
  const days = {
    '7d': 7,
    '14d': 14,
    '30d': 30,
    '90d': 90,
  }[dateRange]

  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsApi.overview(),
  })

  const { data: clicksOverTime } = useQuery({
    queryKey: ['analytics-clicks', days],
    queryFn: () => analyticsApi.clicksOverTime({ days }),
  })

  const { data: topLinks } = useQuery({
    queryKey: ['analytics-top-links', days],
    queryFn: () => analyticsApi.topLinks({ limit: 10, days }),
  })

  const { data: devices } = useQuery({
    queryKey: ['analytics-devices', days],
    queryFn: () => analyticsApi.devices(days),
  })

  const { data: browsers } = useQuery({
    queryKey: ['analytics-browsers', days],
    queryFn: () => analyticsApi.browsers({ days, limit: 10 }),
  })

  const { data: operatingSystems } = useQuery({
    queryKey: ['analytics-os', days],
    queryFn: () => analyticsApi.operatingSystems({ days, limit: 10 }),
  })

  const { data: referrers } = useQuery({
    queryKey: ['analytics-referrers', days],
    queryFn: () => analyticsApi.referrers({ days, limit: 10 }),
  })

  const { data: countries } = useQuery({
    queryKey: ['analytics-countries', days],
    queryFn: () => analyticsApi.countries({ days, limit: 10 }),
  })

  const { data: utmSources } = useQuery({
    queryKey: ['analytics-utm-sources', days],
    queryFn: () => analyticsApi.utmSources({ days, limit: 10 }),
  })

  const { data: utmMediums } = useQuery({
    queryKey: ['analytics-utm-mediums', days],
    queryFn: () => analyticsApi.utmMediums({ days, limit: 10 }),
  })

  const { data: utmCampaigns } = useQuery({
    queryKey: ['analytics-utm-campaigns', days],
    queryFn: () => analyticsApi.utmCampaigns({ days, limit: 10 }),
  })

  const { data: hourlyData } = useQuery({
    queryKey: ['analytics-hourly', days],
    queryFn: () => analyticsApi.hourly(days),
  })

  const { data: realtimeData } = useQuery({
    queryKey: ['analytics-realtime'],
    queryFn: () => analyticsApi.realtime(),
    // Poll more frequently to keep the real-time strip fresh
    refetchInterval: 10000,
  })

  const stats = overview?.data || { total_clicks: 0, unique_visitors: 0, clicks_today: 0, clicks_this_week: 0, clicks_this_month: 0 }
  const clicksData = clicksOverTime?.data || []
  const topLinksData = topLinks?.data || []
  const devicesData = devices?.data || []
  const browsersData = browsers?.data || []
  const osData = operatingSystems?.data || []
  const referrersData = referrers?.data || []
  const countriesData = countries?.data || []
  const utmSourcesData = utmSources?.data || []
  const utmMediumsData = utmMediums?.data || []
  const utmCampaignsData = utmCampaigns?.data || []
  const hourly = hourlyData?.data || []
  const realtime = realtimeData?.data || { clicks_last_hour: 0, clicks_last_5_min: 0, active_links: 0, recent_clicks: [] }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your link performance and audience insights
          </p>
        </div>
        <div className="glass-card flex flex-wrap items-center gap-2 rounded-lg p-1 text-card-foreground">
          {(['7d', '14d', '30d', '90d'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '14d' ? '14 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="glass-card rounded-xl bg-gradient-to-r from-primary to-secondary p-6 text-primary-foreground">
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Real-time Activity</h2>
          <span className="flex h-2 w-2 relative ml-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-3xl font-bold">{formatNumber(realtime.clicks_last_5_min)}</p>
            <p className="text-sm text-primary-foreground/80">Clicks (Last 5 min)</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{formatNumber(realtime.clicks_last_hour)}</p>
            <p className="text-sm text-primary-foreground/80">Clicks (Last hour)</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{formatNumber(realtime.active_links)}</p>
            <p className="text-sm text-primary-foreground/80">Active Links</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card rounded-xl p-4 text-card-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MousePointerClick className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(stats.total_clicks)}</p>
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
              <p className="text-2xl font-bold">{formatNumber(stats.unique_visitors)}</p>
              <p className="text-xs text-muted-foreground">Unique Visitors</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 text-card-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <TrendingUp className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(stats.clicks_today)}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 text-card-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
              <Calendar className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(stats.clicks_this_week)}</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 text-card-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-500/10">
              <BarChart3 className="h-5 w-5 text-fuchsia-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(stats.clicks_this_month)}</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clicks Over Time Chart */}
      <div className="glass-card rounded-xl p-6 text-card-foreground">
        <h2 className="mb-6 text-lg font-semibold">Clicks Over Time</h2>
        <div className="h-80">
          {clicksData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={clicksData}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                />
                <Area 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  fill="url(#colorClicks)"
                  name="Clicks"
                />
                <Area 
                  type="monotone" 
                  dataKey="unique_visitors" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  fill="url(#colorVisitors)"
                  name="Unique Visitors"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No data available yet
            </div>
          )}
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className="glass-card rounded-xl p-6 text-card-foreground">
        <div className="mb-6 flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Hourly Click Distribution</h2>
        </div>
        <div className="h-48">
          {hourly.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis 
                  dataKey="hour" 
                  stroke="#9CA3AF" 
                  fontSize={11}
                  tickFormatter={(h) => formatHourLabel(h as number)}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  labelFormatter={(h) => {
                    const start = formatHourLabel(h as number)
                    const end = formatHourLabel(((h as number) + 1) % 24)
                    return `${start} - ${end}`
                  }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Bar dataKey="clicks" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No data
            </div>
          )}
        </div>
      </div>

      {/* Device & Browser Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Devices */}
        <div className="glass-card rounded-xl p-6 text-card-foreground">
          <h2 className="mb-4 text-lg font-semibold">Devices</h2>
          {devicesData.length > 0 ? (
            <div className="space-y-3">
              {devicesData.map((device: any, index: number) => {
                const Icon = deviceIcons[device.device_type] || Monitor
                return (
                  <div key={device.device_type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm capitalize text-card-foreground">
                        {device.device_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatNumber(device.clicks)}
                      </span>
                      <span className="w-12 text-right text-xs text-muted-foreground">
                        {device.percentage}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No data
            </div>
          )}
        </div>

        {/* Browsers */}
        <div className="glass-card rounded-xl p-6 text-card-foreground">
          <h2 className="mb-4 text-lg font-semibold">Browsers</h2>
          {browsersData.length > 0 ? (
            <div className="space-y-3">
              {browsersData.slice(0, 6).map((browser: any, index: number) => (
                <div key={browser.browser} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-card-foreground">{browser.browser}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatNumber(browser.clicks)}
                    </span>
                    <span className="w-12 text-right text-xs text-muted-foreground">
                      {browser.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No data
            </div>
          )}
        </div>

        {/* Operating Systems */}
        <div className="glass-card rounded-xl p-6 text-card-foreground">
          <h2 className="mb-4 text-lg font-semibold">Operating Systems</h2>
          {osData.length > 0 ? (
            <div className="space-y-3">
              {osData.slice(0, 6).map((os: any, index: number) => (
                <div key={os.os} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-card-foreground">{os.os}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatNumber(os.clicks)}
                    </span>
                    <span className="w-12 text-right text-xs text-muted-foreground">
                      {os.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No data
            </div>
          )}
        </div>
      </div>

      {/* UTM Analytics Section */}
      <div className="glass-card rounded-xl p-6 text-card-foreground">
        <div className="mb-6 flex items-center gap-2">
          <Share2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">UTM Campaign Tracking</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* UTM Sources */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-card-foreground">Sources</h3>
            {utmSourcesData.length > 0 ? (
              <div className="space-y-2">
                {utmSourcesData.slice(0, 5).map((source: any) => (
                  <div key={source.source} className="flex items-center justify-between py-1">
                    <span className="truncate text-sm text-muted-foreground">
                      {source.source}
                    </span>
                    <span className="ml-2 text-sm font-medium">
                      {formatNumber(source.clicks)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No UTM source data</p>
            )}
          </div>

          {/* UTM Mediums */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-card-foreground">Mediums</h3>
            {utmMediumsData.length > 0 ? (
              <div className="space-y-2">
                {utmMediumsData.slice(0, 5).map((medium: any) => (
                  <div key={medium.medium} className="flex items-center justify-between py-1">
                    <span className="truncate text-sm text-muted-foreground">
                      {medium.medium}
                    </span>
                    <span className="ml-2 text-sm font-medium">
                      {formatNumber(medium.clicks)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No UTM medium data</p>
            )}
          </div>

          {/* UTM Campaigns */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-card-foreground">Campaigns</h3>
            {utmCampaignsData.length > 0 ? (
              <div className="space-y-2">
                {utmCampaignsData.slice(0, 5).map((campaign: any) => (
                  <div key={campaign.campaign} className="flex items-center justify-between py-1">
                    <span className="truncate text-sm text-muted-foreground">
                      {campaign.campaign}
                    </span>
                    <span className="ml-2 text-sm font-medium">
                      {formatNumber(campaign.clicks)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No UTM campaign data</p>
            )}
          </div>
        </div>
      </div>

      {/* Countries & Referrers Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Countries */}
        <div className="glass-card rounded-xl p-6 text-card-foreground">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Top Countries</h2>
          </div>
          {countriesData.length > 0 ? (
            <div className="space-y-3">
              {countriesData.slice(0, 8).map((country: any, index: number) => (
                <div key={country.country_code} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getFlagEmoji(country.country_code)}</span>
                    <span className="text-sm text-card-foreground">
                      {(!country.country_name || country.country_name.toLowerCase() === 'unknown')
                        ? 'Global'
                        : country.country_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 rounded-full bg-muted">
                      <div 
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${country.percentage}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-sm font-medium">
                      {formatNumber(country.clicks)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No data available
            </div>
          )}
        </div>

        {/* Referrers */}
        <div className="glass-card rounded-xl p-6 text-card-foreground">
          <h2 className="mb-4 text-lg font-semibold">Top Referrers</h2>
          {referrersData.length > 0 ? (
            <div className="space-y-3">
              {referrersData.slice(0, 8).map((referrer: any) => (
                <div key={referrer.referrer} className="flex items-center justify-between">
                  <span className="truncate text-sm text-muted-foreground">
                    {referrer.referrer || 'Direct'}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 rounded-full bg-muted">
                      <div 
                        className="h-2 rounded-full bg-emerald-400"
                        style={{ width: `${referrer.percentage}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-sm font-medium">
                      {formatNumber(referrer.clicks)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Top Links */}
      <div className="glass-card rounded-xl p-6 text-card-foreground">
        <h2 className="mb-4 text-lg font-semibold">Top Performing Links</h2>
        {topLinksData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    #
                  </th>
                  <th className="py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Short Code
                  </th>
                  <th className="py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Destination
                  </th>
                  <th className="py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                    Clicks
                  </th>
                  <th className="py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                    Unique
                  </th>
                </tr>
              </thead>
              <tbody>
                {topLinksData.slice(0, 10).map((link: any, index: number) => (
                  <tr key={link.link_id || index} className="border-b last:border-0 border-border">
                    <td className="py-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="font-mono text-sm text-card-foreground">
                        {link.short_code}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="block max-w-xs truncate text-sm text-muted-foreground">
                        {link.destination_url}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-sm font-medium text-card-foreground">
                        {formatNumber(link.clicks)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-sm text-muted-foreground">
                        {formatNumber(link.unique_visitors)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        )}
      </div>
    </div>
  )
}

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode === 'unknown') return '🌍'
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}
