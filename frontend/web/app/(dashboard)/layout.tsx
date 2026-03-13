'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Link2,
  LayoutDashboard,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Building2,
} from 'lucide-react'
import { authApi, organizationsApi } from '@/lib/api'

const baseNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Links', href: '/dashboard/links', icon: Link2 },
  { name: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hasOrganization, setHasOrganization] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    authApi.me()
      .then(async (res) => {
        setUser(res.data)
        try {
          const orgRes = await organizationsApi.list()
          const data: any = orgRes.data
          const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
          if (items.length > 0) {
            setHasOrganization(true)
          }
        } catch {
          // Ignore organization loading errors for layout
        }
      })
      .catch(() => {
        localStorage.removeItem('access_token')
        router.push('/login')
      })
  }, [router])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch (e) {}
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    router.push('/login')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const isAdmin = Array.isArray(user.roles) && user.roles.includes('admin')
  const isOrgManager =
    (Array.isArray(user.roles) &&
      (user.roles.includes('admin') || user.roles.includes('store_manager'))) ||
    hasOrganization
  if (pathname.startsWith('/dashboard/admin') && !isAdmin) {
    router.replace('/dashboard')
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }
  let navigation = [...baseNavigation]
  if (isOrgManager) {
    navigation.splice(4, 0, {
      name: 'Organization',
      href: '/dashboard/organizations',
      icon: Building2,
    })
  }
  if (isAdmin) {
    navigation = [...navigation, { name: 'Admin', href: '/dashboard/admin', icon: Shield }]
  }

  return (
    <div className="min-h-screen bg-slate-950 text-foreground">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-xs font-semibold text-white">tl</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-white">
                  The Little URL
                </span>
                <span className="text-[11px] text-slate-400">
                  Pixel transformation for links.
                </span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-slate-300 hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm transition ${
                    isActive
                      ? 'bg-slate-900 text-primary'
                      : 'text-slate-300 hover:bg-slate-900/60'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                <span className="text-slate-100 font-medium">
                  {user.first_name?.[0] || user.email[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.email}
                </p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8 text-foreground">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-slate-800"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1" />
            <Link
              href="/dashboard/links/new"
              className="flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Create Link
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
