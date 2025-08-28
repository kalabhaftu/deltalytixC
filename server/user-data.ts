'use server'

import { getShared } from './shared'
import { TickDetails, User, Tag, DashboardLayout, FinancialEvent, Mood, Trade } from '@prisma/client'
import { GroupWithAccounts } from './groups'
import { getCurrentLocale } from '@/locales/server'
import { prisma } from '@/lib/prisma'
import { createClient, getUserId } from './auth'
import { Account, Group } from '@/context/data-provider'
import { revalidateTag, unstable_cache } from 'next/cache'

export type SharedDataResponse = {
  trades: Trade[]
  params: any
  error?: string
  groups: GroupWithAccounts[]
}

export async function loadSharedData(slug: string): Promise<SharedDataResponse> {
  if (!slug) {
    return {
      trades: [],
      params: null,
      error: 'Invalid slug',
      groups: []
    }
  }

  try {
    const sharedData = await getShared(slug)
    if (!sharedData) {
      return {
        trades: [],
        params: null,
        error: 'Shared data not found',
        groups: []
      }
    }

    return {
      trades: sharedData.trades,
      params: sharedData.params,
      groups: []
    }
  } catch (error) {
    return {
      trades: [],
      params: null,
      error: 'Failed to load shared data',
      groups: []
    }
  }
} 


export async function getUserData(): Promise<{
  userData: User | null;
  tickDetails: TickDetails[];
  tags: Tag[];
  accounts: Account[];
  groups: Group[];
  financialEvents: FinancialEvent[];
  moodHistory: Mood[];
}> {
  try {
    const userId = await getUserId()
    const locale = await getCurrentLocale()


  return unstable_cache(
    async () => {
      console.log(`[Cache MISS] Fetching user data for user ${userId}`)
      
      try {
        // Add timeout for database operations
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 12000)
        )

        const dataPromise = Promise.all([
          prisma.user.findUnique({
            where: {
              id: userId
            }
          }),
          prisma.tickDetails.findMany(),
          prisma.tag.findMany({
            where: {
              userId: userId
            }
          }),
          // Optimized accounts query - minimal data for performance
          prisma.account.findMany({
            where: {
              userId: userId
            },
            select: {
              id: true,
              number: true,
              name: true,
              propfirm: true,
              startingBalance: true,
              createdAt: true,
              groupId: true,
              group: {
                select: {
                  id: true,
                  name: true
                }
              },
              // Get only recent payouts for performance
              payouts: {
                select: {
                  id: true,
                  amount: true,
                  date: true,
                  status: true
                },
                orderBy: {
                  date: 'desc'
                },
                take: 5 // Limit payouts for performance
              }
            }
          }),
          prisma.group.findMany({
            where: {
              userId: userId
            },
            include: {
              accounts: {
                select: {
                  id: true,
                  number: true,
                  name: true,
                  propfirm: true,
                  startingBalance: true
                }
              }
            }
          }),
          prisma.financialEvent.findMany({
            where: {
              lang: locale
            },
            take: 50, // Limit events for performance
            orderBy: {
              date: 'desc'
            }
          }),
          prisma.mood.findMany({
            where: {
              userId: userId
            },
            orderBy: {
              day: 'desc'
            },
            take: 30 // Limit moods for performance
          })
        ])

        const [
          userData,
          tickDetails,
          tags,
          accounts,
          groups,
          financialEvents,
          moodHistory
        ] = await Promise.race([dataPromise, timeoutPromise]) as any

        return { userData, tickDetails, tags, accounts, groups, financialEvents, moodHistory }
      } catch (error) {
        console.error('[getUserData] Database error:', error)
        // Return empty data structure if database is unavailable
        return {
          userData: null,
          tickDetails: [],
          tags: [],
          accounts: [],
          groups: [],
          financialEvents: [],
          moodHistory: []
        }
      }
    },
    [`user-data-${userId}-${locale}`],
    {
      tags: [`user-data-${userId}-${locale}`, `user-data-${userId}`],
      revalidate: 300 // 5 minutes instead of 24 hours for better UX
    }
  )()
  } catch (error) {
    console.error('[getUserData] Error getting user ID or locale:', error)
    // Return empty data structure if we can't get user information
    return {
      userData: null,
      tickDetails: [],
      tags: [],
      accounts: [],
      groups: [],
      financialEvents: [],
      moodHistory: []
    }
  }
}

export async function getDashboardLayout(userId: string): Promise<DashboardLayout | null> {
  console.log('getDashboardLayout')
  try {
    return await prisma.dashboardLayout.findUnique({
      where: {
        userId: userId
      }
    })
  } catch (error) {
    if (error instanceof Error) {
      // Handle prepared statement errors (common with Turbopack)
      if (error.message.includes('prepared statement') && error.message.includes('already exists')) {
        console.log('[getDashboardLayout] Prepared statement error (Turbopack), retrying...')
        // Disconnect and reconnect to clear prepared statements
        await prisma.$disconnect()
        try {
          return await prisma.dashboardLayout.findUnique({
            where: {
              userId: userId
            }
          })
        } catch (retryError) {
          console.error('[getDashboardLayout] Retry failed:', retryError)
          return null
        }
      }
      // Handle table doesn't exist error
      if (error.message.includes('does not exist')) {
        console.log('[getDashboardLayout] DashboardLayout table does not exist yet, returning null')
        return null
      }
      // Handle database connection errors
      if (error.message.includes("Can't reach database server") || 
          error.message.includes('P1001') ||
          error.message.includes('connection') ||
          error.message.includes('timeout')) {
        console.log('[getDashboardLayout] Database connection error, returning null')
        return null
      }
    }
    console.error('[getDashboardLayout] Unexpected error:', error)
    throw error
  }
}

export async function updateIsFirstConnectionAction(isFirstConnection: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return 0
  }
  await prisma.user.update({
    where: { id: userId },
    data: { isFirstConnection }
  })
  revalidateTag(`user-data-${userId}`)
}