'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/utils'

export default function AdminOrganizationsPage() {
  const [page, setPage] = useState(1)
  const pageSize = 20
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orgs', { page, page_size: pageSize }],
    queryFn: () => adminApi.organizations({ page, page_size: pageSize }).then((res) => res.data),
  })

  const orgs = data?.items || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const suspendMutation = useMutation({
    mutationFn: (id: string) => adminApi.suspendOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] })
    },
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => adminApi.activateOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] })
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All companies using the platform, with aggregated usage and activity.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card text-card-foreground">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Showing {orgs.length} of {total} organizations
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
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Slug</th>
                <th className="px-4 py-2 text-left">Plan</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Created</th>
                <th className="px-4 py-2 text-right">Members</th>
                <th className="px-4 py-2 text-right">Links</th>
                <th className="px-4 py-2 text-right">QR Codes</th>
                <th className="px-4 py-2 text-right">Total Clicks</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org: any) => (
                <tr key={org.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-card-foreground">{org.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{org.slug}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {org.plan_type || 'free'}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs ${
                        org.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : org.status === 'suspended'
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {org.created_at ? formatDate(org.created_at) : ''}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {formatNumber(org.members_count)}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {formatNumber(org.link_count)}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {formatNumber(org.qr_count)}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-card-foreground">
                    {formatNumber(org.total_clicks)}
                  </td>
                  <td className="space-x-2 px-4 py-2 text-right text-xs">
                    {org.status === 'suspended' ? (
                      <button
                        onClick={() => activateMutation.mutate(org.id)}
                        className="rounded border border-emerald-500 px-2 py-1 text-emerald-300 hover:bg-emerald-500/10"
                      >
                        Activate
                      </button>
                    ) : (
                      <button
                        onClick={() => suspendMutation.mutate(org.id)}
                        className="rounded border border-amber-500 px-2 py-1 text-amber-300 hover:bg-amber-500/10"
                      >
                        Suspend
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(org.id)}
                      className="rounded border border-red-500 px-2 py-1 text-red-300 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-muted-foreground" colSpan={7}>
                    No organizations yet.
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

