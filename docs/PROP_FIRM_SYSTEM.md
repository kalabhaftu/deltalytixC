# Prop Firm Evaluation System

## Overview

The Prop Firm Evaluation System is a comprehensive solution for managing proprietary trading firm accounts, including evaluation phases, drawdown tracking, profit targets, and payout management. This system supports both one-step and two-step evaluation processes with automatic phase progression and breach detection.

## Features

### 🏢 Account Management
- Multi-phase evaluation system (Phase 1, Phase 2, Funded)
- Support for one-step and two-step evaluation processes
- Configurable drawdown limits (daily and maximum)
- Static and trailing drawdown modes
- Multiple timezone support with custom daily reset times

### 📊 Real-time Monitoring
- Live equity and balance tracking
- Automatic breach detection
- Phase progression monitoring
- Profit target tracking
- Risk metrics calculation

### 💰 Payout Management
- Automated payout eligibility calculation
- Configurable payout cycles and minimum requirements
- Profit sharing configuration
- Reset-on-payout functionality
- Balance reduction options

### 🔄 Background Processing
- Daily anchor computation
- Automatic drawdown recalculation
- Phase transition handling
- Breach detection and account management

## Database Schema

### Core Models

#### Account
- **Basic Info**: number, name, propfirm, starting balance
- **Drawdown Config**: daily/max amounts, types (absolute/percent), modes (static/trailing)
- **Evaluation Settings**: type (one_step/two_step), timezone, daily reset time
- **Business Rules**: include open PnL flags, manual override permissions
- **Payout Config**: profit split, cycle days, minimum requirements

#### AccountPhase
- **Phase Info**: type (phase_1/phase_2/funded), status, profit target
- **Running Stats**: current equity/balance, net profit, highest equity, trade counts
- **Timeline**: start/end dates

#### Trade
- **Trade Data**: symbol, side, quantity, entry/exit prices and times
- **Financial**: realized PnL, fees, commission
- **Attribution**: phase ID, account ID, strategy, tags
- **Metadata**: broker ID, equity snapshots

#### Supporting Models
- **Breach**: Tracks rule violations with type, amount, and context
- **DailyAnchor**: Daily equity anchors for drawdown calculation
- **EquitySnapshot**: Historical equity data for charts
- **AccountTransition**: Audit trail for phase changes
- **Payout**: Payout requests and history

## API Endpoints

### Account Management
```
GET    /api/prop-firm/accounts              # List accounts with filters
POST   /api/prop-firm/accounts              # Create new account
GET    /api/prop-firm/accounts/:id          # Get account details
PATCH  /api/prop-firm/accounts/:id          # Update account
DELETE /api/prop-firm/accounts/:id          # Delete account
POST   /api/prop-firm/accounts/:id/reset    # Reset account
```

### Trade Management
```
GET    /api/prop-firm/accounts/:id/trades   # List account trades
POST   /api/prop-firm/accounts/:id/trades   # Add new trade
```

### Statistics
```
GET    /api/prop-firm/accounts/:id/stats    # Get detailed statistics
```

### Payouts
```
GET    /api/prop-firm/payouts               # List payouts
POST   /api/prop-firm/payouts               # Request payout
PATCH  /api/prop-firm/payouts/:id           # Update payout status
```

### Background Jobs
```
POST   /api/cron/daily-anchors              # Process daily anchors
GET    /api/cron/daily-anchors              # Get anchor status
```

## Business Rules

### Drawdown Calculation

#### Daily Drawdown
- Calculated from daily anchor equity at reset time
- Supports both absolute amounts and percentages
- Configurable per account timezone and reset time
- Automatic breach detection and account failure

#### Maximum Drawdown
- **Static Mode**: Fixed from starting balance
- **Trailing Mode**: Follows highest equity achieved
- Supports both absolute and percentage limits
- Real-time breach monitoring

### Phase Progression

#### One-Step Evaluation
1. **Phase 1**: Must reach profit target → **Funded**

#### Two-Step Evaluation
1. **Phase 1**: Must reach profit target → **Phase 2**
2. **Phase 2**: Must reach profit target → **Funded**

#### Automatic Transitions
- Triggered when profit targets are reached
- Creates new phase and updates account status
- Maintains audit trail of all transitions

### Payout Eligibility (Funded Accounts)
- Minimum days since funding
- Minimum days since last payout
- Minimum profit threshold
- No active breaches
- Automatic eligibility calculation

## Configuration Options

### Account-Level Flags
```typescript
interface AccountConfig {
  ddIncludeOpenPnl: boolean           // Include open PnL in drawdown calculations
  progressionIncludeOpenPnl: boolean  // Include open PnL in progression calculations
  allowManualPhaseOverride: boolean   // Allow manual phase transitions
  resetOnPayout: boolean              // Reset account on payout
  reduceBalanceByPayout: boolean      // Reduce balance by payout amount
}
```

### Drawdown Configuration
```typescript
interface DrawdownConfig {
  dailyDrawdownAmount: number         // Daily limit amount
  dailyDrawdownType: 'absolute' | 'percent'
  maxDrawdownAmount: number           // Maximum limit amount
  maxDrawdownType: 'absolute' | 'percent'
  drawdownModeMax: 'static' | 'trailing'
}
```

### Payout Configuration
```typescript
interface PayoutConfig {
  profitSplitPercent: number          // Trader's profit share (e.g., 80%)
  payoutCycleDays: number             // Days between payouts (e.g., 14)
  minDaysToFirstPayout: number        // Days before first payout (e.g., 4)
  payoutEligibilityMinProfit?: number // Minimum profit for eligibility
  fundedResetBalance?: number         // Balance after reset (if different)
}
```

## Usage Examples

### Creating an Account
```typescript
const accountData = {
  number: "EVAL-001",
  name: "John Doe Evaluation",
  propfirm: "Example Prop Firm",
  startingBalance: 100000,
  dailyDrawdownAmount: 5,           // 5% daily limit
  dailyDrawdownType: "percent",
  maxDrawdownAmount: 10000,         // $10k max limit
  maxDrawdownType: "absolute",
  drawdownModeMax: "static",
  evaluationType: "two_step",
  timezone: "America/New_York",
  dailyResetTime: "17:00",         // 5 PM EST
}

const response = await fetch('/api/prop-firm/accounts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(accountData)
})
```

### Adding a Trade
```typescript
const tradeData = {
  symbol: "ES",
  side: "long",
  quantity: 2,
  entryPrice: 4500.25,
  exitPrice: 4508.75,
  entryTime: new Date("2024-01-15T14:30:00Z"),
  exitTime: new Date("2024-01-15T15:45:00Z"),
  fees: 4.80,
  strategy: "momentum",
  tags: ["scalp", "news"]
}

const response = await fetch(`/api/prop-firm/accounts/${accountId}/trades`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(tradeData)
})
```

### Requesting a Payout
```typescript
const payoutRequest = {
  accountId: "account-123",
  amountRequested: 5000,
  notes: "Monthly payout request"
}

const response = await fetch('/api/prop-firm/payouts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payoutRequest)
})
```

## Background Jobs

### Daily Anchor Processing
Runs automatically to:
- Create daily equity anchors at reset time for each account
- Check for drawdown breaches
- Update phase statistics
- Mark failed accounts

### Setup with Cron
```bash
# Run daily anchor processing every hour
0 * * * * curl -X POST http://localhost:3000/api/cron/daily-anchors \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Testing

### Running Tests
```bash
# Run all prop firm tests
npm test lib/prop-firm/__tests__

# Run business rules tests
npm test lib/prop-firm/__tests__/business-rules.test.ts

# Run API integration tests
npm test app/api/prop-firm/__tests__/integration.test.ts
```

### Test Coverage
- ✅ Drawdown calculations (static and trailing)
- ✅ Phase progression logic
- ✅ Payout eligibility rules
- ✅ Configuration validation
- ✅ Risk metrics calculation
- ✅ Edge cases and error handling

## Performance Considerations

### Database Optimization
- Indexes on frequently queried fields (accountId, phaseId, timestamps)
- Materialized views for complex aggregations
- Efficient pagination for large datasets

### Caching Strategy
- Phase statistics cached in database
- Equity snapshots for fast chart rendering
- Daily anchors pre-computed for quick access

### Background Processing
- Non-blocking daily anchor computation
- Batch processing for large account sets
- Error handling and retry logic

## Security & Compliance

### Data Protection
- User data isolation by userId
- Secure API endpoints with authentication
- Input validation and sanitization
- SQL injection prevention

### Audit Trail
- Complete transaction history
- Phase transition tracking
- Account modification logs
- Breach detection records

### Access Control
- User-scoped data access
- Admin controls for account management
- Configurable manual override permissions

## Monitoring & Alerts

### System Health
- Daily anchor processing status
- Breach detection alerts
- Phase transition notifications
- Payout eligibility updates

### Performance Metrics
- API response times
- Database query performance
- Background job execution time
- Error rates and recovery

## Troubleshooting

### Common Issues

#### Account Not Progressing
1. Check profit target achievement
2. Verify phase progression rules
3. Review breach history
4. Validate business rule configuration

#### Drawdown Calculation Issues
1. Verify daily anchor creation
2. Check timezone configuration
3. Review open PnL inclusion settings
4. Validate drawdown mode settings

#### Payout Eligibility Problems
1. Check minimum day requirements
2. Verify profit thresholds
3. Review breach status
4. Validate payout cycle configuration

### Debug Tools
- Account detail API for complete state
- Daily anchor status endpoint
- Breach history review
- Audit log examination

## Roadmap

### Planned Features
- [ ] Multi-currency support
- [ ] Custom evaluation rules engine
- [ ] Advanced risk management tools
- [ ] Real-time notifications
- [ ] Mobile-optimized interfaces
- [ ] Third-party integrations
- [ ] Advanced analytics and reporting

### Enhancement Ideas
- Machine learning for risk prediction
- Automated strategy analysis
- Social trading features
- Performance benchmarking
- Custom dashboard layouts
- API webhook notifications

## Contributing

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run database migrations: `npx prisma migrate dev`
5. Start development server: `npm run dev`

### Code Standards
- TypeScript for type safety
- Prisma for database operations
- Zod for input validation
- Jest/Vitest for testing
- ESLint for code quality

This documentation provides a comprehensive overview of the Prop Firm Evaluation System. For specific implementation details, refer to the source code and inline documentation.