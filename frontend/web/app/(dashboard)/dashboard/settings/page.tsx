'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { User, Save, Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api'

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
  })
  const [saved, setSaved] = useState(false)

  const { data: userData } = useQuery({
    queryKey: ['user'],
    queryFn: () => authApi.me(),
  })

  useEffect(() => {
    if (userData?.data) {
      setFormData({
        first_name: userData.data.first_name || '',
        last_name: userData.data.last_name || '',
      })
    }
  }, [userData])

  const user = userData?.data

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setSaved(false)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account settings</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
            <p className="text-sm text-gray-500">Update your personal information</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {saved ? (
                <>Saved!</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
        <dl className="space-y-4">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Account Status</dt>
            <dd>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {user?.is_active ? 'Active' : 'Inactive'}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Email Verified</dt>
            <dd>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user?.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user?.is_verified ? 'Verified' : 'Pending'}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Roles</dt>
            <dd className="text-sm text-gray-900">
              {user?.roles?.join(', ') || 'No roles'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Member Since</dt>
            <dd className="text-sm text-gray-900">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
