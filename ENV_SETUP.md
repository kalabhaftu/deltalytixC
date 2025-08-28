# Environment Setup

The application requires the following environment variables to be configured:

## Essential Environment Variables

### Database Connection
- `DIRECT_URL`: Direct connection to your Supabase database (required for migrations)
- `DATABASE_URL`: Connection pooler URL (required for application)

### Supabase Configuration  
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Authentication
- `NEXTAUTH_SECRET`: Random secret for NextAuth (generate with: `openssl rand -base64 32`)
- `NEXTAUTH_URL`: Your application URL (required for production)

## Optional Environment Variables

### AI/Chat Features
- `OPENAI_API_KEY`: For AI-powered features
- `PERPLEXITY_API_KEY`: For enhanced AI capabilities

### Email (Resend)
- `RESEND_API_KEY`: For sending transactional emails

### Discord Integration
- `DISCORD_CLIENT_ID`: Discord OAuth client ID
- `DISCORD_CLIENT_SECRET`: Discord OAuth client secret

## Environment Setup for Different Environments

### Development (.env.local)
```env
DIRECT_URL="postgresql://postgres:password@localhost:5432/deltalytix"
DATABASE_URL="postgresql://postgres:password@localhost:5432/deltalytix"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
NODE_ENV="development"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

### Production (Vercel Environment Variables)
Set these in your Vercel dashboard:
- `DIRECT_URL`
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (e.g., "https://your-app.vercel.app")

### Security Notes
- Never commit .env files to version control
- Use strong, randomly generated secrets for production
- Rotate API keys regularly
- Use environment-specific values (don't use development credentials in production)

