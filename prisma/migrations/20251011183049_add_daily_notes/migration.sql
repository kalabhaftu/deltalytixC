-- CreateTable
CREATE TABLE "public"."DailyNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyNote_userId_idx" ON "public"."DailyNote"("userId");

-- CreateIndex
CREATE INDEX "DailyNote_date_idx" ON "public"."DailyNote"("date");

-- CreateIndex
CREATE INDEX "DailyNote_userId_date_idx" ON "public"."DailyNote"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyNote_userId_date_key" ON "public"."DailyNote"("userId", "date");

-- AddForeignKey
ALTER TABLE "public"."DailyNote" ADD CONSTRAINT "DailyNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
