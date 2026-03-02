import { NextRequest } from 'next/server'
import { proxyRequest } from '@/lib/proxy'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return proxyRequest(request, 'qr', `/qr/${params.id}/regenerate`)
}
