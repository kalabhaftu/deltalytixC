import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Code, Database, Lock, Zap, GitBranch, FileCode, Server, Layers, CheckCircle2, Shield, TrendingUp, BookOpen, Activity, Workflow } from 'lucide-react'

export default function ArchitectureDocs() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Badge variant="outline" className="mb-2">For Developers</Badge>
        <h1>System Architecture</h1>
        <p className="text-xl">
          Deep dive into Deltalytix's technical architecture, design patterns, and implementation details.
        </p>
      </div>

      <div className="space-y-10">
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <h2>Technology Stack</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <FileCode className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Frontend</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">Next.js 15.2</strong>
                      <p className="text-muted-foreground">App Router, React Server Components, Server Actions</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">React 19</strong>
                      <p className="text-muted-foreground">Latest features including use() hook, optimistic updates</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">TypeScript 5.7</strong>
                      <p className="text-muted-foreground">Strict mode enabled for maximum type safety</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">Tailwind CSS</strong>
                      <p className="text-muted-foreground">Utility-first CSS with custom theme system</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">Radix UI</strong>
                      <p className="text-muted-foreground">Unstyled, accessible component primitives</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">Framer Motion</strong>
                      <p className="text-muted-foreground">Declarative animations and gestures</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Server className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Backend</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">Next.js API Routes</strong>
                      <p className="text-muted-foreground">RESTful endpoints for public-facing APIs</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">Server Actions</strong>
                      <p className="text-muted-foreground">Type-safe RPC for mutations with progressive enhancement</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">PostgreSQL 16</strong>
                      <p className="text-muted-foreground">Relational database with JSONB support</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">Prisma ORM 6.2</strong>
                      <p className="text-muted-foreground">Type-safe database client with migrations</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">Supabase Auth</strong>
                      <p className="text-muted-foreground">OAuth, OTP, and password authentication</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <GitBranch className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">State Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">Zustand</strong>
                      <p className="text-muted-foreground">Lightweight store for UI state (modals, filters, layout)</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">React Server Components</strong>
                      <p className="text-muted-foreground">Server-side data fetching and caching</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">React Context</strong>
                      <p className="text-muted-foreground">Auth provider, theme provider, data provider</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Infrastructure</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">Vercel</strong>
                      <p className="text-muted-foreground">Edge Functions, automatic deployments, CDN</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">Supabase</strong>
                      <p className="text-muted-foreground">Managed PostgreSQL, Auth, Storage (images)</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <div>
                      <strong className="text-foreground">Sentry</strong>
                      <p className="text-muted-foreground">Error tracking and performance monitoring</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <h2>Data Flow Architecture</h2>
          </div>

          <div className="space-y-6">
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">1</span>
                  User Authentication Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <pre className="bg-accent/50 border p-4 rounded-lg text-sm overflow-x-auto">
                    {`User → Supabase Auth (OAuth/OTP) 
     → Middleware intercepts request
     → Validates session token
     → Sets x-user-id header
     → Server Components/Actions read user ID
     → Prisma queries filtered by userId`}
                  </pre>
                  <p className="text-sm text-muted-foreground">
                    Authentication is stateless. Every request validates the session cookie.
                    User ID is extracted in middleware and made available to all server-side code.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">2</span>
                  Data Fetching Flow (Reads)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <pre className="bg-accent/50 border p-4 rounded-lg text-sm overflow-x-auto">
                    {`Server Component (async) 
  → Extract userId from headers
  → Call Prisma query (e.g., prisma.trade.findMany)
  → PostgreSQL executes with indexes
  → Return data directly to component
  → React serializes and streams to client
  → Client Component hydrates with data`}
                  </pre>
                  <p className="text-sm text-muted-foreground">
                    No client-side fetching for initial data. Server Components fetch directly
                    from the database, leveraging Next.js caching (force-cache, revalidate: 60).
                  </p>
                  <div className="bg-accent/30 border rounded-lg p-3 mt-3">
                    <p className="text-sm font-mono text-foreground">Example:</p>
                    <pre className="text-xs mt-2 overflow-x-auto">
                      {`// app/dashboard/page.tsx
export default async function DashboardPage() {
  const userId = headers().get('x-user-id')
  const trades = await prisma.trade.findMany({
    where: { userId },
    orderBy: { exitTime: 'desc' }
  })
  return <Dashboard trades={trades} />
}`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono">3</span>
                  Data Mutation Flow (Writes)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <pre className="bg-accent/50 border p-4 rounded-lg text-sm overflow-x-auto">
                    {`Client Component → calls Server Action or API Route
                 → Validates input with Zod schema
                 → Checks rate limit
                 → Prisma write operation (create/update/delete)
                 → Revalidate path/tag to bust cache
                 → Return result to client
                 → Client updates UI optimistically or refetches`}
                  </pre>
                  <p className="text-sm text-muted-foreground">
                    Server Actions are preferred for mutations. They provide automatic CSRF protection,
                    type safety, and progressive enhancement.
                  </p>
                  <div className="bg-accent/30 border rounded-lg p-3 mt-3">
                    <p className="text-sm font-mono text-foreground">Example Server Action:</p>
                    <pre className="text-xs mt-2 overflow-x-auto">
                      {`'use server'
import { revalidatePath } from 'next/cache'

export async function deleteTrade(tradeId: string) {
  const userId = headers().get('x-user-id')
  
  await prisma.trade.deleteMany({
    where: { id: tradeId, userId } // Security: userId check
  })
  
  revalidatePath('/dashboard')
  return { success: true }
}`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileCode className="h-5 w-5 text-primary" />
            </div>
            <h2>Project Structure</h2>
          </div>

          <Card>
            <CardContent className="pt-6">
              <pre className="bg-accent/50 border p-6 rounded-lg text-sm font-mono overflow-x-auto">
                {`deltalytixC/
├── app/
│   ├── dashboard/
│   │   ├── components/          # Dashboard-specific UI
│   │   │   ├── charts/          # Recharts widgets
│   │   │   ├── kpi/             # KPI metric cards
│   │   │   ├── calendar/        # Calendar views
│   │   │   ├── journal/         # Journal components
│   │   │   ├── navbar.tsx       # Top navigation
│   │   │   └── sidebar/         # Mobile sidebar
│   │   ├── config/
│   │   │   └── widget-registry-lazy.tsx  # Widget definitions
│   │   ├── actions/             # Server Actions
│   │   │   ├── accounts.ts
│   │   │   └── trades.ts
│   │   ├── data/                # Data management page
│   │   ├── settings/            # User settings
│   │   ├── layout.tsx           # Dashboard layout wrapper
│   │   └── page.tsx             # Main dashboard (Server Component)
│   ├── api/
│   │   ├── trades/              # Trade CRUD endpoints
│   │   ├── auth/                # Auth endpoints
│   │   ├── journal/             # Journal + AI analysis
│   │   ├── prop-firm/        # Prop firm APIs
│   │   └── cron/                # Background jobs
│   ├── docs/                    # Documentation pages
│   ├── globals.css              # Tailwind + theme CSS
│   └── layout.tsx               # Root layout
├── components/
│   ├── ui/                      # Shadcn/Radix components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── logo.tsx
│   └── theme-switcher.tsx
├── context/
│   ├── auth-provider.tsx        # Supabase auth context
│   ├── data-provider.tsx        # Global data context
│   ├── theme-provider.tsx       # Theme management
│   └── template-provider.tsx    # Dashboard templates
├── lib/
│   ├── utils.ts                 # Utility functions (cn, calculations)
│   ├── prisma.ts                # Prisma singleton client
│   ├── rate-limiter.ts          # Rate limit implementation
│   ├── logger.ts                # Structured logging
│   ├── supabase/
│   │   ├── client.ts            # Client-side Supabase
│   │   └── server.ts            # Server-side Supabase
│   ├── prop-firm/               # Prop firm logic
│   │   └── phase-evaluation-engine.ts
│   └── validation/              # Zod schemas
├── server/
│   ├── auth.ts                  # Auth server actions
│   ├── accounts.ts              # Account management
│   ├── trades.ts                # Trade operations
│   ├── user-data.ts             # User data fetching
│   └── groups.ts                # Account groups
├── store/
│   ├── user-store.ts            # Zustand: user state
│   ├── modal-state-store.ts    # Zustand: modal visibility
│   └── dashboard-edit-store.ts # Zustand: dashboard edit mode
├── types/
│   ├── dashboard.ts             # Widget types
│   ├── supabase.ts              # Generated Supabase types
│   └── index.ts                 # Global types
├── prisma/
│   └── schema.prisma            # Database schema
├── .env.local                   # Environment variables
└── package.json`}
              </pre>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Code className="h-5 w-5 text-primary" />
            </div>
            <h2>Key Design Decisions</h2>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">API Routes vs Server Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-sm text-foreground mb-2">When to use API Routes:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Public endpoints that need to be called from external sources</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Webhooks (e.g., Stripe, Supabase realtime)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>File downloads/uploads that return non-JSON responses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>GET requests that benefit from Next.js edge caching</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground mb-2">When to use Server Actions:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Form submissions with progressive enhancement</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Mutations that don't need to be publicly exposed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Type-safe RPC calls from client components</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Decimal Types for Financial Data</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Entry and exit prices are stored as <code>Decimal(20,10)</code> instead of <code>Float</code>
                  to preserve exact precision from CSV imports and avoid floating-point rounding errors.
                </p>
                <div className="bg-accent/30 border rounded-lg p-3">
                  <pre className="text-xs overflow-x-auto">
                    {`model Trade {
  entryPrice Decimal @db.Decimal(20, 10)
  closePrice Decimal @db.Decimal(20, 10)
  // ...
}`}
                  </pre>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  This ensures sorting and filtering by price work correctly, which is critical for
                  trade analysis and reporting.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trade Grouping by entryId</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Partial closes (scaling out) are grouped by <code>entryId</code> to ensure accurate
                  win rate calculations. A single entry with 3 partial closes counts as 1 trade, not 3.
                </p>
                <div className="bg-accent/30 border rounded-lg p-3">
                  <pre className="text-xs overflow-x-auto">
                    {`// lib/utils.ts - groupTradesByExecution
export function groupTradesByExecution(trades: Trade[]) {
  const groups = new Map()
  
  for (const trade of trades) {
    const key = trade.entryId || trade.id
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(trade)
  }
  
  return Array.from(groups.values()).map(group => ({
    ...group[0],
    pnl: group.reduce((sum, t) => sum + t.pnl, 0),
    quantity: group.reduce((sum, t) => sum + t.quantity, 0)
  }))
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prisma as Primary ORM</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Centralized schema in Prisma enables:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong className="text-foreground">Type safety:</strong> Auto-generated TypeScript types for all models</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong className="text-foreground">Migrations:</strong> Version-controlled schema changes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong className="text-foreground">Cross-platform:</strong> Same schema works with Python, Go, etc.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong className="text-foreground">Studio:</strong> Visual database browser for debugging</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h2>Performance Optimizations</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg h-fit">
                    <Server className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Server Components</h4>
                    <p className="text-sm text-muted-foreground">
                      Data-heavy pages use Server Components to fetch directly from DB.
                      Zero client-side JS for initial render, faster Time to Interactive.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg h-fit">
                    <Code className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Dynamic Imports</h4>
                    <p className="text-sm text-muted-foreground">
                      Charts and heavy dependencies are lazy-loaded with <code>next/dynamic</code>.
                      Widget registry uses code splitting per widget.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg h-fit">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Rate Limiting</h4>
                    <p className="text-sm text-muted-foreground">
                      10 req/min for auth endpoints, 100/min for data.
                      Prevents abuse and DoS attacks. Uses in-memory cache with TTL.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg h-fit">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Database Indexes</h4>
                    <p className="text-sm text-muted-foreground">
                      Composite indexes on <code>(userId, entryTime)</code> for dashboard queries.
                      Index on <code>entryId</code> for grouping. Sub-100ms query times.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg h-fit">
                    <FileCode className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">ISR Caching</h4>
                    <p className="text-sm text-muted-foreground">
                      Static pages revalidate every 60s. Dashboard data cached per-user.
                      <code>revalidatePath()</code> busts cache on mutations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg h-fit">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Structured Logging</h4>
                    <p className="text-sm text-muted-foreground">
                      JSON logs in production for easy parsing.
                      Log levels (info, warn, error) sent to Sentry for monitoring.
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
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h2>Security Measures</h2>
          </div>

          <div className="grid gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold">AUTH</span>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground text-sm">Middleware-level Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        Every request validated at the edge. Unsigned/expired tokens rejected before hitting handlers.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold">RLS</span>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground text-sm">Row Level Security</p>
                      <p className="text-sm text-muted-foreground">
                        Supabase RLS policies enforce userId checks at the database level.
                        Even if Prisma query is misconfigured, DB rejects unauthorized access.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold">ZOD</span>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground text-sm">Input Validation</p>
                      <p className="text-sm text-muted-foreground">
                        All API inputs validated with Zod schemas. Type coercion, regex checks,
                        min/max constraints prevent injection and malformed data.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold">ENV</span>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground text-sm">Environment Variable Validation</p>
                      <p className="text-sm text-muted-foreground">
                        Critical env vars (DB_URL, SUPABASE keys) validated at build time.
                        Missing/invalid values cause immediate fail-fast errors.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold">CSP</span>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground text-sm">Content Security Policy</p>
                      <p className="text-sm text-muted-foreground">
                        Restrictive CSP headers block inline scripts and unauthorized origins.
                        Mitigates XSS attacks.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card className="border-primary bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <FileCode className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Testing Strategy</h3>
                <p className="text-sm text-muted-foreground">
                  Comprehensive test coverage ensures reliability:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <div>
                      <strong className="text-foreground">Vitest</strong> for unit tests (financial calculations, utility functions)
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <div>
                      <strong className="text-foreground">Playwright</strong> for E2E tests (user flows, critical paths)
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <div>
                      <strong className="text-foreground">100% coverage target</strong> for financial logic (win rate, profit factor, drawdown)
                    </div>
                  </li>
                </ul>
                <div className="bg-accent/30 border rounded-lg p-3 mt-3">
                  <pre className="text-xs overflow-x-auto">
                    {`# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage`}
                  </pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
