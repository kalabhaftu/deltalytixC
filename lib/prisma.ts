import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Enhanced Prisma client configuration with robust connection handling
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],

  // Connection configuration with retry logic
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

// Database connection retry utility
async function connectWithRetry(client: PrismaClient, maxRetries = 3, delay = 1000): Promise<PrismaClient> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await client.$connect()
      console.log(`✅ Database connection established (attempt ${i + 1})`)
      return client
    } catch (error) {
      console.warn(`⚠️ Database connection failed (attempt ${i + 1}/${maxRetries}):`, error instanceof Error ? error.message : error)

      if (i < maxRetries - 1) {
        console.log(`🔄 Retrying in ${delay}ms...`)
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
    console.log('✅ Database disconnected via SIGTERM')
  } catch (error) {
    console.error('Error during database disconnect:', error)
  }
  process.exit(0)
})

process.on('SIGINT', async () => {
  try {
    await prisma.$disconnect()
    console.log('✅ Database disconnected via SIGINT')
  } catch (error) {
    console.error('Error during database disconnect:', error)
  }
  process.exit(0)
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 