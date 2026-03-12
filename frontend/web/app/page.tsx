import Link from 'next/link'
import { ArrowRight, QrCode, BarChart3 } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-foreground">
      {/* Top nav */}
      <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <span className="text-xs font-semibold text-white">tl</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-semibold text-white">
              thelittleurl.com
            </span>
            <span className="text-xs text-slate-400">
              Data to destination.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-slate-300 hover:text-white">
            Login
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-teal-500 transition"
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* Hero section */}
      <main className="container mx-auto px-6 pb-20 pt-10 md:pt-16">
        <div className="grid gap-12 md:grid-cols-[1.3fr,1fr] items-center">
          {/* Left copy */}
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-teal-300 uppercase mb-4">
              Core Identity
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white mb-4">
              The Concept of{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Pixel Transformation
              </span>
            </h1>
            <p className="text-base md:text-lg text-slate-300 max-w-xl mb-6">
              The visual identity for thelittleurl.com represents the digital
              alchemy of condensing long, complex URLs into manageable,
              scannable assets. It acts as a bridge between traditional text
              links and the modern efficiency of QR technology.
            </p>
            <div className="inline-flex items-start gap-3 rounded-2xl bg-slate-900/70 px-5 py-4 border border-slate-800 mb-8">
              <div className="mt-1 h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
                <span className="h-2 w-2 rounded-sm bg-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">
                  Design Philosophy
                </p>
                <p className="text-sm text-slate-300">
                  Simplicity is the ultimate sophistication. We take the chaos
                  of a 200+ character URL and distill it into a single, elegant
                  point of access.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:bg-teal-500 transition"
              >
                Start transforming links
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <span className="text-xs md:text-sm text-slate-400">
                No credit card required. Track clicks, QR scans, and campaigns
                in real time.
              </span>
            </div>
          </div>

          {/* Right card – logo & metaphor */}
          <div className="space-y-6">
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              <div className="mb-6 flex justify-center">
                <div className="inline-flex items-center gap-4 rounded-2xl bg-slate-950/80 px-6 py-5 border border-slate-800">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-secondary flex items-center justify-center">
                    <div className="h-9 w-9 rounded-lg border border-white/40 bg-slate-950/40 grid grid-cols-3 grid-rows-3 gap-0.5 p-0.5">
                      <span className="bg-primary rounded-[2px]" />
                      <span className="bg-primary/80 rounded-[2px]" />
                      <span className="bg-secondary rounded-[2px]" />
                      <span className="bg-primary/40 rounded-[2px]" />
                      <span className="bg-teal-200/60 rounded-[2px]" />
                      <span className="bg-secondary/70 rounded-[2px]" />
                      <span className="bg-primary/30 rounded-[2px]" />
                      <span className="bg-primary/60 rounded-[2px]" />
                      <span className="bg-secondary/90 rounded-[2px]" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      thelittleurl.com
                    </span>
                    <span className="text-[11px] text-slate-400">
                      From data to destination.
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs font-semibold tracking-[0.25em] text-teal-300 uppercase mb-3">
                Visual Metaphor
              </p>
              <h2 className="text-lg font-semibold text-white mb-2">
                Data to Destination
              </h2>
              <p className="text-sm text-slate-300">
                The logo utilizes a transition effect where fragmented QR pixels
                on the left organically merge into a solid square on the right.
                This signifies the process of aggregation—turning scattered
                digital information into a solidified, singular destination.
              </p>
            </div>

            {/* Feature strip */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                  <span className="text-primary text-xs font-semibold">SL</span>
                </div>
                <p className="text-sm font-semibold text-white mb-1">
                  Short Links
                </p>
                <p className="text-xs text-slate-300">
                  Condense complex URLs into elegant, branded little URLs.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/15">
                  <QrCode className="h-4 w-4 text-secondary" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">
                  Dynamic QR Codes
                </p>
                <p className="text-xs text-slate-300">
                  Generate QR codes that stay in sync even when destinations
                  change.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="h-4 w-4 text-teal-300" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">
                  Real-time Analytics
                </p>
                <p className="text-xs text-slate-300">
                  See every click, scan, device, and referrer in a single,
                  unified view.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90">
        <div className="container mx-auto flex items-center justify-between px-6 py-6 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} thelittleurl.com</span>
          <span>Pixel-perfect pathways from link to destination.</span>
        </div>
      </footer>
    </div>
  )
}
