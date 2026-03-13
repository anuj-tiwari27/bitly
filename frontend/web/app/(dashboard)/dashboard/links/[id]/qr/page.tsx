'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowLeft, Download, RefreshCw, Loader2, Palette, Check
} from 'lucide-react'
import { linksApi, qrApi } from '@/lib/api'

const colorPresets = [
  { fill: '#000000', back: '#FFFFFF', name: 'Classic' },
  { fill: '#1E40AF', back: '#DBEAFE', name: 'Blue' },
  { fill: '#059669', back: '#D1FAE5', name: 'Green' },
  { fill: '#7C3AED', back: '#EDE9FE', name: 'Purple' },
  { fill: '#DC2626', back: '#FEE2E2', name: 'Red' },
  { fill: '#F59E0B', back: '#FEF3C7', name: 'Orange' },
]

export default function QRCodePage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const linkId = params.id as string

  const [styleConfig, setStyleConfig] = useState({
    fill_color: '#000000',
    back_color: '#FFFFFF',
    box_size: 10,
    border: 4,
  })
  const [generating, setGenerating] = useState(false)

  const { data: linkData, isLoading: linkLoading } = useQuery({
    queryKey: ['link', linkId],
    queryFn: () => linksApi.get(linkId),
  })

  const { data: qrData, isLoading: qrLoading } = useQuery({
    queryKey: ['qr', linkId],
    queryFn: () => qrApi.getByLink(linkId),
    enabled: !!linkId,
  })

  const createMutation = useMutation({
    mutationFn: () => qrApi.create({
      link_id: linkId,
      style_config: styleConfig,
      file_format: 'png',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr', linkId] })
      setGenerating(false)
    },
    onError: () => setGenerating(false),
  })

  const link = linkData?.data
  const qrCodes = qrData?.data || []
  const existingQR = qrCodes[0]

  const handleGenerate = () => {
    setGenerating(true)
    createMutation.mutate()
  }

  const handleDownload = async () => {
    if (existingQR?.download_url) {
      const response = await fetch(existingQR.download_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-${link?.short_code || 'code'}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } else {
      const svg = document.getElementById('qr-preview')
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()
        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height
          ctx?.drawImage(img, 0, 0)
          const pngUrl = canvas.toDataURL('image/png')
          const a = document.createElement('a')
          a.href = pngUrl
          a.download = `qr-${link?.short_code || 'code'}.png`
          a.click()
        }
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
      }
    }
  }

  if (linkLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (!link) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Link not found</p>
        <Link
          href="/dashboard/links"
          className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
        >
          Back to links
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/links/${linkId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Link
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Preview */}
        <div className="glass-card rounded-xl p-6 text-card-foreground">
          <h2 className="mb-4 text-lg font-semibold">QR Code Preview</h2>
          
          <div
            className="mb-6 flex items-center justify-center rounded-lg"
            style={{
              backgroundColor: styleConfig.back_color,
              padding: styleConfig.border * 4,
            }}
          >
            <QRCodeSVG
              id="qr-preview"
              value={link.short_url}
              size={styleConfig.box_size * 25}
              fgColor={styleConfig.fill_color}
              bgColor={styleConfig.back_color}
              level="M"
              includeMargin
            />
          </div>

          <div className="mb-6 text-center text-xs text-muted-foreground break-all">
            {link.short_url}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleDownload}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PNG
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Customization */}
        <div className="glass-card rounded-xl p-6 text-card-foreground">
          <h2 className="mb-4 text-lg font-semibold">
            <Palette className="mr-2 inline h-5 w-5" />
            Customize
          </h2>

          {/* Color Presets */}
          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-muted-foreground">
              Color Presets
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {colorPresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setStyleConfig({
                    ...styleConfig,
                    fill_color: preset.fill,
                    back_color: preset.back,
                  })}
                  className={`relative rounded-lg border-2 p-3 transition ${
                    styleConfig.fill_color === preset.fill && styleConfig.back_color === preset.back
                      ? 'border-primary'
                      : 'border-border hover:border-muted'
                  }`}
                >
                  <div
                    className="flex h-8 w-full items-center justify-center rounded"
                    style={{ backgroundColor: preset.back }}
                  >
                    <div 
                      className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: preset.fill }}
                    />
                  </div>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {preset.name}
                  </span>
                  {styleConfig.fill_color === preset.fill && styleConfig.back_color === preset.back && (
                    <Check className="absolute right-1 top-1 h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Foreground Color
              </label>
              <div className="flex items-center space-x-2">
                <label className="relative h-11 w-11 overflow-hidden rounded-lg border border-border bg-slate-950/60 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                  <span
                    className="absolute inset-0"
                    style={{ backgroundColor: styleConfig.fill_color }}
                  />
                  <input
                    type="color"
                    value={styleConfig.fill_color}
                    onChange={(e) => setStyleConfig({ ...styleConfig, fill_color: e.target.value })}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Foreground color"
                  />
                </label>
                <input
                  type="text"
                  value={styleConfig.fill_color}
                  onChange={(e) => setStyleConfig({ ...styleConfig, fill_color: e.target.value })}
                  className="glass-input flex-1 rounded-lg px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Background Color
              </label>
              <div className="flex items-center space-x-2">
                <label className="relative h-11 w-11 overflow-hidden rounded-lg border border-border bg-slate-950/60 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                  <span
                    className="absolute inset-0"
                    style={{ backgroundColor: styleConfig.back_color }}
                  />
                  <input
                    type="color"
                    value={styleConfig.back_color}
                    onChange={(e) => setStyleConfig({ ...styleConfig, back_color: e.target.value })}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Background color"
                  />
                </label>
                <input
                  type="text"
                  value={styleConfig.back_color}
                  onChange={(e) => setStyleConfig({ ...styleConfig, back_color: e.target.value })}
                  className="glass-input flex-1 rounded-lg px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Size */}
          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Size: {styleConfig.box_size * 25}px
            </label>
            <input
              type="range"
              min="5"
              max="20"
              value={styleConfig.box_size}
              onChange={(e) => setStyleConfig({ ...styleConfig, box_size: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Border */}
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Border: {styleConfig.border}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={styleConfig.border}
              onChange={(e) => setStyleConfig({ ...styleConfig, border: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Existing QR Codes */}
      {qrCodes.length > 0 && (
        <div className="mt-6 rounded-xl border bg-card p-6 text-card-foreground">
          <h2 className="mb-4 text-lg font-semibold">Saved QR Codes</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {qrCodes.map((qr: any) => (
              <div key={qr.id} className="rounded-lg border border-border p-4">
                {qr.download_url && (
                  <img
                    src={qr.download_url}
                    alt="QR Code"
                    className="mb-2 w-full rounded"
                  />
                )}
                <a
                  href={qr.download_url}
                  download
                  className="text-sm font-medium text-primary hover:opacity-90"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
