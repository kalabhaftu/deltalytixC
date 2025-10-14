'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { User as PrismaUser } from '@prisma/client'
import { getUserData } from '@/server/user-data'
import { createClient } from '@/lib/supabase'
import { ensureUserInDatabase } from '@/server/auth'
import { useUserStore } from '@/store/user-store'

interface UserDataContextType {
  user: PrismaUser | null
  isFirstConnection: boolean
  loading: boolean
  error: string | null
  setIsFirstConnection: (value: boolean) => void
  refetch: () => Promise<void>
}

const UserDataContext = createContext<UserDataContextType | null>(null)

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { user: supabaseUser } = useUserStore()
  const [user, setUser] = useState<PrismaUser | null>(null)
  const [isFirstConnection, setIsFirstConnection] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserData = useCallback(async () => {
    if (!supabaseUser?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Ensure user exists in database
      await ensureUserInDatabase(supabaseUser)

      // Fetch user data
      const data = await getUserData()
      
      if (data.userData) {
        setUser(data.userData)
        setIsFirstConnection(data.userData.isFirstConnection || false)
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch user data')
    } finally {
      setLoading(false)
    }
  }, [supabaseUser?.id])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  const value: UserDataContextType = {
    user,
    isFirstConnection,
    loading,
    error,
    setIsFirstConnection,
    refetch: fetchUserData,
  }

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  )
}

export function useUserData() {
  const context = useContext(UserDataContext)
  if (!context) {
    throw new Error('useUserData must be used within UserDataProvider')
  }
  return context
}


