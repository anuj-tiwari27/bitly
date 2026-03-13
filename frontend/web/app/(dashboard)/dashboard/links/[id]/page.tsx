'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Copy, ExternalLink, QrCode, Trash2,
  Check, MousePointerClick, Users, Globe, Calendar,
  Monitor, Smartphone, Tablet, TrendingUp, Clock
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { linksApi, qrApi, analyticsApi } from '@/lib/api'
import { formatNumber, formatDate, copyToClipboard } from '@/lib/utils'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

const deviceIcons: Record<string, any> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  other: Monitor,
  unknown: Monitor,
}

export default function LinkDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const linkId = params.id as string
  const [copied, setCopied] = useState(false)
  const [days, setDays] = useState(30)

  const { data: linkData, isLoading } = useQuery({
    queryKey: ['link', linkId],
    queryFn: () => linksApi.get(linkId),
  })

  const { data: analyticsData } = useQuery({
    queryKey: ['link-analytics', linkId, days],
    queryFn: () => analyticsApi.linkAnalytics(linkId, days),
    enabled: !!linkId,
  })

  const { data: qrData } = useQuery({
    queryKey: ['qr', linkId],
    queryFn: () => qrApi.getByLink(linkId),
    enabled: !!linkId,
  })

  const deleteMutation = useMutation({
    mutationFn: () => linksApi.delete(linkId),
    onSuccess: () => router.push('/dashboard/links'),
  })

  const link = linkData?.data
  const analytics = analyticsData?.data || {
    overview: { total_clicks: 0, unique_visitors: 0, clicks_today: 0, clicks_this_week: 0, clicks_this_month: 0 },
    clicks_over_time: [],
    devices: [],
    browsers: [],
    referrers: [],
    countries: [],
    utm_sources: []
  }
  const qrCodes = qrData?.data || []

  const handleCopy = async () => {
    if (link) {
      await copyToClipboard(link.short_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (!link) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Link not found</p>
        <Link
          href="/dashboard/links"
          className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
        >
          Back to links
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/dashboard/links"
            className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Links
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            {link.title || 'Untitled Link'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Link
            href={`/dashboard/links/${linkId}/qr`}
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            <QrCode className="mr-2 h-4 w-4" />
            QR Code
          </Link>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this link?')) {
                deleteMutation.mutate()
              }
            }}
            className="inline-flex items-center justify-center rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Link URL Card */}
      <div className="glass-card rounded-xl p-6 text-card-foreground">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <p className="mb-1 text-sm text-muted-foreground">Short URL</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="break-all font-mono text-sm text-primary sm:text-base">
                {link.short_url}
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-2 sm:mt-0">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center rounded-lg bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 h-4 w-4 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-4 w-4 text-slate-300" />
                      Copy
                    </>
                  )}
                </button>
                <a
                  href={link.short_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-xs font-medium text-slate-200 hover:bg-muted"
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Open
                </a>
              </div>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              link.is_active
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {link.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-1 text-sm text-muted-foreground">Destination</p>
          <a
            href={link.destination_url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-card-foreground hover:text-primary"
          >
            {link.destination_url}
          </a>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Link Analytics</h2>
        <div className="glass-card flex items-center gap-2 rounded-lg p-1 text-card-foreground">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="glass-card rounded-xl p-4 text-card-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MousePointerClick className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatNumber(analytics.overview?.total_clicks || link.click_count)}
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <TrendingUp className="h-5 w-5 text-amber-400" />
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
              <Calendar className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatNumber(analytics.overview?.clicks_this_week || 0)}
              </p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 text-card-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-500/10">
              <Clock className="h-5 w-5 text-fuchsia-400" />
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

      {/* Clicks Over Time Chart */}
      <div className="glass-card rounded-xl p-6 text-card-foreground">
        <h3 className="mb-4 font-semibold">Clicks Over Time</h3>
        <div className="h-64">
          {analytics.clicks_over_time?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.clicks_over_time}>
                <defs>
                  <linearGradient id="colorClicksLink" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#020617', 
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                />
                <Area 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  fill="url(#colorClicksLink)"
                  name="Clicks"
                />
                <Area 
                  type="monotone" 
                  dataKey="unique_visitors" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  fill="transparent"
                  name="Unique Visitors"
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

      {/* Device & Browser Row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Devices */}
        <div className="glass-card rounded-xl p-6 text-card-foreground">
          <h3 className="mb-4 font-semibold">Devices</h3>
          {analytics.devices?.length > 0 ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="w-full sm:w-1/2">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={analytics.devices}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="clicks"
                    >
                      {analytics.devices.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-2 sm:w-1/2">
                {analytics.devices.map((device: any, index: number) => {
                  const Icon = deviceIcons[device.device_type] || Monitor
                  const total = analytics.devices.reduce((sum: number, d: any) => sum + d.clicks, 0)
                  const percentage = total > 0 ? ((device.clicks / total) * 100).toFixed(1) : 0
                  return (
                    <div key={device.device_type} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className="mr-2 h-2 w-2 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm capitalize text-card-foreground">
                          {device.device_type}
                        </span>
                      </div>
                      <span className="text-sm font-medium">{percentage}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No data
            </div>
          )}
        </div>

        {/* Browsers */}
        <div className="glass-card rounded-xl p-6 text-card-foreground">
          <h3 className="mb-4 font-semibold">Browsers</h3>
          {analytics.browsers?.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.browsers.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="browser" 
                    stroke="#9CA3AF" 
                    fontSize={12}
                    width={70}
                  />
                  <Tooltip />
                  <Bar dataKey="clicks" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No data
            </div>
          )}
        </div>
      </div>

      {/* Countries & Referrers Row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Countries */}
        <div className="glass-card rounded-xl p-6 text-card-foreground">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Top Countries</h3>
          </div>
          {analytics.countries?.length > 0 ? (
            <div className="space-y-3">
              {analytics.countries.slice(0, 6).map((country: any) => {
                const total = analytics.countries.reduce((sum: number, c: any) => sum + c.clicks, 0)
                const percentage = total > 0 ? (country.clicks / total) * 100 : 0
                return (
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
                      <div className="h-2 w-20 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-sm font-medium">
                        {formatNumber(country.clicks)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No geographic data yet
            </div>
          )}
        </div>

        {/* Referrers */}
        <div className="glass-card rounded-xl p-6 text-card-foreground">
          <h3 className="mb-4 font-semibold">Top Referrers</h3>
          {analytics.referrers?.length > 0 ? (
            <div className="space-y-3">
              {analytics.referrers.slice(0, 6).map((referrer: any) => {
                const total = analytics.referrers.reduce((sum: number, r: any) => sum + r.clicks, 0)
                const percentage = total > 0 ? (referrer.clicks / total) * 100 : 0
                return (
                  <div key={referrer.referrer} className="flex items-center justify-between">
                    <span className="max-w-[150px] truncate text-sm text-muted-foreground">
                      {referrer.referrer}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-20 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-emerald-400"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-sm font-medium">
                        {formatNumber(referrer.clicks)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No referrer data yet
            </div>
          )}
        </div>
      </div>

      {/* UTM Sources */}
      {analytics.utm_sources?.length > 0 && (
        <div className="glass-card rounded-xl p-6 text-card-foreground">
          <h3 className="mb-4 font-semibold">UTM Sources</h3>
          <div className="space-y-3">
            {analytics.utm_sources.slice(0, 6).map((source: any) => {
              const total = analytics.utm_sources.reduce(
                (sum: number, s: any) => sum + s.clicks,
                0,
              )
              const percentage = total > 0 ? (source.clicks / total) * 100 : 0
              return (
                <div key={source.source} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{source.source}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-secondary"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-medium">
                      {formatNumber(source.clicks)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Link Details */}
      <div className="glass-card rounded-xl p-6 text-card-foreground">
        <h3 className="mb-4 font-semibold">Link Details</h3>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Created</dt>
            <dd className="whitespace-nowrap text-card-foreground">{formatDate(link.created_at)}</dd>
          </div>
          {link.description && (
            <div>
              <dt className="text-sm text-muted-foreground">Description</dt>
              <dd className="text-card-foreground">{link.description}</dd>
            </div>
          )}
          {link.expires_at && (
            <div>
              <dt className="text-sm text-muted-foreground">Expires</dt>
              <dd className="text-card-foreground">{formatDate(link.expires_at)}</dd>
            </div>
          )}
          {link.max_clicks && (
            <div>
              <dt className="text-sm text-muted-foreground">Max Clicks</dt>
              <dd className="text-card-foreground">{link.max_clicks}</dd>
            </div>
          )}
          {link.has_password && (
            <div>
              <dt className="text-sm text-muted-foreground">Password Protected</dt>
              <dd className="text-emerald-400">Yes</dd>
            </div>
          )}
        </dl>
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
