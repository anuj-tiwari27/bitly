import { NextRequest } from 'next/server'
import { proxyRequest } from '@/lib/proxy'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams.toString()
  const path = `/campaigns${searchParams ? `?${searchParams}` : ''}`
  return proxyRequest(request, 'campaign', path)
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, 'campaign', '/campaigns')
}
