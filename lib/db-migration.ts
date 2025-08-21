'use server'

import { prisma } from '@/lib/prisma'

// Simple migration check and execution
export async function ensureDatabaseSchema() {
  try {
    // Test if we can connect to the database
    await prisma.$queryRaw`SELECT 1`
    
    // Check if the imageBase64Third column exists
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Trade' 
      AND column_name IN ('imageBase64Third', 'imageBase64Fourth')
    ` as any[]

    // If columns don't exist, add them
    if (result.length < 2) {
      console.log('[DB Migration] Adding missing image columns...')
      
      try {
              await prisma.$executeRaw`ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "imageBase64Third" TEXT`
      await prisma.$executeRaw`ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "imageBase64Fourth" TEXT`
        console.log('[DB Migration] Successfully added image columns')
      } catch (alterError) {
        console.warn('[DB Migration] Failed to add columns, but continuing:', alterError)
      }
    }

    // Check and add audit tables if they don't exist
    await ensureAuditTables()
    
    return { success: true }
  } catch (error) {
    console.warn('[DB Migration] Database not accessible or migration failed:', error)
    return { success: false, error }
  }
}

async function ensureAuditTables() {
  try {
    // Check if AuditLog table exists
    const auditTableExists = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'AuditLog'
    ` as any[]

    if (auditTableExists.length === 0) {
      console.log('[DB Migration] Creating AuditLog table...')
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "AuditLog" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" TEXT,
          "action" TEXT NOT NULL,
          "resource" TEXT,
          "resourceId" TEXT,
          "details" JSONB,
          "ipAddress" TEXT,
          "userAgent" TEXT,
          "success" BOOLEAN DEFAULT true,
          "errorMessage" TEXT,
          "timestamp" TIMESTAMP DEFAULT now(),
          "riskLevel" TEXT DEFAULT 'LOW',
          "flags" TEXT[] DEFAULT '{}'
        );
      `
      
      // Add indexes one by one
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AuditLog_riskLevel_idx" ON "AuditLog"("riskLevel")`
    }

    // Check if SecurityEvent table exists
    const securityTableExists = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'SecurityEvent'
    ` as any[]

    if (securityTableExists.length === 0) {
      console.log('[DB Migration] Creating SecurityEvent table...')
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SecurityEvent" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "type" TEXT NOT NULL,
          "severity" TEXT NOT NULL,
          "source" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "details" JSONB,
          "resolved" BOOLEAN DEFAULT false,
          "resolvedAt" TIMESTAMP,
          "resolvedBy" TEXT,
          "createdAt" TIMESTAMP DEFAULT now()
        );
      `
      
      // Add indexes one by one
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SecurityEvent_type_idx" ON "SecurityEvent"("type")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SecurityEvent_severity_idx" ON "SecurityEvent"("severity")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SecurityEvent_source_idx" ON "SecurityEvent"("source")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SecurityEvent_resolved_idx" ON "SecurityEvent"("resolved")`
    }

    // Check and add 2FA columns to User table
    const userColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name IN ('twoFactorSecret', 'twoFactorEnabled', 'lastLoginAt', 'loginAttempts', 'lockedUntil')
    ` as any[]

    if (userColumns.length < 5) {
      console.log('[DB Migration] Adding 2FA columns to User table...')
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT`
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN DEFAULT false`
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP`
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "loginAttempts" INTEGER DEFAULT 0`
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP`
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'UTC'`
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "theme" TEXT DEFAULT 'system'`
    }

    console.log('[DB Migration] Audit tables ensured')
  } catch (error) {
    console.warn('[DB Migration] Failed to ensure audit tables:', error)
  }
}

// Run migrations on app startup
export async function runStartupMigrations() {
  console.log('[Startup] Running database migrations...')
  const result = await ensureDatabaseSchema()
  
  if (result.success) {
    console.log('[Startup] Database migrations completed successfully')
  } else {
    console.warn('[Startup] Database migrations failed, app will run with limited functionality')
  }
  
  return result
}
