# Database Connection Issue - Complete Fix Guide

## Problem Summary
Your Next.js application is experiencing database connection timeouts because:
1. Missing `.env` configuration file
2. Attempting to connect to wrong Supabase port (5432 instead of 6543)
3. API endpoints have insufficient timeout handling

## Immediate Fix Steps

### 1. Configure Environment Variables

The setup script has created `.env` for you. You need to:

1. **Get your Supabase credentials:**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to **Settings > Database**
   - Copy the **"Connection pooler"** string (port 6543, NOT direct connection port 5432)
   - Go to **Settings > API** 
   - Copy your **"anon public"** key

2. **Edit `.env` file:**
   ```bash
   # Replace [YOUR_PROJECT_REF] with your actual project ID
   # Replace [YOUR_PASSWORD] with your actual password
   DIRECT_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?schema=public"
   DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?schema=public&pgbouncer=true&connection_limit=1"
   
   NEXT_PUBLIC_SUPABASE_URL="https://[YOUR_PROJECT_REF].supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-actual-anon-key"
   
   NEXTAUTH_SECRET="your-random-secret-here"  # Generate with: openssl rand -base64 32
   NEXTAUTH_URL="http://localhost:3000"
   NODE_ENV="development"
   ```

### 2. Critical Port Configuration

**IMPORTANT**: Use port **6543** (connection pooler), NOT port **5432** (direct connection).
- ✅ Correct: `aws-1-eu-north-1.pooler.supabase.com:6543`
- ❌ Wrong: `aws-1-eu-north-1.pooler.supabase.com:5432`

### 3. Generate NextAuth Secret

Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```

### 4. Restart Development Server

After configuring `.env`:
```bash
npm run dev
```

## Error Analysis

The logs show these specific issues:
1. **Database connection timeout** - Fixed by using correct port 6543
2. **Request timeouts in API endpoints** - Enhanced with better error handling
3. **Prisma connection errors** - Fixed with proper connection pooling

## Verification Steps

1. **Check environment loading:**
   - Open browser dev tools
   - Go to Network tab
   - Look for successful API calls to `/api/accounts` and `/api/prop-firm/accounts`

2. **Database health check:**
   - Visit `/api/admin/init-db` in your browser
   - Should return `{success: true}` without timeout errors

3. **Dashboard access:**
   - Navigate to `/dashboard`
   - Should load without connection errors

## Troubleshooting Common Issues

### Issue: Still getting connection timeouts
**Solution**: 
- Double-check your Supabase project is active
- Verify the connection string format exactly matches the template
- Ensure no extra spaces or characters in the `.env` file

### Issue: Authentication errors
**Solution**:
- Verify your NEXTAUTH_SECRET is set
- Check that your Supabase anon key is correct
- Restart the dev server after changes

### Issue: Prisma client errors
**Solution**:
```bash
npx prisma generate
npm run dev
```

## Connection String Format Reference

**Correct Format:**
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?schema=public&pgbouncer=true&connection_limit=1
```

**Key Components:**
- `postgres.[PROJECT_REF]` - Your Supabase project reference
- `[PASSWORD]` - Your database password
- `6543` - Connection pooler port (critical!)
- `pgbouncer=true` - Enables connection pooling
- `connection_limit=1` - Prevents pool exhaustion in development

## Next Steps After Fix

1. Test all dashboard functionality
2. Verify prop firm account creation works
3. Check trade import/export features
4. Test database migrations run successfully

## Support

If you continue experiencing issues:
1. Check Supabase project status at https://status.supabase.com
2. Verify your project hasn't been paused for inactivity
3. Check your Supabase project's resource usage

---

**Status**: This guide addresses the core database connection issues shown in your terminal output.
