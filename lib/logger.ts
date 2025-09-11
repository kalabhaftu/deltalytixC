/**
 * Production-ready logger utility
 * Conditionally logs based on environment and provides structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: unknown
  timestamp: string
  context?: string
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development'
  private isVerbose = process.env.ENABLE_VERBOSE_LOGGING === 'true'

  private formatMessage(level: LogLevel, message: string, data?: unknown, context?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context,
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDev && level === 'debug') return false
    if (!this.isVerbose && level === 'info') return false
    return true
  }

  private log(level: LogLevel, message: string, data?: unknown, context?: string) {
    if (!this.shouldLog(level)) return

    const entry = this.formatMessage(level, message, data, context)
    
    switch (level) {
      case 'debug':
        if (this.isDev) console.debug(`[DEBUG${context ? ` ${context}` : ''}]`, message, data)
        break
      case 'info':
        if (this.isDev || this.isVerbose) console.info(`[INFO${context ? ` ${context}` : ''}]`, message, data)
        break
      case 'warn':
        console.warn(`[WARN${context ? ` ${context}` : ''}]`, message, data)
        break
      case 'error':
        console.error(`[ERROR${context ? ` ${context}` : ''}]`, message, data)
        // In production, you might want to send this to an error tracking service
        break
    }
  }

  debug(message: string, data?: unknown, context?: string) {
    this.log('debug', message, data, context)
  }

  info(message: string, data?: unknown, context?: string) {
    this.log('info', message, data, context)
  }

  warn(message: string, data?: unknown, context?: string) {
    this.log('warn', message, data, context)
  }

  error(message: string, data?: unknown, context?: string) {
    this.log('error', message, data, context)
  }

  // Specialized methods for common use cases
  apiError(endpoint: string, error: unknown, additionalData?: unknown) {
    this.error(`API Error in ${endpoint}`, { error, ...(additionalData || {}) }, 'API')
  }

  dbError(operation: string, error: unknown, additionalData?: unknown) {
    this.error(`Database Error in ${operation}`, { error, ...(additionalData || {}) }, 'DB')
  }

  wsDebug(message: string, data?: unknown) {
    this.debug(message, data, 'WebSocket')
  }

  wsError(message: string, error: unknown) {
    this.error(message, error, 'WebSocket')
  }

  authError(message: string, error: unknown) {
    this.error(message, error, 'Auth')
  }
}

export const logger = new Logger()
