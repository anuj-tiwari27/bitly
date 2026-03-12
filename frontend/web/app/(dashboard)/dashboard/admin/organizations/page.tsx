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
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <p className="text-gray-600 mt-1">
          All companies using the platform, with aggregated usage and activity.
        </p>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {orgs.length} of {total} organizations
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
                <th className="py-2 px-4 text-left">Name</th>
                <th className="py-2 px-4 text-left">Slug</th>
                <th className="py-2 px-4 text-left">Plan</th>
                <th className="py-2 px-4 text-left">Status</th>
                <th className="py-2 px-4 text-left">Created</th>
                <th className="py-2 px-4 text-right">Members</th>
                <th className="py-2 px-4 text-right">Links</th>
                <th className="py-2 px-4 text-right">QR Codes</th>
                <th className="py-2 px-4 text-right">Total Clicks</th>
                <th className="py-2 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org: any) => (
                <tr key={org.id} className="border-b last:border-0">
                  <td className="py-2 px-4 text-gray-900">{org.name}</td>
                  <td className="py-2 px-4 text-gray-600">{org.slug}</td>
                  <td className="py-2 px-4 text-gray-600">
                    {org.plan_type || 'free'}
                  </td>
                  <td className="py-2 px-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs ${
                        org.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : org.status === 'suspended'
                          ? 'bg-yellow-50 text-yellow-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-gray-600">
                    {org.created_at ? formatDate(org.created_at) : ''}
                  </td>
                  <td className="py-2 px-4 text-right text-gray-700">
                    {formatNumber(org.members_count)}
                  </td>
                  <td className="py-2 px-4 text-right text-gray-700">
                    {formatNumber(org.link_count)}
                  </td>
                  <td className="py-2 px-4 text-right text-gray-700">
                    {formatNumber(org.qr_count)}
                  </td>
                  <td className="py-2 px-4 text-right font-medium text-gray-900">
                    {formatNumber(org.total_clicks)}
                  </td>
                  <td className="py-2 px-4 text-right text-xs space-x-2">
                    {org.status === 'suspended' ? (
                      <button
                        onClick={() => activateMutation.mutate(org.id)}
                        className="px-2 py-1 rounded border border-green-600 text-green-700 hover:bg-green-50"
                      >
                        Activate
                      </button>
                    ) : (
                      <button
                        onClick={() => suspendMutation.mutate(org.id)}
                        className="px-2 py-1 rounded border border-yellow-600 text-yellow-800 hover:bg-yellow-50"
                      >
                        Suspend
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(org.id)}
                      className="px-2 py-1 rounded border border-red-600 text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td className="py-6 px-4 text-center text-gray-500" colSpan={7}>
                    No organizations yet.
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

