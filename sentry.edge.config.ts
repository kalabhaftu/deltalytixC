import * as Sentry from '@sentry/nextjs'

// Only initialize Sentry if DSN is provided (optional for personal use)
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance monitoring
    tracesSampleRate: 0.1,
    
    // Environment
    environment: process.env.NODE_ENV || 'development',
    
    // Don't report in development
    enabled: process.env.NODE_ENV === 'production',
  })
}

