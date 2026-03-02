import { NextRequest, NextResponse } from 'next/server'

const REDIRECT_SERVICE_URL = process.env.REDIRECT_SERVICE_URL || 'http://redirect-service:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = params.code
  const userAgent = request.headers.get('user-agent') || ''
  const referer = request.headers.get('referer') || ''
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             '127.0.0.1'

  try {
    const response = await fetch(`${REDIRECT_SERVICE_URL}/r/${code}`, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Referer': referer,
        'X-Forwarded-For': ip,
        'X-Real-IP': ip,
      },
      redirect: 'manual',
    })

    if (response.status === 301 || response.status === 302) {
      const location = response.headers.get('location')
      if (location) {
        return NextResponse.redirect(location, { status: 302 })
      }
    }

    if (response.status === 404) {
      return NextResponse.redirect(new URL('/', request.url), { status: 302 })
    }

    const data = await response.text()
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (error) {
    console.error('Redirect error:', error)
    return NextResponse.redirect(new URL('/', request.url), { status: 302 })
  }
}
