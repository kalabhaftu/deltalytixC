/**
 * AI Usage Monitor
 * Tracks model usage and provides insights for optimization
 */

interface UsageStats {
  modelName: string
  requestCount: number
  successCount: number
  failureCount: number
  totalTokensUsed: number
  lastUsed: Date
  averageResponseTime: number
}

class AIUsageMonitor {
  private stats = new Map<string, UsageStats>()
  
  recordRequest(modelName: string, success: boolean, tokensUsed: number = 0, responseTime: number = 0) {
    const existing = this.stats.get(modelName) || {
      modelName,
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      totalTokensUsed: 0,
      lastUsed: new Date(),
      averageResponseTime: 0
    }
    
    existing.requestCount++
    existing.lastUsed = new Date()
    existing.totalTokensUsed += tokensUsed
    
    if (success) {
      existing.successCount++
    } else {
      existing.failureCount++
    }
    
    // Update average response time
    if (responseTime > 0) {
      existing.averageResponseTime = (existing.averageResponseTime * (existing.successCount - 1) + responseTime) / existing.successCount
    }
    
    this.stats.set(modelName, existing)
  }
  
  getStats(modelName?: string): UsageStats[] {
    if (modelName) {
      const stat = this.stats.get(modelName)
      return stat ? [stat] : []
    }
    
    return Array.from(this.stats.values()).sort((a, b) => b.requestCount - a.requestCount)
  }
  
  getSuccessRate(modelName: string): number {
    const stat = this.stats.get(modelName)
    if (!stat || stat.requestCount === 0) return 0
    
    return (stat.successCount / stat.requestCount) * 100
  }
  
  getMostReliableModel(): string | null {
    const stats = this.getStats()
    if (stats.length === 0) return null
    
    // Find model with highest success rate (minimum 5 requests)
    const reliableModels = stats.filter(s => s.requestCount >= 5)
    if (reliableModels.length === 0) return null
    
    return reliableModels.reduce((best, current) => {
      const bestRate = this.getSuccessRate(best.modelName)
      const currentRate = this.getSuccessRate(current.modelName)
      return currentRate > bestRate ? current : best
    }).modelName
  }
  
  logSummary() {
    const stats = this.getStats()
    if (stats.length === 0) {
      console.log('[AI Monitor] No usage data available')
      return
    }
    
    console.log('\n=== AI Model Usage Summary ===')
    stats.forEach(stat => {
      const successRate = this.getSuccessRate(stat.modelName)
      console.log(`${stat.modelName}:`)
      console.log(`  Requests: ${stat.requestCount} (${stat.successCount} success, ${stat.failureCount} failures)`)
      console.log(`  Success Rate: ${successRate.toFixed(1)}%`)
      console.log(`  Tokens Used: ${stat.totalTokensUsed.toLocaleString()}`)
      console.log(`  Avg Response Time: ${stat.averageResponseTime.toFixed(0)}ms`)
      console.log(`  Last Used: ${stat.lastUsed.toISOString()}`)
      console.log('')
    })
    
    const mostReliable = this.getMostReliableModel()
    if (mostReliable) {
      console.log(`Most Reliable Model: ${mostReliable}`)
    }
    console.log('==============================\n')
  }
  
  reset() {
    this.stats.clear()
  }
}

// Global instance
export const aiUsageMonitor = new AIUsageMonitor()

// Middleware function to wrap AI calls with monitoring
export function withUsageMonitoring<T>(
  modelName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  
  return operation()
    .then(result => {
      const responseTime = Date.now() - startTime
      aiUsageMonitor.recordRequest(modelName, true, 0, responseTime)
      return result
    })
    .catch(error => {
      const responseTime = Date.now() - startTime
      aiUsageMonitor.recordRequest(modelName, false, 0, responseTime)
      throw error
    })
}

// Log usage summary every hour in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    aiUsageMonitor.logSummary()
  }, 60 * 60 * 1000) // 1 hour
}
