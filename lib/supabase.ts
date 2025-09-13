import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Check for placeholder values
  if (!supabaseUrl || !supabaseKey || 
      supabaseUrl.includes('[YOUR_PROJECT_REF]') || 
      supabaseKey.includes('your-anon-key') ||
      supabaseUrl === 'https://[YOUR_PROJECT_REF].supabase.co' ||
      supabaseKey === 'your-anon-key-from-supabase') {
    throw new Error('Supabase environment variables are not properly configured. Please update your .env file with actual credentials.')
  }
  
  return createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
}