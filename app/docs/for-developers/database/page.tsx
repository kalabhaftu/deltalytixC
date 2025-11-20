import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Database, Link as LinkIcon, Key, GitBranch } from 'lucide-react'

export default function DatabaseDocs() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Badge variant="outline" className="mb-2">For Developers</Badge>
        <h1>Database Schema Reference</h1>
        <p className="text-xl">
          Complete data model reference for Deltalytix's PostgreSQL database managed with Prisma ORM.
        </p>
      </div>

      <div className="space-y-10">
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <h2>Core Models</h2>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Authenticated user with preferences and settings
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <pre className="bg-accent/50 border p-4 rounded-lg text-sm overflow-x-auto font-mono">
{`model User {
  id            String   @id @default(cuid())
  email         String   @unique
  auth_user_id  String   @unique  // Supabase auth ID
  timezone      String   @default("America/New_York")
  theme         String   @default("system")
  firstName     String?
  lastName      String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  Account         Account[]
  Trade           Trade[]  // via accounts
  Group           Group[]
  TradeTag        TradeTag[]
  MasterAccount   MasterAccount[]
  DailyNote       DailyNote[]
}`}
                </pre>
                <div className="flex items-start gap-2 text-sm">
                  <LinkIcon className="h-4 w-4 text-primary mt-1 shrink-0" />
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Relations:</strong> One-to-many with Account, Trade, Group, TradeTag, MasterAccount, DailyNote
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trade</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Individual trade execution record with full details
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <pre className="bg-accent/50 border p-4 rounded-lg text-sm overflow-x-auto font-mono">
{`model Trade {
  id             String    @id @default(uuid())
  userId         String
  accountId      String
  phaseAccountId String?   // For prop firm trades
  instrument     String
  entryPrice     Decimal   @db.Decimal(20, 10)  // High precision
  closePrice     Decimal   @db.Decimal(20, 10)
  quantity       Float
  pnl            Float
  commission     Float     @default(0)
  entryDate      String    // yyyy-MM-dd format
  closeDate      String
  entryTime      DateTime
  exitTime       DateTime
  side           String    // "long" or "short"
  stopLoss       Decimal?  @db.Decimal(20, 10)
  takeProfit     Decimal?  @db.Decimal(20, 10)
  modelId        String?   // References TradingModel
  selectedRules  Json?     // Array of selected rules for this trade
  tags           String?   // Comma-separated tag IDs
  note           String?   @db.Text
  screenshots    String?   @db.Text  // JSON array of URLs
  entryId        String?   // Group partial closes
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  // Relations
  User           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  Account        Account   @relation(fields: [accountId], references: [id], onDelete: Cascade)
  PhaseAccount   PhaseAccount? @relation(fields: [phaseAccountId], references: [id])
  
  @@index([userId, entryTime])  // Dashboard queries
  @@index([accountId, exitTime])
  @@index([entryId])  // Grouping
}`}
                </pre>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Key className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">Key Points:</strong> Decimal types for prices prevent floating-point errors. 
                      <code>entryId</code> groups partial closes for accurate win rate.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Live trading account (broker-connected or manual tracking)
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <pre className="bg-accent/50 border p-4 rounded-lg text-sm overflow-x-auto font-mono">
{`model Account {
  id              String    @id @default(uuid())
  number          String    // Account number
  name            String?
  broker          String?
  startingBalance Float     @default(0)
  userId          String
  groupId         String?
  isArchived      Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  User            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  Group           Group?    @relation(fields: [groupId], references: [id])
  Trade           Trade[]
  DailyNote       DailyNote[]
  
  @@index([userId])
  @@index([number])
}`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>MasterAccount (Prop Firm)</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Prop firm evaluation account containing multiple phases
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <pre className="bg-accent/50 border p-4 rounded-lg text-sm overflow-x-auto font-mono">
{`model MasterAccount {
  id              String    @id @default(uuid())
  userId          String
  accountName     String
  propFirmName    String
  accountSize     Float
  evaluationType  String    // "standard", "accelerated", etc.
  currentPhase    Int       @default(1)
  status          MasterAccountStatus  @default(active)
  isActive        Boolean   @default(true)
  isArchived      Boolean   @default(false)
  createdAt       DateTime  @default(now())
  
  // Relations
  User            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  PhaseAccount    PhaseAccount[]  // Multiple phases
  Payout          Payout[]
  
  @@index([userId])
}

enum MasterAccountStatus {
  active    // Currently trading
  funded    // Passed evaluation, receiving payouts
  failed    // Breached and closed
}`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>PhaseAccount</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Individual evaluation phase with specific rules and targets
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <pre className="bg-accent/50 border p-4 rounded-lg text-sm overflow-x-auto font-mono">
{`model PhaseAccount {
  id                      String    @id @default(uuid())
  masterAccountId         String
  phaseNumber             Int
  status                  PhaseAccountStatus  @default(active)
  profitTargetPercent     Float
  dailyDrawdownPercent    Float
  maxDrawdownPercent      Float
  maxDrawdownType         String    // "balance" or "equity"
  minTradingDays          Int       @default(0)
  consistencyRulePercent  Float?
  startDate               DateTime  @default(now())
  endDate                 DateTime?
  createdAt               DateTime  @default(now())
  
  // Relations
  MasterAccount   MasterAccount    @relation(fields: [masterAccountId], references: [id], onDelete: Cascade)
  Trade           Trade[]
  DailyAnchor     DailyAnchor[]    // Daily equity snapshots
  BreachRecord    BreachRecord[]   // Rule violations
  Payout          Payout[]
  
  @@unique([masterAccountId, phaseNumber])
  @@index([masterAccountId])
}`}
                </pre>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Key className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">Daily Anchors:</strong> Stored each day to calculate daily drawdown accurately. 
                      Breach detection runs via cron job.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <h2>Supporting Models</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Group</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Organize multiple accounts for grouped analysis and filtering
                </p>
                <pre className="bg-accent/50 border p-3 rounded-lg text-xs overflow-x-auto font-mono">
{`model Group {
  id        String   @id @default(cuid())
  name      String
  userId    String
  color     String   @default("#3b82f6")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  User      User     @relation(fields: [userId], references: [id])
  Account   Account[]
}`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">TradeTag</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Custom tags for categorizing trades by strategy or setup
                </p>
                <pre className="bg-accent/50 border p-3 rounded-lg text-xs overflow-x-auto font-mono">
{`model TradeTag {
  id        String   @id @default(cuid())
  name      String
  color     String   @default("#3b82f6")
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  User      User     @relation(fields: [userId], references: [id])
}`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">DailyNote</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Trading journal entries with emotions and notes
                </p>
                <pre className="bg-accent/50 border p-3 rounded-lg text-xs overflow-x-auto font-mono">
{`model DailyNote {
  id        String   @id @default(uuid())
  date      String   // yyyy-MM-dd
  note      String   @db.Text
  emotion   String?
  userId    String
  accountId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  User      User     @relation(fields: [userId], references: [id])
  Account   Account? @relation(fields: [accountId], references: [id])
  
  @@unique([userId, date, accountId])
}`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">DailyAnchor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Daily equity snapshot for prop firm drawdown tracking
                </p>
                <pre className="bg-accent/50 border p-3 rounded-lg text-xs overflow-x-auto font-mono">
{`model DailyAnchor {
  id             String   @id @default(uuid())
  phaseAccountId String
  anchorDate     String   // yyyy-MM-dd
  anchorEquity   Float
  createdAt      DateTime @default(now())
  
  PhaseAccount   PhaseAccount @relation(fields: [phaseAccountId], references: [id])
  
  @@unique([phaseAccountId, anchorDate])
}`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">BreachRecord</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Logs prop firm rule violations
                </p>
                <pre className="bg-accent/50 border p-3 rounded-lg text-xs overflow-x-auto font-mono">
{`model BreachRecord {
  id             String   @id @default(uuid())
  phaseAccountId String
  breachType     String   // "DAILY_DD", "MAX_DD"
  breachValue    Float
  threshold      Float
  breachDate     DateTime
  createdAt      DateTime @default(now())
  
  PhaseAccount   PhaseAccount @relation(fields: [phaseAccountId], references: [id])
}`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">DashboardTemplate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Stores custom dashboard layouts and widget configurations
                </p>
                <pre className="bg-accent/50 border p-3 rounded-lg text-xs overflow-x-auto font-mono">
{`model DashboardTemplate {
  id        String   @id @default(cuid())
  name      String
  userId    String
  layout    Json     // Widget positions/sizes
  isActive  Boolean  @default(false)
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([userId])
}`}
                </pre>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <h2>Database Indexes</h2>
          </div>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                Optimized for common query patterns to ensure sub-100ms response times:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-accent/30 border rounded-lg">
                  <code className="text-xs font-mono text-primary shrink-0 mt-0.5">INDEX</code>
                  <div className="space-y-1">
                    <code className="text-sm font-mono text-foreground">Trade(userId, entryTime)</code>
                    <p className="text-xs text-muted-foreground">Speeds up dashboard trade list queries (most common)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-accent/30 border rounded-lg">
                  <code className="text-xs font-mono text-primary shrink-0 mt-0.5">INDEX</code>
                  <div className="space-y-1">
                    <code className="text-sm font-mono text-foreground">Trade(accountId, exitTime)</code>
                    <p className="text-xs text-muted-foreground">Account-specific performance queries and P&L calculations</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-accent/30 border rounded-lg">
                  <code className="text-xs font-mono text-primary shrink-0 mt-0.5">INDEX</code>
                  <div className="space-y-1">
                    <code className="text-sm font-mono text-foreground">Trade(entryId)</code>
                    <p className="text-xs text-muted-foreground">Grouping partial closes for accurate win rate</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-accent/30 border rounded-lg">
                  <code className="text-xs font-mono text-primary shrink-0 mt-0.5">UNIQUE</code>
                  <div className="space-y-1">
                    <code className="text-sm font-mono text-foreground">PhaseAccount(masterAccountId, phaseNumber)</code>
                    <p className="text-xs text-muted-foreground">Ensures one phase per number per master account</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-accent/30 border rounded-lg">
                  <code className="text-xs font-mono text-primary shrink-0 mt-0.5">UNIQUE</code>
                  <div className="space-y-1">
                    <code className="text-sm font-mono text-foreground">User(auth_user_id)</code>
                    <p className="text-xs text-muted-foreground">Fast lookup by Supabase auth ID in middleware</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <h2>Enums</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">TradingModel</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-accent/50 border p-3 rounded-lg text-xs overflow-x-auto font-mono">
{`enum TradingModel {
  ICT_2022       // Inner Circle Trader 2022
  MSNR           // Mentfx SNR
  TTFM           // Trade the Fucking Market
  PRICE_ACTION   // Price Action
}`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">PhaseAccountStatus</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-accent/50 border p-3 rounded-lg text-xs overflow-x-auto font-mono">
{`enum PhaseAccountStatus {
  active    // Currently trading
  passed    // Met profit target
  failed    // Breached rules
  archived  // Manually archived
  pending   // Not started
}`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">MasterAccountStatus</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-accent/50 border p-3 rounded-lg text-xs overflow-x-auto font-mono">
{`enum MasterAccountStatus {
  active    // Evaluation in progress
  funded    // Passed, receiving payouts
  failed    // Breached
}`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">TransactionType</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-accent/50 border p-3 rounded-lg text-xs overflow-x-auto font-mono">
{`enum TransactionType {
  DEPOSIT     // Adding funds
  WITHDRAWAL  // Removing funds
}`}
                </pre>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card className="border-primary bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Database className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Prisma CLI Commands</h3>
                <p className="text-sm text-muted-foreground">
                  Essential commands for database management:
                </p>
                <div className="grid gap-3 mt-4">
                  <div className="bg-accent/30 border rounded-lg p-3">
                    <code className="text-sm font-mono">npx prisma db pull</code>
                    <p className="text-xs text-muted-foreground mt-1">Introspect database and update schema.prisma</p>
                  </div>
                  <div className="bg-accent/30 border rounded-lg p-3">
                    <code className="text-sm font-mono">npx prisma generate</code>
                    <p className="text-xs text-muted-foreground mt-1">Generate Prisma Client with updated types</p>
                  </div>
                  <div className="bg-accent/30 border rounded-lg p-3">
                    <code className="text-sm font-mono">npx prisma migrate dev</code>
                    <p className="text-xs text-muted-foreground mt-1">Create and apply a new migration</p>
                  </div>
                  <div className="bg-accent/30 border rounded-lg p-3">
                    <code className="text-sm font-mono">npx prisma studio</code>
                    <p className="text-xs text-muted-foreground mt-1">Open visual database browser at localhost:5555</p>
                  </div>
                  <div className="bg-accent/30 border rounded-lg p-3">
                    <code className="text-sm font-mono">npx prisma migrate reset</code>
                    <p className="text-xs text-muted-foreground mt-1">Reset database and re-run all migrations (dev only!)</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  <strong className="text-foreground">Schema Location:</strong> <code>prisma/schema.prisma</code>
                  <br />
                  <strong className="text-foreground">Migrations:</strong> <code>prisma/migrations/</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
