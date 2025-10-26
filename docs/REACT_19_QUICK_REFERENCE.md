# React 19.2 Quick Reference Guide
**Your Current Version:** React 19.0.0 → **Upgrade to:** 19.2+

## 🆕 New Features in React 19.2 (October 2025)

### 1. useEffectEvent Hook
**Perfect for event handlers in effects**

```typescript
// ❌ OLD: Causes unnecessary re-subscriptions
useEffect(() => {
  const sub = subscribe(data => {
    onUpdate(data) // onUpdate in deps
  })
  return () => sub.unsubscribe()
}, [onUpdate])

// ✅ NEW: Stable reference, no re-subscription
const handleUpdate = useEffectEvent((data) => {
  onUpdate(data)
})

useEffect(() => {
  const sub = subscribe(handleUpdate)
  return () => sub.unsubscribe()
}, []) // Empty deps!
```

**Your files to update:**
- `lib/hooks/use-stable-callback.ts` ← **DELETE THIS FILE**
- All hooks in `hooks/` using useCallback in useEffect
- Real-time subscriptions in `context/` providers

---

### 2. React Compiler (Automatic Memoization)

**Before React 19:**
```typescript
const value = useMemo(() => expensive(a, b), [a, b])
const callback = useCallback(() => doSomething(a), [a])
```

**With React 19 Compiler:**
```typescript
const value = expensive(a, b)  // Compiler auto-memoizes!
const callback = () => doSomething(a)  // Compiler auto-memoizes!
```

**Enable in next.config.js:**
```javascript
experimental: {
  reactCompiler: true, // ← Add this
}
```

**What to remove:**
- Most `useMemo` for computed values
- Most `useCallback` for event handlers
- Some `React.memo` (keep for expensive components)

**Your affected files:** 88 files with manual memoization

---

### 3. useActionState (Form Handling)

**Before:**
```typescript
const [isSubmitting, setIsSubmitting] = useState(false)
const [error, setError] = useState(null)

const onSubmit = async (data) => {
  setIsSubmitting(true)
  setError(null)
  try {
    await saveData(data)
  } catch (e) {
    setError(e.message)
  } finally {
    setIsSubmitting(false)
  }
}
```

**After:**
```typescript
const [state, formAction, isPending] = useActionState(saveData, {
  error: null,
  success: false
})

return (
  <form action={formAction}>
    <button disabled={isPending}>Submit</button>
    {state.error && <Error>{state.error}</Error>}
  </form>
)
```

**Your forms to update:**
- `app/dashboard/components/import/manual-trade-entry/`
- `app/dashboard/components/accounts/*-dialog.tsx`
- `app/dashboard/backtesting/components/add-backtest-form.tsx`

---

### 4. Server Components Pattern

**Before (Client-side fetch):**
```typescript
'use client'
export default function Page() {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData)
  }, [])
  
  if (!data) return <Loading />
  return <Content data={data} />
}
```

**After (Server Component):**
```typescript
// Remove 'use client' - this is now a Server Component
export default async function Page() {
  const data = await getDataDirectly() // No API route!
  return <Content data={data} />
}
```

**Benefits:**
- No loading state
- No API route needed
- Faster initial load
- Better SEO

**Your pages to convert:**
- `app/dashboard/accounts/[id]/page.tsx`
- `app/dashboard/prop-firm/accounts/[id]/page.tsx`
- Static/detail pages without much interactivity

---

### 5. Server Actions vs API Routes

**Old Pattern:**
```typescript
// app/api/accounts/route.ts
export async function POST(req: Request) {
  const data = await req.json()
  return Response.json(await createAccount(data))
}

// client.tsx
await fetch('/api/accounts', {
  method: 'POST',
  body: JSON.stringify(data)
})
```

**New Pattern:**
```typescript
// server/accounts.ts
'use server'
export async function createAccountAction(data: FormData) {
  const account = await createAccount(data)
  revalidatePath('/dashboard/accounts')
  return account
}

// client.tsx
import { createAccountAction } from '@/server/accounts'
await createAccountAction(formData) // Direct call!
```

**Keep API routes for:**
- Webhooks
- Public APIs
- Cron jobs
- Third-party integrations

---

## 📋 Quick Migration Checklist

### Immediate Actions (1-2 weeks)
- [ ] Replace `useStableCallback` with `useEffectEvent`
- [ ] Remove unnecessary `useCallback` in hooks
- [ ] Convert 3-5 pages to Server Components
- [ ] Test React Compiler in dev environment

### Short-term (2-4 weeks)
- [ ] Migrate main forms to `useActionState`
- [ ] Convert Context Providers to Server Component + minimal client
- [ ] Remove manual `useMemo` from hot paths
- [ ] Replace 5-10 API routes with Server Actions

### Medium-term (1-3 months)
- [ ] Enable React Compiler in production
- [ ] Audit all remaining `useMemo`/`useCallback`
- [ ] Convert remaining pages to Server Components where possible
- [ ] Update all forms to use Actions

---

## 🎯 Files with Highest Impact

### High Priority (Update First)
1. `lib/hooks/use-stable-callback.ts` - **DELETE** and replace with useEffectEvent
2. `hooks/use-accounts.ts` - Remove callbacks, add useEffectEvent
3. `hooks/use-realtime-accounts.ts` - useEffectEvent for subscriptions
4. `context/accounts-provider.tsx` - Reduce useCallback usage
5. `app/dashboard/components/import/manual-trade-form.tsx` - Use useActionState

### Medium Priority
6. All chart components - Let compiler handle memoization
7. Table components - Remove manual React.memo where not critical
8. Dashboard pages - Convert to Server Components
9. API routes - Replace with Server Actions

### Low Priority
10. UI components - Already optimized
11. Animation components - Keep manual optimization
12. Third-party integrations - Keep as-is

---

## ⚡ Performance Gains Expected

| Metric | Improvement | Why |
|--------|-------------|-----|
| Initial Load | 20-30% faster | Server Components |
| Bundle Size | 15-25% smaller | Less client JS |
| Re-renders | 30-40% fewer | React Compiler |
| Memory Usage | 10-20% less | Automatic optimization |
| Development Time | 30% faster | Less boilerplate |

---

## 🚫 What NOT to Change

### Keep These Patterns:
1. **Error Boundaries** - Still require class components
2. **Expensive computations** - Can still manually optimize
3. **Animation callbacks** - framer-motion specific
4. **Third-party library callbacks** - Library requirements
5. **Zustand stores** - Already optimal
6. **API routes for webhooks/cron** - External requirements

---

## 🔗 Quick Links

- [Full Audit Report](./REACT_19_MODERNIZATION_AUDIT.md)
- [React 19 Docs](https://react.dev/blog)
- [useEffectEvent RFC](https://react.dev/reference/react)
- [React Compiler Guide](https://react.dev/learn/react-compiler)
- [Next.js 15 Migration](https://nextjs.org/docs/app/building-your-application/upgrading)

---

## 💡 Quick Tips

### Testing React Compiler
```bash
# 1. Update React (if needed)
npm install react@19.2 react-dom@19.2

# 2. Enable compiler in next.config.js
experimental: { reactCompiler: true }

# 3. Test in development
npm run dev

# 4. Check React DevTools
# Look for "✨ Optimized" badge on components
```

### Debugging useEffectEvent
```typescript
// If you see "useEffectEvent is not defined"
// Make sure you're on React 19.2+
import { useEffectEvent } from 'react'

// Fallback for React 19.0
const useEffectEvent = (fn) => {
  const ref = useRef(fn)
  useLayoutEffect(() => { ref.current = fn })
  return useCallback((...args) => ref.current(...args), [])
}
```

### Finding Files to Update
```bash
# Find all useMemo
grep -r "useMemo" --include="*.tsx" --include="*.ts"

# Find all useCallback  
grep -r "useCallback" --include="*.tsx" --include="*.ts"

# Find all "use client"
grep -r '"use client"' --include="*.tsx" --include="*.ts"
```

---

**Last Updated:** October 25, 2025  
**For:** deltalytixC Project


