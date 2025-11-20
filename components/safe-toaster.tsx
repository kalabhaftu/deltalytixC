'use client'

import { Toaster as SonnerToaster } from 'sonner'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'

export function SafeToaster() {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { theme = "system" } = useTheme()

  useEffect(() => {
    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      setMounted(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [pathname])

  // Don't render Toaster until after mount to avoid setState during render
  if (!mounted) return null

  return (
    <SonnerToaster 
      position="bottom-right"
      expand={false}
      richColors
      closeButton
      theme="light"
      duration={3000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:border-border",
        },
      }}
    />
  )
}
