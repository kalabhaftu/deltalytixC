# Environment Setup

The application requires the following environment variables to be configured:

## Database Connection
- DIRECT_URL: Direct connection to your Supabase database (required)
- DATABASE_URL: Connection pooler URL (optional fallback)

## Supabase Configuration  
- NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anonymous key

## Other Configuration
- NODE_ENV: Set to 'development' for local development
- NEXTAUTH_SECRET: Random secret for NextAuth
- NEXTAUTH_URL: Your application URL (e.g., http://localhost:3000)

Create a .env.local file in your project root with these variables configured to resolve the connection errors.

Example .env.local:
DIRECT_URL="postgresql://postgres:password@aws-1-eu-north-1.pooler.supabase.com:6543/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
NODE_ENV="development"

