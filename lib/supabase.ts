import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Check if we have placeholder or missing values
  const hasPlaceholderValues = !supabaseUrl || !supabaseKey ||
    supabaseUrl.includes('[YOUR_PROJECT_REF]') ||
    supabaseKey.includes('your-anon-key') ||
    supabaseUrl === 'https://[YOUR_PROJECT_REF].supabase.co' ||
    supabaseKey === 'your-anon-key-from-supabase' ||
    supabaseUrl === 'https://placeholder.supabase.co' ||
    supabaseKey === 'placeholder-key'

  // If we have placeholder values, return a mock client
  // This prevents build failures while still allowing the app to compile
  if (hasPlaceholderValues) {
    // Return a mock client for development/build
    return {
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
          getSession: async () => ({ data: { session: null }, error: null }),
          signInWithPassword: async () => ({ data: null, error: { message: 'Not configured' } }),
          signUp: async () => ({ data: null, error: { message: 'Not configured' } }),
          signOut: async () => ({ error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        },
        from: (table: string) => ({
          select: (columns?: string) => ({
            data: [],
            error: null,
            eq: () => ({ data: [], error: null }),
            neq: () => ({ data: [], error: null }),
            gt: () => ({ data: [], error: null }),
            gte: () => ({ data: [], error: null }),
            lt: () => ({ data: [], error: null }),
            lte: () => ({ data: [], error: null }),
            like: () => ({ data: [], error: null }),
            ilike: () => ({ data: [], error: null }),
            in: () => ({ data: [], error: null }),
            is: () => ({ data: [], error: null }),
            not: () => ({ data: [], error: null }),
            contains: () => ({ data: [], error: null }),
            containedBy: () => ({ data: [], error: null }),
            rangeGt: () => ({ data: [], error: null }),
            rangeGte: () => ({ data: [], error: null }),
            rangeLt: () => ({ data: [], error: null }),
            rangeLte: () => ({ data: [], error: null }),
            adjacent: () => ({ data: [], error: null }),
            match: () => ({ data: [], error: null }),
            order: () => ({ data: [], error: null }),
            limit: () => ({ data: [], error: null }),
            single: () => ({ data: null, error: null }),
            maybeSingle: () => ({ data: null, error: null }),
          }),
          insert: (values: any) => ({
            data: null,
            error: { message: 'Not configured' },
            select: () => ({ data: [], error: null }),
            single: () => ({ data: null, error: null }),
          }),
          update: (values: any) => ({
            data: null,
            error: { message: 'Not configured' },
            eq: () => ({ data: null, error: { message: 'Not configured' } }),
            select: () => ({ data: [], error: null }),
          }),
          delete: () => ({
            data: null,
            error: { message: 'Not configured' },
            eq: () => ({ data: null, error: { message: 'Not configured' } }),
          }),
          upsert: () => ({ data: null, error: { message: 'Not configured' } }),
        }),
        storage: {
          listBuckets: async () => ({ data: [], error: null }),
          createBucket: async (name: string) => ({ error: null }),
          from: (bucket: string) => ({
            upload: async (path: string, file: File, options?: any) => ({
              data: { path },
              error: null
            }),
            download: async (path: string) => ({
              data: null,
              error: { message: 'Not configured' }
            }),
            remove: async (paths: string[]) => ({ data: null, error: null }),
            getPublicUrl: (path: string) => ({
              data: { publicUrl: `https://mock-storage.com/${path}` }
            }),
            list: async () => ({ data: [], error: null }),
          }),
        },
      } as any
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