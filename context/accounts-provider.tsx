'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Account as PrismaAccount, Group as PrismaGroup } from '@prisma/client'
import { getUserData } from '@/server/user-data'
import {
  setupAccountAction,
  deleteAccountAction,
} from '@/server/accounts'
import {
  saveGroupAction,
  deleteGroupAction,
  moveAccountToGroupAction,
  renameGroupAction
} from '@/server/groups'
import { useUserStore } from '@/store/user-store'
import { handleServerActionError } from '@/lib/utils/server-action-error-handler'

// Extended Account type with computed balance
export type Account = PrismaAccount & {
  balanceToDate?: number
}

interface AccountsContextType {
  accounts: Account[]
  groups: PrismaGroup[]
  loading: boolean
  error: string | null
  setAccounts: (accounts: Account[]) => void
  setGroups: (groups: PrismaGroup[]) => void
  saveAccount: (account: Partial<Account>) => Promise<void>
  deleteAccount: (account: Account) => Promise<void>
  saveGroup: (name: string) => Promise<PrismaGroup | undefined>
  renameGroup: (groupId: string, name: string) => Promise<void>
  deleteGroup: (groupId: string) => Promise<void>
  moveAccountToGroup: (accountId: string, targetGroupId: string | null) => Promise<void>
  refetch: () => Promise<void>
}

const AccountsContext = createContext<AccountsContextType | null>(null)

export function AccountsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUserStore()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [groups, setGroups] = useState<PrismaGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccountsAndGroups = useCallback(
    async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const data = await getUserData()
        
        setAccounts(data.accounts || [])
        setGroups(data.groups || [])
      } catch (err) {
        console.error('Error fetching accounts:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch accounts')
      } finally {
        setLoading(false)
      }
    },
    [user?.id]
  )

  useEffect(() => {
    fetchAccountsAndGroups()
  }, [fetchAccountsAndGroups])

  const saveAccount = useCallback(async (newAccount: Partial<Account>) => {
    if (!user?.id) return

    try {
      const currentAccount = accounts.find(acc => acc.number === newAccount.number)

      if (!currentAccount) {
        const createdAccount = await setupAccountAction(newAccount as Account)
        setAccounts([...accounts, createdAccount])
        return
      }

      const updatedAccount = await setupAccountAction(newAccount as Account)
      setAccounts(accounts.map((account: Account) => 
        account.number === updatedAccount.number ? { ...account, ...updatedAccount } : account
      ))
    } catch (error) {
      console.error('Error saving account:', error)
      if (handleServerActionError(error, { context: 'Save Account' })) {
        return
      }
      throw error
    }
  }, [user?.id, accounts])

  const deleteAccount = useCallback(async (account: Account) => {
    if (!user?.id) return

    try {
      setAccounts(accounts.filter(acc => acc.id !== account.id))
      await deleteAccountAction(account)
    } catch (error) {
      console.error('Error deleting account:', error)
      if (handleServerActionError(error, { context: 'Delete Account' })) {
        return
      }
      throw error
    }
  }, [user?.id, accounts])

  const saveGroup = useCallback(async (name: string) => {
    if (!user?.id) return

    try {
      const newGroup = await saveGroupAction(name)
      setGroups([...groups, newGroup])
      return newGroup
    } catch (error) {
      console.error('Error creating group:', error)
      if (handleServerActionError(error, { context: 'Create Group' })) {
        return
      }
      throw error
    }
  }, [user?.id, groups])

  const renameGroup = useCallback(async (groupId: string, name: string) => {
    if (!user?.id) return

    try {
      setGroups(groups.map(group => group.id === groupId ? { ...group, name } : group))
      await renameGroupAction(groupId, name)
    } catch (error) {
      console.error('Error renaming group:', error)
      if (handleServerActionError(error, { context: 'Rename Group' })) {
        return
      }
      throw error
    }
  }, [user?.id, groups])

  const deleteGroup = useCallback(async (groupId: string) => {
    try {
      const updatedAccounts = accounts.map(account => {
        if (account.groupId === groupId) {
          return { ...account, groupId: null }
        }
        return account
      })
      setAccounts(updatedAccounts)
      setGroups(groups.filter(group => group.id !== groupId))
      await deleteGroupAction(groupId)
    } catch (error) {
      console.error('Error deleting group:', error)
      if (handleServerActionError(error, { context: 'Delete Group' })) {
        return
      }
      throw error
    }
  }, [accounts, groups])

  const moveAccountToGroup = useCallback(async (accountId: string, targetGroupId: string | null) => {
    try {
      setAccounts(accounts.map(account => {
        if (account.id === accountId) {
          return { ...account, groupId: targetGroupId }
        }
        return account
      }))

      await moveAccountToGroupAction(accountId, targetGroupId)
    } catch (error) {
      console.error('Error moving account to group:', error)
      if (handleServerActionError(error, { context: 'Move Account to Group' })) {
        return
      }
      throw error
    }
  }, [accounts])

  const value: AccountsContextType = {
    accounts,
    groups,
    loading,
    error,
    setAccounts,
    setGroups,
    saveAccount,
    deleteAccount,
    saveGroup,
    renameGroup,
    deleteGroup,
    moveAccountToGroup,
    refetch: fetchAccountsAndGroups,
  }

  return (
    <AccountsContext.Provider value={value}>
      {children}
    </AccountsContext.Provider>
  )
}

export function useAccounts() {
  const context = useContext(AccountsContext)
  if (!context) {
    throw new Error('useAccounts must be used within AccountsProvider')
  }
  return context
}


