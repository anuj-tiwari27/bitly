import { NextRequest } from 'next/server'
import { proxyRequest } from '@/lib/proxy'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return proxyRequest(request, 'link', `/links/${params.id}`)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return proxyRequest(request, 'link', `/links/${params.id}`)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return proxyRequest(request, 'link', `/links/${params.id}`)
}
