'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Link2,
  Plus,
  Search,
  Copy,
  ExternalLink,
  QrCode,
  Trash2,
  Check,
  Calendar,
  MousePointerClick,
  FileUp,
  PauseCircle,
  PlayCircle,
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
    mutationFn: (id: string) => linksApi.delete(id, { permanent: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links'] }),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      linksApi.update(id, { is_active }),
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
          <h1 className="text-2xl font-bold text-foreground">Links</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage short links and document shares
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/links/upload-document"
            className={`flex items-center px-4 py-2 rounded-lg transition ${
              activeTab === 'documents'
                ? 'bg-secondary text-secondary-foreground hover:opacity-90'
                : 'border border-secondary text-secondary hover:bg-secondary/10'
            }`}
          >
            <FileUp className="h-4 w-4 mr-2" />
            Upload Document
          </Link>
          <Link
            href="/dashboard/links/new"
            className={`flex items-center px-4 py-2 rounded-lg transition ${
              activeTab === 'links'
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'border border-border text-foreground hover:bg-muted'
            }`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Link
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('links')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'links'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            }`}
          >
            <span className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Links
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {urlLinks.length}
              </span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'documents'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            }`}
          >
            <span className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Documents
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {documentLinks.length}
              </span>
            </span>
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={activeTab === 'documents' ? 'Search documents...' : 'Search links...'}
          className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Links / Documents Table */}
      <div className="glass-card overflow-hidden rounded-xl text-card-foreground">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : links.length === 0 ? (
          <div className="p-12 text-center">
            {activeTab === 'documents' ? (
              <>
                <FileUp className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium text-card-foreground">No documents yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Upload a document to get a short link and QR code
                </p>
                <Link
                  href="/dashboard/links/upload-document"
                  className="inline-flex items-center rounded-lg bg-secondary px-4 py-2 text-secondary-foreground transition hover:opacity-90"
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  Upload Document
                </Link>
              </>
            ) : (
              <>
                <Link2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium text-card-foreground">No links yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create your first short link to get started
                </p>
                <Link
                  href="/dashboard/links/new"
                  className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:opacity-90"
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
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {activeTab === 'documents' ? 'Document' : 'Link'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Short URL
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Clicks
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {links.map((link: any) => (
                  <tr key={link.id} className="hover:bg-muted/60">
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/links/${link.id}`}
                        className="block"
                      >
                        <p className="text-sm font-medium text-card-foreground hover:text-primary">
                          {link.title || 'Untitled'}
                        </p>
                        <p className="max-w-xs truncate text-xs text-muted-foreground">
                          {truncateUrl(link.destination_url, 50)}
                        </p>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm text-primary">
                          {link.short_url}
                        </span>
                        <button
                          onClick={() => handleCopy(link.short_url, link.id)}
                          className="rounded p-1 hover:bg-muted"
                        >
                          {copiedId === link.id ? (
                            <Check className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        <a
                          href={link.short_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded p-1 hover:bg-muted"
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm">
                        <MousePointerClick className="mr-1 h-4 w-4 text-muted-foreground" />
                        {formatNumber(link.click_count)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="mr-1 h-4 w-4" />
                        {formatDate(link.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          link.is_active
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {link.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: link.id,
                              is_active: !link.is_active,
                            })
                          }
                          className="inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                          title={link.is_active ? 'Make inactive' : 'Activate link'}
                        >
                          {link.is_active ? (
                            <>
                              <PauseCircle className="mr-1 h-3 w-3 text-muted-foreground" />
                              Inactivate
                            </>
                          ) : (
                            <>
                              <PlayCircle className="mr-1 h-3 w-3 text-emerald-400" />
                              Activate
                            </>
                          )}
                        </button>
                        <Link
                          href={`/dashboard/links/${link.id}/qr`}
                          className="rounded-lg p-2 hover:bg-muted"
                          title="QR Code"
                        >
                          <QrCode className="h-4 w-4 text-muted-foreground" />
                        </Link>
                        <button
                          onClick={() => {
                            if (confirm('This will permanently delete the link. Continue?')) {
                              deleteMutation.mutate(link.id)
                            }
                          }}
                          className="rounded-lg p-2 hover:bg-red-500/10"
                          title="Delete permanently"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
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
