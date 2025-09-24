'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Session } from '@supabase/supabase-js'
import { signOut } from '@/server/auth'
import { createClient } from '@/lib/supabase'
import { useUserStore } from '@/store/user-store'

interface AuthContextType {
  isLoading: boolean
  isAuthenticated: boolean
  session: Session | null
  user: any | null
  checkAuth: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  session: null,
  user: null,
  checkAuth: async () => false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const router = useRouter()
  const [authCheckCache, setAuthCheckCache] = useState<{timestamp: number, isAuthenticated: boolean} | null>(null)

  // Get user store setters
  const setUser = useUserStore(state => state.setUser)
  const setSupabaseUser = useUserStore(state => state.setSupabaseUser)
  const resetUser = useUserStore(state => state.resetUser)

  // Check if auth status is still valid (cache for 30 seconds)
  const isAuthCheckValid = () => {
    if (!authCheckCache) return false
    return Date.now() - authCheckCache.timestamp < 30000 // 30 seconds
  }

  // Perform auth check with caching
  const performAuthCheck = async (): Promise<boolean> => {
    if (isAuthCheckValid()) {
      return authCheckCache!.isAuthenticated
    }

    try {
      const response = await fetch('/api/auth/check')
      const data = await response.json()

      if (response.ok && data.authenticated) {
        setAuthCheckCache({
          timestamp: Date.now(),
          isAuthenticated: true
        })
        return true
      } else {
        setAuthCheckCache({
          timestamp: Date.now(),
          isAuthenticated: false
        })
        return false
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthCheckCache({
        timestamp: Date.now(),
        isAuthenticated: false
      })
      return false
    }
  }

  useEffect(() => {
    const supabase = createClient()

    // Initial session check
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        setSession(session)

        // Synchronize with user store
        if (session?.user) {
          setSupabaseUser(session.user)
          // Note: We don't set the database user here as it requires a database call
          // The database user will be set when the user data is loaded
        } else {
          setSupabaseUser(null)
          setUser(null)
        }
      } catch (error) {
        console.error('Error checking session:', error)
        setSession(null)
        setSupabaseUser(null)
        setUser(null)
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

        // Synchronize with user store
        if (session?.user) {
          setSupabaseUser(session.user)
          // Note: We don't set the database user here as it requires a database call
          // The database user will be set when the user data is loaded
        } else {
          setSupabaseUser(null)
          setUser(null)
        }

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
        checkAuth: performAuthCheck,
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
  return {
    ...context,
    checkAuth: context.checkAuth,
  }
} 