import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'thelittleurl.com – Pixel Transformation for Links & QR',
  description:
    'Condense long URLs into elegant, trackable short links and QR codes. thelittleurl.com turns data into destination with real-time analytics.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-slate-950">
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
