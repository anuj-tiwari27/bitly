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
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

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
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; first_name?: string; last_name?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/users/me'),
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
  }) => api.post('/links', data),
  update: (id: string, data: any) => api.put(`/links/${id}`, data),
  delete: (id: string) => api.delete(`/links/${id}`),
  stats: (id: string) => api.get(`/links/${id}/stats`),
}

// Campaigns API
export const campaignsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string; search?: string }) =>
    api.get('/campaigns', { params }),
  get: (id: string) => api.get(`/campaigns/${id}`),
  create: (data: { name: string; description?: string; store_id?: string; status?: string }) =>
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

// Stores API
export const storesApi = {
  list: () => api.get('/stores'),
  create: (data: { name: string; description?: string; location?: string }) =>
    api.post('/stores', data),
  update: (id: string, data: any) => api.put(`/stores/${id}`, data),
  delete: (id: string) => api.delete(`/stores/${id}`),
}

// Export redirect URL for short links
export const getShortLinkUrl = (code: string) => `${REDIRECT_URL}/${code}`
