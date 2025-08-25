# Import Trades Card Implementation Plan

## Overview
Replace the "Trade Details" section in the NewTradePage with an "Import Trades" card component that provides all the trade importing functionality.

## Current Structure Analysis
The NewTradePage (`app/[locale]/dashboard/prop-firm/accounts/[id]/trades/new/page.tsx`) contains:
1. Header section with back button and page title
2. Account Info card showing account details
3. Trade Form card (to be replaced) with manual trade entry fields

## Implementation Plan

### 1. Create Import Trades Card Component
Create a new component `app/[locale]/dashboard/components/import/import-trades-card.tsx` that:
- Adapts the ImportButton dialog functionality into a card component
- Removes dialog-specific code and state management
- Maintains all import functionality (CSV, PDF, manual entry, etc.)
- Uses the existing import components and flows

### 2. Modify ManualTradeForm for Card Integration
Adapt the `app/[locale]/dashboard/components/import/manual-trade-entry/manual-trade-form.tsx` to:
- Work as a standalone card component
- Remove dialog-specific props and functionality
- Handle form submission without closing a dialog
- Integrate with the current account context

### 3. Integrate Import Trades Card into NewTradePage
Replace the Trade Form card in `app/[locale]/dashboard/prop-firm/accounts/[id]/trades/new/page.tsx` with:
- The new Import Trades card component
- Proper styling to match the existing card layout
- Maintain the account context and navigation

### 4. Key Implementation Details

#### Import Trades Card Structure
```tsx
<Card>
  <CardHeader>
    <CardTitle>Import Trades</CardTitle>
    <CardDescription>Choose a method to import your trades</CardDescription>
  </CardHeader>
  <CardContent>
    <ImportTypeSelection />
    {/* Other import components based on selection */}
  </CardContent>
</Card>
```

#### Manual Trade Form Adaptations
- Remove `setIsOpen` prop
- Modify form submission to show success message and redirect
- Use the current account ID from the page context
- Maintain all existing form fields and validation

#### Integration Considerations
- Pass the account ID to the import components
- Ensure proper error handling and user feedback
- Maintain responsive design
- Preserve existing navigation and page structure

### 5. Files to Modify
1. Create: `app/[locale]/dashboard/components/import/import-trades-card.tsx`
2. Modify: `app/[locale]/dashboard/components/import/manual-trade-entry/manual-trade-form.tsx`
3. Modify: `app/[locale]/dashboard/prop-firm/accounts/[id]/trades/new/page.tsx`

### 6. Testing Plan
1. Verify all import methods work (CSV, PDF, manual entry)
2. Test form validation and submission
3. Check responsive design on different screen sizes
4. Ensure proper error handling and user feedback
5. Confirm navigation and redirects work correctly

### 7. Git Integration
After testing, prepare the code for pushing to:
- Repository: https://github.com/kalabhaftu/deltalytixC.git
- Branch: main (or appropriate target branch)