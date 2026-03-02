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
    refetchInterval: 30000,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Track your link performance and audience insights</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg border p-1">
          {(['7d', '14d', '30d', '90d'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '14d' ? '14 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
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
            <p className="text-blue-100 text-sm">Clicks (Last 5 min)</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{formatNumber(realtime.clicks_last_hour)}</p>
            <p className="text-blue-100 text-sm">Clicks (Last hour)</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{formatNumber(realtime.active_links)}</p>
            <p className="text-blue-100 text-sm">Active Links</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <MousePointerClick className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total_clicks)}</p>
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
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.unique_visitors)}</p>
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
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.clicks_today)}</p>
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
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.clicks_this_week)}</p>
              <p className="text-xs text-gray-500">This Week</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.clicks_this_month)}</p>
              <p className="text-xs text-gray-500">This Month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clicks Over Time Chart */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Clicks Over Time</h2>
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
            <div className="h-full flex items-center justify-center text-gray-500">
              No data available yet
            </div>
          )}
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Hourly Click Distribution</h2>
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
                  tickFormatter={(h) => `${h}:00`}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  labelFormatter={(h) => `${h}:00 - ${h}:59`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Bar dataKey="clicks" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">No data</div>
          )}
        </div>
      </div>

      {/* Device & Browser Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Devices */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Devices</h2>
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
                      <Icon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700 capitalize">{device.device_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatNumber(device.clicks)}</span>
                      <span className="text-xs text-gray-500 w-12 text-right">{device.percentage}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500 text-sm">No data</div>
          )}
        </div>

        {/* Browsers */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Browsers</h2>
          {browsersData.length > 0 ? (
            <div className="space-y-3">
              {browsersData.slice(0, 6).map((browser: any, index: number) => (
                <div key={browser.browser} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-700">{browser.browser}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatNumber(browser.clicks)}</span>
                    <span className="text-xs text-gray-500 w-12 text-right">{browser.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500 text-sm">No data</div>
          )}
        </div>

        {/* Operating Systems */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Operating Systems</h2>
          {osData.length > 0 ? (
            <div className="space-y-3">
              {osData.slice(0, 6).map((os: any, index: number) => (
                <div key={os.os} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-700">{os.os}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatNumber(os.clicks)}</span>
                    <span className="text-xs text-gray-500 w-12 text-right">{os.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* UTM Analytics Section */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Share2 className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">UTM Campaign Tracking</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* UTM Sources */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Sources</h3>
            {utmSourcesData.length > 0 ? (
              <div className="space-y-2">
                {utmSourcesData.slice(0, 5).map((source: any) => (
                  <div key={source.source} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-600 truncate">{source.source}</span>
                    <span className="text-sm font-medium ml-2">{formatNumber(source.clicks)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No UTM source data</p>
            )}
          </div>

          {/* UTM Mediums */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Mediums</h3>
            {utmMediumsData.length > 0 ? (
              <div className="space-y-2">
                {utmMediumsData.slice(0, 5).map((medium: any) => (
                  <div key={medium.medium} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-600 truncate">{medium.medium}</span>
                    <span className="text-sm font-medium ml-2">{formatNumber(medium.clicks)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No UTM medium data</p>
            )}
          </div>

          {/* UTM Campaigns */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Campaigns</h3>
            {utmCampaignsData.length > 0 ? (
              <div className="space-y-2">
                {utmCampaignsData.slice(0, 5).map((campaign: any) => (
                  <div key={campaign.campaign} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-600 truncate">{campaign.campaign}</span>
                    <span className="text-sm font-medium ml-2">{formatNumber(campaign.clicks)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No UTM campaign data</p>
            )}
          </div>
        </div>
      </div>

      {/* Countries & Referrers Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Countries */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Top Countries</h2>
          </div>
          {countriesData.length > 0 ? (
            <div className="space-y-3">
              {countriesData.slice(0, 8).map((country: any, index: number) => (
                <div key={country.country_code} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getFlagEmoji(country.country_code)}</span>
                    <span className="text-sm text-gray-700">{country.country_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-100 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${country.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">{formatNumber(country.clicks)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-500">No data available</div>
          )}
        </div>

        {/* Referrers */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Referrers</h2>
          {referrersData.length > 0 ? (
            <div className="space-y-3">
              {referrersData.slice(0, 8).map((referrer: any) => (
                <div key={referrer.referrer} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate">{referrer.referrer || 'Direct'}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-100 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${referrer.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">{formatNumber(referrer.clicks)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-500">No data available</div>
          )}
        </div>
      </div>

      {/* Top Links */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Links</h2>
        {topLinksData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-3">#</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-3">Short Code</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-3">Destination</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">Clicks</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">Unique</th>
                </tr>
              </thead>
              <tbody>
                {topLinksData.slice(0, 10).map((link: any, index: number) => (
                  <tr key={link.link_id || index} className="border-b last:border-0">
                    <td className="py-3">
                      <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-medium flex items-center justify-center">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="font-mono text-sm text-gray-900">{link.short_code}</span>
                    </td>
                    <td className="py-3">
                      <span className="text-sm text-gray-600 truncate max-w-xs block">
                        {link.destination_url}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-sm font-medium text-gray-900">{formatNumber(link.clicks)}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-sm text-gray-500">{formatNumber(link.unique_visitors)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-500">No data available</div>
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
