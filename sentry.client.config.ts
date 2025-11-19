import * as Sentry from '@sentry/nextjs'

// Only initialize Sentry if DSN is provided (optional for personal use)
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions for performance
    
    // Session replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Environment
    environment: process.env.NODE_ENV || 'development',
    
    // Don't report in development
    enabled: process.env.NODE_ENV === 'production',
    
    // Integrations
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Filter out known issues
    beforeSend(event, hint) {
      // Filter out network errors from ad blockers
      if (event.exception) {
        const error = hint.originalException
        if (error instanceof Error && error.message.includes('blocked by client')) {
          return null
        }
      }
      return event
    },
  })
}

