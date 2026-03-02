import { NextRequest } from 'next/server'
import { proxyRequest } from '@/lib/proxy'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return proxyRequest(request, 'campaign', `/stores/${params.id}`)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return proxyRequest(request, 'campaign', `/stores/${params.id}`)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return proxyRequest(request, 'campaign', `/stores/${params.id}`)
}
