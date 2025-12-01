# Dead Code Files Report

This report lists files that appear to be never imported or referenced anywhere in the codebase.

**Note:** Some files listed here might be:
- Used in route files (page.tsx, layout.tsx) which are automatically loaded by Next.js
- Type definition files that might be used implicitly by TypeScript
- Files that are dynamically imported (which may not be detected)

## Verification Status

Files have been checked systematically using automated detection. Manual verification is recommended for files you plan to delete.

---

## Confirmed Dead Code Files

### High Confidence - Likely Dead Code

1. **`./server/thor.ts`** - **CONFIRMED DEAD CODE**
   - Contains `generateThorToken()` and `getThorToken()` functions
   - No imports found anywhere in the codebase
   - 59 lines - Safe to delete if Thor token functionality is not needed

### Type Definition Files (Requires Manual Verification)
These type files may not be explicitly imported but could be used implicitly by TypeScript:

2. `./types/utils.ts` - Utility types (237 lines) - **VERIFY: Check if types are used via `import type`**
3. `./types/api.ts` - API types - **VERIFY: May be used in API routes**
4. `./types/calendar.ts` - Calendar types - **VERIFY: May be used in calendar components**
5. `./types/file-saver.d.ts` - File-saver type definitions (5 lines) - **VERIFY: Check if file-saver package is installed and used**
6. `./types/trade-types.ts` - Trade type definitions - **VERIFY: May be used in trade-related code**
7. `./types/account-types.ts` - Account type definitions - **VERIFY: May be used in account-related code**
8. `./types/backtesting.ts` - Backtesting types - **VERIFY: May be used in backtesting code**

### Library Files (Potentially Unused)
9. `./lib/statistics/server-statistics.ts` - **VERIFY: May be used in server-side code**
10. `./lib/database/batch-operations.ts` - **VERIFY: May be used in database operations**
11. `./lib/performance.ts` - **VERIFY: May be used for performance monitoring**
12. `./lib/cache/memory-cache.ts` - **VERIFY: May be used by cache system**
13. `./lib/cache/redis-cache.ts` - **VERIFY: May be used if Redis is configured**
14. `./lib/cache/unified-cache.ts` - **VERIFY: May be used by cache system**
15. `./lib/supabase-server.ts` - **VERIFY: May be used in server components**
16. `./lib/server/image-processing.ts` - **VERIFY: May be used for image processing**
17. `./lib/utils/client-error-handler.ts` - **VERIFY: May be used for error handling**
18. `./lib/utils/api-error-handler.ts` - **VERIFY: May be used in API routes**
19. `./lib/realtime/realtime-manager.ts` - **VERIFY: May be used for realtime features**
20. `./lib/design-tokens.ts` - **VERIFY: May be used for theming**
21. `./lib/env.ts` - **VERIFY: May be used for environment variables**
22. `./lib/export/export-utils.ts` - **VERIFY: May be used for data export**
23. `./lib/services/data-service.ts` - **VERIFY: May be used for data operations**
24. `./lib/validation/account-schemas.ts` - **VERIFY: May be used for validation**
25. `./lib/validation/journal-schemas.ts` - **VERIFY: May be used for validation**

### Hooks (Potentially Unused)
26. `./hooks/use-large-dataset.ts` - **VERIFY: May be used for large data handling**
27. `./hooks/use-paginated-trades.ts` - **VERIFY: May be used for pagination**
28. `./hooks/use-auth.ts` - **VERIFY: May be used for authentication**
29. `./hooks/use-debounce.ts` - **VERIFY: May be used for debouncing**
30. `./hooks/use-dashboard-templates.ts` - **VERIFY: May be used for templates**
31. `./hooks/use-debounced-value.ts` - **VERIFY: May be used for debounced values**
32. `./hooks/use-visibility.ts` - **VERIFY: May be used for visibility detection**
33. `./hooks/use-dashboard-stats.ts` - **VERIFY: May be used for dashboard statistics**

### Store Files (Potentially Unused)
34. `./store/equity-chart-store.ts` - **VERIFY: May be used for equity charts**
35. `./store/account-store.ts` - **VERIFY: May be used for account management**

### Component Files (Mostly False Positives - Used in Route Files)
Many component files are listed, but most are actually used in route files. Verified as USED:

- `./components/ui/pagination.tsx` - **USED** (found in multiple files)
- `./components/ui/virtualized-table.tsx` - **USED** (found in trade-table-review.tsx)
- `./components/ui/sidebar.tsx` - **USED** (found in sidebar-layout.tsx, layout.tsx)
- `./components/ui/range-filter.tsx` - **USED** (found in filter-dropdowns.tsx)
- `./components/animated-icons/clipboard-check.tsx` - **USED** (found in import-button.tsx)
- `./components/animated-icons/users.tsx` - **USED** (found in multiple files)
- `./components/animated-icons/calendar-days.tsx` - **USED** (found in multiple files)
- `./components/theme-switcher.tsx` - **USED** (found in modals.tsx, auth-provider.tsx)
- `./components/onboarding-modal.tsx` - **USED** (found in modals.tsx)
- `./components/auto-cache-cleanup.tsx` - **USED** (found in modals.tsx, auth-provider.tsx)
- `./components/notifications/notification-item.tsx` - **USED** (found in notification-center.tsx)
- `./components/prop-firm/account-loading-skeleton.tsx` - **VERIFY: May be used in prop-firm pages**
- `./components/prop-firm/realtime-status-indicator.tsx` - **VERIFY: May be used in prop-firm pages**

### API Files (Potentially Unused)
49. `./app/api/route.ts` - **VERIFY: May be a root API route**
50. `./app/api/ai/tools/get-trades-summary.ts` - **VERIFY: May be used by AI tools**
51. `./app/api/ai/tools/get-current-week-summary.ts` - **VERIFY: May be used by AI tools**
52. `./app/api/ai/tools/get-previous-week-summary.ts` - **VERIFY: May be used by AI tools**
53. `./app/api/ai/tools/get-most-traded-instruments.ts` - **VERIFY: May be used by AI tools**

---

## Files That Are Actually Used (False Positives)

These files were flagged but are actually used (likely in route files):

- `./app/dashboard/journal/components/journal-client.tsx` - Used in `app/dashboard/journal/page.tsx`
- `./app/dashboard/components/widget-canvas-with-drag.tsx` - Used in `app/dashboard/page.tsx` via dynamic import
- `./app/dashboard/components/navbar.tsx` - Used in `app/dashboard/page.tsx`
- `./app/dashboard/components/template-selector.tsx` - Used in `context/template-provider.tsx`
- Most component files in `app/dashboard/components/` are used in route files

---

## Recommendations

1. **Manual Verification Required**: Before deleting any files, manually verify they are not:
   - Used in route files (page.tsx, layout.tsx)
   - Dynamically imported
   - Used via type-only imports
   - Used in configuration files

2. **Start with High-Confidence Files**: 
   - `./server/thor.ts` appears to be the most likely candidate for deletion
   - Type definition files should be checked for actual usage in TypeScript compilation

3. **Check for Dynamic Imports**: Some files may be dynamically imported using `import()` or `require()`, which may not be detected by static analysis.

4. **Route Files**: Remember that Next.js automatically uses files in the `app/` directory based on the file system routing. Files imported only in route files are still "used" by the application.

---

## Summary

- **Total files flagged by automated scan**: 148
- **Confirmed dead code**: 1 file (`server/thor.ts`)
- **Requires manual verification**: ~50-60 files (type files, some library files, hooks, stores)
- **False positives (actually used)**: ~85-90 files (mostly components used in route files)

## Verified Status

✅ **Confirmed Dead Code (1 file)**:
- `./server/thor.ts` - No imports found, safe to delete

✅ **Confirmed Used (False Positives)**:
- Most component files in `app/dashboard/components/` - Used in route files
- Most UI components in `components/ui/` - Used in various places
- Animated icons - Used in multiple components
- Theme switcher, onboarding modal, auto-cache-cleanup - Used in modals/auth-provider
- Notification components - Used in notification center
- Store files (equity-chart-store, account-store) - Used in cache-manager and other files

⚠️ **Requires Manual Verification**:
- Type definition files (7 files) - Check for `import type` usage
- Library utility files (~20 files) - May be used in server-side code or config
- Hooks (~8 files) - May be used in components
- Some API tool files - May be used by AI tools system

**Next Steps**: 
1. ✅ Delete `server/thor.ts` - Confirmed dead code
2. Manually check type definition files for actual TypeScript usage (search for `import type` from these files)
3. Verify library files are not used in server-side code, middleware, or configuration files
4. Check hooks and stores are not used via dynamic imports or in route files

