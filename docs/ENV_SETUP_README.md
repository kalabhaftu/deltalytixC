# 🔐 Environment Variables Setup - Complete Guide

Welcome! This guide will help you set up all the necessary API keys and environment variables for Deltalytix.

---

## 🎯 Quick Start (5 Minutes)

### Step 1: Create your .env.local file

```bash
cp env.example .env.local
```

### Step 2: Get Your API Keys

You'll need accounts and API keys from these services:

#### ✅ Required (Must have):
1. **PostgreSQL Database** - Choose one:
   - [Supabase](https://supabase.com) ⭐ Recommended
   - [Neon](https://neon.tech)
   - [Railway](https://railway.app)

2. **Supabase** - For authentication & storage
   - [Sign up](https://supabase.com/dashboard)

3. **XAI** - For AI-powered CSV mapping
   - [Get API key](https://console.x.ai/)

#### ⚡ Optional (Highly Recommended):
4. **Upstash/Vercel KV** - For caching
   - [Upstash](https://console.upstash.com/redis)
   - [Vercel KV](https://vercel.com/storage/kv)

#### 🎯 Optional (Feature-specific):
5. **Tradovate** - Only if using Tradovate imports
   - [Tradovate](https://trader.tradovate.com/)

### Step 3: Fill in .env.local

Open `.env.local` in your text editor and fill in the API keys you got from Step 2.

**Minimum required:**
```bash
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbG..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbG..."
XAI_API_KEY="xai-..."
```

### Step 4: Initialize the project

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### Step 5: Test it works

Open http://localhost:3000 and try:
- ✅ Sign up with email
- ✅ Import a CSV file
- ✅ Create an account

---

## 📚 Detailed Setup Instructions

### 1. 🗄️ PostgreSQL Database Setup

**Option A: Supabase (Easiest - Recommended)**

1. Go to https://supabase.com/dashboard
2. Click "New project"
3. Choose organization and create project
4. Wait for database to initialize (~2 minutes)
5. Go to **Settings** > **Database**
6. Scroll to "Connection string"
7. Copy **Connection pooling** string → This is your `DATABASE_URL`
8. Copy **Direct connection** string → This is your `DIRECT_URL`

**Your .env.local should look like:**
```bash
DATABASE_URL="postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-us-east-1.compute.amazonaws.com:5432/postgres"
```

**Option B: Neon**

1. Go to https://neon.tech
2. Sign up and create project
3. Copy the connection string
4. Use the same string for both `DATABASE_URL` and `DIRECT_URL`

**Option C: Local PostgreSQL**

```bash
# Install PostgreSQL locally
# Mac: brew install postgresql
# Ubuntu: sudo apt install postgresql
# Windows: Download from postgresql.org

# Create database
createdb deltalytix

# Use this in .env.local:
DATABASE_URL="postgresql://localhost:5432/deltalytix?schema=public"
DIRECT_URL="postgresql://localhost:5432/deltalytix?schema=public"
```

---

### 2. 🔐 Supabase Authentication Setup

**Part A: Get API Keys**

1. Go to https://supabase.com/dashboard
2. Select your project (or use the same one you created for database)
3. Go to **Settings** > **API**
4. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

**Your .env.local should have:**
```bash
NEXT_PUBLIC_SUPABASE_URL="https://abcdefghijk.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6InNlcnZpY2Vfc..."
```

⚠️ **Important**: `SUPABASE_SERVICE_ROLE_KEY` has admin privileges. Never expose it in client-side code or commit it to version control!

**Part B: Configure Authentication Providers**

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. **Email** provider:
   - Enable it
   - Toggle "Confirm email" ON for production
   - Toggle "Confirm email" OFF for development (easier testing)

3. **Google OAuth** (Optional):
   - Enable Google provider in Supabase
   - Get credentials from [Google Cloud Console](https://console.cloud.google.com/):
     - Create OAuth 2.0 credentials
     - Authorized redirect URI: `https://[YOUR-PROJECT].supabase.co/auth/v1/callback`
   - Paste Client ID and Secret in Supabase dashboard
   - ⚠️ **Note**: OAuth is configured entirely in Supabase dashboard - no environment variables needed in your app

4. **Discord OAuth** (Optional):
   - Enable Discord provider in Supabase
   - Get credentials from [Discord Developer Portal](https://discord.com/developers/applications):
     - Create new application
     - Add redirect: `https://[YOUR-PROJECT].supabase.co/auth/v1/callback`
   - Paste Client ID and Secret in Supabase dashboard
   - ⚠️ **Note**: OAuth is configured entirely in Supabase dashboard - no environment variables needed in your app

**Part C: Configure Redirect URLs**

1. Go to **Authentication** > **URL Configuration**
2. Add your site URLs:
   - **Site URL**: `http://localhost:3000` (dev) or `https://yourdomain.com` (prod)
   - **Redirect URLs**:
     - `http://localhost:3000/api/auth/callback`
     - `https://yourdomain.com/api/auth/callback` (add this when deploying)

---

### 3. 🤖 XAI (Grok) API Setup

**What it's used for:** Intelligently maps CSV columns to database fields when importing trades.

**Setup:**
1. Go to https://console.x.ai/
2. Sign in with X/Twitter account
3. Click "API Keys" in sidebar
4. Click "Create New Key"
5. Name it (e.g., "Deltalytix")
6. Copy the API key → `XAI_API_KEY`

**Your .env.local should have:**
```bash
XAI_API_KEY="xai-9k3jF8sL2mQ5pN7rT1vY4wX6zC0bD8hG"
XAI_BASE_URL="https://api.x.ai/v1"
XAI_MODEL="grok-3"
```

**Cost:** Check current pricing at https://x.ai/api

**Alternative (requires code changes):**
- OpenAI GPT-4: https://platform.openai.com/
- Anthropic Claude: https://console.anthropic.com/

---

### 4. ⚡ Redis Cache Setup (Optional but Recommended)

**What it's used for:** Speeds up the app by caching frequently accessed data (dashboard stats, account lists, etc.)

**Without cache:** App works fine, but slower on repeated requests.

**With cache:** 5-10x faster response times for cached data.

**Option A: Vercel KV (Easiest if deploying to Vercel)**

1. Deploy your project to Vercel first
2. Go to Vercel Dashboard > Your Project
3. Click **Storage** tab
4. Click **Create Database**
5. Select **KV** (Redis)
6. Click **Create**
7. Vercel automatically adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` to your project ✨

**Option B: Upstash (Works anywhere)**

1. Go to https://console.upstash.com/redis
2. Sign up or log in
3. Click "Create Database"
4. Choose a name (e.g., "deltalytix-cache")
5. Select region closest to your users
6. Click "Create"
7. In the database page, click **REST API** tab
8. Copy:
   - **UPSTASH_REDIS_REST_URL** → `KV_REST_API_URL`
   - **UPSTASH_REDIS_REST_TOKEN** → `KV_REST_API_TOKEN`

**Your .env.local should have:**
```bash
KV_REST_API_URL="https://guiding-sunfish-12345.upstash.io"
KV_REST_API_TOKEN="AYQgASQgNzY3NzAwMGMt...longtoken..."
```

**Free Tier:** 10,000 commands per day (plenty for small-medium projects)

---

### 5. 📊 Tradovate API Setup (Optional)

**Only needed if:** You want to import trades directly from Tradovate platform.

**If you're not using Tradovate:** Skip this section entirely.

**Setup:**
1. Log in to https://trader.tradovate.com/
2. Go to **Settings** (gear icon)
3. Go to **API** section
4. Click **Request API Access** (if first time)
5. Once approved, create new application:
   - Application Name: "Deltalytix"
   - Click **Create**
6. Save the credentials:
   - **Client ID** → `TRADOVATE_CID`
   - **Client Secret** → `TRADOVATE_SECRET`
7. Also save:
   - Your username → `TRADOVATE_USERNAME`
   - Your password → `TRADOVATE_PASSWORD`

**Your .env.local should have:**
```bash
TRADOVATE_USERNAME="your_username"
TRADOVATE_PASSWORD="your_password"
TRADOVATE_CID="12345"
TRADOVATE_SECRET="abc123xyz789"
```

---

## 🎨 Complete .env.local Examples

### For Local Development (Minimum)

```bash
# Database (using Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.xxx:pass@aws.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:pass@aws.compute.amazonaws.com:5432/postgres"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# AI
XAI_API_KEY="xai-abc123"
XAI_BASE_URL="https://api.x.ai/v1"
XAI_MODEL="grok-3"

# App Config
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NODE_ENV="development"
```

### For Local Development (Full Featured)

```bash
# Database
DATABASE_URL="postgresql://postgres.xxx:pass@aws.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:pass@aws.compute.amazonaws.com:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# AI
XAI_API_KEY="xai-abc123"
XAI_BASE_URL="https://api.x.ai/v1"
XAI_MODEL="grok-3"

# Redis Cache (Upstash)
KV_REST_API_URL="https://xxx.upstash.io"
KV_REST_API_TOKEN="AYQgASQgNzY3..."

# Tradovate (optional)
TRADOVATE_USERNAME="myusername"
TRADOVATE_PASSWORD="mypassword"
TRADOVATE_CID="12345"
TRADOVATE_SECRET="secret123"

# App Config
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NODE_ENV="development"
```

### For Production (Vercel)

```bash
# Database (pooled connection for serverless)
DATABASE_URL="postgresql://postgres.xxx:pass@aws.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:pass@aws.compute.amazonaws.com:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# AI
XAI_API_KEY="xai-abc123"
XAI_BASE_URL="https://api.x.ai/v1"
XAI_MODEL="grok-3"

# Vercel KV (auto-populated by Vercel)
KV_REST_API_URL="https://xxx.kv.vercel-storage.com"
KV_REST_API_TOKEN="AYQgASQgNzY3..."

# App Config
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
NODE_ENV="production"
```

---

## ✅ Verification & Testing

### 1. Check your .env.local file

```bash
# Make sure file exists
ls -la .env.local

# Check it's not empty (on Linux/Mac)
cat .env.local

# Windows
type .env.local
```

### 2. Test database connection

```bash
npx prisma generate
npx prisma db push
```

**Expected output:**
```
✔ Generated Prisma Client
Your database is now in sync with your schema
```

### 3. Start development server

```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 15.2.4
- Local:        http://localhost:3000
✓ Ready in 2.5s
```

### 4. Test authentication

1. Open http://localhost:3000
2. Click "Sign Up" or "Sign In"
3. Enter your email
4. Check your email for OTP code
5. Enter code to complete signup

**✅ If this works:** Supabase is configured correctly!

### 5. Test CSV import with AI

1. Log in to the app
2. Go to Import page
3. Upload a CSV file with trades
4. Check if columns are automatically mapped

**✅ If columns auto-map:** XAI API is working!

### 6. Test cache (optional)

Check your terminal logs while using the app. You should see:
```
Redis cache get failed: (if not configured)
# OR
✓ Cache hit for dashboard:stats:...  (if configured)
```

---

## 🐛 Troubleshooting

### Error: "Can't reach database server"

**Cause:** Database connection string is wrong or database is not running.

**Fix:**
1. Check `DATABASE_URL` is correct
2. Make sure no trailing spaces
3. Try pinging the database host
4. Check firewall settings
5. For Supabase: Make sure project is not paused

### Error: "Supabase configuration is incomplete"

**Cause:** Supabase environment variables are wrong or missing.

**Fix:**
1. Double-check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Make sure they're exactly as shown in Supabase dashboard
3. No trailing spaces or quotes
4. Make sure variables start with `NEXT_PUBLIC_` (required for client-side use)

### Error: "Failed to generate mappings"

**Cause:** XAI API key is wrong or has no credits.

**Fix:**
1. Check `XAI_API_KEY` is correct
2. Log in to https://console.x.ai/ and check:
   - API key is valid
   - You have credits/quota remaining
3. Try generating a new API key

### Error: "Token expired" or "Invalid token"

**Cause:** Old authentication session or cookie issue.

**Fix:**
1. Clear browser cookies for localhost:3000
2. Sign out and sign in again
3. Check Supabase dashboard > Authentication > Users to see if user exists

### Cache warnings but app still works

**This is normal!** Cache is optional. If you see:
```
Redis cache get failed
```

The app works fine without cache, just a bit slower. To enable cache, set up Upstash/Vercel KV.

---

## 🚀 Next Steps After Setup

1. ✅ **Verify** all features work:
   - Authentication (sign up/sign in)
   - CSV import with AI mapping
   - Creating accounts and trades
   - Dashboard loads correctly

2. 📱 **Configure OAuth** (optional):
   - Set up Google login in Supabase dashboard
   - Set up Discord login in Supabase dashboard

3. ⚡ **Add Redis cache** (optional but recommended):
   - Speeds up the app significantly
   - Easy to add later

4. 🌐 **Deploy to production**:
   - Push code to GitHub
   - Deploy to Vercel
   - Add production environment variables in Vercel dashboard
   - Update Supabase redirect URLs

5. 🔒 **Security hardening**:
   - Enable email confirmation in Supabase (production)
   - Review API permissions
   - Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code

---

## 📞 Need More Help?

- 📖 **Quick Reference**: `API_KEYS_QUICK_REFERENCE.md`
- 📦 **Main README**: `../README.md`

---

**You're all set!** 🎉

Run `npm run dev` and start using Deltalytix!
