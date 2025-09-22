// Simple console logging for personal use
export const logger = {
  debug: (message: string, data?: unknown, context?: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG${context ? ` ${context}` : ''}]`, message, data)
    }
  },

  info: (message: string, data?: unknown, context?: string) => {
    console.info(`[INFO${context ? ` ${context}` : ''}]`, message, data)
  },

  warn: (message: string, data?: unknown, context?: string) => {
    console.warn(`[WARN${context ? ` ${context}` : ''}]`, message, data)
  },

  error: (message: string, data?: unknown, context?: string) => {
    console.error(`[ERROR${context ? ` ${context}` : ''}]`, message, data)
  }
}
