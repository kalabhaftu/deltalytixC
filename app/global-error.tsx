
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

interface GlobalErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    React.useEffect(() => {
        // Log the error to an error reporting service
        console.error('Global Error Boundary caught:', error)
    }, [error])

    return (
        <html>
            <body className="antialiased min-h-screen bg-background text-foreground flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="p-4 rounded-full bg-destructive/10 text-destructive animate-pulse">
                            <AlertCircle className="h-12 w-12" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tighter">System Critical Error</h1>
                        <p className="text-muted-foreground">
                            A critical error occurred that prevented the application from rendering effectively.
                        </p>
                    </div>

                    <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 text-left text-sm font-mono overflow-auto max-h-[200px] custom-scrollbar">
                        <p className="text-destructive font-semibold">Error Digest: {error.digest || 'Unknown'}</p>
                        <p className="mt-1 text-muted-foreground break-all">{error.message}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button onClick={() => reset()} size="lg" className="w-full sm:w-auto gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </Button>
                        <Button onClick={() => window.location.href = '/'} variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                            <Home className="h-4 w-4" />
                            Return Home
                        </Button>
                    </div>
                </div>
            </body>
        </html>
    )
}
