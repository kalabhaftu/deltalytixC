'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Session } from '@supabase/supabase-js'
import { signOut } from '@/server/auth'

interface AuthContextType {
  isLoading: boolean
  isAuthenticated: boolean
  session: Session | null
  user: any | null
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  session: null,
  user: null,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Initial session check
    const checkSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        if (error) throw error
        setSession(initialSession)
      } catch (error) {
        console.error('Error checking session:', error)
        toast({
          title: 'Session Error',
          description: 'Failed to check authentication status',
          variant: 'destructive',
        })
        await signOut()
      } finally {
        setIsLoading(false)
      }
    }

    // Call initial session check
    checkSession()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        
        // Add error handling for router refresh
        try {
          router.refresh()
        } catch (refreshError) {
          console.warn('Router refresh failed, continuing without refresh:', refreshError)
          // Don't throw - let the app continue working
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: !!session,
        session,
        user: session?.user || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 