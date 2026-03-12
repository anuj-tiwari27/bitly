'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/utils'

export default function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', { page, page_size: pageSize }],
    queryFn: () => adminApi.users({ page, page_size: pageSize }).then((res) => res.data),
  })

  const users = data?.items || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-600 mt-1">
          All registered user accounts with aggregated usage statistics.
        </p>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {users.length} of {total} users
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b bg-gray-50">
                <th className="py-2 px-4 text-left">Email</th>
                <th className="py-2 px-4 text-left">Created</th>
                <th className="py-2 px-4 text-right">Campaigns</th>
                <th className="py-2 px-4 text-right">Links</th>
                <th className="py-2 px-4 text-right">QR Codes</th>
                <th className="py-2 px-4 text-right">Total Clicks</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-2 px-4 text-gray-900">{user.email}</td>
                  <td className="py-2 px-4 text-gray-600">
                    {user.created_at ? formatDate(user.created_at) : ''}
                  </td>
                  <td className="py-2 px-4 text-right text-gray-700">
                    {formatNumber(user.campaign_count)}
                  </td>
                  <td className="py-2 px-4 text-right text-gray-700">
                    {formatNumber(user.link_count)}
                  </td>
                  <td className="py-2 px-4 text-right text-gray-700">
                    {formatNumber(user.qr_count)}
                  </td>
                  <td className="py-2 px-4 text-right font-medium text-gray-900">
                    {formatNumber(user.total_clicks)}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="py-6 px-4 text-center text-gray-500" colSpan={6}>
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-xs">
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border rounded-lg bg-white disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border rounded-lg bg-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

