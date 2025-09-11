'use server'

import { prisma } from '@/lib/prisma'

// Simple migration check and execution
export async function ensureDatabaseSchema() {
  try {
    // Test if we can connect to the database with extended timeout for migrations
    const healthCheck = Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 20000) // Extended timeout for migrations
      )
    ]);
    
    await healthCheck;
    
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
    
    // Check and add prop firm evaluation system tables if they don't exist
    await ensurePropFirmEvaluationTables()
    
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
          "flags" TEXT[] DEFAULT '{}',
          "accountId" TEXT,
          "entity" TEXT,
          "entityId" TEXT,
          "oldValues" JSONB,
          "newValues" JSONB,
          "metadata" JSONB DEFAULT '{}'
        );
      `
      
      // Add indexes one by one
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AuditLog_riskLevel_idx" ON "AuditLog"("riskLevel")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AuditLog_accountId_idx" ON "AuditLog"("accountId")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId")`
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

    // Check if AuditLog table needs additional columns for prop firm evaluation
    const auditLogColumns = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'AuditLog'
      AND column_name IN ('accountId', 'entity', 'entityId', 'oldValues', 'newValues', 'metadata')
    ` as any[]

    if (auditLogColumns.length < 6) {
      console.log('[DB Migration] Adding missing prop firm evaluation columns to AuditLog table...')
      try {
        await prisma.$executeRaw`ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "accountId" TEXT`
        await prisma.$executeRaw`ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "entity" TEXT`
        await prisma.$executeRaw`ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "entityId" TEXT`
        await prisma.$executeRaw`ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "oldValues" JSONB`
        await prisma.$executeRaw`ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "newValues" JSONB`
        await prisma.$executeRaw`ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'`
        
        // Add indexes for the new columns
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AuditLog_accountId_idx" ON "AuditLog"("accountId")`
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId")`
        
        console.log('[DB Migration] Successfully added prop firm evaluation columns to AuditLog table')
      } catch (alterError) {
        console.warn('[DB Migration] Failed to add columns to AuditLog table:', alterError)
      }
    }

    console.log('[DB Migration] Audit tables ensured')
  } catch (error) {
    console.warn('[DB Migration] Failed to ensure audit tables:', error)
  }
}

async function ensurePropFirmEvaluationTables() {
  try {
    // Check if AccountPhase table exists
    const accountPhaseTableExists = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'AccountPhase'
    ` as any[]

    if (accountPhaseTableExists.length === 0) {
      console.log('[DB Migration] Creating AccountPhase table and related tables...')
      
      // Create enums first (PostgreSQL doesn't support IF NOT EXISTS for types, so we need to check first)
      try {
        await prisma.$executeRaw`CREATE TYPE "AccountStatus" AS ENUM ('active', 'failed', 'passed', 'funded')`
      } catch (e) {
        // Type already exists, continue
      }
      try {
        await prisma.$executeRaw`CREATE TYPE "PhaseType" AS ENUM ('phase_1', 'phase_2', 'funded')`
      } catch (e) {
        // Type already exists, continue
      }
      try {
        await prisma.$executeRaw`CREATE TYPE "PhaseStatus" AS ENUM ('active', 'passed', 'failed')`
      } catch (e) {
        // Type already exists, continue
      }
      try {
        await prisma.$executeRaw`CREATE TYPE "DrawdownType" AS ENUM ('absolute', 'percent')`
      } catch (e) {
        // Type already exists, continue
      }
      try {
        await prisma.$executeRaw`CREATE TYPE "DrawdownMode" AS ENUM ('static', 'trailing')`
      } catch (e) {
        // Type already exists, continue
      }
      try {
        await prisma.$executeRaw`CREATE TYPE "EvaluationType" AS ENUM ('one_step', 'two_step')`
      } catch (e) {
        // Type already exists, continue
      }
      try {
        await prisma.$executeRaw`CREATE TYPE "BreachType" AS ENUM ('daily_drawdown', 'max_drawdown')`
      } catch (e) {
        // Type already exists, continue
      }
      
      // Add columns to Account table
      try {
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "name" TEXT`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "daily_drawdown_amount" DOUBLE PRECISION`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "daily_drawdown_type" "DrawdownType" DEFAULT 'percent'`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "max_drawdown_amount" DOUBLE PRECISION`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "max_drawdown_type" "DrawdownType" DEFAULT 'percent'`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "drawdown_mode_max" "DrawdownMode" DEFAULT 'static'`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "evaluation_type" "EvaluationType" DEFAULT 'two_step'`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'UTC'`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "daily_reset_time" TEXT DEFAULT '00:00'`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "status" "AccountStatus" DEFAULT 'active'`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "dd_include_open_pnl" BOOLEAN DEFAULT false`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "progression_include_open_pnl" BOOLEAN DEFAULT false`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "allow_manual_phase_override" BOOLEAN DEFAULT false`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "profit_split_percent" DOUBLE PRECISION DEFAULT 80`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "payout_cycle_days" INTEGER DEFAULT 14`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "min_days_to_first_payout" INTEGER DEFAULT 4`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "payout_eligibility_min_profit" DOUBLE PRECISION`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "reset_on_payout" BOOLEAN DEFAULT false`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "reduce_balance_by_payout" BOOLEAN DEFAULT true`
        await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "funded_reset_balance" DOUBLE PRECISION`
      } catch (alterError) {
        console.warn('[DB Migration] Some Account columns already exist or failed to add:', alterError)
      }
      
      // Create AccountPhase table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "AccountPhase" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "accountId" TEXT NOT NULL,
          "phaseType" "PhaseType" NOT NULL,
          "phaseStatus" "PhaseStatus" NOT NULL DEFAULT 'active',
          "profitTarget" DOUBLE PRECISION,
          "phaseStartAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "phaseEndAt" TIMESTAMP(3),
          "currentEquity" DOUBLE PRECISION DEFAULT 0,
          "currentBalance" DOUBLE PRECISION DEFAULT 0,
          "netProfitSincePhaseStart" DOUBLE PRECISION DEFAULT 0,
          "highestEquitySincePhaseStart" DOUBLE PRECISION DEFAULT 0,
          "totalTrades" INTEGER DEFAULT 0,
          "winningTrades" INTEGER DEFAULT 0,
          "totalCommission" DOUBLE PRECISION DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `
      
      // Add foreign key constraint for AccountPhase
      await prisma.$executeRaw`
        ALTER TABLE "AccountPhase"
        ADD CONSTRAINT "AccountPhase_accountId_fkey"
        FOREIGN KEY ("accountId")
        REFERENCES "Account"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
      `
      
      // Add columns to Trade table
      try {
        await prisma.$executeRaw`ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "phaseId" TEXT`
        await prisma.$executeRaw`ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "accountId" TEXT`
        await prisma.$executeRaw`ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "symbol" TEXT`
        await prisma.$executeRaw`ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "strategy" TEXT`
        await prisma.$executeRaw`ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "fees" DOUBLE PRECISION DEFAULT 0`
        await prisma.$executeRaw`ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "realizedPnl" DOUBLE PRECISION`
        await prisma.$executeRaw`ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "entryTime" TIMESTAMP(3)`
        await prisma.$executeRaw`ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "exitTime" TIMESTAMP(3)`
        await prisma.$executeRaw`ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "equityAtOpen" DOUBLE PRECISION`
        await prisma.$executeRaw`ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "equityAtClose" DOUBLE PRECISION`
        await prisma.$executeRaw`ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "rawBrokerId" TEXT`
      } catch (alterError) {
        console.warn('[DB Migration] Some Trade columns already exist or failed to add:', alterError)
      }
      
      // Add foreign key constraints for Trade
      try {
        await prisma.$executeRaw`
          ALTER TABLE "Trade"
          ADD CONSTRAINT "Trade_phaseId_fkey"
          FOREIGN KEY ("phaseId")
          REFERENCES "AccountPhase"("id")
          ON DELETE SET NULL
          ON UPDATE CASCADE
        `
        await prisma.$executeRaw`
          ALTER TABLE "Trade"
          ADD CONSTRAINT "Trade_accountId_fkey"
          FOREIGN KEY ("accountId")
          REFERENCES "Account"("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE
        `
      } catch (constraintError) {
        console.warn('[DB Migration] Trade constraints already exist or failed to add:', constraintError)
      }
      
      // Extend Payout table
      try {
        await prisma.$executeRaw`ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "amountRequested" DOUBLE PRECISION`
        await prisma.$executeRaw`ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "amountPaid" DOUBLE PRECISION`
        await prisma.$executeRaw`ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "requestedAt" TIMESTAMP(3)`
        await prisma.$executeRaw`ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3)`
        await prisma.$executeRaw`ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "notes" TEXT`
      } catch (alterError) {
        console.warn('[DB Migration] Some Payout columns already exist or failed to add:', alterError)
      }
      
      // Create Breach table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Breach" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "accountId" TEXT NOT NULL,
          "phaseId" TEXT,
          "breachType" "BreachType" NOT NULL,
          "breachAmount" DOUBLE PRECISION NOT NULL,
          "breachThreshold" DOUBLE PRECISION NOT NULL,
          "equity" DOUBLE PRECISION NOT NULL,
          "breachTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "description" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `
      
      // Add foreign key constraints for Breach
      try {
        await prisma.$executeRaw`
          ALTER TABLE "Breach"
          ADD CONSTRAINT "Breach_accountId_fkey"
          FOREIGN KEY ("accountId")
          REFERENCES "Account"("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE
        `
        await prisma.$executeRaw`
          ALTER TABLE "Breach"
          ADD CONSTRAINT "Breach_phaseId_fkey"
          FOREIGN KEY ("phaseId")
          REFERENCES "AccountPhase"("id")
          ON DELETE SET NULL
          ON UPDATE CASCADE
        `
      } catch (constraintError) {
        console.warn('[DB Migration] Breach constraints already exist or failed to add:', constraintError)
      }
      
      // Create DailyAnchor table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "DailyAnchor" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "accountId" TEXT NOT NULL,
          "date" DATE NOT NULL,
          "anchorEquity" DOUBLE PRECISION NOT NULL,
          "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `
      
      // Add foreign key constraint and unique constraint for DailyAnchor
      try {
        await prisma.$executeRaw`
          ALTER TABLE "DailyAnchor"
          ADD CONSTRAINT "DailyAnchor_accountId_fkey"
          FOREIGN KEY ("accountId")
          REFERENCES "Account"("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE
        `
        await prisma.$executeRaw`
          CREATE UNIQUE INDEX IF NOT EXISTS "DailyAnchor_accountId_date_key"
          ON "DailyAnchor"("accountId", "date")
        `
      } catch (constraintError) {
        console.warn('[DB Migration] DailyAnchor constraints already exist or failed to add:', constraintError)
      }
      
      // Create EquitySnapshot table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "EquitySnapshot" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "accountId" TEXT NOT NULL,
          "phaseId" TEXT,
          "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "equity" DOUBLE PRECISION NOT NULL,
          "balance" DOUBLE PRECISION NOT NULL,
          "openPnl" DOUBLE PRECISION DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `
      
      // Add foreign key constraints for EquitySnapshot
      try {
        await prisma.$executeRaw`
          ALTER TABLE "EquitySnapshot"
          ADD CONSTRAINT "EquitySnapshot_accountId_fkey"
          FOREIGN KEY ("accountId")
          REFERENCES "Account"("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE
        `
        await prisma.$executeRaw`
          ALTER TABLE "EquitySnapshot"
          ADD CONSTRAINT "EquitySnapshot_phaseId_fkey"
          FOREIGN KEY ("phaseId")
          REFERENCES "AccountPhase"("id")
          ON DELETE SET NULL
          ON UPDATE CASCADE
        `
      } catch (constraintError) {
        console.warn('[DB Migration] EquitySnapshot constraints already exist or failed to add:', constraintError)
      }
      
      // Create AccountTransition table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "AccountTransition" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "accountId" TEXT NOT NULL,
          "fromPhaseId" TEXT,
          "toPhaseId" TEXT,
          "fromStatus" "AccountStatus",
          "toStatus" "AccountStatus",
          "reason" TEXT,
          "triggeredBy" TEXT,
          "transitionTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "metadata" JSONB DEFAULT '{}'
        )
      `
      
      // Add foreign key constraints for AccountTransition
      try {
        await prisma.$executeRaw`
          ALTER TABLE "AccountTransition"
          ADD CONSTRAINT "AccountTransition_accountId_fkey"
          FOREIGN KEY ("accountId")
          REFERENCES "Account"("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE
        `
        await prisma.$executeRaw`
          ALTER TABLE "AccountTransition"
          ADD CONSTRAINT "AccountTransition_fromPhaseId_fkey"
          FOREIGN KEY ("fromPhaseId")
          REFERENCES "AccountPhase"("id")
          ON DELETE SET NULL
          ON UPDATE CASCADE
        `
        await prisma.$executeRaw`
          ALTER TABLE "AccountTransition"
          ADD CONSTRAINT "AccountTransition_toPhaseId_fkey"
          FOREIGN KEY ("toPhaseId")
          REFERENCES "AccountPhase"("id")
          ON DELETE SET NULL
          ON UPDATE CASCADE
        `
      } catch (constraintError) {
        console.warn('[DB Migration] AccountTransition constraints already exist or failed to add:', constraintError)
      }
      
      // Create indexes for performance
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AccountPhase_accountId_idx" ON "AccountPhase"("accountId")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AccountPhase_phaseType_idx" ON "AccountPhase"("phaseType")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AccountPhase_phaseStatus_idx" ON "AccountPhase"("phaseStatus")`
      
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Trade_phaseId_idx" ON "Trade"("phaseId")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Trade_accountId_idx" ON "Trade"("accountId")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Trade_entryTime_idx" ON "Trade"("entryTime")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Trade_symbol_idx" ON "Trade"("symbol")`
      
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Breach_accountId_idx" ON "Breach"("accountId")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Breach_phaseId_idx" ON "Breach"("phaseId")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Breach_breachTime_idx" ON "Breach"("breachTime")`
      
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "DailyAnchor_date_idx" ON "DailyAnchor"("date")`
      
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "EquitySnapshot_accountId_idx" ON "EquitySnapshot"("accountId")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "EquitySnapshot_phaseId_idx" ON "EquitySnapshot"("phaseId")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "EquitySnapshot_timestamp_idx" ON "EquitySnapshot"("timestamp")`
      
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AccountTransition_accountId_idx" ON "AccountTransition"("accountId")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AccountTransition_transitionTime_idx" ON "AccountTransition"("transitionTime")`
      
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Account_status_idx" ON "Account"("status")`
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Account_evaluation_type_idx" ON "Account"("evaluation_type")`
      
      console.log('[DB Migration] Prop firm evaluation system tables created successfully')
    }
  } catch (error) {
    console.warn('[DB Migration] Failed to ensure prop firm evaluation tables:', error)
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
