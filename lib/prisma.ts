import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Build optimized database URL with connection pooling
function buildDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || 'file:./dev.db'

  // Skip pooling config for file-based databases
  if (baseUrl.startsWith('file:')) {
    return baseUrl
  }

  // Parse URL to add/modify connection pool parameters
  try {
    const url = new URL(baseUrl)

    // Optimize connection pool for serverless (Vercel free tier)
    // Increased limits to handle concurrent dashboard requests
    // Optimized for Vercel serverless environment (Supabase/Prisma)
    url.searchParams.set('connection_limit', '10')
    url.searchParams.set('pool_timeout', '20')
    url.searchParams.set('connect_timeout', '10')
    url.searchParams.set('socket_timeout', '30') // 30 second socket timeout

    // Enable prepared statements for better performance
    url.searchParams.set('pgbouncer', 'true')

    return url.toString()
  } catch {
    return baseUrl
  }
}

// Enhanced Prisma client configuration with robust connection handling
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],

  // Optimized connection configuration
  datasources: {
    db: {
      url: buildDatabaseUrl()
    }
  },

  // Enhanced error handling and connection settings
  ...(process.env.NODE_ENV === 'development' && {
    errorFormat: 'pretty',
  }),
})

// Safe database operations that handle connection failures gracefully
export const safeDbOperation = async <T>(
  operation: () => Promise<T>,
  fallbackValue?: T
): Promise<T | undefined> => {
  try {
    return await operation()
  } catch (error) {
    console.error('Database operation failed:', error)
    return fallbackValue
  }
}

// Cleanup connections on process exit (optional in serverless but good for local)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
