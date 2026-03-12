'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link2, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { linksApi, campaignsApi } from '@/lib/api'

export default function NewLinkPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    destination_url: '',
    title: '',
    description: '',
    custom_code: '',
    campaign_id: '',
    expires_at: '',
    password: '',
    max_clicks: '',
  })
  const [error, setError] = useState('')

  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsApi.list({ page_size: 100 }),
  })

  const campaigns = campaignsData?.data?.items || []

  const createMutation = useMutation({
    mutationFn: (data: any) => linksApi.create(data),
    onSuccess: (response) => {
      router.push(`/dashboard/links/${response.data.id}`)
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create link')
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.destination_url) {
      setError('Destination URL is required')
      return
    }

    const data: any = {
      destination_url: formData.destination_url,
    }

    if (formData.title) data.title = formData.title
    if (formData.description) data.description = formData.description
    if (formData.custom_code) data.custom_code = formData.custom_code
    if (formData.campaign_id) data.campaign_id = formData.campaign_id
    if (formData.expires_at) data.expires_at = formData.expires_at
    if (formData.password) data.password = formData.password
    if (formData.max_clicks) data.max_clicks = parseInt(formData.max_clicks)

    if (typeof window !== 'undefined') {
      const orgId = localStorage.getItem('current_organization_id')
      if (orgId) {
        data.organization_id = orgId
      }
    }

    createMutation.mutate(data)
  }

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
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Link2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Create Link</h1>
            <p className="text-sm text-gray-500">Shorten a URL and track its performance</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              name="destination_url"
              value={formData.destination_url}
              onChange={handleChange}
              placeholder="https://example.com/your-long-url"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (optional)
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="My awesome link"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              placeholder="A brief description of this link"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Short Code (optional)
              </label>
              <input
                type="text"
                name="custom_code"
                value={formData.custom_code}
                onChange={handleChange}
                placeholder="my-link"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for auto-generated code</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campaign (optional)
              </label>
              <select
                name="campaign_id"
                value={formData.campaign_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No campaign</option>
                {campaigns.map((campaign: any) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date (optional)
              </label>
              <input
                type="datetime-local"
                name="expires_at"
                value={formData.expires_at}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Clicks (optional)
              </label>
              <input
                type="number"
                name="max_clicks"
                value={formData.max_clicks}
                onChange={handleChange}
                placeholder="Unlimited"
                min="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password Protection (optional)
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password to protect link"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              disabled={createMutation.isPending}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Link'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
