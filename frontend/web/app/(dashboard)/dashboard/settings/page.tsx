'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { User, Save, Loader2, Shield, Building2 } from 'lucide-react'
import { authApi, adminApi, rolesApi, usersApi, organizationsApi } from '@/lib/api'

export default function SettingsPage() {
  const queryClient = useQueryClient()
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
  const isAdmin = Array.isArray(user?.roles) && user.roles.includes('admin')
  const isOrgManager =
    Array.isArray(user?.roles) &&
    (user.roles.includes('admin') || user.roles.includes('store_manager'))

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
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account settings</p>
      </div>

      {/* Profile Section */}
      <div className="glass-card mb-6 rounded-xl p-6 text-card-foreground">
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Profile</h2>
            <p className="text-sm text-muted-foreground">Update your personal information</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-muted-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              className="flex items-center rounded-lg bg-primary px-6 py-3 text-primary-foreground transition hover:opacity-90"
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
      <div className="glass-card rounded-xl p-6 text-card-foreground">
        <h2 className="mb-4 text-lg font-semibold">Account Information</h2>
        <dl className="space-y-4">
          <div className="flex justify-between">
            <dt className="text-sm text-muted-foreground">Account Status</dt>
            <dd>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {user?.is_active ? 'Active' : 'Inactive'}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-muted-foreground">Email Verified</dt>
            <dd>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user?.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user?.is_verified ? 'Verified' : 'Pending'}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-muted-foreground">Roles</dt>
            <dd className="text-sm text-card-foreground">
              {user?.roles?.join(', ') || 'No roles'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-muted-foreground">Member Since</dt>
            <dd className="text-sm text-card-foreground">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Organization section - hidden for individual / non-org-manager users */}
      {isOrgManager && <OrganizationSettingsSection queryClient={queryClient} />}

      {/* Admin section - platform admins only */}
      {isAdmin && <AdminRoleSettingsSection queryClient={queryClient} />}
    </div>
  )
}

function OrganizationSettingsSection({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const [activeOrgId, setActiveOrgId] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null
  )
  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.list().then((res) => res.data as any[]),
  })
  const orgId = activeOrgId || orgs?.[0]?.id

  useEffect(() => {
    if (orgs?.length && !activeOrgId) {
      const first = orgs[0]?.id
      if (first) {
        setActiveOrgId(first)
        if (typeof window !== 'undefined') localStorage.setItem('current_organization_id', first)
      }
    }
  }, [orgs, activeOrgId])
  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => organizationsApi.get(orgId!).then((res) => res.data),
    enabled: !!orgId,
  })

  const [form, setForm] = useState({
    name: '',
    slug: '',
    website: '',
    industry: '',
    team_size: '',
  })
  const [orgSaved, setOrgSaved] = useState(false)

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name || '',
        slug: org.slug || '',
        website: org.website || '',
        industry: org.industry || '',
        team_size: org.team_size || '',
      })
    }
  }, [org])

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      organizationsApi.update(orgId!, data),
    onSuccess: () => {
      setOrgSaved(true)
      setTimeout(() => setOrgSaved(false), 2000)
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })

  if (!orgId || !org) return null
  if (isLoading) return null

  const handleOrgSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setActiveOrgId(id)
    if (typeof window !== 'undefined') localStorage.setItem('current_organization_id', id)
    queryClient.invalidateQueries({ queryKey: ['organization', id] })
  }

  const handleOrgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleOrgSave = () => {
    updateMutation.mutate(form)
  }

  return (
    <div className="glass-card mb-6 rounded-xl p-6 text-card-foreground">
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
          <Building2 className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Organization</h2>
          <p className="text-sm text-muted-foreground">Edit your organization details</p>
        </div>
      </div>
      <div className="space-y-4">
        {orgs && orgs.length > 1 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Organization
            </label>
            <select
              value={orgId}
              onChange={handleOrgSwitch}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground focus:ring-2 focus:ring-primary"
            >
              {orgs.map((o: any) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">
            Name
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleOrgChange}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">
            Slug
          </label>
          <input
            type="text"
            name="slug"
            value={form.slug}
            onChange={handleOrgChange}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">
            Website
          </label>
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={handleOrgChange}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Industry
            </label>
            <input
              type="text"
              name="industry"
              value={form.industry}
              onChange={handleOrgChange}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Team size
            </label>
            <input
              type="text"
              name="team_size"
              value={form.team_size}
              onChange={handleOrgChange}
              placeholder="e.g. 1-10"
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button
            onClick={handleOrgSave}
            disabled={updateMutation.isPending}
            className="flex items-center rounded-lg bg-primary px-6 py-3 text-primary-foreground transition disabled:opacity-50 hover:opacity-90"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : orgSaved ? (
              'Saved!'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function AdminRoleSettingsSection({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-settings', { page: 1, page_size: 50 }],
    queryFn: () => adminApi.users({ page: 1, page_size: 50 }).then((res) => res.data),
  })
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list().then((res) => res.data as any[]),
  })

  const assignMutation = useMutation({
    mutationFn: () => usersApi.assignRole(selectedUserId, selectedRoleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-settings'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })

  const users = usersData?.items || []
  const roles = Array.isArray(rolesData) ? rolesData : (rolesData as any)?.data || []

  return (
    <div className="glass-card rounded-xl p-6 text-card-foreground">
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
          <Shield className="h-5 w-5 text-slate-200" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Admin & Moderators</h2>
          <p className="text-sm text-muted-foreground">Assign platform roles to users</p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground focus:ring-2 focus:ring-primary"
            >
              <option value="">Select user</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Role
            </label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground focus:ring-2 focus:ring-primary"
            >
              <option value="">Select role</option>
              {roles.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => assignMutation.mutate()}
              disabled={!selectedUserId || !selectedRoleId || assignMutation.isPending}
              className="w-full rounded-lg bg-secondary px-4 py-3 text-secondary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Assign role'}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          To remove a role, contact a developer or use the database. Assigned roles grant access to admin or moderator features.
        </p>
      </div>
    </div>
  )
}
