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
    url.searchParams.set('connection_limit', '20') // Max connections per instance
    url.searchParams.set('pool_timeout', '30') // 30 second timeout for pool
    url.searchParams.set('connect_timeout', '15') // 15 second connect timeout
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

// Database availability check
let isDatabaseAvailable = false

// Check database availability
prisma.$connect()
  .then(() => {
    isDatabaseAvailable = true
  })
  .catch(() => {
    isDatabaseAvailable = false
  })

// Safe database operations that handle connection failures gracefully
export const safeDbOperation = async <T>(
  operation: () => Promise<T>,
  fallbackValue?: T
): Promise<T | undefined> => {
  if (!isDatabaseAvailable) {
    return fallbackValue
  }

  try {
    return await operation()
  } catch (error) {
    return fallbackValue
  }
}

// Database connection retry utility with exponential backoff
async function connectWithRetry(client: PrismaClient, maxRetries = 3, baseDelay = 500): Promise<PrismaClient> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Set a timeout for each connection attempt (optimized for serverless)
      const connectionPromise = client.$connect()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 10000) // 10s timeout
      )

      await Promise.race([connectionPromise, timeoutPromise])
      isDatabaseAvailable = true
      return client
    } catch (error: any) {
      // Exponential backoff with jitter
      if (i < maxRetries - 1) {
        const jitter = Math.random() * 100 // Random 0-100ms
        const delay = baseDelay * Math.pow(2, i) + jitter
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  isDatabaseAvailable = false
  throw new Error(`Database connection failed after ${maxRetries} attempts`)
}

// Initialize connection with retry
connectWithRetry(prisma).catch(() => {
  // Connection failed, will retry on next operation
})

// Cleanup connections on process exit
process.on('beforeExit', async () => {
  try {
    await prisma.$disconnect()
  } catch (error) {
    // Ignore disconnect errors
  }
})

process.on('SIGTERM', async () => {
  try {
    await prisma.$disconnect()
  } catch (error) {
    // Ignore disconnect errors
  }
  process.exit(0)
})

process.on('SIGINT', async () => {
  try {
    await prisma.$disconnect()
  } catch (error) {
    // Ignore disconnect errors
  }
  process.exit(0)
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 