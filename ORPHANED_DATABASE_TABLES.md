# Orphaned Database Tables Analysis

## Summary
Found **6 database tables** that exist in comments but may still be in the actual PostgreSQL database. These should be dropped.

---

## ❌ ORPHANED TABLES (Already removed from Prisma schema)

### 1. **`TickDetails`** ❌
- **Status:** Model removed from Prisma schema
- **Comment:** "tick details feature was fully deleted from application"
- **Related Code:** We deleted `server/tick-details.ts` and `store/tick-details-store.ts`
- **Database Table:** `TickDetails` table may still exist in PostgreSQL

### 2. **`Notification`** ❌
- **Status:** Model removed from Prisma schema
- **Comment:** "no notification functionality in application. Only referenced in account deletion cleanup (can use direct SQL if needed)"
- **Database Table:** `Notification` table may still exist in PostgreSQL

### 3. **`Shared`** ❌
- **Status:** Model removed from Prisma schema (we did this in Phase 2)
- **Comment:** "trade sharing feature not implemented, was incomplete/unused"
- **Related Code:** We deleted `server/shared.ts` and `lib/translations/en/shared.ts`
- **Database Table:** `Shared` table may still exist in PostgreSQL

### 4. **`Tag`** ❌
- **Status:** Model removed from Prisma schema
- **Comment:** "tags are stored as string array in Trade model, no separate Tag table used"
- **Current Implementation:** Tags stored in `Trade.tags String[]`
- **Database Table:** `Tag` table may still exist in PostgreSQL

### 5. **`Order`** ❌
- **Status:** Model removed from Prisma schema
- **Comment:** "orders are processed in-memory during IBKR import, not persisted to database"
- **Database Table:** `Order` table may still exist in PostgreSQL

### 6. **`TradeAnalytics`** ❌
- **Status:** Model removed from Prisma schema
- **Comment:** "MAE/MFE analytics not actively used, no database queries found"
- **Related Code:** We deleted `lib/databento.ts` (MAE/MFE feature)
- **Database Table:** `TradeAnalytics` table may still exist in PostgreSQL

### 7. **`HistoricalData`** ❌
- **Status:** Model removed from Prisma schema
- **Comment:** "no database queries found, historical data not persisted"
- **Database Table:** `HistoricalData` table may still exist in PostgreSQL

### 8. **`FilterPreset`** ❌
- **Status:** Model removed from Prisma schema
- **Comment:** "no database queries found, filter presets not implemented"
- **Database Table:** `FilterPreset` table may still exist in PostgreSQL

---

## 🔍 How to Check for Orphaned Tables

### Option 1: Check via Prisma Studio
```bash
npx prisma studio
```
Look for tables that don't exist in `schema.prisma`

### Option 2: Check via SQL Query
```sql
-- List all tables in the public schema
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Option 3: Check via Prisma Migration
Run `npx prisma db pull` to see what tables exist in the database vs schema.

---

## 🎯 Cleanup Strategy

### Step 1: Verify Orphaned Tables Exist
```bash
# Connect to your database and run:
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

### Step 2: Create Migration to Drop Tables
If any of these tables exist, create a migration:

```sql
-- Drop orphaned tables (ONLY if they exist)
DROP TABLE IF EXISTS "TickDetails";
DROP TABLE IF EXISTS "Notification";
DROP TABLE IF EXISTS "Shared";
DROP TABLE IF EXISTS "Tag";
DROP TABLE IF EXISTS "Order";
DROP TABLE IF EXISTS "TradeAnalytics";
DROP TABLE IF EXISTS "HistoricalData";
DROP TABLE IF EXISTS "FilterPreset";

-- Also check for any related junction tables or indexes
```

### Step 3: Run Migration
```bash
# Create custom migration file
npx prisma migrate dev --create-only --name drop_orphaned_tables

# Edit the migration file to add DROP TABLE statements
# Then run:
npx prisma migrate dev
```

---

## ⚠️ IMPORTANT WARNINGS

### Before Dropping Tables:
1. **Backup your database first!**
2. **Verify tables are truly unused** (check if they have any data)
3. **Check for foreign key constraints** that might reference these tables
4. **Run in staging environment first**

### Check for Data Before Dropping:
```sql
-- Check if tables have any rows
SELECT COUNT(*) FROM "TickDetails";
SELECT COUNT(*) FROM "Notification";
SELECT COUNT(*) FROM "Shared";
SELECT COUNT(*) FROM "Tag";
SELECT COUNT(*) FROM "Order";
SELECT COUNT(*) FROM "TradeAnalytics";
SELECT COUNT(*) FROM "HistoricalData";
SELECT COUNT(*) FROM "FilterPreset";
```

---

## 📊 Expected State After Cleanup

### Tables That SHOULD Exist:
1. ✅ `Trade` - Core trading data
2. ✅ `User` - User accounts
3. ✅ `Account` - Live trading accounts
4. ✅ `Group` - Account grouping
5. ✅ `MasterAccount` - Prop firm master accounts
6. ✅ `PhaseAccount` - Prop firm phase accounts
7. ✅ `Payout` - Payout tracking
8. ✅ `DailyAnchor` - Daily balance anchors
9. ✅ `BreachRecord` - Rule violation tracking
10. ✅ `DashboardTemplate` - Dashboard layouts
11. ✅ `_prisma_migrations` - Prisma migration history

### Tables That Should NOT Exist:
- ❌ `TickDetails`
- ❌ `Notification`
- ❌ `Shared`
- ❌ `Tag`
- ❌ `Order`
- ❌ `TradeAnalytics`
- ❌ `HistoricalData`
- ❌ `FilterPreset`

---

## 🚀 Recommended Action

1. **First:** Run a database backup
2. **Then:** Query your database to see which orphaned tables actually exist
3. **Finally:** Create a migration to drop only the tables that exist

**Command to check:**
```bash
# This will show you what's in the DB vs your schema
npx prisma db pull --print
```

This will show any tables in your database that aren't in your Prisma schema.

