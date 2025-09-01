# Account System Simplification Proposal

## Current Problems

The current account system is overly complex with 50+ fields mixed together:

### Issues:
1. **Mixed Account Types**: Live accounts, prop firm accounts, and demo accounts all use the same model
2. **Redundant Fields**: Many fields are only relevant to specific account types
3. **Complex Configuration**: Too many optional fields make account creation confusing
4. **Maintenance Burden**: Adding new account types requires modifying the core Account model

### Current Account Model Fields (50+):
- Core: id, number, userId, createdAt
- Prop Firm: propfirm, evaluation, phases, drawdown rules
- Live: broker, name
- Payment: nextPaymentDate, paymentFrequency, autoRenewal
- Evaluation: dailyDrawdownAmount, maxDrawdownAmount, evaluationType
- Payout: profitSplitPercent, payoutCycleDays, minDaysToFirstPayout
- Business Rules: ddIncludeOpenPnl, allowManualPhaseOverride
- Legacy: drawdownThreshold, trailingDrawdown, isPerformance

## Proposed Simplified System

### 1. Account Type Enum
```typescript
enum AccountType {
  LIVE = "live",           // Real trading account
  PROP_FIRM = "prop_firm", // Prop firm evaluation account  
  DEMO = "demo"            // Demo/practice account
}
```

### 2. Core Account Model (Simplified)
```typescript
model Account {
  // Core fields (all types)
  id              String      @id @default(uuid())
  number          String      
  name            String?
  type            AccountType @default(LIVE)
  status          AccountStatus @default(active)
  startingBalance Float
  userId          String
  groupId         String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  // Relations
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  group           Group?      @relation(fields: [groupId], references: [id], onDelete: SetNull)
  trades          Trade[]
  
  // Type-specific configurations (JSON fields)
  liveConfig      Json?       // For live accounts: { broker, etc }
  propFirmConfig  Json?       // For prop firm: { evaluation rules, etc }
  demoConfig      Json?       // For demo: { demo settings }
}
```

### 3. Type-Specific Configuration

#### Live Account Config:
```typescript
interface LiveAccountConfig {
  broker: string
  accountCurrency?: string
  leverage?: number
}
```

#### Prop Firm Account Config:
```typescript
interface PropFirmAccountConfig {
  propFirm: string
  evaluationType: 'one_step' | 'two_step'
  dailyDrawdown: { amount: number, type: 'absolute' | 'percent' }
  maxDrawdown: { amount: number, type: 'absolute' | 'percent' }
  profitTarget: number
  payoutRules: {
    profitSplit: number
    cycleDays: number
    minDays: number
  }
  businessRules: {
    includeOpenPnl: boolean
    allowManualOverride: boolean
  }
}
```

#### Demo Account Config:
```typescript
interface DemoAccountConfig {
  virtualBalance: number
  resetInterval?: 'daily' | 'weekly' | 'monthly'
  practiceMode: boolean
}
```

## Benefits

1. **Cleaner Schema**: Reduce from 50+ fields to ~15 core fields
2. **Type Safety**: Clear separation of account types
3. **Easier Maintenance**: Adding new account types doesn't require schema changes
4. **Better UX**: Account creation forms can be type-specific
5. **Performance**: Smaller database rows, better indexing

## Migration Strategy

1. **Phase 1**: Add `type` and config JSON fields to existing schema
2. **Phase 2**: Migrate existing data to new structure
3. **Phase 3**: Update API endpoints to use simplified structure
4. **Phase 4**: Remove legacy fields (breaking change)

## Implementation Steps

1. Create new account type enum and config interfaces
2. Add migration to add new fields
3. Create data migration script to populate new fields
4. Update API endpoints to support both old and new structure
5. Update frontend components to use simplified structure
6. Remove legacy fields after full migration

This approach maintains backward compatibility while providing a clear path to simplification.




