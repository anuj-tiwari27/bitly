'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import {
  FileUp,
  ArrowLeft,
  Loader2,
  Link2,
  QrCode,
  Check,
  Copy,
  Download,
} from 'lucide-react'
import Link from 'next/link'
import { documentsApi, linksApi, qrApi } from '@/lib/api'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]

const MAX_SIZE_MB = 50

export default function UploadDocumentPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    link: { id: string; short_code: string; short_url: string }
    qr?: { download_url: string }
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected')
      const docRes = await documentsApi.upload(file)
      const docUrl = docRes?.data?.url
      if (!docUrl) throw new Error('Invalid response from upload')

      const linkData: any = {
        destination_url: docUrl,
        title: title || file.name,
      }
      if (typeof window !== 'undefined') {
        const orgId = localStorage.getItem('current_organization_id')
        if (orgId) linkData.organization_id = orgId
      }

      const linkRes = await linksApi.create(linkData)
      const link = linkRes?.data
      if (!link?.id) throw new Error('Failed to create link')

      let qrDownloadUrl: string | undefined
      try {
        const qrRes = await qrApi.create({ link_id: link.id })
        qrDownloadUrl = qrRes?.data?.download_url
      } catch {
        // QR creation optional
      }

      return { link, qrDownloadUrl }
    },
    onSuccess: (data) => {
      setResult({
        link: data.link,
        qr: data.qrDownloadUrl ? { download_url: data.qrDownloadUrl } : undefined,
      })
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : err?.message ?? 'Upload failed'
      setError(msg)
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    setResult(null)
    const f = e.target.files?.[0]
    if (!f) {
      setFile(null)
      return
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`)
      setFile(null)
      return
    }
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)
    const f = e.dataTransfer.files[0]
    if (!f) return
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`)
      return
    }
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''))
  }

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!file) {
      setError('Please select a file')
      return
    }
    uploadMutation.mutate()
  }

  const copyShortUrl = () => {
    if (result?.link.short_url) {
      navigator.clipboard.writeText(result.link.short_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shortUrl = result?.link?.short_url || ''

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/links"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Links
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-6 text-card-foreground">
        <div className="mb-6 flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
            <FileUp className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Upload Document</h1>
            <p className="text-sm text-muted-foreground">
              Upload a file and get a short link + QR code to share it
            </p>
          </div>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Document <span className="text-red-500">*</span>
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={`rounded-lg border-2 border-dashed p-8 text-center transition ${
                  file
                    ? 'border-secondary/60 bg-secondary/5'
                    : 'border-border hover:border-muted'
                }`}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept={ALLOWED_TYPES.join(',')}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {file ? (
                    <div>
                      <FileUp className="mx-auto mb-2 h-12 w-12 text-secondary" />
                      <p className="font-medium text-card-foreground">{file.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                      <p className="mt-2 text-xs text-secondary">
                        Click to change file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <FileUp className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Drag and drop a file here, or click to browse
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        PDF, Word, Excel, images, and more. Max {MAX_SIZE_MB}MB.
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Link Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My document"
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:border-transparent focus:ring-2 focus:ring-secondary"
              />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Link
                href="/dashboard/links"
                className="rounded-lg border border-border px-6 py-3 text-sm hover:bg-muted"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={uploadMutation.isPending || !file}
                className="flex items-center rounded-lg bg-secondary px-6 py-3 text-sm text-secondary-foreground transition disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Create Link & QR
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <p className="font-medium text-emerald-200">Link and QR created!</p>
                <p className="text-sm text-emerald-100">
                  Your document is ready to share.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Short Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shortUrl}
                  className="flex-1 rounded-lg border border-border bg-muted px-4 py-3 font-mono text-sm text-foreground"
                />
                <button
                  onClick={copyShortUrl}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-primary-foreground hover:opacity-90"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {result.qr?.download_url && (
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">
                  QR Code
                </label>
                <a
                  href={result.qr.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm hover:bg-muted/80"
                >
                  <Download className="h-4 w-4" />
                  Download QR Code
                </a>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Link
                href={`/dashboard/links/${result.link.id}`}
                className="rounded-lg bg-primary px-6 py-3 text-sm text-primary-foreground transition hover:opacity-90"
              >
                View Link Details
              </Link>
              <button
                onClick={() => {
                  setResult(null)
                  setFile(null)
                  setTitle('')
                }}
                className="rounded-lg border border-border px-6 py-3 text-sm hover:bg-muted"
              >
                Upload Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
