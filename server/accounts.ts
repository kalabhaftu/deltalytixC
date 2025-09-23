'use server'

import { getUserId, getUserIdSafe } from '@/server/auth'
import { PrismaClient, Trade, Payout } from '@prisma/client'
import { Account } from '@/context/data-provider'
import { unstable_cache } from 'next/cache'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

type GroupedTrades = Record<string, Record<string, Trade[]>>

interface FetchTradesResult {
  groupedTrades: GroupedTrades;
  flattenedTrades: Trade[];
}

export async function fetchGroupedTradesAction(userId: string): Promise<FetchTradesResult> {
  const trades = await prisma.trade.findMany({
    where: {
      userId: userId
    },
    orderBy: [
      { accountNumber: 'asc' },
      { instrument: 'asc' }
    ]
  })

  const groupedTrades = trades.reduce<GroupedTrades>((acc, trade) => {
    if (!acc[trade.accountNumber]) {
      acc[trade.accountNumber] = {}
    }
    if (!acc[trade.accountNumber][trade.instrument]) {
      acc[trade.accountNumber][trade.instrument] = []
    }
    acc[trade.accountNumber][trade.instrument].push(trade)
    return acc
  }, {})

  return {
    groupedTrades,
    flattenedTrades: trades
  }
}

export async function removeAccountsFromTradesAction(accountNumbers: string[]): Promise<void> {
  const userId = await getUserId()
  await prisma.trade.deleteMany({
    where: {
      accountNumber: { in: accountNumbers },
      userId: userId
    }
  })
  await prisma.account.deleteMany({
    where: {
      number: { in: accountNumbers },
      userId: userId
    }
  })
}

export async function removeAccountFromTradesAction(accountNumber: string): Promise<void> {
  const userId = await getUserId()
  await prisma.trade.deleteMany({
    where: {
      accountNumber: accountNumber,
      userId: userId
    }
  })
}

export async function deleteInstrumentGroupAction(accountNumber: string, instrumentGroup: string, userId: string): Promise<void> {
  await prisma.trade.deleteMany({
    where: {
      accountNumber: accountNumber,
      instrument: { startsWith: instrumentGroup },
      userId: userId
    }
  })
}

export async function updateCommissionForGroupAction(accountNumber: string, instrumentGroup: string, newCommission: number): Promise<void> {
  // We have to update the commission for all trades in the group and compute based on the quantity
  const trades = await prisma.trade.findMany({
    where: {
      accountNumber: accountNumber,
      instrument: { startsWith: instrumentGroup }
    }
  })
  // For each trade, update the commission
  for (const trade of trades) {
    const updatedCommission = newCommission * trade.quantity
    await prisma.trade.update({
      where: {
        id: trade.id
      },
      data: {
        commission: updatedCommission
      }
    })
  }
}

export async function renameAccountAction(oldAccountNumber: string, newAccountNumber: string): Promise<void> {
  try {
    const userId = await getUserId()
    // First check if the account exists and get its ID
    const existingAccount = await prisma.account.findFirst({
      where: {
        number: oldAccountNumber,
        userId: userId
      }
    })

    if (!existingAccount) {
      throw new Error('Account not found')
    }

    // Check if the new account number is already in use by this user
    const duplicateAccount = await prisma.account.findFirst({
      where: {
        number: newAccountNumber,
        userId: userId
      }
    })

    if (duplicateAccount) {
      throw new Error('You already have an account with this number')
    }

    // Use a transaction to ensure all updates happen together
    await prisma.$transaction(async (tx) => {
      // Update the account number
      await tx.account.update({
        where: {
          id: existingAccount.id
        },
        data: {
          number: newAccountNumber
        }
      })

      // Update trades accountNumber
      await tx.trade.updateMany({
        where: {
          accountNumber: oldAccountNumber,
          userId: userId
        },
        data: {
          accountNumber: newAccountNumber
        }
      })

      // Update payouts accountNumber
      await tx.payout.updateMany({
        where: {
          accountId: existingAccount.id
        },
        data: {
          accountNumber: newAccountNumber
        }
      })
    })
  } catch (error) {
    console.error('Error renaming account:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to rename account')
  }
}

export async function deleteTradesByIdsAction(tradeIds: string[]): Promise<void> {
  try {
    const userId = await getUserId()
    
    // Delete trades and invalidate cache in parallel for faster response
    const [result] = await Promise.all([
      prisma.trade.deleteMany({
        where: {
          id: { in: tradeIds },
          userId: userId // Ensure user can only delete their own trades
        }
      }),
      // Invalidate multiple related caches immediately
      (async () => {
        const { revalidateTag } = await import('next/cache')
        revalidateTag(`trades-${userId}`)
        revalidateTag(`user-data-${userId}`)
        revalidateTag(`grouped-trades-${userId}`)
      })()
    ])
    
  } catch (error) {
    console.error('[deleteTradesByIds] Error deleting trades:', error)
    throw error
  }
}

export async function setupAccountAction(account: Account) {
  const userId = await getUserId()
  const existingAccount = await prisma.account.findFirst({
    where: {
      number: account.number,
      userId: userId
    }
  })

  // Extract fields that should not be included in the database operation
  const { 
    id, 
    userId: _, 
    payouts, 
    groupId,
    balanceToDate,
    group,
    ...baseAccountData 
  } = account

  // Handle group relation separately if groupId exists
  const accountDataWithGroup = {
    ...baseAccountData,
    ...(groupId && {
      group: {
        connect: {
          id: groupId
        }
      }
    })
  }

  if (existingAccount) {
    return await prisma.account.update({
      where: { id: existingAccount.id },
      data: accountDataWithGroup
    })
  }

  return await prisma.account.create({
    data: {
      ...accountDataWithGroup,
      user: {
        connect: {
          id: userId
        }
      }
    }
  })
}

export async function deleteAccountAction(account: Account) {
  const userId = await getUserId()
  await prisma.account.delete({
    where: {
      id: account.id,
      userId: userId
    }
  })
}

export async function getAccountsAction() {
  try {
    const userId = await getUserIdSafe()

    // If user is not authenticated, return empty array instead of throwing error
    if (!userId) {
      return []
    }

    // PERFORMANCE OPTIMIZATION: Use caching and minimal fields with error handling
    return unstable_cache(
      async () => {
        let accounts = [];
        try {
          accounts = await prisma.account.findMany({
            where: {
              userId: userId,
              // Include all accounts regardless of propfirm status
            },
            select: {
              id: true,
              number: true,
              name: true,
              propfirm: true,
              broker: true,
              startingBalance: true,
              status: true,
              createdAt: true,
              userId: true,
              groupId: true,
              // Skip payouts for performance - can be loaded on demand
            }
          })
        } catch (dbError) {
          console.error('[getAccountsAction] Database error:', dbError)
          // Return empty array instead of throwing to prevent app crash
          return []
        }

        if (accounts.length === 0) {
          // Try to see if there are any accounts at all in the database
          try {
            const allAccounts = await prisma.account.findMany({
              select: { id: true, userId: true, number: true, propfirm: true },
              take: 5
            })
          } catch (dbError) {
            console.error('[getAccountsAction] Secondary database error:', dbError)
          }
        }

        return accounts.map((account: any) => ({
          ...account,
          payouts: [], // Empty for performance - load on demand if needed
        }))
      },
      [`accounts-${userId}`],
      {
        tags: [`accounts-${userId}`],
        revalidate: 60 // 1 minute cache for faster updates
      }
    )()
  } catch (error) {
    console.error('Error fetching accounts:', error)
    // Return empty array instead of throwing error to prevent frontend crashes
    return []
  }
}

export async function savePayoutAction(payout: Payout) {
  
  try {
    // First find the account to get its ID
    const userId = await getUserId()
    const account = await prisma.account.findFirst({
      where: {
        number: payout.accountNumber,
        userId: userId
      }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    return await prisma.payout.upsert({
      where: {
        id: payout.id
      },
      create: {
        id: crypto.randomUUID(),
        accountNumber: payout.accountNumber,
        date: payout.date,
        amount: payout.amount,
        status: payout.status,
        account: {
          connect: {
            id: account.id
          }
        }
      },
      update: {
        accountNumber: payout.accountNumber,
        date: payout.date,
        amount: payout.amount,
        status: payout.status,
        account: {
          connect: {
            id: account.id
          }
        }
      },
    })
  } catch (error) {
    console.error('Error adding payout:', error)
    throw new Error('Failed to add payout')
  }
}

export async function deletePayoutAction(payoutId: string) {
  try {
    const userId = await getUserId()
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId, account: { userId: userId } },
      include: {
        account: true
      }
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    // Delete the payout
    await prisma.payout.delete({
      where: { id: payoutId }
    });

    // Decrement the payoutCount on the account
    await prisma.account.update({
      where: {
        id: payout.account.id
      },
      data: {
        payoutCount: {
          decrement: 1
        }
      }
    });

    return true;
  } catch (error) {
    console.error('Failed to delete payout:', error);
    throw new Error('Failed to delete payout');
  }
}

export async function renameInstrumentAction(accountNumber: string, oldInstrumentName: string, newInstrumentName: string): Promise<void> {
  try {
    const userId = await getUserId()
    // Update all trades for this instrument in this account
    await prisma.trade.updateMany({
      where: {
        accountNumber: accountNumber,
        instrument: oldInstrumentName,
        userId: userId
      },
      data: {
        instrument: newInstrumentName
      }
    })
  } catch (error) {
    console.error('Error renaming instrument:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to rename instrument')
  }
}

export async function checkAndResetAccountsAction() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const accountsToReset = await prisma.account.findMany({
    where: {
      resetDate: {
        lte: today,
      },
    },
  })

  for (const account of accountsToReset) {
    await prisma.account.update({
      where: {
        id: account.id
      },
      data: {
        resetDate: null,
      }
    })
  }
}


export async function createAccountAction(accountNumber: string) {
  try {
    const userId = await getUserId()
    const account = await prisma.account.create({
      data: {
        number: accountNumber,
        userId,
        propfirm: '',
        drawdownThreshold: 0,
        profitTarget: 0,
        isPerformance: false,
        payoutCount: 0,
      },
    })
    return account
  } catch (error) {
    console.error('Error creating account:', error)
    throw error
  }
}
