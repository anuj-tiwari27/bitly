import { NextRequest } from 'next/server'
import { proxyRequest } from '@/lib/proxy'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = `/users/${params.path.join('/')}`
  return proxyRequest(request, 'rbac', path)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = `/users/${params.path.join('/')}`
  return proxyRequest(request, 'rbac', path)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = `/users/${params.path.join('/')}`
  return proxyRequest(request, 'rbac', path)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = `/users/${params.path.join('/')}`
  return proxyRequest(request, 'rbac', path)
}
