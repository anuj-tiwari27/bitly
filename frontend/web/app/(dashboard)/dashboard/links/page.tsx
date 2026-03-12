'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Link2, Plus, Search, Copy, ExternalLink, QrCode, Trash2,
  Check, Calendar, MousePointerClick, FileUp
} from 'lucide-react'
import { linksApi } from '@/lib/api'
import { formatNumber, formatDate, truncateUrl, copyToClipboard } from '@/lib/utils'

type Tab = 'links' | 'documents'

function isDocumentLink(link: { destination_url?: string }) {
  return link?.destination_url?.includes('/api/documents/') ?? false
}

export default function LinksPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('links')
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['links', { search }],
    queryFn: () => linksApi.list({ search: search || undefined, page_size: 100 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => linksApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links'] }),
  })

  const allLinks = data?.data?.items || []
  const documentLinks = allLinks.filter(isDocumentLink)
  const urlLinks = allLinks.filter((l: any) => !isDocumentLink(l))

  const links = activeTab === 'documents' ? documentLinks : urlLinks

  const handleCopy = async (url: string, id: string) => {
    await copyToClipboard(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Links</h1>
          <p className="text-gray-600 mt-1">Manage short links and document shares</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/links/upload-document"
            className={`flex items-center px-4 py-2 rounded-lg transition ${
              activeTab === 'documents'
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            <FileUp className="h-4 w-4 mr-2" />
            Upload Document
          </Link>
          <Link
            href="/dashboard/links/new"
            className={`flex items-center px-4 py-2 rounded-lg transition ${
              activeTab === 'links'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Link
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('links')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'links'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Links
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                {urlLinks.length}
              </span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'documents'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Documents
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                {documentLinks.length}
              </span>
            </span>
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={activeTab === 'documents' ? 'Search documents...' : 'Search links...'}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Links / Documents Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : links.length === 0 ? (
          <div className="p-12 text-center">
            {activeTab === 'documents' ? (
              <>
                <FileUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                <p className="text-gray-500 mb-4">Upload a document to get a short link and QR code</p>
                <Link
                  href="/dashboard/links/upload-document"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  Upload Document
                </Link>
              </>
            ) : (
              <>
                <Link2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No links yet</h3>
                <p className="text-gray-500 mb-4">Create your first short link to get started</p>
                <Link
                  href="/dashboard/links/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Link
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'documents' ? 'Document' : 'Link'}
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Short URL
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clicks
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {links.map((link: any) => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/links/${link.id}`}
                        className="block"
                      >
                        <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {link.title || 'Untitled'}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-xs">
                          {truncateUrl(link.destination_url, 50)}
                        </p>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-blue-600 font-mono">
                          {link.short_url}
                        </span>
                        <button
                          onClick={() => handleCopy(link.short_url, link.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {copiedId === link.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <a
                          href={link.short_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm">
                        <MousePointerClick className="h-4 w-4 text-gray-400 mr-1" />
                        {formatNumber(link.click_count)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(link.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          link.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {link.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/dashboard/links/${link.id}/qr`}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="QR Code"
                        >
                          <QrCode className="h-4 w-4 text-gray-500" />
                        </Link>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this link?')) {
                              deleteMutation.mutate(link.id)
                            }
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
