# Security Configuration Guide

This document outlines the security configurations that need to be applied in the Supabase Dashboard to resolve security warnings.

## 🚨 URGENT: Required Supabase Dashboard Configurations

### 1. Fix OTP Long Expiry Warning ⚠️

**Location:** Supabase Dashboard > Authentication > Settings > Auth

**Current Issue:** OTP expiry is set to more than 1 hour (SECURITY RISK)
**Required Fix:** Set OTP expiry to less than 1 hour

**Detailed Steps:**
1. Go to your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Settings** > **Auth**
4. Scroll down to **"Email OTP expiry"** setting
5. Change value from current setting to **1800** (30 minutes) or **900** (15 minutes)
6. Click **"Save"**

**Recommended Value:** 1800 seconds (30 minutes)
**Security Impact:** Reduces window for OTP interception attacks

### 2. Enable Leaked Password Protection ⚠️

**Location:** Supabase Dashboard > Authentication > Settings > Auth

**Current Issue:** Leaked password protection is disabled (SECURITY RISK)
**Required Fix:** Enable protection against compromised passwords

**Detailed Steps:**
1. In the same **Authentication** > **Settings** > **Auth** page
2. Find **"Password Settings"** section
3. Enable **"Leaked password protection"**
4. This will check passwords against HaveIBeenPwned.org database
5. Click **"Save"**

**Security Impact:** Prevents users from using passwords that have been compromised in data breaches

### 3. Verification Steps

After making these changes:
1. ✅ OTP expiry should show ≤ 3600 seconds (1 hour)
2. ✅ Leaked password protection should show as "Enabled"
3. ✅ Re-run Supabase Security Advisor to confirm warnings are cleared

**⚠️ Important:** These settings require manual configuration in the Supabase Dashboard and cannot be automated through code.

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
