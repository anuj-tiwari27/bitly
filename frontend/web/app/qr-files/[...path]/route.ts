import { NextRequest } from 'next/server'

/** Proxy /qr-files/* to QR service for local storage QR code downloads */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const url = `${process.env.QR_SERVICE_URL || 'http://qr-service:8000'}/qr-files/${path}`

  try {
    const response = await fetch(url)
    const data = await response.arrayBuffer()
    const contentType = response.headers.get('Content-Type') || 'image/png'
    return new Response(data, {
      status: response.status,
      headers: { 'Content-Type': contentType },
    })
  } catch (error) {
    console.error(`QR files proxy error: ${error}`)
    return new Response('Not found', { status: 404 })
  }
}
