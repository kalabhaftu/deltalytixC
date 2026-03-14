'use client'
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Trade as PrismaTrade,
  Account as PrismaAccount,
  // Payout as PrismaPayout, // Payout model not available
  // DashboardLayout as PrismaDashboardLayout, // DashboardLayout model not available

} from '@prisma/client';

// Payout model not available - placeholder type
type PrismaPayout = any;

// DashboardLayout model not available - placeholder type
type PrismaDashboardLayout = {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  desktop: any[];
  mobile: any[];
};

import {
  getUserData,
  updateIsFirstConnectionAction
} from '@/server/user-data';
import {
  getTradesAction,
  groupTradesAction,
  revalidateCache,
  saveDashboardLayoutAction,
  ungroupTradesAction,
  updateTradesAction
} from '@/server/database';
import {
  WidgetType,
  WidgetSize,
} from '@/app/dashboard/types/dashboard';
import {
  deletePayoutAction,
  deleteAccountAction,
  setupAccountAction,
  savePayoutAction,
} from '@/server/accounts';
import { createClient } from '@/lib/supabase';
import { signOut } from '@/server/auth';
import { useUserStore } from '@/store/user-store';
import { useTradesStore } from '@/store/trades-store';
import {
  endOfDay,
  isValid,
  startOfDay
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
// filterActiveAccounts and filterTradesFromActiveAccounts removed - not used
import { useAccountFilterSettings } from '@/hooks/use-account-filter-settings';
import { AccountFilterSettings } from '@/types/account-filter-settings';
import { calculateStatistics, formatCalendarData } from '@/lib/utils';
import { useFilteredTrades, type TradeFilters } from '@/hooks/use-filtered-trades';
import { useParams, usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { handleServerActionError } from '@/lib/utils/server-action-error-handler';
import { useDatabaseRealtime } from '@/lib/realtime/database-realtime';
import { defaultLayouts, defaultLayoutsWithKPI } from '@/lib/dashboard/default-layouts';

// Types from trades-data.tsx
type StatisticsProps = {
  cumulativeFees: number
  cumulativePnl: number
  winningStreak: number
  winRate: number
  nbTrades: number
  nbBe: number
  nbWin: number
  nbLoss: number
  totalPositionTime: number
  averagePositionTime: string
  profitFactor: number
  grossLosses: number
  grossWin: number
  biggestWin: number
  biggestLoss: number
  averageWin: number
  averageLoss: number
  totalPayouts: number
  nbPayouts: number
  totalPnL: number
}

type CalendarData = {
  [date: string]: {
    pnl: number
    tradeNumber: number
    longNumber: number
    shortNumber: number
    trades: PrismaTrade[]
  }
}

interface DateRange {
  from: Date
  to: Date
}

// Removed TickRange - tick details feature has been removed

interface PnlRange {
  min: number | undefined
  max: number | undefined
}


// Add new interface for time range
interface TimeRange {
  range: string | null
}


// Update WeekdayFilter interface to use numbers
interface WeekdayFilter {
  day: number | null
}

// Add new interface for hour filter
interface HourFilter {
  hour: number | null
}


// Update Account type to include payouts and balanceToDate
export interface Account extends Omit<PrismaAccount, 'payouts'> {
  payouts?: PrismaPayout[]
  balanceToDate?: number
  status?: string
  accountType?: 'live' | 'prop-firm'
}



interface DataContextType {
  refreshTrades: () => Promise<void>
  refreshAllData: () => Promise<void>
  isPlusUser: () => boolean
  isLoading: boolean
  isLoadingAccountFilterSettings: boolean
  accountFilterSettings: AccountFilterSettings | null
  updateAccountFilterSettings: (newSettings: Partial<AccountFilterSettings>) => Promise<void>
  isMobile: boolean
  changeIsFirstConnection: (isFirstConnection: boolean) => void
  isFirstConnection: boolean
  setIsFirstConnection: (isFirstConnection: boolean) => void
  error: string | null
  setError: React.Dispatch<React.SetStateAction<string | null>>

  // Formatted trades and filters
  formattedTrades: PrismaTrade[]
  instruments: string[]
  setInstruments: React.Dispatch<React.SetStateAction<string[]>>
  accountNumbers: string[]
  setAccountNumbers: React.Dispatch<React.SetStateAction<string[]>>
  dateRange: DateRange | undefined
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>
  pnlRange: PnlRange
  setPnlRange: React.Dispatch<React.SetStateAction<PnlRange>>
  timeRange: TimeRange
  setTimeRange: React.Dispatch<React.SetStateAction<TimeRange>>
  weekdayFilter: WeekdayFilter
  setWeekdayFilter: React.Dispatch<React.SetStateAction<WeekdayFilter>>
  hourFilter: HourFilter
  setHourFilter: React.Dispatch<React.SetStateAction<HourFilter>>

  // Statistics and calendar
  statistics: StatisticsProps
  calendarData: CalendarData

  // Accounts
  accounts: Account[]


  // Mutations
  // Trades
  updateTrades: (tradeIds: string[], update: Partial<PrismaTrade>) => Promise<void>
  groupTrades: (tradeIds: string[]) => Promise<void>
  ungroupTrades: (tradeIds: string[]) => Promise<void>

  // Accounts
  deleteAccount: (account: Account) => Promise<void>
  saveAccount: (account: Account) => Promise<void>

  // Payouts
  savePayout: (payout: PrismaPayout) => Promise<void>
  deletePayout: (payoutId: string) => Promise<void>

  // Dashboard layout
  saveDashboardLayout: (layout: PrismaDashboardLayout) => Promise<void>
}


const DataContext = createContext<DataContextType | undefined>(undefined);

// Add this hook before the UserDataProvider component
function useIsMobileDetection() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const checkMobile = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);

    // Check immediately
    checkMobile(mobileQuery);

    // Add listener for changes
    mobileQuery.addEventListener('change', checkMobile);
    return () => mobileQuery.removeEventListener('change', checkMobile);
  }, []);

  return isMobile;
}

// Import unified balance calculator
import { calculateAccountBalance as calcBalance } from '@/lib/utils/balance-calculator';

const supabase = createClient()

const normalizeSelection = (selection: string[]) =>
  Array.from(new Set(selection)).sort()

const selectionsMatch = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false
  const normalizedA = normalizeSelection(a)
  const normalizedB = normalizeSelection(b)
  return normalizedA.every((value, index) => value === normalizedB[index])
}

export const DataProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams();
  const isMobile = useIsMobileDetection();

  // Get store values
  const user = useUserStore(state => state.user);
  const setUser = useUserStore(state => state.setUser);

  const setAccounts = useUserStore(state => state.setAccounts);
  const setDashboardLayout = useUserStore(state => state.setDashboardLayout);
  const supabaseUser = useUserStore(state => state.supabaseUser);
  const timezone = useUserStore(state => state.timezone);
  const accounts = useUserStore(state => state.accounts);
  const setSupabaseUser = useUserStore(state => state.setSupabaseUser);

  const trades = useTradesStore(state => state.trades);
  const setTrades = useTradesStore(state => state.setTrades);
  const dashboardLayout = useUserStore(state => state.dashboardLayout);
  const locale = 'en' // Fixed to English since we removed i18n
  const isLoading = useUserStore(state => state.isLoading)
  const setIsLoading = useUserStore(state => state.setIsLoading)

  // Remove unused states that caused dependency issues

  // Account filter settings
  const { settings: accountFilterSettings, isLoading: isLoadingAccountFilterSettings, updateSettings: updateAccountFilterSettings } = useAccountFilterSettings()

  // Local states

  // Filter states
  const [instruments, setInstruments] = useState<string[]>([]);
  const [accountNumbers, setAccountNumbers] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [pnlRange, setPnlRange] = useState<PnlRange>({ min: undefined, max: undefined });
  const [timeRange, setTimeRange] = useState<TimeRange>({ range: null });
  const [weekdayFilter, setWeekdayFilter] = useState<WeekdayFilter>({ day: null });
  const [hourFilter, setHourFilter] = useState<HourFilter>({ hour: null });
  const [isFirstConnection, setIsFirstConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize account filter from saved settings (CLIENT-SIDE ONLY)
  const selectionInitializedRef = React.useRef(false)
  const lastSyncedSelectionRef = React.useRef<string>('')

  // Initialize account filter from saved settings only (NO AUTO-SELECTION)
  // User must explicitly select accounts
  useEffect(() => {
    if (!accounts || accounts.length === 0) {
      return
    }

    // ONLY load from saved settings - no auto-selection
    const savedSelection = accountFilterSettings?.selectedPhaseAccountIds || []
    const savedSignature = JSON.stringify(normalizeSelection(savedSelection))

    if (!selectionInitializedRef.current) {
      // Check DB settings first
      if (savedSelection.length > 0) {
        setAccountNumbers(savedSelection)
        selectionInitializedRef.current = true
        lastSyncedSelectionRef.current = savedSignature

        try {
          localStorage.setItem(
            'settings-cache',
            JSON.stringify({
              selectedPhaseAccountIds: savedSelection,
            })
          )
        } catch (error) {
          // Ignore storage errors
        }
        return
      }

      // Check localStorage cache as fallback
      let cachedSelection: string[] | null = null
      try {
        const cached = localStorage.getItem('settings-cache')
        if (cached) {
          const settings = JSON.parse(cached)
          cachedSelection = settings.selectedPhaseAccountIds || null
        }
      } catch (error) {
        // Ignore parsing errors
      }

      if (cachedSelection && cachedSelection.length > 0) {
        setAccountNumbers(cachedSelection)
        selectionInitializedRef.current = true
        lastSyncedSelectionRef.current = JSON.stringify(normalizeSelection(cachedSelection))
        return
      }

      // NO SAVED SELECTION - leave accountNumbers empty
      // This will show "All Accounts" in the navbar and show all data
      // User must explicitly select accounts via the filter dialog
      selectionInitializedRef.current = true
      lastSyncedSelectionRef.current = ''
      return
    }

    // Sync updates from server settings (e.g., another tab saved settings)
    if (
      savedSelection.length > 0 &&
      savedSignature !== lastSyncedSelectionRef.current &&
      !selectionsMatch(savedSelection, accountNumbers)
    ) {
      setAccountNumbers(savedSelection)
      lastSyncedSelectionRef.current = savedSignature
    }
  }, [accounts, accountFilterSettings, accountNumbers, setAccountNumbers])

  // Track active data loading to prevent concurrent calls - MOVED TO useRef FOR PERSISTENCE
  const activeLoadPromiseRef = React.useRef<Promise<void> | null>(null)
  const hasLoadedDataRef = React.useRef(false)

  // Load initial data (user + accounts) from /api/v1/init
  const loadData = useCallback(async () => {
    if (isLoading) return
    if (activeLoadPromiseRef.current) return activeLoadPromiseRef.current
    
    activeLoadPromiseRef.current = (async () => {
      try {
        setIsLoading(true);

        // Step 1: Get supabase user for session
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          setIsLoading(false)
          hasLoadedDataRef.current = false
          return;
        }
        setSupabaseUser(user);

        // Set default dashboard layout if none exists
        if (!dashboardLayout) {
          const freshDefaultLayout = { 
            ...defaultLayouts,
            id: `default-${user.id}`,
            userId: user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
          try {
            const cachedLayout = localStorage.getItem(`dashboard-layout-${user.id}`)
            if (cachedLayout) {
              const parsedLayout = JSON.parse(cachedLayout)
              if (parsedLayout.desktop && parsedLayout.mobile) {
                setDashboardLayout(parsedLayout)
              } else {
                setDashboardLayout(freshDefaultLayout)
                localStorage.setItem(`dashboard-layout-${user.id}`, JSON.stringify(freshDefaultLayout))
              }
            } else {
              setDashboardLayout(freshDefaultLayout)
              localStorage.setItem(`dashboard-layout-${user.id}`, JSON.stringify(freshDefaultLayout))
            }
          } catch (error) {
            setDashboardLayout(freshDefaultLayout)
          }
        }

        // Step 2: Fetch initial data from v1 init endpoint (NO trades — those come via React Query)
        const initResponse = await fetch('/api/v1/init', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
        
        if (!initResponse.ok) throw new Error('Failed to fetch initial data')
        const initData = await initResponse.json()
        
        if (!initData.isAuthenticated) {
          try { await signOut(); } catch (error) {}
          setIsLoading(false)
          hasLoadedDataRef.current = false
          return;
        }

        const { user: userData, accounts: rawAccounts, calendarNotes } = initData

        setUser(userData);
        setIsFirstConnection(userData?.isFirstConnection || false)
        
        // Cache calendar notes for hooks
        if (calendarNotes) {
          localStorage.setItem('calendar-notes-cache', JSON.stringify(calendarNotes))
        }
        
        // Persist account filter settings
        if (userData?.accountFilterSettings) {
          try {
            const hasPendingChanges = localStorage.getItem('settings-pending')
            if (!hasPendingChanges) {
              const settings = JSON.parse(userData.accountFilterSettings)
              localStorage.setItem('settings-cache', JSON.stringify(settings))
            }
          } catch (error) {}
        }

        // NOTE: Trades are NO LONGER fetched here.
        // They come via useFilteredTrades() React Query hook below.
        // Set empty trades in store — legacy consumers will get data from context.formattedTrades
        setTrades([])

        // Calculate balanceToDate for accounts (without trades, uses trade count from API)
        const accountsWithBalance = (rawAccounts || []).map((account: any) => ({
          ...account,
          balanceToDate: calcBalance(account, [], [], {
            excludeFailedAccounts: false,
            includePayouts: true
          })
        }));
        
        setAccounts(accountsWithBalance);

      } catch (error) {
        if (error instanceof Error && (
          error.message === 'NEXT_REDIRECT' || 
          error.message.includes('NEXT_REDIRECT') ||
          ('digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT'))
        )) {
          throw error;
        }
        if (error instanceof Error && (
          error.message.includes('User not authenticated') ||
          error.message.includes('User not found') ||
          error.message.includes('Unauthorized')
        )) {
          try { await signOut(); } catch (signOutError) {}
          return;
        }
        hasLoadedDataRef.current = false;
      } finally {
        setIsLoading(false);
        setTimeout(() => { activeLoadPromiseRef.current = null; }, 0);
      }
    })();

    return activeLoadPromiseRef.current
  }, [dashboardLayout, isLoading, setAccounts, setDashboardLayout, setIsLoading, setSupabaseUser, setTrades, setUser]);

  // Load data on mount only - ONCE
  useEffect(() => {
    // CRITICAL FIX: Only run on initial mount when supabaseUser is first set
    if (!supabaseUser) {
      return
    }
    
    // CRITICAL: Check and set flag IMMEDIATELY to prevent duplicate calls
    if (hasLoadedDataRef.current) {
      return
    }
    
    // START LOADING IMMEDIATELY before any async work
    setIsLoading(true);
    hasLoadedDataRef.current = true
    
    let mounted = true;

    const loadDataIfMounted = async () => {
      if (!mounted) return;
      
      try {
        // ✅ Just load main data - account filter settings are handled by the hook
        await loadData()
      } catch (error) {
        // Handle Next.js redirect errors (these are normal and expected)
        if (error instanceof Error && (
          error.message === 'NEXT_REDIRECT' || 
          error.message.includes('NEXT_REDIRECT') ||
          ('digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT'))
        )) {
          // Let the redirect proceed - these are handled by Next.js router
          return;
        }

        // Handle authentication errors
        if (error instanceof Error && (
          error.message.includes('User not authenticated') ||
          error.message.includes('User not found') ||
          error.message.includes('Unauthorized')
        )) {
          return;
        }
        
        // Silent fail to prevent unhandled promise rejections
        
        // Set error state to inform user
        setError('Failed to load data. Please refresh the page.');
        setIsLoading(false);
      }
    };

    loadDataIfMounted();

    return () => {
      mounted = false;
    };
  }, [supabaseUser, loadData, setIsLoading]); // ONLY depend on supabaseUser, run once when it's set

  // ============================================
  // REACT QUERY: Server-filtered trades + stats + calendar
  // ============================================
  const queryClient = useQueryClient()
  
  // Build filters from current DataProvider state
  const tradeFilters: TradeFilters = useMemo(() => ({
    accounts: accountNumbers.length > 0 ? accountNumbers : undefined,
    dateFrom: dateRange?.from?.toISOString(),
    dateTo: dateRange?.to?.toISOString(),
    instruments: instruments.length > 0 ? instruments : undefined,
    pnlMin: pnlRange.min,
    pnlMax: pnlRange.max,
    timeRange: timeRange.range,
    weekday: weekdayFilter.day,
    hour: hourFilter.hour,
    limit: 5000,
    includeStats: true,
    includeCalendar: true,
    timezone: timezone || 'UTC',
  }), [accountNumbers, dateRange, instruments, pnlRange, timeRange, weekdayFilter, hourFilter, timezone])

  const { data: serverTradeData } = useFilteredTrades(tradeFilters, !!user?.id && !isLoading)

  // ============================================
  // REALTIME SUBSCRIPTIONS (Server-push, no polling)
  // ============================================
  const lastRealtimeRefreshRef = React.useRef<number>(0)
  const realtimeRefreshTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  
  // Debounced refresh — invalidates React Query cache instead of full reload
  const debouncedRefresh = useCallback(() => {
    const now = Date.now()
    const timeSinceLastRefresh = now - lastRealtimeRefreshRef.current
    const cooldown = 800
    
    if (timeSinceLastRefresh < cooldown) {
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current)
      }
      realtimeRefreshTimeoutRef.current = setTimeout(() => {
        lastRealtimeRefreshRef.current = Date.now()
        // Invalidate React Query cache — triggers fresh server fetch
        queryClient.invalidateQueries({ queryKey: ['v1', 'trades'] })
        queryClient.invalidateQueries({ queryKey: ['v1', 'reports'] })
        loadData() // Still reload accounts/user for account balance updates
      }, cooldown - timeSinceLastRefresh)
      return
    }
    
    setTimeout(() => {
      lastRealtimeRefreshRef.current = Date.now()
      queryClient.invalidateQueries({ queryKey: ['v1', 'trades'] })
      queryClient.invalidateQueries({ queryKey: ['v1', 'reports'] })
      loadData()
    }, 300)
  }, [loadData, queryClient])
  
  useDatabaseRealtime({
    userId: user?.id,
    enabled: !!user?.id && !isLoading,
    onTradeChange: () => debouncedRefresh(),
    onAccountChange: () => debouncedRefresh()
  })
  
  useEffect(() => {
    return () => {
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current)
      }
    }
  }, [])

  const refreshTrades = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    
    try {
      // Clear legacy caches
      try {
        localStorage.removeItem('calendar-notes-cache')
        localStorage.removeItem('last-refresh-timestamp')
      } catch (e) {}
      
      hasLoadedDataRef.current = false
      activeLoadPromiseRef.current = null
      
      await revalidateCache([`trades-${user.id}`, `user-data-${user.id}-${locale}`])
      
      // Invalidate React Query caches for fresh data
      await queryClient.invalidateQueries({ queryKey: ['v1'] })
      
      await new Promise(resolve => setTimeout(resolve, 200))
      await loadData()
    } catch (error) {
      if (error instanceof Error && (
        error.message === 'NEXT_REDIRECT' || 
        error.message.includes('NEXT_REDIRECT') ||
        ('digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT'))
      )) {
        setIsLoading(false);
        throw error;
      }
      if (error instanceof Error && (
        error.message.includes('User not authenticated') ||
        error.message.includes('User not found') ||
        error.message.includes('Unauthorized')
      )) {
        setIsLoading(false);
        return;
      }
      setIsLoading(false)
    } finally {
      setTimeout(() => { setIsLoading(false) }, 200)
    }
  }, [user?.id, loadData, setIsLoading, locale, queryClient])

  // Expose refreshAllData as an alias for refreshTrades (it refreshes everything including accounts)
  const refreshAllData = refreshTrades

  // Memoize hidden account numbers to prevent unnecessary re-renders
  const hiddenAccountNumbers = useMemo(() => {
    return accounts
      .filter(a => a.isArchived === true)
      .map(a => a.number);
  }, [accounts]);

  // SERVER-COMPUTED: formattedTrades, statistics, calendarData
  // Previously 110+ lines of client-side useMemo filtering — now all server-side via /api/v1/trades
  const formattedTrades = useMemo(() => {
    if (serverTradeData?.trades && serverTradeData.trades.length > 0) {
      return serverTradeData.trades;
    }
    // Fallback to Zustand trades for backward compatibility during migration
    if (!trades || !Array.isArray(trades) || trades.length === 0) return [];
    // Filter out hidden accounts only
    return trades.filter(trade => !hiddenAccountNumbers.includes(trade.accountNumber));
  }, [serverTradeData?.trades, trades, hiddenAccountNumbers]);

  const statistics = useMemo(() => {
    // Use server-computed statistics when available
    if (serverTradeData?.statistics) return serverTradeData.statistics;
    // Fallback to client-side calculation
    return calculateStatistics(formattedTrades, accounts);
  }, [serverTradeData?.statistics, formattedTrades, accounts]);

  const calendarData = useMemo(() => {
    // Use server-computed calendar data when available
    if (serverTradeData?.calendarData) return serverTradeData.calendarData;
    // Fallback to client-side calculation
    return formatCalendarData(formattedTrades, accounts);
  }, [serverTradeData?.calendarData, formattedTrades, accounts]);

  const isPlusUser = () => {
    return true; // All users now have full access
  };


  const saveAccount = useCallback(async (newAccount: Account) => {
    if (!user?.id) return

    try {
      // Get the current account to preserve other properties
      const { accounts } = useUserStore.getState()
      const currentAccount = accounts.find(acc => acc.number === newAccount.number) as Account
      // If the account is not found, create it
      if (!currentAccount) {
        const createdAccount = await setupAccountAction(newAccount)
        setAccounts([...accounts, createdAccount])
        // Revalidate cache for next reload
        revalidateCache([`user-data-${user.id}`])
        return
      }

      // Update the account in the database
      const updatedAccount = await setupAccountAction(newAccount)
      // Update the account in the local state
      const updatedAccounts = accounts.map((account: Account) => {
        if (account.number === updatedAccount.number) {
          return { ...account, ...updatedAccount };
        }
        return account;
      });
      setAccounts(updatedAccounts);
      revalidateCache([`user-data-${user.id}`])
    } catch (error) {
      // Error updating account
      throw error
    }
  }, [user?.id, setAccounts])


  // Add savePayout function
  const savePayout = useCallback(async (payout: PrismaPayout) => {
    if (!user?.id) return;

    try {
      // Add to database
      const newPayout = await savePayoutAction(payout);

      // Update local state
      setAccounts(accounts.map((account: Account) => {
        if (account.number === payout.accountNumber) {
          return {
            ...account,
            payouts: [...(account.payouts || []), newPayout]
          };
        }
        return account;
      })
      );

    } catch (error) {
      // Error adding payout
      throw error;
    }
  }, [user?.id, accounts, setAccounts]);

  // Add deleteAccount function
  const deleteAccount = useCallback(async (account: Account) => {
    if (!user?.id) return;

    try {
      // Update local state
      setAccounts(accounts.filter(acc => acc.id !== account.id));
      // Delete from database
      await deleteAccountAction(account);
    } catch (error) {
      // Error deleting account
      if (handleServerActionError(error, { context: 'Delete Account' })) {
        return // Return early on deployment error (will refresh)
      }
      throw error;
    }
  }, [user?.id, accounts, setAccounts]);

  // Add deletePayout function
  const deletePayout = useCallback(async (payoutId: string) => {
    if (!user?.id) return;

    try {

      // Update local state
      setAccounts(accounts.map((account: Account) => ({
        ...account,
        payouts: account.payouts?.filter(p => p.id !== payoutId) || []
      })
      ));

      // Delete from database
      await deletePayoutAction(payoutId);

    } catch (error) {
      // Error deleting payout
      if (handleServerActionError(error, { context: 'Delete Payout' })) {
        return // Return early on deployment error (will refresh)
      }
      throw error;
    }
  }, [user?.id, accounts, setAccounts]);

  const changeIsFirstConnection = useCallback(async (isFirstConnection: boolean) => {
    if (!user?.id) return
    // Update the user in the database
    setIsFirstConnection(isFirstConnection)
    await updateIsFirstConnectionAction(isFirstConnection)
  }, [user?.id, setIsFirstConnection])

  const updateTrades = useCallback(async (tradeIds: string[], update: Partial<PrismaTrade>) => {
    if (!user?.id) return
    const updatedTrades = trades.map(
      trade =>
        tradeIds.includes(trade.id) ? {
          ...trade,
          ...update
        } : trade
    )
    setTrades(updatedTrades)
    await updateTradesAction(tradeIds, update)
  }, [user?.id, trades, setTrades])

  const groupTrades = useCallback(async (tradeIds: string[]) => {
    if (!user?.id) return
    // CRITICAL FIX: Only update trades that are in the tradeIds array
    setTrades(trades.map(trade => 
      tradeIds.includes(trade.id) 
        ? { ...trade, groupId: tradeIds[0] }
        : trade
    ))
    await groupTradesAction(tradeIds)
  }, [user?.id, trades, setTrades])

  const ungroupTrades = useCallback(async (tradeIds: string[]) => {
    if (!user?.id) return
    // CRITICAL FIX: Only update trades that are in the tradeIds array
    setTrades(trades.map(trade => 
      tradeIds.includes(trade.id)
        ? { ...trade, groupId: null }
        : trade
    ))
    await ungroupTradesAction(tradeIds)
  }, [user?.id, trades, setTrades])

  const saveDashboardLayout = useCallback(async (layout: PrismaDashboardLayout) => {
    if (!user?.id) return
    setDashboardLayout(layout)
    await saveDashboardLayoutAction(layout)
    revalidateCache([`user-data-${user.id}`])

    // Update localStorage to keep cache fresh for next visit
    try {
      localStorage.setItem(`dashboard-layout-${user.id}`, JSON.stringify(layout))
    } catch (error) {
      // Ignore localStorage errors
    }
  }, [user?.id, setDashboardLayout])

  const contextValue: DataContextType = {
    isPlusUser,
    isLoading,
    isLoadingAccountFilterSettings,
    accountFilterSettings,
    updateAccountFilterSettings,
    isMobile,
    refreshTrades,
    refreshAllData,
    changeIsFirstConnection,
    isFirstConnection,
    setIsFirstConnection,
    error,
    setError,

    // Formatted trades and filters
    formattedTrades,
    instruments,
    setInstruments,
    accountNumbers,
    setAccountNumbers,
    dateRange,
    setDateRange,
    pnlRange,
    setPnlRange,

    // Time range related
    timeRange,
    setTimeRange,

    // Weekday filter related
    weekdayFilter,
    setWeekdayFilter,

    // Hour filter related
    hourFilter,
    setHourFilter,

    // Statistics and calendar
    statistics,
    calendarData,

    // Accounts
    accounts,

    // Mutations

    // Update trade
    updateTrades,
    groupTrades,
    ungroupTrades,

    // Accounts
    deleteAccount,
    saveAccount,

    // Group functions
    // Payout functions
    deletePayout,
    savePayout,

    // Dashboard layout
    saveDashboardLayout,
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Add getTimeRangeKey function at the top level
function getTimeRangeKey(timeInPosition: number): string {
  const minutes = timeInPosition / 60 // Convert seconds to minutes
  if (minutes < 1) return 'under1min'
  if (minutes >= 1 && minutes < 5) return '1to5min'
  if (minutes >= 5 && minutes < 10) return '5to10min'
  if (minutes >= 10 && minutes < 15) return '10to15min'
  if (minutes >= 15 && minutes < 30) return '15to30min'
  if (minutes >= 30 && minutes < 60) return '30to60min'
  if (minutes >= 60 && minutes < 120) return '1to2hours'
  if (minutes >= 120 && minutes < 300) return '2to5hours'
  return 'over5hours'
}