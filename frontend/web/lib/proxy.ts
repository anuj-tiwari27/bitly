import { NextRequest, NextResponse } from 'next/server'

const SERVICES = {
  rbac: process.env.RBAC_SERVICE_URL || 'http://rbac-service:8000',
  link: process.env.LINK_SERVICE_URL || 'http://link-service:8000',
  campaign: process.env.CAMPAIGN_SERVICE_URL || 'http://campaign-service:8000',
  qr: process.env.QR_SERVICE_URL || 'http://qr-service:8000',
  redirect: process.env.REDIRECT_SERVICE_URL || 'http://redirect-service:8000',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://analytics-processor:8000',
}

export async function proxyRequest(
  request: NextRequest,
  service: keyof typeof SERVICES,
  path: string
): Promise<NextResponse> {
  const url = `${SERVICES[service]}/api${path}`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  const authHeader = request.headers.get('Authorization')
  if (authHeader) {
    headers['Authorization'] = authHeader
  }

  try {
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const body = await request.text()
      if (body) {
        fetchOptions.body = body
      }
    }

    const response = await fetch(url, fetchOptions)
    const data = await response.text()

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    })
  } catch (error) {
    console.error(`Proxy error to ${url}:`, error)
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    )
  }
}
