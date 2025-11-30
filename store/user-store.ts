import { create } from 'zustand'
import { User } from '@prisma/client'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { Account } from '@/context/data-provider'

type UserStore = {
  user: User | null
  supabaseUser: SupabaseUser | null
  accounts: Account[]
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
        dashboardLayout: null
      }),
    })
  )
) 