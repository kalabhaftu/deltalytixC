# React 19.2 Migration Examples
**Real examples from your codebase**

## Example 1: use-stable-callback.ts → useEffectEvent

### Current Code (lib/hooks/use-stable-callback.ts)
```typescript
// ❌ THIS ENTIRE FILE CAN BE DELETED
import { useCallback, useRef, useEffect } from 'react'

export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  })

  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  )
}
```

### New Code (React 19.2)
```typescript
// ✅ JUST USE useEffectEvent DIRECTLY
import { useEffectEvent } from 'react'

// In your components:
const handleCallback = useEffectEvent((data) => {
  // Your logic here
  onUpdate?.(data)
})

// That's it! No custom hook needed.
```

---

## Example 2: hooks/use-realtime-accounts.ts

### Current Code (Lines 28-42)
```typescript
// ❌ OLD: Manual useCallback
const cleanup = useCallback(() => {
  subscriptionsRef.current.forEach(subscription => {
    try {
      subscription?.unsubscribe()
    } catch (error) {
      console.warn('[useRealtimeAccounts] Error unsubscribing:', error)
    }
  })
  subscriptionsRef.current = []
  
  if (reconnectTimeoutRef.current) {
    clearTimeout(reconnectTimeoutRef.current)
    reconnectTimeoutRef.current = null
  }
}, [])

const setupRealtimeSubscriptions = useCallback(async () => {
  // ... subscription logic
}, [enabled, onUpdate])

useEffect(() => {
  if (enabled) {
    setupRealtimeSubscriptions()
  } else {
    cleanup()
    setConnectionStatus('disconnected')
    setIsConnected(false)
  }

  return cleanup
}, [enabled, setupRealtimeSubscriptions, cleanup])
```

### New Code (React 19.2)
```typescript
// ✅ NEW: useEffectEvent
const cleanup = useEffectEvent(() => {
  subscriptionsRef.current.forEach(subscription => {
    try {
      subscription?.unsubscribe()
    } catch (error) {
      console.warn('[useRealtimeAccounts] Error unsubscribing:', error)
    }
  })
  subscriptionsRef.current = []
  
  if (reconnectTimeoutRef.current) {
    clearTimeout(reconnectTimeoutRef.current)
    reconnectTimeoutRef.current = null
  }
})

const setupRealtimeSubscriptions = useEffectEvent(async () => {
  // ... subscription logic
  // Can access latest onUpdate without causing re-subscription
  onUpdate?.()
})

useEffect(() => {
  if (enabled) {
    setupRealtimeSubscriptions()
  } else {
    cleanup()
    setConnectionStatus('disconnected')
    setIsConnected(false)
  }

  return cleanup
}, [enabled]) // ✨ Much cleaner deps array!
```

**Benefits:**
- No dependency chain issues
- Subscriptions won't re-create on every render
- Always calls latest callbacks
- Cleaner, more maintainable code

---

## Example 3: context/accounts-provider.tsx

### Current Code (Lines 78-101)
```typescript
// ❌ OLD: Heavy useCallback
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
```

### New Code (React 19.2)
```typescript
// ✅ NEW: React Compiler handles optimization
const saveAccount = async (newAccount: Partial<Account>) => {
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
}
// No useCallback! Compiler optimizes automatically
```

**OR Better - Use useActionState:**
```typescript
// ✅ EVEN BETTER: Use React 19 Actions
const [saveState, saveAccountAction, isSaving] = useActionState(
  setupAccountAction,
  { error: null, success: false }
)

// In your component:
<button onClick={() => saveAccountAction(account)} disabled={isSaving}>
  {isSaving ? 'Saving...' : 'Save'}
</button>
{saveState.error && <ErrorAlert>{saveState.error}</ErrorAlert>}
```

---

## Example 4: app/dashboard/components/import/manual-trade-form.tsx

### Current Code (Lines 112-168)
```typescript
// ❌ OLD: Manual state management
export default function ManualTradeForm({ setIsOpen }: ManualTradeFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phaseValidationError, setPhaseValidationError] = useState<string | null>(null)
  const [calculatedPnL, setCalculatedPnL] = useState<number | null>(null)
  
  const user = useUserStore(state => state.user)
  const supabaseUser = useUserStore(state => state.supabaseUser)
  const trades = useTradesStore(state => state.trades)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors }
  } = useForm<TradeFormData>({
    resolver: zodResolver(tradeFormSchema),
    mode: 'onChange',
  })

  // Auto-calculate P&L when prices change
  useEffect(() => {
    const { entryPrice, closePrice, quantity, side, commission } = watchedValues
    
    if (entryPrice && closePrice && quantity) {
      const entry = parseFloat(entryPrice)
      const close = parseFloat(closePrice)
      const qty = quantity
      const comm = commission || 0
      
      let pnl = 0
      if (side === 'LONG') {
        pnl = (close - entry) * qty - comm
      } else if (side === 'SHORT') {
        pnl = (entry - close) * qty - comm
      }
      
      setCalculatedPnL(pnl)
      setValue('pnl', pnl)
    }
  }, [watchedValues, setValue])

  const onSubmit = async (data: TradeFormData) => {
    setIsSubmitting(true)
    setPhaseValidationError(null)
    try {
      // ... submission logic
      toast.success('Trade added successfully!')
      setIsOpen?.(false)
    } catch (error) {
      console.error('Error submitting trade:', error)
      toast.error('Failed to add trade')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  )
}
```

### New Code (React 19.2)
```typescript
// ✅ NEW: useActionState + useEffectEvent
import { useActionState, useEffectEvent } from 'react'

export default function ManualTradeForm({ setIsOpen }: ManualTradeFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [calculatedPnL, setCalculatedPnL] = useState<number | null>(null)
  
  const user = useUserStore(state => state.user)
  const trades = useTradesStore(state => state.trades)

  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors }
  } = useForm<TradeFormData>({
    resolver: zodResolver(tradeFormSchema),
    mode: 'onChange',
  })

  // ✨ React 19: useEffectEvent for stable calculation
  const calculatePnL = useEffectEvent(() => {
    const { entryPrice, closePrice, quantity, side, commission } = watch()
    
    if (entryPrice && closePrice && quantity) {
      const entry = parseFloat(entryPrice)
      const close = parseFloat(closePrice)
      const qty = quantity
      const comm = commission || 0
      
      let pnl = 0
      if (side === 'LONG') {
        pnl = (close - entry) * qty - comm
      } else if (side === 'SHORT') {
        pnl = (entry - close) * qty - comm
      }
      
      setCalculatedPnL(pnl)
      setValue('pnl', pnl)
    }
  })

  useEffect(() => {
    calculatePnL()
  }, [watch('entryPrice'), watch('closePrice'), watch('quantity')])

  // ✨ React 19: useActionState for form submission
  const [submitState, submitAction, isSubmitting] = useActionState(
    async (prevState: any, formData: FormData) => {
      try {
        // ... submission logic
        toast.success('Trade added successfully!')
        setIsOpen?.(false)
        return { error: null, success: true }
      } catch (error) {
        console.error('Error submitting trade:', error)
        return { 
          error: error instanceof Error ? error.message : 'Failed to add trade',
          success: false 
        }
      }
    },
    { error: null, success: false }
  )

  return (
    <form action={submitAction}>
      {/* Form fields */}
      {submitState.error && (
        <div className="text-red-500">{submitState.error}</div>
      )}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  )
}
```

**Benefits:**
- No manual `isSubmitting` state
- Built-in error handling
- Cleaner effect dependencies
- Less boilerplate

---

## Example 5: app/dashboard/accounts/[id]/page.tsx

### Current Code (Lines 43-91)
```typescript
// ❌ OLD: Client-side data fetching
'use client'

export default function LiveAccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [account, setAccount] = useState<LiveAccountData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const accountId = params.id as string

  // Fetch account data
  const fetchAccountData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/accounts/${accountId}?t=${Date.now()}`, {
        cache: 'no-store'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch account')
      }
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch account data')
      }

      const accountData = data.data
      
      if (!accountData || accountData.accountType !== 'live') {
        router.push('/dashboard/accounts')
        return
      }

      setAccount(accountData)
    } catch (error) {
      console.error('Error fetching account data:', error)
      router.push('/dashboard/accounts')
    } finally {
      setIsLoading(false)
    }
  }, [accountId, router])

  useEffect(() => {
    if (accountId) {
      fetchAccountData()
    }
  }, [accountId, fetchAccountData])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      {/* Account display */}
    </div>
  )
}
```

### New Code (React 19.2)
```typescript
// ✅ NEW: Server Component (if data is static)
// Remove 'use client' directive

import { getAccountData } from '@/server/accounts'
import { redirect } from 'next/navigation'

export default async function LiveAccountDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  // Server-side data fetching (no API route needed!)
  const account = await getAccountData(params.id)
  
  if (!account || account.accountType !== 'live') {
    redirect('/dashboard/accounts')
  }

  return (
    <div>
      <AccountDisplay account={account} />
    </div>
  )
}

// ✅ Create a client component for interactive parts
// components/account-display.tsx
'use client'

export function AccountDisplay({ account }: { account: LiveAccountData }) {
  const [activeTab, setActiveTab] = useState('overview')
  
  return (
    <div>
      {/* Interactive UI */}
    </div>
  )
}
```

**Benefits:**
- No loading state needed
- No `useEffect` data fetching
- Faster initial page load
- Better SEO
- Type-safe data flow
- Can delete `/api/accounts/[id]/route.ts` if only used here

---

## Example 6: hooks/use-dashboard-stats.ts

### Current Code
```typescript
// ❌ OLD: Heavy memoization
export function useDashboardStats(settings: AccountFilterSettings) {
  const { accounts } = useAccounts()
  const { trades } = useTrades()
  
  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      // Complex filtering logic
      return matchesFilters(trade, settings)
    })
  }, [trades, settings])
  
  const statistics = useMemo(() => {
    return calculateStats(filteredTrades)
  }, [filteredTrades])
  
  const chartData = useMemo(() => {
    return transformToChartData(statistics)
  }, [statistics])
  
  return { statistics, chartData }
}
```

### New Code (React 19.2)
```typescript
// ✅ NEW: Let compiler handle it
export function useDashboardStats(settings: AccountFilterSettings) {
  const { accounts } = useAccounts()
  const { trades } = useTrades()
  
  // No useMemo needed! Compiler optimizes automatically
  const filteredTrades = trades.filter(trade => {
    return matchesFilters(trade, settings)
  })
  
  const statistics = calculateStats(filteredTrades)
  const chartData = transformToChartData(statistics)
  
  return { statistics, chartData }
}
```

**OR if data is expensive to compute:**
```typescript
// ✅ BETTER: Server Component with caching
// app/dashboard/stats/page.tsx (Server Component)

import { cache } from 'react'

const getStats = cache(async (userId: string, settings: AccountFilterSettings) => {
  const trades = await prisma.trade.findMany({ where: { userId } })
  const filteredTrades = trades.filter(trade => matchesFilters(trade, settings))
  const statistics = calculateStats(filteredTrades)
  return { statistics, chartData: transformToChartData(statistics) }
})

export default async function StatsPage() {
  const { userId } = await getUser()
  const settings = await getFilterSettings(userId)
  const { statistics, chartData } = await getStats(userId, settings)
  
  return <StatsDisplay stats={statistics} chart={chartData} />
}
```

---

## Example 7: Converting API Route to Server Action

### Current Code
```typescript
// ❌ OLD: API Route + Client Fetch

// app/api/backtesting/route.ts
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const userId = await getUserId()
    
    const backtest = await prisma.backtest.create({
      data: {
        ...body,
        userId
      }
    })
    
    return Response.json({ success: true, data: backtest })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

// component.tsx
'use client'
const handleSubmit = async (data) => {
  const response = await fetch('/api/backtesting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
}
```

### New Code (React 19.2)
```typescript
// ✅ NEW: Server Action (Direct)

// server/backtesting.ts
'use server'

import { revalidatePath } from 'next/cache'

export async function createBacktestAction(data: BacktestData) {
  const userId = await getUserId()
  
  const backtest = await prisma.backtest.create({
    data: {
      ...data,
      userId
    }
  })
  
  revalidatePath('/dashboard/backtesting')
  return backtest
}

// component.tsx
'use client'
import { createBacktestAction } from '@/server/backtesting'

const [state, submitAction, isPending] = useActionState(
  createBacktestAction,
  null
)

return (
  <form action={submitAction}>
    <button disabled={isPending}>Submit</button>
  </form>
)
```

**Benefits:**
- Type-safe (TypeScript from client to server)
- No API route boilerplate
- No JSON parsing
- Automatic cache revalidation
- Better error handling

**You can DELETE:** `app/api/backtesting/route.ts`

---

## Example 8: Chart Component Optimization

### Current Code
```typescript
// ❌ OLD: app/dashboard/components/charts/daily-cumulative-pnl.tsx
'use client'

export function DailyCumulativePnL({ trades }: Props) {
  // Heavy computation wrapped in useMemo
  const chartData = useMemo(() => {
    const grouped = groupBy(trades, t => format(t.date, 'yyyy-MM-dd'))
    const cumulative = Object.entries(grouped).map(([date, trades], idx) => ({
      date,
      pnl: trades.reduce((sum, t) => sum + t.pnl, 0),
      cumulative: idx === 0 ? 0 : /* complex calc */
    }))
    return cumulative
  }, [trades])
  
  return <Chart data={chartData} />
}
```

### New Code (React 19.2 - Option 1: Compiler)
```typescript
// ✅ OPTION 1: Let compiler handle it
'use client'

export function DailyCumulativePnL({ trades }: Props) {
  // No useMemo! Compiler optimizes
  const grouped = groupBy(trades, t => format(t.date, 'yyyy-MM-dd'))
  const chartData = Object.entries(grouped).map(([date, trades], idx) => ({
    date,
    pnl: trades.reduce((sum, t) => sum + t.pnl, 0),
    cumulative: idx === 0 ? 0 : /* complex calc */
  }))
  
  return <Chart data={chartData} />
}
```

### New Code (React 19.2 - Option 2: Server Component)
```typescript
// ✅ OPTION 2: Move computation to server
// page.tsx (Server Component)
export default async function DashboardPage() {
  const trades = await getTrades()
  
  // Compute on server
  const grouped = groupBy(trades, t => format(t.date, 'yyyy-MM-dd'))
  const chartData = Object.entries(grouped).map(([date, trades], idx) => ({
    date,
    pnl: trades.reduce((sum, t) => sum + t.pnl, 0),
    cumulative: idx === 0 ? 0 : /* complex calc */
  }))
  
  return <DailyCumulativePnLClient data={chartData} />
}

// daily-cumulative-pnl-client.tsx
'use client'
export function DailyCumulativePnLClient({ data }: { data: ChartData[] }) {
  // Just render, no computation!
  return <Chart data={data} />
}
```

**Option 2 Benefits:**
- Less client-side JS
- Faster initial render
- No computation blocking UI
- Better mobile performance

---

## Migration Strategy

### Step-by-Step Approach:

1. **Week 1: Replace use-stable-callback**
   ```bash
   # Find all usages
   grep -r "useStableCallback" --include="*.ts" --include="*.tsx"
   
   # Replace with useEffectEvent
   # Delete lib/hooks/use-stable-callback.ts
   ```

2. **Week 2: Remove obvious useCallback/useMemo**
   - Start with hooks/
   - Then context/
   - Then components/

3. **Week 3: Convert 5 pages to Server Components**
   - Pick detail pages first
   - Pages without real-time updates
   - Pages with heavy data fetching

4. **Week 4: Migrate 2-3 forms to useActionState**
   - Start with simple forms
   - Then complex multi-step forms

5. **Week 5+: Enable React Compiler**
   - Test in development
   - Monitor performance
   - Gradually roll out to production

---

## Testing Checklist

After each migration:

- [ ] Component renders correctly
- [ ] No console errors/warnings
- [ ] Performance is same or better (React DevTools)
- [ ] TypeScript types are correct
- [ ] Tests pass (if you have tests)
- [ ] Real-time updates still work
- [ ] Forms submit correctly
- [ ] Loading states work
- [ ] Error handling works

---

## Common Pitfalls

### 1. useEffectEvent with external libs
```typescript
// ❌ DON'T: Use with external library callbacks that need stable ref
<ThirdPartyLib onUpdate={useEffectEvent(handleUpdate)} />

// ✅ DO: Use regular callback for external libs
<ThirdPartyLib onUpdate={handleUpdate} />
```

### 2. Server Components with client state
```typescript
// ❌ DON'T: Server component with useState
export default async function Page() {
  const [state, setState] = useState() // ERROR!
  return <div>{state}</div>
}

// ✅ DO: Split into server + client
export default async function Page() {
  const data = await getData()
  return <ClientWrapper initialData={data} />
}

'use client'
function ClientWrapper({ initialData }) {
  const [state, setState] = useState(initialData)
  return <div>{state}</div>
}
```

### 3. React Compiler with complex patterns
```typescript
// ❌ Compiler might not optimize
const value = useMemo(() => {
  if (complexCondition) {
    return expensiveCalc1()
  }
  return expensiveCalc2()
}, [deps])

// ✅ Simplify for compiler
const value = complexCondition 
  ? expensiveCalc1() 
  : expensiveCalc2()
// Compiler handles this better
```

---

**Next:** See [Full Audit Report](./REACT_19_MODERNIZATION_AUDIT.md) for complete analysis.


