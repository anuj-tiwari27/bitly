import { NextRequest } from 'next/server'
import { proxyRequest } from '@/lib/proxy'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams.toString()
  const path = `/links${searchParams ? `?${searchParams}` : ''}`
  return proxyRequest(request, 'link', path)
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, 'link', '/links')
}
