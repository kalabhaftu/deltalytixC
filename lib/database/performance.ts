'use server'

import { prisma } from '@/lib/prisma'

export interface QueryPerformanceMetrics {
  query: string
  executionTime: number
  rowsAffected?: number
  indexesUsed?: string[]
  suggestions?: string[]
}

export interface DatabaseStats {
  totalQueries: number
  avgQueryTime: number
  slowQueries: QueryPerformanceMetrics[]
  tableStats: TableStats[]
  indexUsage: IndexUsageStats[]
}

export interface TableStats {
  tableName: string
  rowCount: number
  sizeInBytes: number
  indexCount: number
  lastVacuum?: Date
  lastAnalyze?: Date
}

export interface IndexUsageStats {
  tableName: string
  indexName: string
  timesUsed: number
  sizeInBytes: number
  isUnique: boolean
  efficiency: number
}

class DatabasePerformanceMonitor {
  private static instance: DatabasePerformanceMonitor
  private queryMetrics: QueryPerformanceMetrics[] = []
  private readonly MAX_METRICS = 1000

  private constructor() {}

  public static getInstance(): DatabasePerformanceMonitor {
    if (!DatabasePerformanceMonitor.instance) {
      DatabasePerformanceMonitor.instance = new DatabasePerformanceMonitor()
    }
    return DatabasePerformanceMonitor.instance
  }

  // Monitor query performance
  async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()
    
    try {
      const result = await queryFn()
      const executionTime = performance.now() - startTime
      
      this.recordMetric({
        query: queryName,
        executionTime,
        suggestions: this.generateSuggestions(executionTime),
      })
      
      return result
    } catch (error) {
      const executionTime = performance.now() - startTime
      
      this.recordMetric({
        query: queryName,
        executionTime,
        suggestions: ['Query failed - check error logs'],
      })
      
      throw error
    }
  }

  private recordMetric(metric: QueryPerformanceMetrics) {
    this.queryMetrics.push(metric)
    
    // Keep only the last MAX_METRICS entries
    if (this.queryMetrics.length > this.MAX_METRICS) {
      this.queryMetrics = this.queryMetrics.slice(-this.MAX_METRICS)
    }
    
    // Log slow queries
    if (metric.executionTime > 1000) { // > 1 second
      console.warn(`Slow query detected: ${metric.query} took ${metric.executionTime}ms`)
    }
  }

  private generateSuggestions(executionTime: number): string[] {
    const suggestions: string[] = []
    
    if (executionTime > 2000) {
      suggestions.push('Consider adding database indexes')
      suggestions.push('Review query complexity')
      suggestions.push('Check for N+1 query problems')
    } else if (executionTime > 1000) {
      suggestions.push('Monitor for potential optimization')
    }
    
    return suggestions
  }

  // Get performance metrics
  getMetrics(): QueryPerformanceMetrics[] {
    return [...this.queryMetrics]
  }

  // Get slow queries (> 500ms)
  getSlowQueries(): QueryPerformanceMetrics[] {
    return this.queryMetrics.filter(m => m.executionTime > 500)
  }

  // Get average query time
  getAverageQueryTime(): number {
    if (this.queryMetrics.length === 0) return 0
    
    const total = this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0)
    return total / this.queryMetrics.length
  }

  // Clear metrics
  clearMetrics() {
    this.queryMetrics = []
  }
}

// Export singleton instance
export const dbPerformanceMonitor = DatabasePerformanceMonitor.getInstance()

// Database statistics functions
export async function getTableStats(): Promise<TableStats[]> {
  try {
    // PostgreSQL-specific query to get table statistics
    const result = await prisma.$queryRaw<Array<{
      table_name: string
      row_count: bigint
      size_bytes: bigint
      index_count: bigint
    }>>`
      SELECT 
        schemaname || '.' || tablename as table_name,
        n_tup_ins + n_tup_upd + n_tup_del as row_count,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
        (SELECT COUNT(*) FROM pg_indexes WHERE tablename = t.tablename) as index_count
      FROM pg_stat_user_tables t
      WHERE schemaname = 'public'
      ORDER BY size_bytes DESC
    `

    return result.map(row => ({
      tableName: row.table_name,
      rowCount: Number(row.row_count),
      sizeInBytes: Number(row.size_bytes),
      indexCount: Number(row.index_count),
    }))
  } catch (error) {
    console.error('Failed to get table stats:', error)
    return []
  }
}

export async function getIndexUsageStats(): Promise<IndexUsageStats[]> {
  try {
    // PostgreSQL-specific query to get index usage statistics
    const result = await prisma.$queryRaw<Array<{
      table_name: string
      index_name: string
      times_used: bigint
      size_bytes: bigint
      is_unique: boolean
    }>>`
      SELECT 
        schemaname || '.' || tablename as table_name,
        indexname as index_name,
        idx_scan as times_used,
        pg_relation_size(schemaname||'.'||indexname) as size_bytes,
        indisunique as is_unique
      FROM pg_stat_user_indexes 
      JOIN pg_index ON pg_stat_user_indexes.indexrelid = pg_index.indexrelid
      WHERE schemaname = 'public'
      ORDER BY times_used DESC
    `

    return result.map(row => ({
      tableName: row.table_name,
      indexName: row.index_name,
      timesUsed: Number(row.times_used),
      sizeInBytes: Number(row.size_bytes),
      isUnique: row.is_unique,
      efficiency: Number(row.times_used) > 0 ? 
        Math.min(100, (Number(row.times_used) / 1000) * 100) : 0,
    }))
  } catch (error) {
    console.error('Failed to get index usage stats:', error)
    return []
  }
}

export async function getDatabaseStats(): Promise<DatabaseStats> {
  const [tableStats, indexUsage] = await Promise.all([
    getTableStats(),
    getIndexUsageStats(),
  ])

  const metrics = dbPerformanceMonitor.getMetrics()

  return {
    totalQueries: metrics.length,
    avgQueryTime: dbPerformanceMonitor.getAverageQueryTime(),
    slowQueries: dbPerformanceMonitor.getSlowQueries(),
    tableStats,
    indexUsage,
  }
}

// Query optimization utilities
export class QueryOptimizer {
  // Optimize trade queries with proper indexing
  static async getOptimizedTrades(userId: string, filters?: {
    accountNumbers?: string[]
    instruments?: string[]
    dateFrom?: Date
    dateTo?: Date
    limit?: number
  }) {
    return dbPerformanceMonitor.measureQuery(
      'getOptimizedTrades',
      async () => {
        const where: any = { userId }
        
        if (filters?.accountNumbers?.length) {
          where.accountNumber = { in: filters.accountNumbers }
        }
        
        if (filters?.instruments?.length) {
          where.instrument = { in: filters.instruments }
        }
        
        if (filters?.dateFrom || filters?.dateTo) {
          where.entryDate = {}
          if (filters.dateFrom) {
            where.entryDate.gte = filters.dateFrom.toISOString()
          }
          if (filters.dateTo) {
            where.entryDate.lte = filters.dateTo.toISOString()
          }
        }

        return prisma.trade.findMany({
          where,
          orderBy: { entryDate: 'desc' },
          take: filters?.limit || 1000,
          // Only select necessary fields to reduce data transfer
          select: {
            id: true,
            accountNumber: true,
            instrument: true,
            entryDate: true,
            closeDate: true,
            pnl: true,
            commission: true,
            quantity: true,
            side: true,
            timeInPosition: true,
            tags: true,
          },
        })
      }
    )
  }

  // Optimized dashboard statistics
  static async getDashboardStats(userId: string) {
    return dbPerformanceMonitor.measureQuery(
      'getDashboardStats',
      async () => {
        // Use materialized view if available, otherwise compute
        try {
          const stats = await prisma.$queryRaw<Array<{
            total_trades: bigint
            total_pnl: number
            total_commission: number
            winning_trades: bigint
            losing_trades: bigint
            win_rate: number
          }>>`
            SELECT 
              COUNT(*) as total_trades,
              SUM(pnl) as total_pnl,
              SUM(commission) as total_commission,
              SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
              SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
              ROUND(
                (SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::decimal / COUNT(*)) * 100, 2
              ) as win_rate
            FROM "Trade"
            WHERE "userId" = ${userId}
          `

          return stats[0] ? {
            totalTrades: Number(stats[0].total_trades),
            totalPnl: stats[0].total_pnl || 0,
            totalCommission: stats[0].total_commission || 0,
            winningTrades: Number(stats[0].winning_trades),
            losingTrades: Number(stats[0].losing_trades),
            winRate: stats[0].win_rate || 0,
          } : null
        } catch (error) {
          console.error('Failed to get dashboard stats:', error)
          return null
        }
      }
    )
  }

  // Optimized account performance
  static async getAccountPerformance(userId: string) {
    return dbPerformanceMonitor.measureQuery(
      'getAccountPerformance',
      async () => {
        return prisma.$queryRaw<Array<{
          account_number: string
          total_trades: bigint
          total_pnl: number
          win_rate: number
          avg_pnl: number
        }>>`
          SELECT 
            "accountNumber" as account_number,
            COUNT(*) as total_trades,
            SUM("pnl") as total_pnl,
            ROUND(
              (SUM(CASE WHEN "pnl" > 0 THEN 1 ELSE 0 END)::decimal / COUNT(*)) * 100, 2
            ) as win_rate,
            ROUND(AVG("pnl"), 2) as avg_pnl
          FROM "Trade"
          WHERE "userId" = ${userId}
          GROUP BY "accountNumber"
          ORDER BY total_pnl DESC
        `
      }
    )
  }
}

// Database maintenance utilities
export class DatabaseMaintenance {
  // Refresh materialized views
  static async refreshMaterializedViews() {
    try {
      await prisma.$executeRaw`SELECT refresh_trade_summaries()`
      console.log('Materialized views refreshed successfully')
    } catch (error) {
      console.error('Failed to refresh materialized views:', error)
    }
  }

  // Analyze table statistics
  static async analyzeDatabase() {
    try {
      await prisma.$executeRaw`ANALYZE`
      console.log('Database analysis completed')
    } catch (error) {
      console.error('Failed to analyze database:', error)
    }
  }

  // Vacuum database (PostgreSQL)
  static async vacuumDatabase() {
    try {
      await prisma.$executeRaw`VACUUM (ANALYZE, VERBOSE)`
      console.log('Database vacuum completed')
    } catch (error) {
      console.error('Failed to vacuum database:', error)
    }
  }

  // Check for unused indexes
  static async getUnusedIndexes(): Promise<string[]> {
    try {
      const result = await prisma.$queryRaw<Array<{ index_name: string }>>`
        SELECT indexname as index_name
        FROM pg_stat_user_indexes 
        WHERE idx_scan = 0 
        AND schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
      `
      
      return result.map(row => row.index_name)
    } catch (error) {
      console.error('Failed to get unused indexes:', error)
      return []
    }
  }

  // Get database size
  static async getDatabaseSize(): Promise<string> {
    try {
      const result = await prisma.$queryRaw<Array<{ size: string }>>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `
      
      return result[0]?.size || 'Unknown'
    } catch (error) {
      console.error('Failed to get database size:', error)
      return 'Unknown'
    }
  }
}
