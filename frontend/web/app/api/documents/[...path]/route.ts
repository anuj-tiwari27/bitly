import { NextRequest } from 'next/server'
import { proxyRequest, proxyMultipartRequest } from '@/lib/proxy'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = `/documents/${params.path.join('/')}`
  const searchParams = request.nextUrl.searchParams.toString()
  const fullPath = searchParams ? `${path}?${searchParams}` : path

  const url = `${process.env.DOCUMENT_SERVICE_URL || 'http://document-service:8000'}/api${fullPath}`

  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    if (!['host'].includes(key.toLowerCase())) {
      headers[key] = value
    }
  })

  try {
    const response = await fetch(url, { method: 'GET', headers })
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream'
    const contentDisposition = response.headers.get('Content-Disposition')
    const contentLength = response.headers.get('Content-Length')

    const data = await response.arrayBuffer()
    const resHeaders: Record<string, string> = {
      'Content-Type': contentType,
    }
    if (contentDisposition) resHeaders['Content-Disposition'] = contentDisposition
    if (contentLength) resHeaders['Content-Length'] = contentLength

    return new Response(data, {
      status: response.status,
      headers: resHeaders,
    })
  } catch (error) {
    console.error(`Document proxy error to ${url}:`, error)
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = `/documents/${params.path.join('/')}`
  return proxyMultipartRequest(request, 'document', path)
}
