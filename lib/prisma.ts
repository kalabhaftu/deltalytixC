import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  errorFormat: 'pretty',
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Disable prepared statements in development to fix Turbopack issues
  ...(process.env.NODE_ENV === 'development' && {
    datasources: {
      db: {
        url: process.env.DIRECT_URL + (process.env.DIRECT_URL?.includes('?') ? '&' : '?') + 'prepared_statements=false'
      }
    }
  }),
  // Use session pooler for production
  ...(process.env.NODE_ENV === 'production' && {
    datasources: {
      db: {
        url: process.env.DATABASE_URL || process.env.DIRECT_URL
      }
    }
  })
})

// Add connection error handling and cleanup
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