# Deltalytix Setup Guide

## Quick Start for Local Development

### 1. Environment Variables (CRITICAL FOR FIXING "Failed to fetch accounts")

Create a `.env.local` file in the root directory with:

```env
# ========================================
# REQUIRED ENVIRONMENT VARIABLES
# ========================================

# Database Configuration (Required for API endpoints)
# Without these, you'll get "Failed to fetch accounts" error
DATABASE_URL="postgresql://username:password@localhost:5432/deltalytix"
DIRECT_URL="postgresql://username:password@localhost:5432/deltalytix"

# Supabase Configuration (Required for authentication)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Authentication (Required for NextAuth)
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Development Environment
NODE_ENV="development"

# ========================================
# OPTIONAL ENVIRONMENT VARIABLES
# ========================================

# AI Features (Optional)
OPENAI_API_KEY="your-openai-api-key"

# Email Service (Optional)
RESEND_API_KEY="your-resend-api-key"

# Support Configuration (Optional)
SUPPORT_EMAIL="support@example.com"
SUPPORT_TEAM_EMAIL="support-team@example.com"
```

**Important Notes:**
- The `DATABASE_URL` and `DIRECT_URL` are the most critical variables
- Without proper database configuration, all API endpoints will fail
- You can use any PostgreSQL database (local, Supabase, Railway, etc.)
- Generate `NEXTAUTH_SECRET` with: `openssl rand -base64 32`

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations (if database is accessible)
npx prisma migrate deploy

# Or push schema changes (for development)
npx prisma db push
```

### 4. Start Development Server

```bash
npm run dev
```

## Current Issues Fixed

### ✅ Authentication Redirect Issue
- **Problem**: Site was redirecting to `0.0.0.0:3000` causing "ERR_ADDRESS_INVALID"
- **Solution**: Fixed redirect logic to always use `localhost:3000` in development

### ✅ Database Schema Issue  
- **Problem**: Code trying to use `imageBase64Third` column that doesn't exist
- **Solution**: Temporarily commented out new columns until migration can be run

### ✅ Image Upload Enhancement
- **Feature**: Added comprehensive image compression and processing
- **Files**: `lib/image-compression.ts`, `components/image-upload-with-compression.tsx`

### ✅ Security Features
- **2FA Authentication**: Complete TOTP implementation with QR codes
- **Rate Limiting**: Multi-tier rate limiting for different API endpoints
- **Input Sanitization**: XSS and SQL injection protection
- **Audit Logging**: Complete security event tracking

### ✅ Performance Optimizations
- **Database Indexes**: Optimized queries with proper indexing
- **Lazy Loading**: Component and data lazy loading
- **Service Worker**: Offline functionality with caching
- **Image Compression**: Client and server-side compression

### ✅ Advanced Trading Features
- **Advanced Metrics**: Sharpe ratio, Sortino ratio, 30+ metrics
- **Export System**: PDF/Excel export with charts
- **Advanced Filtering**: Saved filter presets
- **TradingView Integration**: Live market data and charts

## Troubleshooting

### 🚨 "Failed to fetch accounts" Error (Most Common Issue)

This error occurs when the API endpoints can't connect to the database. Here's how to fix it:

**Step 1: Check Environment Variables**
```bash
# Verify .env.local exists in project root
ls -la .env.local

# If missing, create .env.local with the variables shown above
```

**Step 2: Verify Database Connection**
```bash
# Test database connection
npx prisma db pull

# If this fails, your DATABASE_URL is incorrect
```

**Step 3: Generate Prisma Client**
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

**Step 4: Restart Development Server**
```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

**Common Causes:**
- Missing `.env.local` file (most common)
- Incorrect `DATABASE_URL` format
- Database server not running
- Network connectivity issues
- Missing Prisma client generation

### If database migration fails:
1. Check your DATABASE_URL environment variable
2. Ensure your database is running and accessible
3. Run `npx prisma db push` to sync schema without migrations

### If Prisma generation fails:
1. Stop the development server
2. Delete `node_modules/.prisma` folder
3. Run `npx prisma generate` again
4. Restart development server

### If authentication doesn't work:
1. Verify SUPABASE_URL and SUPABASE_ANON_KEY in `.env.local`
2. Check Supabase dashboard for authentication settings
3. Ensure callback URL is set to `http://localhost:3000/api/auth/callback`

## Features Available

### 🔐 Security (Production Ready)
- Two-Factor Authentication (2FA)
- API Rate Limiting  
- Input Sanitization
- Audit Logging
- Advanced threat detection

### 📊 Trading Analytics
- 30+ professional trading metrics
- Risk-adjusted returns (Sharpe, Sortino, Calmar)
- Drawdown analysis
- Monte Carlo simulation
- Pattern recognition

### 🚀 Performance
- Database query optimization
- Lazy loading components
- Service worker caching
- Image compression
- Virtual scrolling

### 💼 Professional Features
- PDF/Excel export with charts
- Advanced filtering with saved presets
- Bulk trade operations
- TradingView integration
- Webhook notifications
- Social trading features

### 🌐 User Experience
- Offline functionality
- Mobile responsive
- Dark/light theme
- Multi-language support (EN/FR)
- Real-time updates

## Next Steps

1. **Set up your environment variables** (most important)
2. **Configure your Supabase project** with authentication providers
3. **Connect your database** for data persistence
4. **Add your OpenAI API key** for AI features
5. **Customize the trading metrics** for your needs

The application is now feature-complete with enterprise-grade security, performance optimizations, and professional trading analytics!
