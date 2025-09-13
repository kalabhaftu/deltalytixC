'use client'
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

interface ConsentSettings {
  // Only essential cookies for basic website functionality
  functionality_storage: boolean;
  security_storage: boolean;
}

export function ConsentBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [settings] = useState<ConsentSettings>({
    functionality_storage: true, // Always true - essential for website function
    security_storage: true, // Always true - essential for security
  })

  useEffect(() => {
    const hasConsent = localStorage.getItem("cookieConsent")
    if (!hasConsent) {
      setIsVisible(true)
    }

    // Add keyboard shortcut for dev mode (Cmd/Ctrl + Shift + K)
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
        localStorage.removeItem("cookieConsent")
        setIsVisible(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Add/remove data attribute when banner visibility changes
  useEffect(() => {
    if (isVisible) {
      document.body.setAttribute('data-consent-banner', 'visible')
    } else {
      document.body.removeAttribute('data-consent-banner')
    }
    
    // Cleanup on unmount
    return () => {
      document.body.removeAttribute('data-consent-banner')
    }
  }, [isVisible])

  const handleAcceptEssential = () => {
    // Only essential cookies - no analytics or advertising
    const essentialOnly = {
      functionality_storage: true,
      security_storage: true,
    }
    saveConsent(essentialOnly)
  }

  const saveConsent = (consentSettings: ConsentSettings) => {
    localStorage.setItem("cookieConsent", JSON.stringify(consentSettings))
    // No gtag consent calls - we don't use Google Analytics or ads
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ 
          type: "spring",
          damping: 25,
          stiffness: 200,
          duration: 0.6 
        }}
        className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-auto"
        style={{
          filter: 'drop-shadow(0 -4px 6px rgb(0 0 0 / 0.1))',
        }}
      >
        <div className="bg-background/80 backdrop-blur-lg border-t border-border/50 p-4 shadow-lg">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  This website uses only essential cookies required for basic functionality, security, and user authentication. No tracking or advertising cookies are used.
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Button 
                  size="sm"
                  className="bg-black text-white hover:bg-black/90"
                  onClick={handleAcceptEssential}
                >
                  Accept Essential Cookies
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}