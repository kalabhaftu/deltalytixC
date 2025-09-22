import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Simplified Prisma client configuration for better performance
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Simple connection configuration without complex pooling for development
  ...(process.env.NODE_ENV === 'development' && {
    datasources: {
      db: {
        url: process.env.DATABASE_URL || process.env.DIRECT_URL || ''
      }
    }
  }),
  // Production configuration with basic connection pooling
  ...(process.env.NODE_ENV === 'production' && {
    datasources: {
      db: {
        url: process.env.DATABASE_URL || process.env.DIRECT_URL || ''
      }
    }
  })
})

// Cleanup connections on process exit
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 