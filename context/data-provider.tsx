'use client'
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo
} from 'react';

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
import { useParams, usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { handleServerActionError } from '@/lib/utils/server-action-error-handler';
import { useDatabaseRealtime } from '@/lib/realtime/database-realtime';

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
  totalPayouts: number
  nbPayouts: number
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

// Original default layouts (without KPI widgets) - used for existing users to prevent flash
export const defaultLayouts: PrismaDashboardLayout = {
  id: '',
  userId: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  desktop: [
    // Row 1 - KPI widgets
    {
      "i": "widget-net-pnl-kpi",
      "type": "netPnlKpi",
      "size": "kpi",
      "x": 0,
      "y": 0,
      "w": 2.4,
      "h": 1.8
    },
    {
      "i": "widget-win-rate-kpi",
      "type": "winRateKpi",
      "size": "kpi",
      "x": 2.4,
      "y": 0,
      "w": 2.4,
      "h": 1.8
    },
    {
      "i": "widget-profit-factor-kpi",
      "type": "profitFactorKpi",
      "size": "kpi",
      "x": 4.8,
      "y": 0,
      "w": 2.4,
      "h": 1.8
    },
    {
      "i": "widget-day-win-rate-kpi",
      "type": "dayWinRateKpi",
      "size": "kpi",
      "x": 7.2,
      "y": 0,
      "w": 2.4,
      "h": 1.8
    },
    {
      "i": "widget-avg-win-loss-kpi",
      "type": "avgWinLossKpi",
      "size": "kpi",
      "x": 9.6,
      "y": 0,
      "w": 2.4,
      "h": 1.8
    },
    
    // Row 2 - Statistics and Trade Distribution
    {
      "i": "widget1752135396857",
      "type": "statisticsWidget",
      "size": "medium",
      "x": 0,
      "y": 3,
      "w": 6,
      "h": 4
    },
    {
      "i": "widget1752135370000",
      "type": "tradeDistribution",
      "size": "medium",
      "x": 6,
      "y": 3,
      "w": 6,
      "h": 4
    },
    
    // Row 3 - Chart widgets
    {
      "i": "widget1752135357688",
      "type": "weekdayPnlChart",
      "size": "medium",
      "x": 0,
      "y": 7,
      "w": 6,
      "h": 4
    },
    {
      "i": "widget1752135361015",
      "type": "timeInPositionChart",
      "size": "medium",
      "x": 6,
      "y": 7,
      "w": 6,
      "h": 4
    },
    
    // Row 4 - Calendar (full width)
    {
      "i": "widget1751403095730",
      "type": "calendarAdvanced",
      "size": "extra-large",
      "x": 0,
      "y": 11,
      "w": 12,
      "h": 6
    },

    // Row 4 - Equity Chart and P&L Chart
    {
      "i": "widget1752135363430",
      "type": "equityChart",
      "size": "large",
      "x": 0,
      "y": 14,
      "w": 6,
      "h": 8
    },
    {
      "i": "widget1751741589330",
      "type": "pnlChart",
      "size": "medium",
      "x": 6,
      "y": 14,
      "w": 6,
      "h": 4
    },

    // Row 5 - Time charts
    {
      "i": "widget1752135359621",
      "type": "timeOfDayChart",
      "size": "medium",
      "x": 6,
      "y": 18,
      "w": 6,
      "h": 4
    },

    // Row 7 - Side charts (shifted from row 6)
    {
      "i": "widget1752135365730",
      "type": "pnlBySideChart",
      "size": "medium",
      "x": 0,
      "y": 23,
      "w": 6,
      "h": 4
    },
    {
      "i": "widget1752135368429",
      "type": "radarChart",
      "size": "medium",
      "x": 6,
      "y": 23,
      "w": 6,
      "h": 4
    },
    // Row 8 - Commission and Time Range (shifted from row 7)
    {
      "i": "widget1752135370579",
      "type": "commissionsPnl",
      "size": "medium",
      "x": 0,
      "y": 27,
      "w": 6,
      "h": 4
    },
    {
      "i": "widget1752135378584",
      "type": "timeRangePerformance",
      "size": "medium",
      "x": 6,
      "y": 27,
      "w": 6,
      "h": 4
    },

    // Row 9 - Small widgets (tiny sizes) (shifted from row 8)
    {
      "i": "widget1752135435916",
      "type": "riskRewardRatio",
      "size": "tiny",
      "x": 0,
      "y": 31,
      "w": 3,
      "h": 1
    },
    {
      "i": "widget1752135437611",
      "type": "profitFactor",
      "size": "tiny",
      "x": 3,
      "y": 31,
      "w": 3,
      "h": 1
    },
    {
      "i": "widget1752135441717",
      "type": "cumulativePnl",
      "size": "tiny",
      "x": 6,
      "y": 31,
      "w": 3,
      "h": 1
    },
    {
      "i": "widget1752135443857",
      "type": "tradePerformance",
      "size": "tiny",
      "x": 9,
      "y": 31,
      "w": 3,
      "h": 1
    },

    // Row 10 - More small widgets (shifted from row 9)
    {
      "i": "widget1752135445916",
      "type": "winningStreak",
      "size": "tiny",
      "x": 0,
      "y": 32,
      "w": 3,
      "h": 1
    },
    {
      "i": "widget1752135449717",
      "type": "averagePositionTime",
      "size": "tiny",
      "x": 3,
      "y": 32,
      "w": 3,
      "h": 1
    },
    {
      "i": "widget1752135451857",
      "type": "longShortPerformance",
      "size": "tiny",
      "x": 6,
      "y": 32,
      "w": 3,
      "h": 1
    },
    {
      "i": "widget1752135448000",
      "type": "advancedMetrics",
      "size": "tiny",
      "x": 9,
      "y": 32,
      "w": 3,
      "h": 1
    },
    
    // Row 10 - Other widgets
  ],
  mobile: [
    // KPI widgets
    {
      i: "mobile-net-pnl-kpi",
      type: "netPnlKpi" as WidgetType,
      size: "kpi" as WidgetSize,
      x: 0,
      y: 0,
      w: 12,
      h: 3
    },
    {
      i: "mobile-win-rate-kpi",
      type: "winRateKpi" as WidgetType,
      size: "kpi" as WidgetSize,
      x: 0,
      y: 3,
      w: 12,
      h: 3
    },
    {
      i: "mobile-profit-factor-kpi",
      type: "profitFactorKpi" as WidgetType,
      size: "kpi" as WidgetSize,
      x: 0,
      y: 6,
      w: 12,
      h: 3
    },
    {
      i: "mobile-day-win-rate-kpi",
      type: "dayWinRateKpi" as WidgetType,
      size: "kpi" as WidgetSize,
      x: 0,
      y: 9,
      w: 12,
      h: 3
    },
    {
      i: "mobile-avg-win-loss-kpi",
      type: "avgWinLossKpi" as WidgetType,
      size: "kpi" as WidgetSize,
      x: 0,
      y: 12,
      w: 12,
      h: 3
    },
    
    // Core widgets
    {
      i: "statisticsWidget",
      type: "statisticsWidget" as WidgetType,
      size: "medium" as WidgetSize,
      x: 0,
      y: 15,
      w: 12,
      h: 4
    },
    {
      i: "calendarWidget",
      type: "calendarAdvanced" as WidgetType,
      size: "extra-large" as WidgetSize,
      x: 0,
      y: 19,
      w: 12,
      h: 6
    },
    {
      i: "equityChart",
      type: "equityChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 0,
      y: 25,
      w: 12,
      h: 6
    },

    // Important small widgets
    {
      i: "cumulativePnl",
      type: "cumulativePnl" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 31,
      w: 12,
      h: 1
    },
    {
      i: "tradePerformance",
      type: "tradePerformance" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 17,
      w: 12,
      h: 1
    },
    {
      i: "profitFactor",
      type: "profitFactor" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 23,
      w: 12,
      h: 1
    },

    // Chart widgets
    {
      i: "pnlChart",
      type: "pnlChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 0,
      y: 24,
      w: 12,
      h: 4
    },
    {
      i: "weekdayPnlChart",
      type: "weekdayPnlChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 0,
      y: 28,
      w: 12,
      h: 4
    },
    {
      i: "timeOfDayChart",
      type: "timeOfDayChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 0,
      y: 32,
      w: 12,
      h: 4
    },
    
    // Other essential widgets
  ]
};

// New default layouts with KPI widgets - used only for new users and reset functionality
export const defaultLayoutsWithKPI: PrismaDashboardLayout = {
  id: '',
  userId: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  desktop: [
    // Row 1 - KPI Widgets (Top row with 5 KPI cards)
    {
      "i": "kpi-net-pnl",
      "type": "netPnlKpi",
      "size": "kpi",
      "x": 0,
      "y": 0,
      "w": 2.4,
      "h": 1.8
    },
    {
      "i": "kpi-win-rate",
      "type": "winRateKpi",
      "size": "kpi",
      "x": 2.4,
      "y": 0,
      "w": 2.4,
      "h": 1.8
    },
    {
      "i": "kpi-profit-factor",
      "type": "profitFactorKpi",
      "size": "kpi",
      "x": 4.8,
      "y": 0,
      "w": 2.4,
      "h": 1.8
    },
    {
      "i": "kpi-day-win-rate",
      "type": "dayWinRateKpi",
      "size": "kpi",
      "x": 7.2,
      "y": 0,
      "w": 2.4,
      "h": 1.8
    },
    {
      "i": "kpi-avg-win-loss",
      "type": "avgWinLossKpi",
      "size": "kpi",
      "x": 9.6,
      "y": 0,
      "w": 2.4,
      "h": 1.8
    },
    
    // Row 2 - Statistics and Trade Distribution  
    {
      "i": "widget1752135396857",
      "type": "statisticsWidget",
      "size": "medium",
      "x": 0,
      "y": 3,
      "w": 6,
      "h": 4
    },
    {
      "i": "widget1752135370000",
      "type": "tradeDistribution",
      "size": "medium",
      "x": 6,
      "y": 3,
      "w": 6,
      "h": 4
    },
    
    // Row 3 - Chart widgets
    {
      "i": "widget1752135357688",
      "type": "weekdayPnlChart",
      "size": "medium",
      "x": 0,
      "y": 7,
      "w": 6,
      "h": 4
    },
    {
      "i": "widget1752135361015",
      "type": "timeInPositionChart",
      "size": "medium",
      "x": 6,
      "y": 7,
      "w": 6,
      "h": 4
    },
    
    // Row 4 - Calendar (full width)
    {
      "i": "widget1751403095730",
      "type": "calendarAdvanced",
      "size": "extra-large",
      "x": 0,
      "y": 11,
      "w": 12,
      "h": 6
    },

    // Row 5 - Equity Chart and P&L Chart
    {
      "i": "widget1752135363430",
      "type": "equityChart",
      "size": "large",
      "x": 0,
      "y": 17,
      "w": 6,
      "h": 8
    },
    {
      "i": "widget1751741589330",
      "type": "pnlChart",
      "size": "medium",
      "x": 6,
      "y": 17,
      "w": 6,
      "h": 4
    },

    // Row 6 - Time charts
    {
      "i": "widget1752135359621",
      "type": "timeOfDayChart",
      "size": "medium",
      "x": 6,
      "y": 21,
      "w": 6,
      "h": 4
    },

    // Row 7 - Side charts
    {
      "i": "widget1752135365730",
      "type": "pnlBySideChart",
      "size": "medium",
      "x": 0,
      "y": 25,
      "w": 6,
      "h": 4
    },
    {
      "i": "widget1752135368429",
      "type": "tickDistribution",
      "size": "medium",
      "x": 6,
      "y": 25,
      "w": 6,
      "h": 4
    },
    // Row 8 - Commission and Time Range
    {
      "i": "widget1752135370579",
      "type": "commissionsPnl",
      "size": "medium",
      "x": 0,
      "y": 29,
      "w": 6,
      "h": 4
    },
    {
      "i": "widget1752135378584",
      "type": "timeRangePerformance",
      "size": "medium",
      "x": 6,
      "y": 29,
      "w": 6,
      "h": 4
    },

    // Row 9 - Small widgets (tiny sizes)
    {
      "i": "widget1752135435916",
      "type": "riskRewardRatio",
      "size": "tiny",
      "x": 0,
      "y": 33,
      "w": 3,
      "h": 1
    },
    {
      "i": "widget1752135437611",
      "type": "profitFactor",
      "size": "tiny",
      "x": 3,
      "y": 33,
      "w": 3,
      "h": 1
    },
    {
      "i": "widget1752135441717",
      "type": "cumulativePnl",
      "size": "tiny",
      "x": 6,
      "y": 33,
      "w": 3,
      "h": 1
    },
    {
      "i": "widget1752135443857",
      "type": "tradePerformance",
      "size": "tiny",
      "x": 9,
      "y": 33,
      "w": 3,
      "h": 1
    },

    // Row 10 - More small widgets
    {
      "i": "widget1752135445916",
      "type": "winningStreak",
      "size": "tiny",
      "x": 0,
      "y": 34,
      "w": 3,
      "h": 1
    },
    {
      "i": "widget1752135449717",
      "type": "averagePositionTime",
      "size": "tiny",
      "x": 3,
      "y": 34,
      "w": 3,
      "h": 1
    },
    {
      "i": "widget1752135451857",
      "type": "longShortPerformance",
      "size": "tiny",
      "x": 6,
      "y": 34,
      "w": 3,
      "h": 1
    },
    {
      "i": "widget1752135448000",
      "type": "advancedMetrics",
      "size": "tiny",
      "x": 9,
      "y": 34,
      "w": 3,
      "h": 1
    },
    
    // Row 10 - Other widgets
  ],
  mobile: [
    // KPI widgets (stacked vertically on mobile)
    {
      i: "kpi-net-pnl-mobile",
      type: "netPnlKpi" as WidgetType,
      size: "kpi" as WidgetSize,
      x: 0,
      y: 0,
      w: 12,
      h: 3
    },
    {
      i: "kpi-win-rate-mobile",
      type: "winRateKpi" as WidgetType,
      size: "kpi" as WidgetSize,
      x: 0,
      y: 3,
      w: 12,
      h: 3
    },
    {
      i: "kpi-profit-factor-mobile",
      type: "profitFactorKpi" as WidgetType,
      size: "kpi" as WidgetSize,
      x: 0,
      y: 6,
      w: 12,
      h: 3
    },
    {
      i: "kpi-day-win-rate-mobile",
      type: "dayWinRateKpi" as WidgetType,
      size: "kpi" as WidgetSize,
      x: 0,
      y: 9,
      w: 12,
      h: 3
    },
    {
      i: "kpi-avg-win-loss-mobile",
      type: "avgWinLossKpi" as WidgetType,
      size: "kpi" as WidgetSize,
      x: 0,
      y: 12,
      w: 12,
      h: 3
    },
    
    // Core widgets
    {
      i: "statisticsWidget",
      type: "statisticsWidget" as WidgetType,
      size: "medium" as WidgetSize,
      x: 0,
      y: 15,
      w: 12,
      h: 4
    },
    {
      i: "calendarWidget",
      type: "calendarAdvanced" as WidgetType,
      size: "extra-large" as WidgetSize,
      x: 0,
      y: 19,
      w: 12,
      h: 6
    },
    {
      i: "equityChart",
      type: "equityChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 0,
      y: 25,
      w: 12,
      h: 6
    },

    // Important small widgets
    {
      i: "cumulativePnl",
      type: "cumulativePnl" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 31,
      w: 12,
      h: 1
    },
    {
      i: "tradePerformance",
      type: "tradePerformance" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 32,
      w: 12,
      h: 1
    },
    {
      i: "profitFactor",
      type: "profitFactor" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 33,
      w: 12,
      h: 1
    },

    // Chart widgets
    {
      i: "pnlChart",
      type: "pnlChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 0,
      y: 34,
      w: 12,
      h: 4
    },
    {
      i: "weekdayPnlChart",
      type: "weekdayPnlChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 0,
      y: 38,
      w: 12,
      h: 4
    },
    {
      i: "timeOfDayChart",
      type: "timeOfDayChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 0,
      y: 42,
      w: 12,
      h: 4
    },
    
    // Other essential widgets
  ]
};

// Combined Context Type
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
          localStorage.setItem('account-filter-settings-cache', JSON.stringify(accountFilterSettings))
        } catch (error) {
          // Ignore storage errors
        }
        return
      }

      // Check localStorage cache as fallback
      let cachedSelection: string[] | null = null
      try {
        const cached = localStorage.getItem('account-filter-settings-cache')
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

  // Load data from the server
  const loadData = useCallback(async () => {
    // PERFORMANCE FIX: Prevent multiple simultaneous loads
    if (isLoading) {
      return
    }

    // Prevent concurrent data loading - reuse in-flight promise
    if (activeLoadPromiseRef.current) {
      return activeLoadPromiseRef.current
    }
    
    // Create the load promise with proper error handling
    activeLoadPromiseRef.current = (async () => {
      try {
        setIsLoading(true);

      // Step 1: Get user from AuthProvider (no API call needed - already checked)
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

      // Check if we're on the accounts page - if so, fetch trades for all visible accounts
      const isAccountsPage = pathname?.startsWith('/dashboard/accounts') || false
      
      // Get account filter settings for DB-level filtering (only for dashboard/widgets)
      let selectedAccounts: string[] = []
      if (!isAccountsPage) {
        // Only apply account filter for dashboard/widgets, not accounts page
        try {
          const cached = localStorage.getItem('account-filter-settings-cache')
          if (cached) {
            const settings = JSON.parse(cached)
            selectedAccounts = settings.selectedPhaseAccountIds || []
          }
        } catch (error) {
          // Ignore - will fetch all trades
        }
      }

      // PERFORMANCE OPTIMIZATION: Use bundled API endpoint for single-request data fetch
      const params = new URLSearchParams()
      if (isAccountsPage) {
        // For accounts page, fetch trades for all visible accounts (not filtered)
        params.append('forAccountsPage', 'true')
      } else if (selectedAccounts.length > 0) {
        // For dashboard/widgets, use account filter
        params.append('selectedAccounts', selectedAccounts.join(','))
      }
      params.append('tradesLimit', '5000')
      // Add cache-busting timestamp to ensure fresh data after realtime events
      params.append('_t', Date.now().toString())
      
      const bundledResponse = await fetch(`/api/bundled-data?${params.toString()}`, {
        cache: 'no-store', // Bypass HTTP cache to ensure fresh data
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!bundledResponse.ok) {
        throw new Error('Failed to fetch bundled data')
      }
      
      const bundledData = await bundledResponse.json()
      
      if (!bundledData.success || !bundledData.data.isAuthenticated) {
        try {
          await signOut();
        } catch (error) {
        }
        setIsLoading(false)
        hasLoadedDataRef.current = false
        return;
      }

      const { user: userData, accounts: rawAccounts, trades: allTrades, calendarNotes } = bundledData.data

      setUser(userData);
      setIsFirstConnection(userData?.isFirstConnection || false)
      
      // Store bundled data in localStorage for hooks to use
      if (calendarNotes) {
        localStorage.setItem('calendar-notes-cache', JSON.stringify(calendarNotes))
      }
      
      // Store account filter settings from bundled data
      // But don't overwrite if there are pending local changes (user just saved new settings)
      if (userData?.accountFilterSettings) {
        try {
          const hasPendingChanges = localStorage.getItem('account-filter-settings-pending')
          if (!hasPendingChanges) {
            const settings = JSON.parse(userData.accountFilterSettings)
            localStorage.setItem('account-filter-settings-cache', JSON.stringify(settings))
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
      
      setTrades(allTrades || [])

      // Calculate balanceToDate for each account using the trades we just loaded
      // Using .map() ensures a new array reference, which Zustand's shallow equality will detect
      const accountsWithBalance = (rawAccounts || []).map((account: any) => ({
        ...account,
        balanceToDate: calcBalance(account, allTrades || [], [], {
          excludeFailedAccounts: false,
          includePayouts: true
        })
      }));
      
      // Zustand automatically triggers re-renders when the store updates
      // No need for manual broadcast - Zustand's reactivity handles this
      setAccounts(accountsWithBalance);

    } catch (error) {
      // Error loading data
      
      // Handle Next.js redirect errors (these are normal and expected)
      if (error instanceof Error && (
        error.message === 'NEXT_REDIRECT' || 
        error.message.includes('NEXT_REDIRECT') ||
        ('digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT'))
      )) {
        // Don't log redirect errors as they are expected behavior
        throw error; // Re-throw to let Next.js handle the redirect
      }

      // Handle authentication errors by redirecting to auth page
      if (error instanceof Error && (
        error.message.includes('User not authenticated') ||
        error.message.includes('User not found') ||
        error.message.includes('Unauthorized')
      )) {
        // Authentication error, signing out
        try {
          await signOut();
        } catch (signOutError) {
        }
        return;
      }

      // CRITICAL FIX: Reset flag on error to allow retry
      hasLoadedDataRef.current = false;
    } finally {
      setIsLoading(false);
      // CRITICAL FIX: Always clear the active load promise to prevent stuck state
      // Use setTimeout to ensure this happens even if there's an error in finally block
      setTimeout(() => {
        activeLoadPromiseRef.current = null;
      }, 0);
    }
  })();

  // Return the promise for any waiting calls
  return activeLoadPromiseRef.current
  }, [dashboardLayout, isLoading, setAccounts, setDashboardLayout, setIsLoading, setSupabaseUser, setTrades, setUser, pathname]);

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
  // REALTIME SUBSCRIPTIONS (Server-push, no polling)
  // ============================================
  // Supabase postgres_changes - server pushes updates when DB changes
  // This replaces the old 30-second polling mechanism
  const lastRealtimeRefreshRef = React.useRef<number>(0)
  const realtimeRefreshTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  
  // Debounced refresh to prevent too many calls
  // Includes delay to ensure DB transaction commits and cache invalidation completes
  const debouncedRefresh = useCallback(() => {
    const now = Date.now()
    const timeSinceLastRefresh = now - lastRealtimeRefreshRef.current
    
    // 800ms cooldown: 300ms for DB commit + 500ms debounce
    // This ensures the database transaction is fully committed and cache invalidation completes
    // before we fetch fresh data
    const cooldown = 800
    if (timeSinceLastRefresh < cooldown) {
      // Schedule a refresh after the cooldown
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current)
      }
      realtimeRefreshTimeoutRef.current = setTimeout(() => {
        lastRealtimeRefreshRef.current = Date.now()
        loadData()
      }, cooldown - timeSinceLastRefresh)
      return
    }
    
    // If enough time has passed, add a small delay to ensure DB commit completes
    // then fetch fresh data
    setTimeout(() => {
      lastRealtimeRefreshRef.current = Date.now()
      loadData()
    }, 300) // 300ms delay ensures DB transaction is committed
  }, [loadData])
  
  // Subscribe to database changes via Supabase Realtime
  useDatabaseRealtime({
    userId: user?.id,
    enabled: !!user?.id && !isLoading,
    onTradeChange: () => {
      debouncedRefresh()
    },
    onAccountChange: () => {
      debouncedRefresh()
    }
  })
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current)
      }
    }
  }, [])

  const refreshTrades = useCallback(async () => {
    if (!user?.id) return
    
    // Explicitly set loading state before cache invalidation
    setIsLoading(true)
    
    try {
      // Clear data caches to force fresh fetch
      // NOTE: We preserve account-filter-settings-cache as it contains user's explicit selection
      try {
        localStorage.removeItem('bundled-data-cache')
        localStorage.removeItem('bundled-data-timestamp')
        localStorage.removeItem('calendar-notes-cache')
        localStorage.removeItem('last-refresh-timestamp')
      } catch (e) {
        // Ignore storage errors
      }
      
      // CRITICAL: Reset the loaded flag to allow re-fetching
      hasLoadedDataRef.current = false
      activeLoadPromiseRef.current = null
      
      // DO NOT reset selection refs - preserve user's explicit account selection
      // selectionInitializedRef and lastSyncedSelectionRef should persist
      
      // Force cache invalidation
      await revalidateCache([`trades-${user.id}`, `user-data-${user.id}-${locale}`])
      
      // Add delay to ensure cache invalidation and DB commit complete
      // This is critical for realtime updates to fetch fresh data
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Reload data
      await loadData()
    } catch (error) {
      // Handle Next.js redirect errors (these are normal and expected)
      if (error instanceof Error && (
        error.message === 'NEXT_REDIRECT' || 
        error.message.includes('NEXT_REDIRECT') ||
        ('digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT'))
      )) {
        // Don't log redirect errors as they are expected behavior
        setIsLoading(false); // Ensure loading is set to false before redirect
        throw error; // Re-throw to let Next.js handle the redirect
      }

      // Handle authentication errors
      if (error instanceof Error && (
        error.message.includes('User not authenticated') ||
        error.message.includes('User not found') ||
        error.message.includes('Unauthorized')
      )) {
        setIsLoading(false);
        return;
      }
      
      // Silently handle other errors to avoid console spam
      setIsLoading(false)
    } finally {
      // Ensure loading is always set to false, even if loadData() doesn't handle it properly
      // Add a small delay to prevent flickering
      setTimeout(() => {
        setIsLoading(false)
      }, 200)
    }
  }, [user?.id, loadData, setIsLoading, locale])

  // Expose refreshAllData as an alias for refreshTrades (it refreshes everything including accounts)
  const refreshAllData = refreshTrades

  // Memoize hidden account numbers to prevent unnecessary re-renders
  const hiddenAccountNumbers = useMemo(() => {
    return accounts
      .filter(a => a.isArchived === true)
      .map(a => a.number);
  }, [accounts]);

  const formattedTrades = useMemo(() => {
    // Early return if no trades
    if (!trades || !Array.isArray(trades) || trades.length === 0) {
      return [];
    }

    // SIMPLE FILTERING: Only by selected accounts and hidden accounts
    const result = trades
      .filter((trade) => {
        // Skip trades from hidden accounts
        if (hiddenAccountNumbers.includes(trade.accountNumber)) {
          return false;
        }

        // Validate entry date
        const entryDate = new Date(formatInTimeZone(
          new Date(trade.entryDate),
          timezone,
          'yyyy-MM-dd HH:mm:ssXXX'
        ));
        if (!isValid(entryDate)) return false;

        // Instrument filter
        if (instruments.length > 0 && !instruments.includes(trade.instrument)) {
          return false;
        }

        // Account filter - if no accounts selected, show all (unless settings explicitly filter)
        if (accountNumbers.length > 0) {
          // Check if trade matches selected account numbers (by accountNumber or phaseAccountId)
          const matchesAccount = accountNumbers.includes(trade.accountNumber) ||
                                (trade.phaseAccountId && accountNumbers.includes(trade.phaseAccountId));

          if (!matchesAccount) {
            return false;
          }
        }
        // If accountNumbers is empty, show all trades (don't filter by account)

        // Date range filter
        if (dateRange?.from && dateRange?.to) {
          const tradeDate = startOfDay(entryDate);
          const fromDate = startOfDay(dateRange.from);
          const toDate = endOfDay(dateRange.to);

          if (fromDate.getTime() === startOfDay(toDate).getTime()) {
            // Single day selection
            if (tradeDate.getTime() !== fromDate.getTime()) {
              return false;
            }
          } else {
            // Date range selection
            if (entryDate < fromDate || entryDate > toDate) {
              return false;
            }
          }
        }

        // PnL range filter
        if ((pnlRange.min !== undefined && trade.pnl < pnlRange.min) ||
          (pnlRange.max !== undefined && trade.pnl > pnlRange.max)) {
          return false;
        }

        // Time range filter
        if (timeRange.range && getTimeRangeKey(trade.timeInPosition) !== timeRange.range) {
          return false;
        }

        // Weekday filter
        if (weekdayFilter?.day !== null) {
          const dayOfWeek = entryDate.getDay();
          if (dayOfWeek !== weekdayFilter.day) {
            return false;
          }
        }

        // Hour filter
        if (hourFilter?.hour !== null) {
          const hour = entryDate.getHours();
          if (hour !== hourFilter.hour) {
            return false;
          }
        }


        return true;
      });
    
    return result;
  }, [
    trades,
    accountNumbers,
    dateRange,
    pnlRange,
    timeRange,
    weekdayFilter,
    hourFilter,
    timezone,
    instruments,
    hiddenAccountNumbers
  ]);

  const statistics = useMemo(() => {
    // Use centralized statistics calculation
    return calculateStatistics(formattedTrades, accounts);
  }, [formattedTrades, accounts]);

  // Calendar data uses formattedTrades (filtered by account selection)
  // This ensures calendar respects the navbar filter settings
  const calendarData = useMemo(() => formatCalendarData(formattedTrades, accounts), [formattedTrades, accounts]);

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