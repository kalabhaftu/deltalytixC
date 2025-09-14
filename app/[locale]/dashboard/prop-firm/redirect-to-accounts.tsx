"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

export function RedirectToAccounts() {
  const router = useRouter()

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard/prop-firm/accounts')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-yellow-100 w-fit">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle>Account Not Found</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            The requested account could not be found. It may have been deleted or you may not have access to it.
          </p>
          
          <div className="text-sm text-muted-foreground">
            Redirecting to accounts list in <span className="font-mono">3</span> seconds...
          </div>

          <Button 
            onClick={() => router.push('/dashboard/prop-firm/accounts')}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Accounts
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
