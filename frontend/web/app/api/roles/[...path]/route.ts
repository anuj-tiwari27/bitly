import { NextRequest } from 'next/server'
import { proxyRequest } from '@/lib/proxy'

function getPath(path: string[]) {
  return path.length ? `/roles/${path.join('/')}` : '/roles'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, 'rbac', getPath(params.path))
}
