import { create } from 'zustand'
import { User } from '@prisma/client'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { Group, Account } from '@/context/data-provider'
import { deleteGroupAction, saveGroupAction, updateGroupAction } from '@/server/groups'

type UserStore = {
  user: User | null
  supabaseUser: SupabaseUser | null
  accounts: Account[]
  groups: Group[]
  dashboardLayout: {
    id: string
    userId: string
    desktop: any[]
    mobile: any[]
    createdAt: Date
    updatedAt: Date
  } | null
  isLoading: boolean
  isMobile: boolean
  timezone: string
  setTimezone: (timezone: string) => void
  setUser: (user: User | null) => void
  setSupabaseUser: (supabaseUser: SupabaseUser | null) => void
  setAccounts: (accounts: Account[]) => void
  addAccount: (account: Account) => void
  updateAccount: (accountId: string, data: Partial<Account>) => void
  removeAccount: (accountId: string) => void
  setGroups: (groups: Group[]) => void
  addGroup: (group: Group) => void
  updateGroup: (groupId: string, data: Partial<Group>) => void
  removeGroup: (groupId: string) => void
  setDashboardLayout: (layout: any) => void
  updateDashboardLayout: (type: 'desktop' | 'mobile', layout: any[]) => void
  setIsLoading: (value: boolean) => void
  setIsMobile: (value: boolean) => void
  resetUser: () => void
}

export const useUserStore = create<UserStore>()((
    (set, get) => ({
      user: null,
      supabaseUser: null,
      accounts: [],
      groups: [],
      dashboardLayout: null,
      isLoading: false,
      isMobile: false,
      timezone: 'America/New_York',
      setTimezone: (timezone: string) => set({ timezone }),
      setUser: (user) => set({ user }),
      setSupabaseUser: (supabaseUser) => set({ supabaseUser }),
      setAccounts: (accounts) => set({ accounts }),
      addAccount: (account) => set((state) => ({ 
        accounts: [...state.accounts, account] 
      })),
      updateAccount: (accountId, data) => set((state) => ({
        accounts: state.accounts.map(account => 
          account.id === accountId ? { ...account, ...data } : account
        )
      })),
      removeAccount: (accountId) => set((state) => ({ 
        accounts: state.accounts.filter(account => account.id !== accountId) 
      })),
      setGroups: (groups) => set({ groups }),
      addGroup: async (group) => {
        try {
          // Update local state
          set((state) => ({ 
            groups: [...state.groups, group] 
          }))
          // Update database
          await saveGroupAction(group.id)
        } catch (error) {
          console.error('Error adding group:', error)
          throw error
        }
      },
      updateGroup: async (groupId, data) => {
        try {
          // Update local state
          set((state) => ({
            groups: state.groups.map(group => 
              group.id === groupId ? { ...group, ...data } : group
            )
          }))
          // Update database
          await updateGroupAction(groupId, data.name || '')
        } catch (error) {
          console.error('Error updating group:', error)
          throw error
        }
      },
      removeGroup: async (groupId) => {
        try {
          // Update local state
          set((state) => ({ 
            groups: state.groups.filter(group => group.id !== groupId) 
          }))
          // Update database
          await deleteGroupAction(groupId)
        } catch (error) {
          console.error('Error removing group:', error)
          throw error
        }
      },
      setDashboardLayout: (layout) => set({
        dashboardLayout: {
          id: layout.id,
          userId: layout.userId,
          desktop: typeof layout.desktop === 'string' ? JSON.parse(layout.desktop) : layout.desktop,
          mobile: typeof layout.mobile === 'string' ? JSON.parse(layout.mobile) : layout.mobile,
          createdAt: layout.createdAt,
          updatedAt: layout.updatedAt
        }
      }),
      updateDashboardLayout: (type, layout) => set((state) => ({
        dashboardLayout: state.dashboardLayout ? {
          ...state.dashboardLayout,
          [type]: layout
        } : {
          id: '',
          userId: '',
          desktop: type === 'desktop' ? layout : [],
          mobile: type === 'mobile' ? layout : [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })),
      setIsLoading: (value) => set({ isLoading: value }),
      setIsMobile: (value) => set({ isMobile: value }),
      resetUser: () => set({ 
        user: null, 
        accounts: [], 
        groups: [],
        dashboardLayout: null
      }),
    })
  )
) 