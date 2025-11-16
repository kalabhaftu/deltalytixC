-- AlterTable
ALTER TABLE "public"."Account" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."MasterAccount" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Account_userId_isArchived_idx" ON "public"."Account"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "MasterAccount_userId_isArchived_idx" ON "public"."MasterAccount"("userId", "isArchived");

