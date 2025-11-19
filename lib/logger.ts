// Structured logging utility
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: string
  data?: unknown
  env?: string
}

function formatLog(level: LogLevel, message: string, data?: unknown, context?: string): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    data,
    env: process.env.NODE_ENV || 'development',
  }
}

function shouldLog(level: LogLevel): boolean {
  // In production, only log WARN and ERROR
  if (process.env.NODE_ENV === 'production') {
    return level === 'WARN' || level === 'ERROR'
  }
  // In development, log all levels
  return true
}

function outputLog(level: LogLevel, logEntry: LogEntry): void {
  if (process.env.NODE_ENV === 'production') {
    // Production: JSON format for parsing by log aggregators
    const output = JSON.stringify(logEntry)
    
    switch (level) {
      case 'DEBUG':
        console.debug(output)
        break
      case 'INFO':
        console.info(output)
        break
      case 'WARN':
        console.warn(output)
        break
      case 'ERROR':
        console.error(output)
        break
    }
  } else {
    // Development: Human-readable format
    const prefix = `[${level}${logEntry.context ? ` ${logEntry.context}` : ''}]`
    
    switch (level) {
      case 'DEBUG':
        console.debug(prefix, logEntry.message, logEntry.data || '')
        break
      case 'INFO':
        console.info(prefix, logEntry.message, logEntry.data || '')
        break
      case 'WARN':
        console.warn(prefix, logEntry.message, logEntry.data || '')
        break
      case 'ERROR':
        console.error(prefix, logEntry.message, logEntry.data || '')
        break
    }
  }
}

export const logger = {
  debug: (message: string, data?: unknown, context?: string) => {
    if (shouldLog('DEBUG')) {
      const logEntry = formatLog('DEBUG', message, data, context)
      outputLog('DEBUG', logEntry)
    }
  },

  info: (message: string, data?: unknown, context?: string) => {
    if (shouldLog('INFO')) {
      const logEntry = formatLog('INFO', message, data, context)
      outputLog('INFO', logEntry)
    }
  },

  warn: (message: string, data?: unknown, context?: string) => {
    if (shouldLog('WARN')) {
      const logEntry = formatLog('WARN', message, data, context)
      outputLog('WARN', logEntry)
    }
  },

  error: (message: string, data?: unknown, context?: string) => {
    if (shouldLog('ERROR')) {
      const logEntry = formatLog('ERROR', message, data, context)
      outputLog('ERROR', logEntry)
    }
  },
}
