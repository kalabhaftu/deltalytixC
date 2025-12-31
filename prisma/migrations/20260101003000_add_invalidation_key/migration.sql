-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "invalidationKey" TEXT;

-- CreateIndex
CREATE INDEX "Notification_userId_invalidationKey_idx" ON "Notification"("userId", "invalidationKey");
