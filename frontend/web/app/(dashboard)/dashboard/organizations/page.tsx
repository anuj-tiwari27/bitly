'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Mail, Shield, Users, Loader2, Plus, Trash2 } from 'lucide-react'
import { organizationsApi } from '@/lib/api'

export default function OrganizationsPage() {
  const queryClient = useQueryClient()
  const [activeOrgId, setActiveOrgId] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') : null,
  )
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')

  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsApi.list().then((res) => res.data as any[]),
  })

  const orgs = orgsData || []
  const orgId = activeOrgId || orgs[0]?.id

  useEffect(() => {
    if (orgs.length && !activeOrgId) {
      const first = orgs[0]?.id
      if (first) {
        setActiveOrgId(first)
        if (typeof window !== 'undefined') {
          localStorage.setItem('current_organization_id', first)
        }
      }
    }
  }, [orgs, activeOrgId])

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['organization-members', orgId],
    queryFn: () => organizationsApi.members(orgId!).then((res) => res.data as any[]),
    enabled: !!orgId,
  })

  const inviteMutation = useMutation({
    mutationFn: () => organizationsApi.invite(orgId!, { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      setInviteEmail('')
      queryClient.invalidateQueries({ queryKey: ['organization-members', orgId] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => organizationsApi.removeMember(orgId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', orgId] })
    },
  })

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setActiveOrgId(id)
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_organization_id', id)
    }
    queryClient.invalidateQueries({ queryKey: ['organization-members', id] })
  }

  const org = orgs.find((o: any) => o.id === orgId)
  const members = membersData || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
            <Building2 className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Organization</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your workspace, admins, moderators, and members.
            </p>
          </div>
        </div>
        {orgs.length > 1 && (
          <div className="w-full max-w-xs">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Active organization
            </label>
            <select
              value={orgId}
              onChange={handleOrgChange}
              className="glass-input w-full rounded-lg px-3 py-2 text-sm"
            >
              {orgs.map((o: any) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
        {/* Org summary */}
        <div className="glass-card rounded-xl p-6 text-card-foreground">
          {orgsLoading || !org ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : (
            <>
              <h2 className="mb-4 text-lg font-semibold">Workspace overview</h2>
              <p className="text-sm font-medium text-card-foreground">{org.name}</p>
              {org.slug && (
                <p className="mb-4 text-xs text-muted-foreground">Slug: {org.slug}</p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <p className="text-xs text-muted-foreground">Members</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {org.members_count ?? members.length}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <p className="text-xs text-muted-foreground">Links & QR</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {(org.link_count ?? 0) + (org.qr_count ?? 0)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-slate-900/60 p-4 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-card-foreground">Roles</p>
                <p>
                  <span className="font-semibold text-card-foreground">Admin</span> can manage
                  workspace settings and all members.
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-card-foreground">Member</span> can create and
                  manage their own links, QR codes, and campaigns.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Members management */}
        <div className="glass-card rounded-xl p-6 text-card-foreground">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Members</h2>
                <p className="text-xs text-muted-foreground">
                  Invite teammates and control who has admin access.
                </p>
              </div>
            </div>
          </div>

          {/* Invite form */}
          <form
            className="mb-6 flex flex-col gap-3 rounded-lg bg-slate-950/60 p-4 sm:flex-row sm:items-center"
            onSubmit={(e) => {
              e.preventDefault()
              if (!orgId || !inviteEmail || inviteMutation.isPending) return
              inviteMutation.mutate()
            }}
          >
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Invite by email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="glass-input w-full rounded-lg px-3 py-2 pl-9 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 sm:w-56">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={!inviteEmail || inviteMutation.isPending || !orgId}
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-90"
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="mr-1 h-4 w-4" />
                    Invite
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Members table */}
          {membersLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-sm text-muted-foreground">
              <Users className="mb-2 h-6 w-6" />
              <p>No members yet. Invite your first teammate above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4 text-left">Member</th>
                    <th className="py-2 pr-4 text-left">Role</th>
                    <th className="py-2 pr-4 text-left">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member: any) => (
                    <tr key={member.id} className="border-b border-slate-800 last:border-0">
                      <td className="py-2 pr-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-card-foreground">{member.email}</span>
                          {member.first_name && (
                            <span className="text-xs text-muted-foreground">
                              {member.first_name} {member.last_name || ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="inline-flex items-center rounded-full bg-slate-900/80 px-2.5 py-0.5 text-xs capitalize text-slate-200">
                          {member.role || 'member'}
                          {member.role === 'admin' && (
                            <Shield className="ml-1 h-3 w-3 text-amber-300" />
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {member.status === 'pending' ? 'Pending invite' : 'Active'}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Remove ${member.email} from ${org?.name || 'this organization'}?`,
                              )
                            ) {
                              removeMutation.mutate(member.id)
                            }
                          }}
                          className="inline-flex items-center rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
