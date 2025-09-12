import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  errorFormat: 'pretty',
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Enhanced connection configuration with robust error handling
  ...(process.env.NODE_ENV === 'development' && {
    datasources: {
      db: {
        url: (process.env.DATABASE_URL || process.env.DIRECT_URL || '') + 
             ((process.env.DATABASE_URL || process.env.DIRECT_URL || '').includes('?') ? '&' : '?') + 
             'connect_timeout=30&pool_timeout=30&connection_limit=5&statement_cache_size=0&prepared_statements=false&pgbouncer=true&sslmode=require'
      }
    }
  }),
  // Use connection pooler for production with optimized timeouts
  ...(process.env.NODE_ENV === 'production' && {
    datasources: {
      db: {
        url: (process.env.DATABASE_URL || process.env.DIRECT_URL || '') + 
             ((process.env.DATABASE_URL || process.env.DIRECT_URL || '').includes('?') ? '&' : '?') + 
             'connect_timeout=30&pool_timeout=30&connection_limit=10&statement_cache_size=0&pgbouncer=true&sslmode=require'
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