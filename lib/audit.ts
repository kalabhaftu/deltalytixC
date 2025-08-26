'use server'

import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export type AuditAction = 
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED'
  | 'CREATE_TRADE' | 'UPDATE_TRADE' | 'DELETE_TRADE' | 'BULK_DELETE_TRADES'
  | 'CREATE_ACCOUNT' | 'UPDATE_ACCOUNT' | 'DELETE_ACCOUNT'
  | 'UPLOAD_FILE' | 'DOWNLOAD_FILE' | 'EXPORT_DATA'
  | 'ENABLE_2FA' | 'DISABLE_2FA' | 'VERIFY_2FA'
  | 'CHANGE_PASSWORD' | 'UPDATE_PROFILE'
  | 'API_ACCESS' | 'RATE_LIMITED'
  | 'SUSPICIOUS_ACTIVITY' | 'SECURITY_VIOLATION'

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type SecurityEventType = 
  | 'FAILED_LOGIN' | 'MULTIPLE_FAILED_LOGINS' | 'RATE_LIMIT_EXCEEDED'
  | 'SUSPICIOUS_IP' | 'XSS_ATTEMPT' | 'SQL_INJECTION_ATTEMPT'
  | 'FILE_UPLOAD_VIOLATION' | 'UNUSUAL_ACTIVITY_PATTERN'
  | 'BRUTE_FORCE_ATTEMPT' | 'ACCOUNT_LOCKOUT' | 'SUSPICIOUS_ACTIVITY'

export interface AuditLogData {
  userId?: string
  action: AuditAction
  resource?: string
  resourceId?: string
  details?: Record<string, any>
  success?: boolean
  errorMessage?: string
  riskLevel?: RiskLevel
  flags?: string[]
}

export interface SecurityEventData {
  type: SecurityEventType
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  source: string
  description: string
  details?: Record<string, any>
}

class AuditLogger {
  private static instance: AuditLogger
  private isEnabled: boolean = true

  private constructor() {
    // Initialize audit logger
    this.isEnabled = process.env.AUDIT_LOGGING !== 'false'
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }

  // Get request metadata
  private async getRequestMetadata(): Promise<{
    ipAddress?: string
    userAgent?: string
  }> {
    try {
      const headersList = await headers()
      return {
        ipAddress: headersList.get('x-forwarded-for') || 
                   headersList.get('x-real-ip') || 
                   headersList.get('remote-addr') || 
                   'unknown',
        userAgent: headersList.get('user-agent') || 'unknown',
      }
    } catch (error) {
      console.warn('Failed to get request metadata:', error)
      return {}
    }
  }

  // Log audit event
  async log(data: AuditLogData): Promise<void> {
    if (!this.isEnabled) return

    try {
      const metadata = await this.getRequestMetadata()
      
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          details: data.details || {},
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          success: data.success ?? true,
          errorMessage: data.errorMessage,
          riskLevel: data.riskLevel || 'LOW',
          flags: data.flags || [],
        },
      })

      // Log high-risk events to console immediately
      if (data.riskLevel === 'CRITICAL' || data.riskLevel === 'HIGH') {
        console.warn(`HIGH-RISK AUDIT EVENT: ${data.action}`, {
          userId: data.userId,
          resource: data.resource,
          riskLevel: data.riskLevel,
          flags: data.flags,
        })
      }
    } catch (error) {
      console.error('Failed to log audit event:', error)
      // Don't throw - audit logging shouldn't break the main flow
    }
  }

  // Log security event
  async logSecurityEvent(data: SecurityEventData): Promise<void> {
    if (!this.isEnabled) return

    try {
      await prisma.securityEvent.create({
        data: {
          type: data.type,
          severity: data.severity,
          source: data.source,
          description: data.description,
          details: data.details || {},
        },
      })

      // Immediate console logging for critical security events
      if (data.severity === 'CRITICAL' || data.severity === 'HIGH') {
        console.error(`SECURITY EVENT: ${data.type}`, {
          severity: data.severity,
          source: data.source,
          description: data.description,
        })

        // TODO: Send alert to administrators
        // await this.sendSecurityAlert(data)
      }
    } catch (error) {
      console.error('Failed to log security event:', error)
    }
  }

  // Log user authentication events
  async logAuth(userId: string, action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED', details?: Record<string, any>): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'authentication',
      details,
      riskLevel: action === 'LOGIN_FAILED' ? 'MEDIUM' : 'LOW',
    })

    // Check for multiple failed logins
    if (action === 'LOGIN_FAILED') {
      await this.checkForBruteForce(userId)
    }
  }

  // Log trade operations
  async logTrade(userId: string, action: 'CREATE_TRADE' | 'UPDATE_TRADE' | 'DELETE_TRADE', tradeId?: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'trade',
      resourceId: tradeId,
      details,
      riskLevel: action === 'DELETE_TRADE' ? 'MEDIUM' : 'LOW',
    })
  }

  // Log bulk operations
  async logBulkOperation(userId: string, action: string, count: number, details?: Record<string, any>): Promise<void> {
    await this.log({
      userId,
      action: action as AuditAction,
      resource: 'bulk_operation',
      details: { count, ...details },
      riskLevel: count > 100 ? 'HIGH' : count > 10 ? 'MEDIUM' : 'LOW',
    })
  }

  // Log file operations
  async logFileOperation(userId: string, action: 'UPLOAD_FILE' | 'DOWNLOAD_FILE', filename: string, fileSize?: number): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'file',
      details: { filename, fileSize },
      riskLevel: fileSize && fileSize > 50 * 1024 * 1024 ? 'MEDIUM' : 'LOW', // 50MB
    })
  }

  // Log security violations
  async logSecurityViolation(source: string, violation: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      action: 'SECURITY_VIOLATION',
      resource: 'security',
      details: { violation, ...details },
      riskLevel: 'HIGH',
      flags: ['SECURITY_VIOLATION'],
    })

    await this.logSecurityEvent({
      type: violation.includes('XSS') ? 'XSS_ATTEMPT' : 
            violation.includes('SQL') ? 'SQL_INJECTION_ATTEMPT' : 
            'SUSPICIOUS_ACTIVITY',
      severity: 'HIGH',
      source,
      description: `Security violation detected: ${violation}`,
      details,
    })
  }

  // Check for brute force attacks
  private async checkForBruteForce(userId: string): Promise<void> {
    try {
      const recentFailures = await prisma.auditLog.count({
        where: {
          userId,
          action: 'LOGIN_FAILED',
          timestamp: {
            gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
          },
        },
      })

      if (recentFailures >= 5) {
        await this.logSecurityEvent({
          type: 'BRUTE_FORCE_ATTEMPT',
          severity: 'HIGH',
          source: userId,
          description: `Multiple failed login attempts detected: ${recentFailures} attempts in 15 minutes`,
          details: { attemptCount: recentFailures },
        })
      }
    } catch (error) {
      console.error('Failed to check for brute force:', error)
    }
  }

  // Get audit logs for user
  async getUserAuditLogs(userId: string, limit: number = 50): Promise<any[]> {
    try {
      return await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        select: {
          id: true,
          action: true,
          resource: true,
          timestamp: true,
          success: true,
          ipAddress: true,
          riskLevel: true,
        },
      })
    } catch (error) {
      console.error('Failed to get user audit logs:', error)
      return []
    }
  }

  // Get security events
  async getSecurityEvents(limit: number = 50): Promise<any[]> {
    try {
      return await prisma.securityEvent.findMany({
        where: { resolved: false },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    } catch (error) {
      console.error('Failed to get security events:', error)
      return []
    }
  }

  // Mark security event as resolved
  async resolveSecurityEvent(eventId: string, resolvedBy: string): Promise<void> {
    try {
      await prisma.securityEvent.update({
        where: { id: eventId },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy,
        },
      })
    } catch (error) {
      console.error('Failed to resolve security event:', error)
    }
  }

  // Get audit statistics
  async getAuditStats(userId?: string): Promise<{
    totalEvents: number
    recentEvents: number
    securityEvents: number
    riskDistribution: Record<RiskLevel, number>
  }> {
    try {
      const where = userId ? { userId } : {}
      const recentWhere = {
        ...where,
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }

      const [totalEvents, recentEvents, securityEvents, riskCounts] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.count({ where: recentWhere }),
        prisma.securityEvent.count({ where: { resolved: false } }),
        prisma.auditLog.groupBy({
          by: ['riskLevel'],
          where,
          _count: true,
        }),
      ])

      const riskDistribution: Record<RiskLevel, number> = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      }

      riskCounts.forEach(item => {
        riskDistribution[item.riskLevel as RiskLevel] = item._count
      })

      return {
        totalEvents,
        recentEvents,
        securityEvents,
        riskDistribution,
      }
    } catch (error) {
      console.error('Failed to get audit stats:', error)
      return {
        totalEvents: 0,
        recentEvents: 0,
        securityEvents: 0,
        riskDistribution: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      }
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance()

// Convenience functions
export async function logAuth(userId: string, action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED', details?: Record<string, any>) {
  return auditLogger.logAuth(userId, action, details)
}

export async function logTrade(userId: string, action: 'CREATE_TRADE' | 'UPDATE_TRADE' | 'DELETE_TRADE', tradeId?: string, details?: Record<string, any>) {
  return auditLogger.logTrade(userId, action, tradeId, details)
}

export async function logSecurityViolation(source: string, violation: string, details?: Record<string, any>) {
  return auditLogger.logSecurityViolation(source, violation, details)
}

export async function logFileOperation(userId: string, action: 'UPLOAD_FILE' | 'DOWNLOAD_FILE', filename: string, fileSize?: number) {
  return auditLogger.logFileOperation(userId, action, filename, fileSize)
}
