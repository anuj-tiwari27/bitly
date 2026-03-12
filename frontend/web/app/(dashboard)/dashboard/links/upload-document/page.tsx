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
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/links"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Links
        </Link>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <FileUp className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Upload Document</h1>
            <p className="text-sm text-gray-500">
              Upload a file and get a short link + QR code to share it
            </p>
          </div>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document <span className="text-red-500">*</span>
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                  file
                    ? 'border-indigo-300 bg-indigo-50/50'
                    : 'border-gray-300 hover:border-gray-400'
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
                      <FileUp className="h-12 w-12 text-indigo-600 mx-auto mb-2" />
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                      <p className="text-xs text-indigo-600 mt-2">Click to change file</p>
                    </div>
                  ) : (
                    <div>
                      <FileUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">
                        Drag and drop a file here, or click to browse
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        PDF, Word, Excel, images, and more. Max {MAX_SIZE_MB}MB.
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My document"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Link
                href="/dashboard/links"
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={uploadMutation.isPending || !file}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Create Link & QR
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">Link and QR created!</p>
                <p className="text-sm text-green-700">
                  Your document is ready to share.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Short Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shortUrl}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                />
                <button
                  onClick={copyShortUrl}
                  className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QR Code
                </label>
                <a
                  href={result.qr.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  <Download className="h-4 w-4" />
                  Download QR Code
                </a>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Link
                href={`/dashboard/links/${result.link.id}`}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                View Link Details
              </Link>
              <button
                onClick={() => {
                  setResult(null)
                  setFile(null)
                  setTitle('')
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
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
