'use server'

import { User, DashboardLayout, Trade } from '@prisma/client'
import { GroupWithAccounts } from './groups'
import { prisma } from '@/lib/prisma'
import { createClient, getUserId, getUserIdSafe } from './auth'
import { Account, Group } from '@/context/data-provider'
import { revalidateTag, unstable_cache } from 'next/cache' 


export async function getUserData(): Promise<{
  userData: User | null;
  accounts: Account[];
  groups: Group[];
}> {
  try {
    const userId = await getUserIdSafe()

    // If user is not authenticated, return empty data instead of throwing error
    if (!userId) {
      return {
        userData: null,
        accounts: [],
        groups: []
      }
    }

    const locale = 'en' // Default to English since i18n was removed


  return unstable_cache(
    async () => {
      try {
        // Add timeout for database operations - reduced for better performance
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database timeout')), 10000)
        )

        // PERFORMANCE OPTIMIZATION: Reduce database queries and use parallel fetching
    const dataPromise = Promise.all([
      // User data - essential only with error handling
      (async () => {
        try {
          return await prisma.user.findUnique({
            where: {
              auth_user_id: userId
            },
            select: {
              id: true,
              email: true,
              auth_user_id: true,
              isFirstConnection: true,
              timezone: true,
              theme: true,
              firstName: true,
              lastName: true,
              accountFilterSettings: true
            }
          })
        } catch (error) {
          console.error('[getUserData] User query failed:', error)
          return null
        }
      })(),
      // Use getAccountsAction for unified account handling (regular + prop firm)
      (async () => {
        try {
          // Import and use the existing account logic
          const { getAccountsAction } = await import('./accounts')
          return await getAccountsAction()
        } catch (error) {
          console.error('[getUserData] Accounts query failed:', error)
          return []
        }
      })(),
      // Groups - minimal data with error handling
      (async () => {
        try {
          return await prisma.group.findMany({
            where: {
              userId: userId
            },
            select: {
              id: true,
              name: true,
              userId: true,
              createdAt: true
            }
          })
        } catch (error) {
          console.error('[getUserData] Groups query failed:', error)
          return []
        }
      })(),
      Promise.resolve([]), // Placeholder for removed financial events
      Promise.resolve([]) // Placeholder for removed mood feature
    ])

        const [
          userData,
          accounts,
          groups
        ] = await Promise.race([dataPromise, timeoutPromise]) as any


        return { userData, accounts, groups }
      } catch (error) {
        console.error('[getUserData] Database error:', error)
        // Return empty data structure if database is unavailable
        return {
          userData: null,
          accounts: [],
          groups: []
        }
      }
    },
      [`user-data-${userId}-${locale}`],
    {
      tags: [`user-data-${userId}-${locale}`, `user-data-${userId}`],
      revalidate: 60 // 1 minute cache for faster updates
    }
  )()
  } catch (error) {
    console.error('[getUserData] Error getting user ID or locale:', error)
    // Return empty data structure if we can't get user information
    return {
      userData: null,
      accounts: [],
      groups: []
    }
  }
}

// REMOVED: getDashboardLayout - now using DashboardTemplate model
// Template management is handled in hooks/use-dashboard-templates.ts

export async function updateIsFirstConnectionAction(isFirstConnection: boolean) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id
    
    if (!userId) {
      throw new Error('User not authenticated')
    }
    
    await prisma.user.update({
      where: { auth_user_id: userId },
      data: { isFirstConnection }
    })
    
    revalidateTag(`user-data-${userId}`)
    
    return { success: true }
  } catch (error) {
    console.error('Error updating onboarding status:', error)
    throw new Error('Failed to update onboarding status')
  }
}