'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OrganizationsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/settings')
  }, [router])
  return (
    <div className="flex min-h-[200px] items-center justify-center bg-slate-950">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  )
}
