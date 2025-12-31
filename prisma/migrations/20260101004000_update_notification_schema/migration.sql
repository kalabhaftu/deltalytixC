-- CreateEnum for NotificationPriority if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationPriority') THEN
        CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
    END IF;
END$$;

-- AlterTable Notification
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "actionRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex for actionRequired
CREATE INDEX IF NOT EXISTS "Notification_userId_actionRequired_idx" ON "Notification"("userId", "actionRequired");

-- Add new values to NotificationType Enum (safe method)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RISK_DAILY_LOSS_80';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RISK_DAILY_LOSS_95';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RISK_MAX_DRAWDOWN_80';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RISK_MAX_DRAWDOWN_95';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'IMPORT_PROCESSING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'IMPORT_COMPLETE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'STRATEGY_SESSION_VIOLATION';
