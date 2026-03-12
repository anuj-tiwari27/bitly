'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OrganizationsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/settings')
  }, [router])
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )
}
