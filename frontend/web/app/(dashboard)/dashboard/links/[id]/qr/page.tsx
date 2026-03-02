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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!link) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Link not found</p>
        <Link href="/dashboard/links" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to links
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/dashboard/links/${linkId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Link
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Preview */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">QR Code Preview</h2>
          
          <div 
            className="flex items-center justify-center p-8 rounded-lg mb-6"
            style={{ backgroundColor: styleConfig.back_color }}
          >
            <QRCodeSVG
              id="qr-preview"
              value={link.short_url}
              size={200}
              fgColor={styleConfig.fill_color}
              bgColor={styleConfig.back_color}
              level="M"
              includeMargin
            />
          </div>

          <div className="text-center text-sm text-gray-500 mb-6">
            {link.short_url}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PNG
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
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
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <Palette className="h-5 w-5 inline mr-2" />
            Customize
          </h2>

          {/* Color Presets */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Color Presets
            </label>
            <div className="grid grid-cols-3 gap-3">
              {colorPresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setStyleConfig({
                    ...styleConfig,
                    fill_color: preset.fill,
                    back_color: preset.back,
                  })}
                  className={`relative p-3 rounded-lg border-2 transition ${
                    styleConfig.fill_color === preset.fill && styleConfig.back_color === preset.back
                      ? 'border-blue-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div 
                    className="w-full h-8 rounded flex items-center justify-center"
                    style={{ backgroundColor: preset.back }}
                  >
                    <div 
                      className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: preset.fill }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 mt-1 block">{preset.name}</span>
                  {styleConfig.fill_color === preset.fill && styleConfig.back_color === preset.back && (
                    <Check className="absolute top-1 right-1 h-4 w-4 text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foreground Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={styleConfig.fill_color}
                  onChange={(e) => setStyleConfig({ ...styleConfig, fill_color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={styleConfig.fill_color}
                  onChange={(e) => setStyleConfig({ ...styleConfig, fill_color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Background Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={styleConfig.back_color}
                  onChange={(e) => setStyleConfig({ ...styleConfig, back_color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={styleConfig.back_color}
                  onChange={(e) => setStyleConfig({ ...styleConfig, back_color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Size */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
        <div className="mt-6 bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Saved QR Codes</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {qrCodes.map((qr: any) => (
              <div key={qr.id} className="border rounded-lg p-4">
                {qr.download_url && (
                  <img
                    src={qr.download_url}
                    alt="QR Code"
                    className="w-full rounded mb-2"
                  />
                )}
                <a
                  href={qr.download_url}
                  download
                  className="text-sm text-blue-600 hover:text-blue-700"
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
