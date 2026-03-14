'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Lightning, Wrench, Warning } from '@phosphor-icons/react'

export default function PrismaOptimizationDocs() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Badge variant="outline" className="mb-2">For Developers</Badge>
        <h1>Prisma & Database Optimization</h1>
        <p className="text-xl">
          What’s indexed, what’s optimized, and where the remaining hotspots are.
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database weight="light" className="h-5 w-5 text-primary" />
              Index coverage (verified)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              The Prisma schema includes composite indexes to support the read-heavy analytical patterns used by the 90/10 endpoints.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border bg-accent/30 p-4">
                <p className="font-semibold text-foreground mb-2">Trade model</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><code>@@index([userId, entryDate(sort: Desc)])</code> — dashboard/reports date range scans</li>
                  <li><code>@@index([userId, accountNumber, entryDate])</code> — account + date filters (v1 trades)</li>
                  <li><code>@@index([userId, instrument])</code> — symbol filters</li>
                  <li><code>@@index([userId, pnl])</code> — PnL range filters</li>
                  <li><code>@@index([userId])</code>, <code>@@index([accountNumber])</code>, <code>@@index([phaseAccountId])</code> — base lookups</li>
                </ul>
              </div>
              <div className="rounded-lg border bg-accent/30 p-4">
                <p className="font-semibold text-foreground mb-2">Other models</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><code>Account</code>: <code>@@index([userId])</code></li>
                  <li><code>LiveAccountTransaction</code>: <code>@@index([userId])</code>, <code>@@index([accountId, createdAt])</code></li>
                  <li><code>MasterAccount</code>: <code>@@index([userId, status])</code></li>
                  <li><code>PhaseAccount</code>: <code>@@index([status])</code>, <code>@@index([phaseId])</code></li>
                  <li><code>DailyNote</code>: <code>@@index([accountId])</code></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightning weight="light" className="h-5 w-5 text-primary" />
              N+1 patterns (status)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-foreground">server/user-data.ts</strong>: parallel fetch via <code>Promise.all</code>.</li>
              <li><strong className="text-foreground">lib/statistics/report-statistics.ts</strong>: single <code>findMany</code> + parallel models fetch.</li>
              <li><strong className="text-foreground">app/api/v1/trades/route.ts</strong>: single <code>findMany</code> for trades + accounts (no per-trade queries).</li>
              <li><strong className="text-foreground">app/api/dashboard/stats/route.ts</strong>: parallel queries.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warning weight="light" className="h-5 w-5 text-primary" />
              Known lower-traffic N+1
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">server/accounts.ts</strong> <code>updateCommissionForGroupAction</code> updates trades one-by-one.
              If this becomes hot, switch to batched updates.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench weight="light" className="h-5 w-5 text-primary" />
              Rollback & validation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Rollback:</strong> drop the index in a down migration and run Prisma migrate.</p>
            <p><strong className="text-foreground">Validate:</strong> use <code>EXPLAIN (ANALYZE, BUFFERS)</code> and prefer Index Scans over Seq Scans for filtered trade queries.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

