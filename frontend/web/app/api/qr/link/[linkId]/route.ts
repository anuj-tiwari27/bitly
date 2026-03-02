import { NextRequest } from 'next/server'
import { proxyRequest } from '@/lib/proxy'

export async function GET(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
  return proxyRequest(request, 'qr', `/qr/link/${params.linkId}`)
}
