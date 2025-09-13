'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PropFirmPage() {
  const router = useRouter()
  
  // Redirect to the main accounts page which now handles both live and prop firm accounts
  useEffect(() => {
    router.push('/dashboard/accounts?filter=prop-firm')
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
