import Link from 'next/link'
import { ArrowRight, QrCode, BarChart3 } from 'lucide-react'
import { Logo } from './components/Logo'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-foreground">
      {/* Top nav */}
      <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
        <Logo variant="md" tagline="Data to destination." />
        <div className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-slate-300 hover:text-white">
            Login
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-teal-500 transition"
          >
            Sign Up
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* Hero section */}
      <main className="container mx-auto px-6 pb-20 pt-10 md:pt-16">
        <div className="grid items-center gap-12 md:grid-cols-[1.3fr,1fr]">
          {/* Left copy */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-teal-300">
              Link Intelligence Platform
            </p>
            <h1 className="mb-4 text-4xl font-semibold text-white md:text-5xl lg:text-6xl">
              Short links, QR codes &{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                document analytics
              </span>{' '}
              in one place.
            </h1>
            <p className="mb-6 max-w-xl text-base text-slate-300 md:text-lg">
              The Little URL is your control center for everything that clicks or scans.
              Create branded short links and dynamic QR codes, share documents securely, and
              see every interaction in real-time—down to device, location, and campaign.
            </p>
            <div className="mb-8 inline-flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4">
              <div className="mt-1 h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
                <span className="h-2 w-2 rounded-sm bg-primary" />
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold text-white">Pixel transformation for growth teams</p>
                <p className="text-sm text-slate-300">
                  Turn chaotic URLs and raw documents into trackable, branded touchpoints your
                  marketing, product, and ops teams can measure.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:bg-teal-500 transition"
              >
                Start free – create your first link
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <span className="text-xs md:text-sm text-slate-400">
                No credit card required. Track clicks, scans, and document views in real time.
              </span>
            </div>
          </div>

          {/* Right card – product snapshot */}
          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-7">
              <div className="mb-6 flex justify-center">
                <div className="inline-flex items-center gap-4 rounded-2xl border border-slate-700/70 bg-slate-950/80 px-6 py-5">
                  <Logo variant="md" tagline="From data to destination." inline />
                </div>
              </div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-teal-300">
                Live snapshot
              </p>
              <h2 className="mb-2 text-lg font-semibold text-white">Every interaction, one timeline</h2>
              <p className="text-sm text-slate-300">
                Short links, QR scans, and document opens are streamed into a single, real-time
                analytics layer. See which campaigns convert, which documents get read, and which
                channels actually drive traffic.
              </p>
            </div>

            {/* Feature strip */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="glass-card rounded-2xl p-4">
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
              <div className="glass-card rounded-2xl p-4">
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
              <div className="glass-card rounded-2xl p-4">
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
          <span>© {new Date().getFullYear()} The Little URL</span>
          <span>Pixel-perfect pathways from link to destination.</span>
        </div>
      </footer>
    </div>
  )
}
