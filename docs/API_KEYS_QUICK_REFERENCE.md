# 🔑 API Keys Quick Reference

Quick links to get all your API keys and credentials.

## ✅ Required Services

### 1. PostgreSQL Database
**Choose one provider:**

| Provider | Free Tier | Sign Up Link |
|----------|-----------|--------------|
| **Supabase** (Recommended) | 500MB, unlimited API requests | https://supabase.com/dashboard |
| **Neon** | 3GB storage, 100hr compute | https://neon.tech |
| **Railway** | $5 credit/month | https://railway.app |

**What to copy:**
- Connection string (pooled) → `DATABASE_URL`
- Connection string (direct) → `DIRECT_URL`

---

### 2. Supabase - Authentication & Storage
**Sign up**: https://supabase.com/dashboard

**Steps**:
1. Create or select project
2. Go to **Settings** > **API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Keep secret!

**Configure Auth Providers** (Settings > Authentication > Providers):
- ✅ Enable Email (recommended)
- ✅ Enable Google OAuth (optional) - Configure in Supabase dashboard only
- ✅ Enable Discord OAuth (optional) - Configure in Supabase dashboard only

**Set Redirect URLs** (Settings > Authentication > URL Configuration):
- Development: `http://localhost:3000/api/auth/callback`
- Production: `https://yourdomain.com/api/auth/callback`

---

### 3. XAI (Grok) - AI API
**Sign up**: https://console.x.ai/

**Steps**:
1. Log in with X/Twitter account
2. Go to **API Keys**
3. Click **Create New Key**
4. Copy the key → `XAI_API_KEY`

**Pricing**: Check current rates at https://x.ai/api

**Alternative AI Providers**:
- OpenAI: https://platform.openai.com/ (requires code changes)
- Anthropic: https://console.anthropic.com/ (requires code changes)

---

## ⚡ Optional Services (Recommended)

### 4. Upstash Redis - Caching
**Choose one:**

| Provider | Setup Difficulty | Sign Up Link |
|----------|------------------|--------------|
| **Vercel KV** (if deploying to Vercel) | Easy | https://vercel.com/storage/kv |
| **Upstash** (works anywhere) | Medium | https://console.upstash.com/redis |

**Vercel KV Steps**:
1. Deploy to Vercel
2. Dashboard > Storage > Create Database > KV
3. Environment variables auto-populated ✨

**Upstash Steps**:
1. Sign up at https://console.upstash.com/redis
2. Create database
3. Copy **REST API** credentials:
   - Endpoint → `KV_REST_API_URL`
   - Token → `KV_REST_API_TOKEN`

**Free Tier**: 10,000 commands/day

---

## 🎯 Optional Services (Specific Features)

### 5. Tradovate - Trading Platform Integration
**Only needed for Tradovate import feature**

**Sign up**: https://trader.tradovate.com/

**Steps**:
1. Log in to Tradovate
2. Account Settings > API
3. Create new API application
4. Copy:
   - Client ID → `TRADOVATE_CID`
   - Client Secret → `TRADOVATE_SECRET`
   - Username → `TRADOVATE_USERNAME`
   - Password → `TRADOVATE_PASSWORD`

---

## 📋 Environment Variables Checklist

### Core (Required)
```bash
DATABASE_URL=          # PostgreSQL connection (pooled)
DIRECT_URL=            # PostgreSQL connection (direct)
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=       # Supabase admin key (keep secret!)
XAI_API_KEY=           # XAI/Grok API key
```

### Performance (Optional but Recommended)
```bash
KV_REST_API_URL=       # Upstash Redis endpoint
KV_REST_API_TOKEN=     # Upstash Redis token
```

### Tradovate (Optional)
```bash
TRADOVATE_USERNAME=    # Your Tradovate username
TRADOVATE_PASSWORD=    # Your Tradovate password
TRADOVATE_CID=         # API Client ID
TRADOVATE_SECRET=      # API Client Secret
```

### Next.js Config
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000    # Your app URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # Your site URL
NODE_ENV=development                          # Environment
```

---

## 🚀 Quick Setup Commands

### 1. Create your environment file
```bash
cp env.example .env.local
```

### 2. Edit .env.local
Open in your favorite editor and fill in the API keys

### 3. Install and run
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

---

## 💡 Pro Tips

### For Development
- Use `NODE_ENV=development`
- Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- You can skip Redis cache initially (app works without it)
- You can skip Tradovate if not using that platform

### For Production (Vercel)
1. Set all environment variables in Vercel Dashboard:
   - Project Settings > Environment Variables
2. Use pooled database connection for `DATABASE_URL`
3. Set `NODE_ENV=production`
4. Set `NEXT_PUBLIC_APP_URL` to your domain
5. Use Vercel KV for easy Redis setup

---

## 🔒 Security Reminders

- ✅ Never commit `.env.local` to git (it's already in .gitignore)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` has admin privileges - never expose it!
- ✅ Use different keys for development and production
- ✅ Rotate API keys if you suspect they're compromised
- ✅ Don't share your API keys publicly

---

## 📞 Need Help?

Check these resources:
1. **Detailed Guide**: See `ENV_SETUP_README.md` in this folder
2. **Service Docs**:
   - [Supabase Docs](https://supabase.com/docs)
   - [Prisma Docs](https://prisma.io/docs)
   - [XAI Docs](https://docs.x.ai/)
   - [Upstash Docs](https://docs.upstash.com/redis)

---

## ✅ Verification

After setup, verify everything works:

```bash
# Check database connection
npx prisma db push

# Check Supabase connection
# Run dev server and try to sign up

# Check XAI API
# Import a CSV file and see if column mapping works

# Check Redis cache (optional)
# App logs will show cache hits/misses
```

---

**Ready to start?**

```bash
cp env.example .env.local
# Edit .env.local and fill in your API keys
npm run dev
```

Good luck! 🚀
