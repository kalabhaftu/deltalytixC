import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Enhanced Prisma client configuration with robust connection handling
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],

  // Connection configuration with retry logic and optimized settings
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DIRECT_URL || 'file:./dev.db'
    }
  },

  // Enhanced error handling and connection settings
  ...(process.env.NODE_ENV === 'development' && {
    errorFormat: 'pretty',
  }),

  // Production configuration with optimized settings
  ...(process.env.NODE_ENV === 'production' && {
    datasources: {
      db: {
        url: process.env.DATABASE_URL || process.env.DIRECT_URL || ''
      }
    }
  })
})

// Database availability check
let isDatabaseAvailable = false

// Check database availability
prisma.$connect()
  .then(() => {
    isDatabaseAvailable = true
  })
  .catch((error) => {
    console.warn('⚠️ Database not available:', error.message)
    isDatabaseAvailable = false
  })

// Safe database operations that handle connection failures gracefully
export const safeDbOperation = async <T>(
  operation: () => Promise<T>,
  fallbackValue?: T
): Promise<T | undefined> => {
  if (!isDatabaseAvailable) {
    console.warn('Database not available, returning fallback value')
    return fallbackValue
  }

  try {
    return await operation()
  } catch (error) {
    console.error('Database operation failed:', error)
    return fallbackValue
  }
}

// Database connection retry utility with enhanced error handling
async function connectWithRetry(client: PrismaClient, maxRetries = 5, delay = 1000): Promise<PrismaClient> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Set a timeout for each connection attempt
      const connectionPromise = client.$connect()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )

      await Promise.race([connectionPromise, timeoutPromise])
      return client
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : error
      console.warn(`⚠️ Database connection failed (attempt ${i + 1}/${maxRetries}):`, errorMessage)

      // Handle specific error codes
      if (error?.code === 'P1001') {
      } else if (errorMessage.includes('timeout')) {
      } else {
      }

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= 2 // Exponential backoff
      }
    }
  }
  throw new Error(`Database connection failed after ${maxRetries} attempts`)
}

// Initialize connection with retry
connectWithRetry(prisma).catch((error) => {
  console.error('❌ Failed to establish database connection:', error)
})

// Cleanup connections on process exit
process.on('beforeExit', async () => {
  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error during database disconnect:', error)
  }
})

process.on('SIGTERM', async () => {
  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error during database disconnect:', error)
  }
  process.exit(0)
})

process.on('SIGINT', async () => {
  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error during database disconnect:', error)
  }
  process.exit(0)
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 