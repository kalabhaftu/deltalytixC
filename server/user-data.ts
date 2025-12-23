'use server'

import { User, Trade } from '@prisma/client'
// Groups removed - no longer used
// import { GroupWithAccounts } from './groups'
import { prisma } from '@/lib/prisma'
import { createClient, getUserId, getUserIdSafe } from './auth'
import { Account } from '@/context/data-provider'
import { revalidateTag, unstable_cache } from 'next/cache'


import { getAccountsAction } from './accounts'

export async function getUserData(): Promise<{
  userData: User | null;
  accounts: Account[];
  groups: never[]; // Groups removed - no longer used
  calendarNotes: Record<string, string>;
}> {
  try {
    const userId = await getUserIdSafe()

    // If user is not authenticated, return empty data instead of throwing error
    if (!userId) {
      return {
        userData: null,
        accounts: [],
        groups: [],
        calendarNotes: {}
      }
    }

    const locale = 'en' // Default to English since i18n was removed

    // IMPORTANT: Removed unstable_cache wrapper to prevent "items over 2MB cannot be cached" errors
    // User data includes accounts which can exceed Next.js 2MB cache limit
    // Database queries are already fast with proper indexing
    try {
      // PERFORMANCE FIX: Removed aggressive timeout wrapper - let Prisma handle connection timeouts naturally
      // Aggressive timeouts cause premature failures when network is slow

      // PERFORMANCE OPTIMIZATION: Reduce database queries and use parallel fetching
      const [userData, accounts, groups, calendarNotes] = await Promise.all([
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
                thorToken: true,
                timezone: true,
                theme: true,
                firstName: true,
                lastName: true,
                accountFilterSettings: true,
                goalSettings: true,
                backtestInputMode: true
              }
            })
          } catch (error) {
            return null
          }
        })(),
        // Use getAccountsAction for unified account handling (regular + prop firm)
        (async () => {
          try {
            return await getAccountsAction()
          } catch (error) {
            return []
          }
        })(),
        // Groups removed - no longer used
        Promise.resolve([]),
        // Calendar notes - bundled with initial data load (Limited to recent history)
        (async () => {
          try {
            // PERFORMANCE: Limit notes to last 2 years to prevent payload bloat
            const twoYearsAgo = new Date()
            twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

            const notes = await prisma.dailyNote.findMany({
              where: {
                userId,
                date: {
                  gte: twoYearsAgo
                }
              },
              select: {
                date: true,
                note: true
              }
            })
            return notes.reduce((acc, note) => {
              // Convert Date to ISO string for consistent keys
              const dateKey = typeof note.date === 'string' ? note.date : note.date.toISOString().split('T')[0]
              acc[dateKey] = note.note
              return acc
            }, {} as Record<string, string>)
          } catch (error) {
            return {}
          }
        })()
      ])

      return { userData, accounts, groups, calendarNotes }
    } catch (error) {
      return {
        userData: null,
        accounts: [],
        groups: [],
        calendarNotes: {}
      }
    }
  } catch (error) {
    return {
      userData: null,
      accounts: [],
      groups: [],
      calendarNotes: {}
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
    throw new Error('Failed to update onboarding status')
  }
}

