import { notFound } from 'next/navigation'

// This catch-all route handles any unmatched routes
// It calls notFound() which renders the not-found.tsx page
export default function CatchAllPage() {
  notFound()
  
  // Fallback (never reached due to notFound())
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
      <p className="text-muted-foreground mt-4">The page you&apos;re looking for doesn&apos;t exist.</p>
    </div>
  )
} 