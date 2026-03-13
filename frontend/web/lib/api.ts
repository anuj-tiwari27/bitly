import axios from 'axios'

// Use local API routes that proxy to backend services
const API_BASE = '/api'
const REDIRECT_URL = process.env.NEXT_PUBLIC_REDIRECT_URL || 'http://localhost:8005'

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        const isAdminPath = window.location.pathname.startsWith('/dashboard/admin')
        window.location.href = isAdminPath ? '/admin' : '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    account_type?: 'individual' | 'organization';
    organization_name?: string;
    organization_website?: string;
    organization_industry?: string;
    organization_team_size?: string;
  }) => api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  requestOtp: (data: { email: string; purpose: 'signup' | 'login' }) =>
    api.post('/auth/otp/request', data),
  verifyOtp: (data: { email: string; purpose: 'signup' | 'login'; code: string }) =>
    api.post('/auth/otp/verify', data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/users/me'),
  updateMe: (data: { first_name?: string; last_name?: string }) => api.put('/users/me', data),
}

// Links API
export const linksApi = {
  list: (params?: { page?: number; page_size?: number; campaign_id?: string; search?: string }) =>
    api.get('/links', { params }),
  get: (id: string) => api.get(`/links/${id}`),
  create: (data: {
    destination_url: string;
    title?: string;
    description?: string;
    campaign_id?: string;
    custom_code?: string;
    expires_at?: string;
    password?: string;
    max_clicks?: number;
    organization_id?: string;
  }) => api.post('/links', data),
  update: (id: string, data: any) => api.put(`/links/${id}`, data),
  delete: (id: string, params?: { permanent?: boolean }) =>
    api.delete(`/links/${id}`, { params }),
  stats: (id: string) => api.get(`/links/${id}/stats`),
}

// Campaigns API
export const campaignsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string; search?: string }) =>
    api.get('/campaigns', { params }),
  get: (id: string) => api.get(`/campaigns/${id}`),
  create: (data: { name: string; description?: string; store_id?: string; status?: string; organization_id?: string }) =>
    api.post('/campaigns', data),
  update: (id: string, data: any) => api.put(`/campaigns/${id}`, data),
  delete: (id: string) => api.delete(`/campaigns/${id}`),
}

// QR API
export const qrApi = {
  create: (data: {
    link_id: string;
    style_config?: {
      fill_color?: string;
      back_color?: string;
      box_size?: number;
      border?: number;
      logo_url?: string;
    };
    file_format?: string;
  }) => api.post('/qr', data),
  get: (id: string) => api.get(`/qr/${id}`),
  getByLink: (linkId: string) => api.get(`/qr/link/${linkId}`),
  regenerate: (id: string, data?: any) => api.post(`/qr/${id}/regenerate`, data),
  delete: (id: string) => api.delete(`/qr/${id}`),
}

// Analytics API
export const analyticsApi = {
  overview: (params?: { start_date?: string; end_date?: string }) => 
    api.get('/analytics/overview', { params }),
  clicksOverTime: (params?: { days?: number; start_date?: string; end_date?: string }) => 
    api.get('/analytics/clicks-over-time', { params }),
  topLinks: (params?: { limit?: number; days?: number }) => 
    api.get('/analytics/top-links', { params }),
  devices: (days?: number) => 
    api.get('/analytics/devices', { params: { days } }),
  browsers: (params?: { days?: number; limit?: number }) => 
    api.get('/analytics/browsers', { params }),
  operatingSystems: (params?: { days?: number; limit?: number }) => 
    api.get('/analytics/operating-systems', { params }),
  referrers: (params?: { days?: number; limit?: number }) => 
    api.get('/analytics/referrers', { params }),
  countries: (params?: { days?: number; limit?: number }) => 
    api.get('/analytics/countries', { params }),
  utmSources: (params?: { days?: number; limit?: number }) => 
    api.get('/analytics/utm-sources', { params }),
  utmMediums: (params?: { days?: number; limit?: number }) => 
    api.get('/analytics/utm-mediums', { params }),
  utmCampaigns: (params?: { days?: number; limit?: number }) => 
    api.get('/analytics/utm-campaigns', { params }),
  linkAnalytics: (linkId: string, days?: number) => 
    api.get(`/analytics/link/${linkId}`, { params: { days } }),
  campaignAnalytics: (campaignId: string, days?: number) => 
    api.get(`/analytics/campaign/${campaignId}`, { params: { days } }),
  hourly: (days?: number) => 
    api.get('/analytics/hourly', { params: { days } }),
  realtime: () => 
    api.get('/analytics/realtime'),
}

// Admin Analytics API (platform-wide, admin only)
export const adminAnalyticsApi = {
  overview: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/analytics/admin/overview', { params }),
  clicksOverTime: (params?: { days?: number; start_date?: string; end_date?: string }) =>
    api.get('/analytics/admin/clicks-over-time', { params }),
  topLinks: (params?: { limit?: number; days?: number }) =>
    api.get('/analytics/admin/top-links', { params }),
  devices: (days?: number) =>
    api.get('/analytics/admin/devices', { params: { days } }),
  browsers: (params?: { days?: number; limit?: number }) =>
    api.get('/analytics/admin/browsers', { params }),
  operatingSystems: (params?: { days?: number; limit?: number }) =>
    api.get('/analytics/admin/operating-systems', { params }),
  referrers: (params?: { days?: number; limit?: number }) =>
    api.get('/analytics/admin/referrers', { params }),
  countries: (params?: { days?: number; limit?: number }) =>
    api.get('/analytics/admin/countries', { params }),
  utmSources: (params?: { days?: number; limit?: number }) =>
    api.get('/analytics/admin/utm-sources', { params }),
  utmMediums: (params?: { days?: number; limit?: number }) =>
    api.get('/analytics/admin/utm-mediums', { params }),
  utmCampaigns: (params?: { days?: number; limit?: number }) =>
    api.get('/analytics/admin/utm-campaigns', { params }),
  hourly: (days?: number) =>
    api.get('/analytics/admin/hourly', { params: { days } }),
  realtime: () =>
    api.get('/analytics/admin/realtime'),
}

// Stores API
export const storesApi = {
  list: () => api.get('/stores'),
  create: (data: { name: string; description?: string; location?: string; organization_id?: string }) =>
    api.post('/stores', data),
  update: (id: string, data: any) => api.put(`/stores/${id}`, data),
  delete: (id: string) => api.delete(`/stores/${id}`),
}

// Organizations API
export const organizationsApi = {
  list: () => api.get('/organizations'),
  create: (data: { name: string; slug?: string; logo_url?: string }) =>
    api.post('/organizations', data),
  get: (id: string) => api.get(`/organizations/${id}`),
  update: (id: string, data: { name?: string; slug?: string; website?: string; industry?: string; team_size?: string }) =>
    api.put(`/organizations/${id}`, data),
  members: (id: string) => api.get(`/organizations/${id}/members`),
  invite: (id: string, payload: { email: string; role: 'admin' | 'member' }) =>
    api.post(`/organizations/${id}/invite`, payload),
  removeMember: (id: string, userId: string) =>
    api.delete(`/organizations/${id}/members/${userId}`),
}

// Invitation APIs
export const inviteApi = {
  get: (token: string) => api.get(`/auth/invites/${token}`),
  accept: (
    token: string,
    data: { password: string; first_name?: string; last_name?: string }
  ) => api.post(`/auth/invites/${token}/accept`, data),
}

// Roles API (platform roles: admin, moderator, etc.)
export const rolesApi = {
  list: () => api.get<{ id: string; name: string; description?: string }[]>('/roles'),
}

// Users API (for role assignment - admin only)
export const usersApi = {
  get: (id: string) => api.get(`/users/${id}`),
  assignRole: (userId: string, roleId: string) =>
    api.post(`/users/${userId}/roles`, { role_id: roleId }),
  removeRole: (userId: string, roleId: string) =>
    api.delete(`/users/${userId}/roles/${roleId}`),
}

// Admin API
export const adminApi = {
  overview: () => api.get('/admin/overview'),
  users: (params?: { page?: number; page_size?: number }) =>
    api.get('/admin/users', { params }),
  organizations: (params?: { page?: number; page_size?: number }) =>
    api.get('/admin/organizations', { params }),
  suspendOrganization: (id: string) => api.post(`/admin/organizations/${id}/suspend`, {}),
  activateOrganization: (id: string) => api.post(`/admin/organizations/${id}/activate`, {}),
  deleteOrganization: (id: string) => api.delete(`/admin/organizations/${id}`),
  auditLogs: (params?: { page?: number; page_size?: number }) =>
    api.get('/admin/audit-logs', { params }),
}

// Documents API (upload for link/QR generation)
// Uses fetch to avoid axios Content-Type conflict with FormData multipart boundary
export const documentsApi = {
  upload: async (file: File): Promise<{ data: { id: string; filename: string; url: string; content_type: string; file_size: number } }> => {
    const formData = new FormData()
    formData.append('file', file)
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers,
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText || 'Upload failed' }))
      const detail = err?.detail ?? (typeof err === 'string' ? err : 'Upload failed')
      throw Object.assign(new Error(detail), { response: { data: { detail }, status: res.status } })
    }
    const data = await res.json()
    return { data }
  },
}

// Export redirect URL for short links
export const getShortLinkUrl = (code: string) => `${REDIRECT_URL}/${code}`
