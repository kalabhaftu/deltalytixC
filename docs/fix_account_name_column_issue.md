# Fix for "Error: Failed to fetch accounts" Issue

## Problem Description
The application was experiencing an error when trying to fetch accounts in the prop firm dashboard:
```
Error: Failed to fetch accounts
    at fetchAccounts (http://localhost:3000/_next/static/chunks/_b5ddacd9._.js:4896:23)
```

The root cause was a database schema mismatch where the Prisma client expected a `name` column on the `Account` table, but this column didn't exist in the actual database.

## Root Cause Analysis
1. The Prisma schema defined a `name` field in the `Account` model (line 239 in `prisma/schema.prisma`)
2. The migration file `20250115000001_add_prop_firm_evaluation_system` included the SQL statement to add the `name` column
3. However, this migration hadn't been applied to the database
4. When the API endpoint `/api/prop-firm/accounts` tried to fetch accounts and access the `name` field, it failed with the error:
   ```
   The column `Account.name` does not exist in the current database.
   ```

## Solution Approach
Since the standard Prisma migration commands were hanging, we implemented a manual approach using direct PostgreSQL connections:

1. Created a script to add the basic columns to the Account table
2. Created a script to create the required enum types
3. Created a script to add the remaining enum columns to the Account table

## Implementation Steps

### Step 1: Add Basic Columns
Created `add_columns_pg.js` to add the basic columns that didn't require enum types:
```javascript
const columns = [
  { name: 'name', type: 'TEXT' },
  { name: 'dailyDrawdownAmount', type: 'DOUBLE PRECISION' },
  { name: 'maxDrawdownAmount', type: 'DOUBLE PRECISION' },
  { name: 'timezone', type: 'TEXT DEFAULT \'UTC\'' },
  { name: 'dailyResetTime', type: 'TEXT DEFAULT \'00:00\'' },
  { name: 'ddIncludeOpenPnl', type: 'BOOLEAN DEFAULT false' },
  { name: 'progressionIncludeOpenPnl', type: 'BOOLEAN DEFAULT false' },
  { name: 'allowManualPhaseOverride', type: 'BOOLEAN DEFAULT false' },
  { name: 'profitSplitPercent', type: 'DOUBLE PRECISION DEFAULT 80' },
  { name: 'payoutCycleDays', type: 'INTEGER DEFAULT 14' },
  { name: 'minDaysToFirstPayout', type: 'INTEGER DEFAULT 4' },
  { name: 'payoutEligibilityMinProfit', type: 'DOUBLE PRECISION' },
  { name: 'resetOnPayout', type: 'BOOLEAN DEFAULT false' },
  { name: 'reduceBalanceByPayout', type: 'BOOLEAN DEFAULT true' },
  { name: 'fundedResetBalance', type: 'DOUBLE PRECISION' }
];
```

### Step 2: Create Enum Types
Created `create_enums_pg.js` to create the required enum types:
```javascript
const enums = [
  { name: 'AccountStatus', sql: 'CREATE TYPE "AccountStatus" AS ENUM (\'active\', \'failed\', \'passed\', \'funded\');' },
  { name: 'PhaseType', sql: 'CREATE TYPE "PhaseType" AS ENUM (\'phase_1\', \'phase_2\', \'funded\');' },
  { name: 'PhaseStatus', sql: 'CREATE TYPE "PhaseStatus" AS ENUM (\'active\', \'passed\', \'failed\');' },
  { name: 'DrawdownType', sql: 'CREATE TYPE "DrawdownType" AS ENUM (\'absolute\', \'percent\');' },
  { name: 'DrawdownMode', sql: 'CREATE TYPE "DrawdownMode" AS ENUM (\'static\', \'trailing\');' },
  { name: 'EvaluationType', sql: 'CREATE TYPE "EvaluationType" AS ENUM (\'one_step\', \'two_step\');' },
  { name: 'BreachType', sql: 'CREATE TYPE "BreachType" AS ENUM (\'daily_drawdown\', \'max_drawdown\');' }
];
```

### Step 3: Add Enum Columns
Created `add_remaining_enum_columns_pg.js` to add the columns that required enum types:
```javascript
const columns = [
  { name: 'dailyDrawdownType', type: '"DrawdownType" DEFAULT \'percent\'' },
  { name: 'maxDrawdownType', type: '"DrawdownType" DEFAULT \'percent\'' },
  { name: 'drawdownModeMax', type: '"DrawdownMode" DEFAULT \'static\'' },
  { name: 'evaluationType', type: '"EvaluationType" DEFAULT \'two_step\'' },
  { name: 'status', type: '"AccountStatus" DEFAULT \'active\'' }
];
```

## Verification
After applying these fixes:
1. The API endpoint `/api/prop-firm/accounts` now returns a 200 status code
2. The error "The column `Account.name` does not exist in the current database" is resolved
3. The frontend prop-firm dashboard can now successfully fetch and display accounts

## Files Created
1. `add_columns_pg.js` - Script to add basic columns
2. `create_enums_pg.js` - Script to create enum types
3. `add_remaining_enum_columns_pg.js` - Script to add enum columns
4. `docs/fix_account_name_column_issue.md` - This documentation

## Lessons Learned
1. Database schema mismatches can cause hard-to-debug errors in ORMs like Prisma
2. When standard migration tools fail, direct SQL execution can be a viable alternative
3. Enum types must be created before columns that reference them
4. PostgreSQL doesn't support "IF NOT EXISTS" for CREATE TYPE, requiring manual checks

## Future Prevention
To prevent similar issues in the future:
1. Ensure all migrations are properly applied after schema changes
2. Implement automated checks to verify database schema matches Prisma schema
3. Consider adding database schema verification to CI/CD pipelines