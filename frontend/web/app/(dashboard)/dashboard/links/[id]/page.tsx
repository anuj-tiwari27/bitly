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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!link) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Link not found</p>
        <Link href="/dashboard/links" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to links
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/links"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Links
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{link.title || 'Untitled Link'}</h1>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href={`/dashboard/links/${linkId}/qr`}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR Code
          </Link>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this link?')) {
                deleteMutation.mutate()
              }
            }}
            className="flex items-center px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Link URL Card */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-1">Short URL</p>
            <div className="flex items-center space-x-3">
              <span className="text-xl font-mono text-blue-600">{link.short_url}</span>
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5 text-gray-400" />
                )}
              </button>
              <a
                href={link.short_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ExternalLink className="h-5 w-5 text-gray-400" />
              </a>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              link.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {link.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-500 mb-1">Destination</p>
          <a
            href={link.destination_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-900 hover:text-blue-600 break-all"
          >
            {link.destination_url}
          </a>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Link Analytics</h2>
        <div className="flex items-center gap-2 bg-white rounded-lg border p-1">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                days === d
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <MousePointerClick className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(analytics.overview?.total_clicks || link.click_count)}
              </p>
              <p className="text-xs text-gray-500">Total Clicks</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(analytics.overview?.unique_visitors || 0)}
              </p>
              <p className="text-xs text-gray-500">Unique Visitors</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(analytics.overview?.clicks_today || 0)}
              </p>
              <p className="text-xs text-gray-500">Today</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(analytics.overview?.clicks_this_week || 0)}
              </p>
              <p className="text-xs text-gray-500">This Week</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(analytics.overview?.clicks_this_month || 0)}
              </p>
              <p className="text-xs text-gray-500">This Month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clicks Over Time Chart */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Clicks Over Time</h3>
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
            <div className="h-full flex items-center justify-center text-gray-500">
              No click data yet
            </div>
          )}
        </div>
      </div>

      {/* Device & Browser Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Devices */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Devices</h3>
          {analytics.devices?.length > 0 ? (
            <div className="flex items-center">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={150}>
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
              <div className="w-1/2 space-y-2">
                {analytics.devices.map((device: any, index: number) => {
                  const Icon = deviceIcons[device.device_type] || Monitor
                  const total = analytics.devices.reduce((sum: number, d: any) => sum + d.clicks, 0)
                  const percentage = total > 0 ? ((device.clicks / total) * 100).toFixed(1) : 0
                  return (
                    <div key={device.device_type} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <Icon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600 capitalize">{device.device_type}</span>
                      </div>
                      <span className="text-sm font-medium">{percentage}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500 text-sm">No data</div>
          )}
        </div>

        {/* Browsers */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Browsers</h3>
          {analytics.browsers?.length > 0 ? (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.browsers.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
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
            <div className="h-32 flex items-center justify-center text-gray-500 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Countries & Referrers Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Countries */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Top Countries</h3>
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
                      <span className="text-sm text-gray-700">{country.country_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 bg-gray-100 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{formatNumber(country.clicks)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500 text-sm">No geographic data yet</div>
          )}
        </div>

        {/* Referrers */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top Referrers</h3>
          {analytics.referrers?.length > 0 ? (
            <div className="space-y-3">
              {analytics.referrers.slice(0, 6).map((referrer: any) => {
                const total = analytics.referrers.reduce((sum: number, r: any) => sum + r.clicks, 0)
                const percentage = total > 0 ? (referrer.clicks / total) * 100 : 0
                return (
                  <div key={referrer.referrer} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 truncate max-w-[150px]">{referrer.referrer}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-20 bg-gray-100 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-green-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{formatNumber(referrer.clicks)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500 text-sm">No referrer data yet</div>
          )}
        </div>
      </div>

      {/* UTM Sources */}
      {analytics.utm_sources?.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">UTM Sources</h3>
          <div className="space-y-3">
            {analytics.utm_sources.slice(0, 6).map((source: any) => {
              const total = analytics.utm_sources.reduce((sum: number, s: any) => sum + s.clicks, 0)
              const percentage = total > 0 ? (source.clicks / total) * 100 : 0
              return (
                <div key={source.source} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{source.source}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-100 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-purple-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{formatNumber(source.clicks)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Link Details */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Link Details</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">Created</dt>
            <dd className="text-gray-900">{formatDate(link.created_at)}</dd>
          </div>
          {link.description && (
            <div>
              <dt className="text-sm text-gray-500">Description</dt>
              <dd className="text-gray-900">{link.description}</dd>
            </div>
          )}
          {link.expires_at && (
            <div>
              <dt className="text-sm text-gray-500">Expires</dt>
              <dd className="text-gray-900">{formatDate(link.expires_at)}</dd>
            </div>
          )}
          {link.max_clicks && (
            <div>
              <dt className="text-sm text-gray-500">Max Clicks</dt>
              <dd className="text-gray-900">{link.max_clicks}</dd>
            </div>
          )}
          {link.has_password && (
            <div>
              <dt className="text-sm text-gray-500">Password Protected</dt>
              <dd className="text-green-600">Yes</dd>
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
