# Security Configuration Guide

This document outlines the security configurations that need to be applied in the Supabase Dashboard to resolve security warnings.

## Required Supabase Dashboard Configurations

### 1. Fix OTP Long Expiry Warning

**Location:** Supabase Dashboard > Authentication > Settings > Email

**Current Issue:** OTP expiry is set to more than 1 hour
**Required Fix:** Set OTP expiry to less than 1 hour (recommended: 15-30 minutes)

**Steps:**
1. Go to Authentication > Settings
2. Find "Email OTP expiry" setting
3. Set value to 1800 (30 minutes) or 900 (15 minutes)
4. Click "Save"

### 2. Enable Leaked Password Protection

**Location:** Supabase Dashboard > Authentication > Settings > Password

**Current Issue:** Leaked password protection is disabled
**Required Fix:** Enable leaked password protection against HaveIBeenPwned database

**Steps:**
1. Go to Authentication > Settings
2. Find "Password Settings" section
3. Enable "Leaked password protection"
4. Click "Save"

## Database Performance Optimizations Applied

### RLS Policy Optimizations
- ✅ Fixed all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
- ✅ This prevents re-evaluation of auth functions for each row

### Index Optimizations
- ✅ Removed duplicate indexes (Account, Newsletter, TickDetails, Trade)
- ✅ Added missing foreign key indexes (Account.userId, Payout.accountId)
- ✅ Kept essential indexes for query performance

### Performance Monitoring
- Monitor query performance after applying these changes
- Consider removing unused indexes if they remain unused after monitoring
- Review and optimize queries that still perform poorly

## Migration Commands

To apply the database optimizations:

```bash
# Apply the SQL migrations directly to the database
psql $DATABASE_URL -f prisma/migrations/99999_optimize_rls_policies.sql
psql $DATABASE_URL -f prisma/migrations/99998_remove_duplicate_indexes.sql  
psql $DATABASE_URL -f prisma/migrations/99997_add_missing_fkey_indexes.sql

# Or use Prisma if you prefer
npx prisma db push
```

## Verification

After applying these changes:

1. Check Supabase Dashboard > Reports > Performance for RLS improvements
2. Verify in Dashboard > Database > Indexes that duplicates are removed
3. Monitor query performance in your application
4. Re-run Supabase advisor to confirm warnings are resolved
