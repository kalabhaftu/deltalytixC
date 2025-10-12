-- CreateEnum
CREATE TYPE "public"."MasterAccountStatus" AS ENUM ('active', 'funded', 'failed');

-- AlterTable
ALTER TABLE "public"."MasterAccount" ADD COLUMN     "status" "public"."MasterAccountStatus" NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "MasterAccount_status_idx" ON "public"."MasterAccount"("status");

-- CreateIndex
CREATE INDEX "MasterAccount_userId_status_idx" ON "public"."MasterAccount"("userId", "status");
