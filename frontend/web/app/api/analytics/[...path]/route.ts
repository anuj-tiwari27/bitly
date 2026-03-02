import { NextRequest } from 'next/server'
import { proxyRequest } from '@/lib/proxy'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const searchParams = request.nextUrl.searchParams.toString()
  const basePath = `/analytics/${params.path.join('/')}`
  const path = searchParams ? `${basePath}?${searchParams}` : basePath
  return proxyRequest(request, 'analytics', path)
}
