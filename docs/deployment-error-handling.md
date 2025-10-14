# Deployment Error Handling

This document explains the deployment error handling system that prevents "Server Action not found" errors during production deployments.

## The Problem

When you deploy a new version of the app while users have it open:
1. Users have old JavaScript with old Server Action IDs
2. New deployment has new Server Action IDs
3. Users get "Failed to find Server Action" errors when they interact with the app
4. This causes a poor user experience

## The Solution

We've implemented a multi-layered approach:

### 1. Deployment Detection (Proactive)

**Location:** `hooks/use-deployment-check.ts`, `components/deployment-monitor.tsx`

- Checks for new deployments every 5 minutes
- Compares build IDs via `/api/build-id`
- Shows user-friendly notification when new version detected
- Optional auto-refresh after a delay

**Usage:**
```tsx
// Already added to app/layout.tsx - no action needed
<DeploymentMonitor 
  checkInterval={5 * 60 * 1000} // 5 minutes
  autoRefresh={false} // Show notification instead of auto-refresh
  enabled={process.env.NODE_ENV === 'production'}
/>
```

### 2. Server Action Error Handling (Reactive)

**Location:** `lib/utils/server-action-error-handler.ts`

Automatically catches and handles Server Action errors:

**Global Handler (Already Active):**
```typescript
// Automatically set up by DeploymentMonitor
setupGlobalServerActionErrorHandler()
```

**Manual Handling in Try-Catch:**
```typescript
import { handleServerActionError } from '@/lib/utils/server-action-error-handler'

try {
  await someServerAction()
} catch (error) {
  if (handleServerActionError(error, { context: 'My Action' })) {
    return // Error was a deployment mismatch - handled
  }
  // Handle other errors normally
  throw error
}
```

**Wrapper Function:**
```typescript
import { withServerActionErrorHandling } from '@/lib/utils/server-action-error-handler'

const safeAction = withServerActionErrorHandling(myServerAction, {
  autoRefresh: true,
  showToast: true,
  context: 'My Action'
})
```

### 3. API Route Error Handling

**Location:** `lib/utils/api-error-handler.ts`

For API routes (Next.js Route Handlers):

**Basic Usage:**
```typescript
import { handleApiError, apiSuccess } from '@/lib/utils/api-error-handler'

export async function GET(request: NextRequest) {
  try {
    const data = await fetchData()
    return apiSuccess(data, 'Success')
  } catch (error) {
    return handleApiError(error, 'GET /api/my-route')
  }
}
```

**With Wrapper:**
```typescript
import { withApiErrorHandling } from '@/lib/utils/api-error-handler'

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const data = await processData()
    return apiSuccess(data)
  }, 'POST /api/my-route')
}
```

### 4. Client-Side API Error Handling

**Location:** `lib/utils/client-error-handler.ts`

For client-side fetch requests:

**Safe Fetch:**
```typescript
import { safeFetch } from '@/lib/utils/client-error-handler'

// Automatically handles deployment errors
const data = await safeFetch('/api/my-endpoint', {
  method: 'POST',
  body: JSON.stringify({ ... }),
  showToast: true,
  autoRefresh: true
})
```

**Response Handler:**
```typescript
import { handleApiResponse } from '@/lib/utils/client-error-handler'

const response = await fetch('/api/my-endpoint')
const data = await handleApiResponse(response, {
  showToast: true,
  autoRefresh: true,
  onError: (error) => {
    console.log('Custom error handling:', error)
  }
})
```

## How It Works

### Detection Flow
1. **Periodic Check:** Every 5 minutes, fetch current build ID
2. **Compare:** If build ID changed → new deployment detected
3. **Notify:** Show toast notification to user
4. **Refresh:** Either auto-refresh or let user click "Refresh" button

### Error Handling Flow
1. **Error Occurs:** Server Action or API call fails
2. **Detect Type:** Check if it's a deployment mismatch error
3. **Handle Gracefully:** 
   - Show user-friendly message
   - Auto-refresh page after short delay
   - Or show "Refresh" button
4. **Prevent Error Spam:** Don't show console errors for deployment issues

## Configuration

### Environment Variables

Add to `.env.local` for custom build ID:
```bash
NEXT_BUILD_ID=your-custom-id
# Or use Vercel's automatic ID
VERCEL_DEPLOYMENT_ID=auto-generated
```

### DeploymentMonitor Props

```typescript
interface DeploymentMonitorProps {
  checkInterval?: number       // Default: 300000 (5 minutes)
  autoRefresh?: boolean        // Default: false
  autoRefreshDelay?: number    // Default: 3000 (3 seconds)
  enabled?: boolean            // Default: true in production
}
```

### Error Handler Options

```typescript
interface ErrorHandlerOptions {
  autoRefresh?: boolean        // Default: true
  refreshDelay?: number        // Default: 2000 (2 seconds)
  showToast?: boolean         // Default: true
  context?: string            // For logging
  onError?: (error) => void   // Custom error handler
}
```

## Best Practices

### For Server Actions
1. Always wrap in try-catch
2. Use `handleServerActionError` in catch block
3. Provide meaningful context for debugging

### For API Routes
1. Use `withApiErrorHandling` wrapper
2. Return proper HTTP status codes
3. Include helpful error messages

### For Client Code
1. Use `safeFetch` for all API calls
2. Let the system handle deployment errors automatically
3. Add custom error handling only when needed

## Testing

### Test Deployment Detection
1. Start dev server: `npm run dev`
2. Change `NEXT_BUILD_ID` in `.env.local`
3. Restart server
4. Old tabs will detect the change and show notification

### Test Server Action Errors
1. Deploy new version
2. Keep old tab open (don't refresh)
3. Trigger a Server Action
4. Should see graceful error handling + refresh

### Test in Development
Set `enabled={true}` in DeploymentMonitor to test in dev mode.

## Monitoring

All deployment-related errors are logged with context:
```typescript
console.warn('Server Action mismatch detected:', error, 'Context: My Action')
```

You can integrate with error tracking services (Sentry, etc.):
```typescript
setupGlobalServerActionErrorHandler()

window.addEventListener('unhandledrejection', (event) => {
  if (isDeploymentError(event.reason)) {
    // Send to Sentry/monitoring service
    trackError(event.reason)
  }
})
```

## Troubleshooting

### Users still see errors
- Check if `DeploymentMonitor` is in root layout
- Verify `enabled` prop is true in production
- Check build ID endpoint: `/api/build-id`

### Too many refreshes
- Increase `checkInterval` to 10-15 minutes
- Set `autoRefresh={false}` to require user action

### False positives
- Ensure build ID is stable per deployment
- Use `VERCEL_DEPLOYMENT_ID` on Vercel
- Use consistent `NEXT_BUILD_ID` in other environments

## Summary

This system provides:
- ✅ Proactive detection of new deployments
- ✅ Graceful handling of Server Action errors
- ✅ User-friendly error messages
- ✅ Automatic page refresh when needed
- ✅ No more "Failed to find Server Action" errors
- ✅ Better user experience during deployments

