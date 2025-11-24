'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Session } from '@supabase/supabase-js'
import { signOut } from '@/server/auth'
import { createClient } from '@/lib/supabase'
import { useUserStore } from '@/store/user-store'
import { useAutoCacheCleanup } from '@/hooks/use-auto-cache-cleanup'

interface AuthContextType {
  isLoading: boolean
  isAuthenticated: boolean
  session: Session | null
  user: any | null
  checkAuth: () => Promise<boolean>
  forceClearAuth: () => void
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  session: null,
  user: null,
  checkAuth: async () => false,
  forceClearAuth: () => {},
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
  
  // Get user from store for cache cleanup
  const user = useUserStore(state => state.user)
  
  // Auto-cleanup stale caches when app loads or user changes
  useAutoCacheCleanup({
    userId: user?.id,
    enabled: true
  })

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
      const response = await fetch('/api/auth/check', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      })
      const data = await response.json()

      if (response.ok && data.authenticated) {
        setAuthCheckCache({
          timestamp: Date.now(),
          isAuthenticated: true
        })
        return true
      } else {
        // Clear user state when not authenticated
        resetUser()
        setSession(null)
        setAuthCheckCache({
          timestamp: Date.now(),
          isAuthenticated: false
        })
        return false
      }
    } catch (error) {
      // Clear user state on error
      resetUser()
      setSession(null)
      setAuthCheckCache({
        timestamp: Date.now(),
        isAuthenticated: false
      })
      return false
    }
  }

  // Force clear all auth state and cache
  const forceClearAuth = useCallback(() => {
    resetUser()
    setSession(null)
    setSupabaseUser(null)
    setAuthCheckCache(null)
    setIsLoading(false)
    
    // Clear any cached auth data
    localStorage.removeItem('deltalytix_user_data')
    // Clear Supabase auth tokens (they start with 'sb-')
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && key.includes('-auth-token')) {
        localStorage.removeItem(key)
      }
    })
    sessionStorage.clear()
  }, [resetUser, setSupabaseUser])

  useEffect(() => {
    const supabase = createClient()

    // Check if we should force clear auth state (e.g., after logout or account deletion)
    const urlParams = new URLSearchParams(window.location.search)
    const shouldForceClear = urlParams.get('deleted') === 'true' || urlParams.get('logout') === 'true'

    if (shouldForceClear) {
      const reason = urlParams.get('deleted') === 'true' ? 'account deletion' : 'logout'
      forceClearAuth()
      // Remove the parameter from URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      return
    }

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
        setSession(null)
        setSupabaseUser(null)
        setUser(null)
        toast.error('Session Error', {
          description: 'Failed to check authentication status',
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
      async (_event: any, session: any) => {
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
          // Don't throw - let the app continue working
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router, forceClearAuth, setSupabaseUser, setUser])

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: !!session,
        session,
        user: session?.user || null,
        checkAuth: performAuthCheck,
        forceClearAuth,
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
    forceClearAuth: context.forceClearAuth,
  }
} 