# Environment Setup

## Quick Setup for Local Development

### 1. Copy the template
```bash
cp env.example .env.local
```

### 2. Copy values from Vercel
Go to your Vercel project → Settings → Environment Variables

Copy each value from Vercel and paste into `.env.local`

### 3. Update these for local development
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Run the app
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

---

## Environment Variables Reference

### Required
- `DATABASE_URL` - PostgreSQL connection (pooled)
- `DIRECT_URL` - PostgreSQL direct connection  
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (keep secret!)
- `XAI_API_KEY` - XAI/Grok API key for AI CSV mapping
- `XAI_BASE_URL` - XAI API base URL (default: https://api.x.ai/v1)
- `XAI_MODEL` - AI model to use (default: grok-3)

### Optional (Performance)
- `KV_REST_API_URL` - Vercel KV/Upstash Redis URL
- `KV_REST_API_TOKEN` - Vercel KV/Upstash Redis token

### Optional (Tradovate Integration)
- `TRADOVATE_USERNAME` - Tradovate username
- `TRADOVATE_PASSWORD` - Tradovate password
- `TRADOVATE_CID` - Tradovate client ID
- `TRADOVATE_SECRET` - Tradovate client secret

### App Configuration
- `NEXT_PUBLIC_APP_URL` - Your app URL (http://localhost:3000 for dev)
- `NEXT_PUBLIC_SITE_URL` - Your site URL (http://localhost:3000 for dev)
- `NODE_ENV` - Environment (development/production)

---

## Notes

- OAuth (Google/Discord) is configured entirely in Supabase dashboard - no env variables needed in your app
- `SUPABASE_SERVICE_ROLE_KEY` has admin privileges - never expose it in client code!
- Redis cache is optional - app works without it but is slower
- Tradovate integration is optional - only needed if importing from Tradovate

---

## For Detailed Setup

See `ENV_SETUP_README.md` for complete step-by-step instructions on getting all API keys.
