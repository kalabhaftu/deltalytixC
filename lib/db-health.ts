import { prisma } from './prisma'

interface DatabaseHealthStatus {
  isConnected: boolean
  error?: string
  connectionTime?: number
  usingPooler: boolean
}

export async function checkDatabaseHealth(timeout = 5000): Promise<DatabaseHealthStatus> {
  const startTime = Date.now()
  
  try {
    // Create a promise that races against a timeout
    const healthCheck = Promise.race([
      // Test connection with a simple query
      prisma.$queryRaw`SELECT 1 as health_check`,
      // Timeout promise
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database connection timeout')), timeout)
      )
    ])

    await healthCheck
    const connectionTime = Date.now() - startTime
    
    return {
      isConnected: true,
      connectionTime,
      usingPooler: process.env.DIRECT_URL ? true : false
    }
  } catch (error) {
    const connectionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error'
    
    return {
      isConnected: false,
      error: errorMessage,
      connectionTime,
      usingPooler: process.env.DIRECT_URL ? true : false
    }
  }
}

export async function retryDatabaseConnection(maxRetries = 3, delayMs = 2000): Promise<DatabaseHealthStatus> {
  let lastError: DatabaseHealthStatus | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Database connection attempt ${attempt}/${maxRetries}`)
    
    const result = await checkDatabaseHealth()
    
    if (result.isConnected) {
      console.log(`Database connected successfully on attempt ${attempt}`)
      return result
    }
    
    lastError = result
    console.warn(`Connection attempt ${attempt} failed: ${result.error}`)
    
    if (attempt < maxRetries) {
      console.log(`Waiting ${delayMs}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  return lastError || {
    isConnected: false,
    error: 'Failed to connect after all retries',
    usingPooler: false
  }
}
