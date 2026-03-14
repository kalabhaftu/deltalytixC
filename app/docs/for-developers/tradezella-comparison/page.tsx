'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Warning, Database, Lightning, Package } from '@phosphor-icons/react'

export default function TradezellaComparisonDocs() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Badge variant="outline" className="mb-2">For Developers</Badge>
        <h1>DeltalytixC vs TradeZella (architecture)</h1>
        <p className="text-xl">
          A direct comparison based on observable behavior + standard SaaS patterns.
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightning weight="light" className="h-5 w-5 text-primary" />
              Server-side computation (90%)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              TradeZella-style systems compute stats server-side and return DTOs. DeltalytixC does the same via
              <code> /api/v1/trades</code> and <code> /api/v1/reports/stats</code>.
            </p>
            <div className="flex items-start gap-2">
              <CheckCircle weight="light" className="h-4 w-4 text-primary mt-1 shrink-0" />
              <p><strong className="text-foreground">Verdict:</strong> Match.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database weight="light" className="h-5 w-5 text-primary" />
              Indexes & query patterns
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              TradeZella-style platforms rely on composite indexes for user+account+date range scans.
              DeltalytixC has the equivalent indexes in Prisma schema.
            </p>
            <div className="flex items-start gap-2">
              <CheckCircle weight="light" className="h-4 w-4 text-primary mt-1 shrink-0" />
              <p><strong className="text-foreground">Verdict:</strong> Match.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package weight="light" className="h-5 w-5 text-primary" />
              Payload size & pagination (the gap)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              The main difference is not computation — it’s payload size. TradeZella-style UX usually paginates the trade table
              (cursor/limit) while stats are computed over the full filtered set.
            </p>
            <div className="flex items-start gap-2">
              <Warning weight="light" className="h-4 w-4 text-primary mt-1 shrink-0" />
              <p>
                <strong className="text-foreground">Gap:</strong> returning thousands of trades in one JSON response for “All time”
                can create multi‑MB payloads.
              </p>
            </div>
            <p>
              We added pagination support on <code>/api/v1/trades</code> using <code>pageLimit</code> and <code>pageOffset</code> so
              the UI can request smaller pages while still receiving server-computed stats.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

