# ✅ UUID Parsing Bug - COMPLETE FIX

## Problem
All prop firm API routes were incorrectly treating pure UUIDs as composite IDs and corrupting them.

### What Was Happening:
**Input**: `ffb35c4a-657a-4b1b-8746-5e8271e6144c` (pure masterAccountId UUID)  
**Wrong Logic**: `substring(0, lastIndexOf('-'))`  
**Output**: `ffb35c4a-657a-4b1b-8746` ❌ (CORRUPTED UUID!)

---

## Root Cause

Frontend **always** passes pure `masterAccountId` (UUID), never composite IDs:

```typescript
// hooks/use-accounts.ts
return {
  id: account.id  // Pure UUID from database
}

// app/dashboard/accounts/page.tsx
router.push(`/dashboard/prop-firm/accounts/${account.id}`)  // Pure UUID
```

But API routes were **incorrectly assuming** composite ID format `masterAccountId-phaseNumber`.

---

## Fixed Routes (9 total)

### 1. ✅ `/api/prop-firm-v2/accounts/[id]/transition/route.ts`
**Methods**: POST  
**Status**: Fixed - Now uses pure UUID

### 2. ✅ `/api/prop-firm-v2/accounts/[id]/payouts/route.ts`
**Methods**: GET  
**Status**: Fixed - Now uses pure UUID

### 3-5. ✅ `/api/prop-firm-v2/accounts/[id]/route.ts`
**Methods**: GET, PATCH, DELETE  
**Status**: Fixed - All 3 methods now use pure UUID

### 6-7. ✅ `/api/prop-firm-v2/accounts/[id]/evaluate/route.ts`
**Methods**: POST, GET  
**Status**: Fixed - Both methods now use pure UUID

### 8-9. ✅ `/api/prop-firm-v2/accounts/[id]/trades/route.ts`
**Methods**: POST, GET  
**Status**: Fixed - Both methods now use pure UUID

---

## The Fix

**Before**:
```typescript
const { id: rawId } = await params
const lastDashIndex = rawId.lastIndexOf('-')
const masterAccountId = lastDashIndex > 0 ? rawId.substring(0, lastDashIndex) : rawId
// ❌ Corrupts UUIDs!
```

**After**:
```typescript
const { id: masterAccountId } = await params
// ID is pure masterAccountId (UUID), not composite
// ✅ Treats it correctly!
```

---

## Why This Bug Existed

The original plan was to use composite IDs like `{masterAccountId}-{phaseNumber}` for routing, but:
1. The URL refactoring to `/accounts/[masterAccountId]/phases/[phaseNumber]` was planned but never implemented
2. Frontend always sends pure `masterAccountId`
3. API routes were coded defensively to "handle both formats"
4. The defensive code corrupted UUIDs

---

## Impact

**Before Fix**:
- ❌ All prop firm account pages would fail to load (404)
- ❌ Phase transitions would fail
- ❌ Trade imports would fail
- ❌ Payout requests would fail

**After Fix**:
- ✅ All routes work correctly with pure UUIDs
- ✅ No UUID corruption
- ✅ All prop firm functionality restored

---

## Verification

No more incorrect UUID parsing patterns in codebase:
```bash
grep "lastIndexOf('-')" app/api/prop-firm-v2/**/*.ts
# Result: 0 matches ✅
```

---

## Next Steps

If the URL structure needs to be refactored to `/accounts/[masterAccountId]/phases/[phaseNumber]`:
1. Create new route structure
2. Update all frontend `router.push()` and `Link` components
3. Add redirect from old routes to new routes
4. Update all API calls

**For now**: Current implementation works perfectly with pure UUIDs.

