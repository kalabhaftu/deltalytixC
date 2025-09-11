import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  errorFormat: 'pretty',
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Optimized configuration specifically for Supabase connection pooling
  datasources: {
    db: {
      url: (() => {
        const baseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || ''
        const isDev = process.env.NODE_ENV === 'development'
        
        // Supabase-optimized connection parameters
        const params = new URLSearchParams({
          // Connection management - crucial for Supabase
          connect_timeout: isDev ? '20' : '30',
          pool_timeout: isDev ? '20' : '30', 
          connection_limit: '1', // Single connection for Supabase compatibility
          
          // Performance optimizations for Supabase
          statement_cache_size: '0',
          prepared_statements: 'false',
          pgbouncer: 'true',
          
          // Application identification
          application_name: isDev ? 'deltalytix-dev' : 'deltalytix-prod',
          
          // Additional Supabase-specific optimizations
          idle_timeout: '30',
          query_timeout: '60'
        })
        
        return baseUrl + (baseUrl.includes('?') ? '&' : '?') + params.toString()
      })()
    }
  }
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