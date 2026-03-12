'use client'

import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { Users, Building2, Link2, QrCode, MousePointerClick } from 'lucide-react'

export default function AdminOverviewPage() {
  const { data: overviewData, isLoading: loadingOverview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.overview().then((res) => res.data),
  })

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users', { page: 1, page_size: 5 }],
    queryFn: () => adminApi.users({ page: 1, page_size: 5 }).then((res) => res.data),
  })

  const { data: orgsData, isLoading: loadingOrgs } = useQuery({
    queryKey: ['admin-orgs', { page: 1, page_size: 5 }],
    queryFn: () => adminApi.organizations({ page: 1, page_size: 5 }).then((res) => res.data),
  })

  const overview = overviewData || {
    total_users: 0,
    total_organizations: 0,
    total_links: 0,
    total_campaigns: 0,
    total_qr_codes: 0,
    total_clicks: 0,
  }

  const topUsers = usersData?.items || []
  const topOrgs = orgsData?.items || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
        <p className="text-gray-600 mt-1">
          Platform-wide metrics across all customers, users, and links.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Users"
          icon={Users}
          loading={loadingOverview}
          value={overview.total_users}
        />
        <StatCard
          label="Organizations"
          icon={Building2}
          loading={loadingOverview}
          value={overview.total_organizations}
        />
        <StatCard
          label="Links"
          icon={Link2}
          loading={loadingOverview}
          value={overview.total_links}
        />
        <StatCard
          label="QR Codes"
          icon={QrCode}
          loading={loadingOverview}
          value={overview.total_qr_codes}
        />
        <StatCard
          label="Total Clicks"
          icon={MousePointerClick}
          loading={loadingOverview}
          value={overview.total_clicks}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top users */}
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top users by clicks</h2>
          </div>
          {loadingUsers ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : topUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No user data yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="py-2 text-left">Email</th>
                  <th className="py-2 text-right">Links</th>
                  <th className="py-2 text-right">QRs</th>
                  <th className="py-2 text-right">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((user: any) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-gray-900">{user.email}</td>
                    <td className="py-2 text-right text-gray-700">
                      {formatNumber(user.link_count)}
                    </td>
                    <td className="py-2 text-right text-gray-700">
                      {formatNumber(user.qr_count)}
                    </td>
                    <td className="py-2 text-right font-medium text-gray-900">
                      {formatNumber(user.total_clicks)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top organizations */}
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top organizations</h2>
          </div>
          {loadingOrgs ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : topOrgs.length === 0 ? (
            <p className="text-sm text-gray-500">No organizations created yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="py-2 text-left">Name</th>
                  <th className="py-2 text-right">Members</th>
                  <th className="py-2 text-right">Links</th>
                  <th className="py-2 text-right">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {topOrgs.map((org: any) => (
                  <tr key={org.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-gray-900">{org.name}</td>
                    <td className="py-2 text-right text-gray-700">
                      {formatNumber(org.members_count)}
                    </td>
                    <td className="py-2 text-right text-gray-700">
                      {formatNumber(org.link_count)}
                    </td>
                    <td className="py-2 text-right font-medium text-gray-900">
                      {formatNumber(org.total_clicks)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
}) {
  return (
    <div className="bg-white border rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-xl font-semibold text-gray-900">
          {loading ? (
            <span className="inline-flex items-center">
              <span className="animate-pulse h-5 w-10 bg-gray-100 rounded" />
            </span>
          ) : (
            formatNumber(value || 0)
          )}
        </p>
      </div>
      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
    </div>
  )
}

