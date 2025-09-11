/**
 * Database Connection Manager for Supabase
 * Handles connection serialization and retry logic to work around Supabase pooling limitations
 */

import { prisma } from '@/lib/prisma'

class DatabaseConnectionManager {
  private connectionQueue: Array<() => Promise<any>> = []
  private isProcessing = false
  private maxConcurrentConnections = 1 // Limit for Supabase
  private activeConnections = 0

  /**
   * Execute a database operation with connection management
   */
  async executeWithConnection<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.queueOperation(operation)
      } catch (error) {
        console.warn(`[DB Manager] Attempt ${attempt}/${retries} failed:`, error instanceof Error ? error.message : error)
        
        if (attempt === retries) {
          throw error
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        
        // Force disconnect on certain errors to clear stale connections
        if (error instanceof Error && (
          error.message.includes("Can't reach database server") ||
          error.message.includes('connection pool timeout') ||
          error.message.includes('ECONNREFUSED')
        )) {
          try {
            await prisma.$disconnect()
            await new Promise(resolve => setTimeout(resolve, 2000))
          } catch (disconnectError) {
            console.warn('[DB Manager] Disconnect error during retry:', disconnectError)
          }
        }
      }
    }
    
    throw new Error('All retry attempts failed')
  }

  /**
   * Queue database operations to prevent concurrent connection issues
   */
  private async queueOperation<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.connectionQueue.push(async () => {
        try {
          this.activeConnections++
          const result = await operation()
          this.activeConnections--
          resolve(result)
        } catch (error) {
          this.activeConnections--
          reject(error)
        }
      })

      this.processQueue()
    })
  }

  /**
   * Process the connection queue
   */
  private async processQueue() {
    if (this.isProcessing || this.connectionQueue.length === 0) {
      return
    }

    if (this.activeConnections >= this.maxConcurrentConnections) {
      return
    }

    this.isProcessing = true

    while (this.connectionQueue.length > 0 && this.activeConnections < this.maxConcurrentConnections) {
      const operation = this.connectionQueue.shift()
      if (operation) {
        // Don't await here to allow parallel processing up to the limit
        operation().finally(() => {
          // Continue processing queue after operation completes
          setTimeout(() => this.processQueue(), 100)
        })
      }
    }

    this.isProcessing = false
  }

  /**
   * Test database connectivity
   */
  async testConnection(): Promise<{ success: boolean; latency: number; error?: string }> {
    const startTime = Date.now()
    
    try {
      await this.executeWithConnection(async () => {
        await prisma.$queryRaw`SELECT 1 as test`
      })
      
      return {
        success: true,
        latency: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get connection pool status
   */
  getStatus() {
    return {
      activeConnections: this.activeConnections,
      queueLength: this.connectionQueue.length,
      isProcessing: this.isProcessing,
      maxConcurrentConnections: this.maxConcurrentConnections
    }
  }
}

// Export singleton instance
export const dbConnectionManager = new DatabaseConnectionManager()

/**
 * Helper function to execute database operations safely
 */
export async function executeDbOperation<T>(operation: () => Promise<T>): Promise<T> {
  return dbConnectionManager.executeWithConnection(operation)
}

/**
 * Helper function for simple queries
 */
export async function safeQuery<T>(query: () => Promise<T>): Promise<T> {
  return executeDbOperation(query)
}
