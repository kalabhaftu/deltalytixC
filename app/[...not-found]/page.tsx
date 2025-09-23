// import { notFound } from 'next/navigation'

// This catch-all route will handle any unmatched routes within the [locale] directory
// It immediately calls notFound() which will render the not-found.tsx page from the same directory level
export default function CatchAllPage() {
  // Temporarily disabled to debug build issues
  // notFound()

  // Simple fallback for now
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
      <p className="text-muted-foreground mt-4">The page you&apos;re looking for doesn&apos;t exist.</p>
    </div>
  )
} 