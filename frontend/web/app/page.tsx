import Link from 'next/link'
import { ArrowRight, Link2, QrCode, BarChart3 } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link2 className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">Bitly</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/login" className="text-gray-600 hover:text-gray-900">
            Login
          </Link>
          <Link
            href="/register"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Shorten Links.
            <br />
            <span className="text-blue-600">Amplify Reach.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Create short, trackable links and QR codes. Get real-time analytics
            and insights to optimize your marketing campaigns.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/register"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition flex items-center"
            >
              Start for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-50 transition"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-xl shadow-sm border">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Link2 className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Short Links</h3>
            <p className="text-gray-600">
              Create branded short links that are easy to share and remember.
              Customize your URLs for better engagement.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <QrCode className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Dynamic QR Codes</h3>
            <p className="text-gray-600">
              Generate customizable QR codes for your links. Update destinations
              without reprinting.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-time Analytics</h3>
            <p className="text-gray-600">
              Track clicks, geographic data, device types, and more. Make
              data-driven decisions.
            </p>
          </div>
        </div>
      </main>

      <footer className="container mx-auto px-6 py-8 border-t mt-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link2 className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-semibold text-gray-900">Bitly</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2024 Bitly. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
