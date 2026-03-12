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
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All registered user accounts with aggregated usage statistics.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card text-card-foreground">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Showing {users.length} of {total} users
          </p>
        </div>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Created</th>
                <th className="px-4 py-2 text-right">Campaigns</th>
                <th className="px-4 py-2 text-right">Links</th>
                <th className="px-4 py-2 text-right">QR Codes</th>
                <th className="px-4 py-2 text-right">Total Clicks</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-card-foreground">{user.email}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {user.created_at ? formatDate(user.created_at) : ''}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {formatNumber(user.campaign_count)}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {formatNumber(user.link_count)}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {formatNumber(user.qr_count)}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-card-foreground">
                    {formatNumber(user.total_clicks)}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-muted-foreground" colSpan={6}>
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-3 text-xs">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-border bg-card px-3 py-1 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-border bg-card px-3 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

