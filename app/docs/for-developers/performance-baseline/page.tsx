'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartLineUp, Gauge, ShieldCheck } from '@phosphor-icons/react'

export default function PerformanceBaselineDocs() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Badge variant="outline" className="mb-2">For Developers</Badge>
        <h1>Performance Baseline (90/10)</h1>
        <p className="text-xl">
          What improved after the server-first migration and what to monitor in production.
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartLineUp weight="light" className="h-5 w-5 text-primary" />
              Before vs after
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border bg-accent/30 p-4 space-y-2">
                <p className="font-semibold text-foreground">Before (client-heavy)</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Dashboard fetched large trade payloads and computed stats in the browser.</li>
                  <li>Reports ran heavy aggregation client-side.</li>
                  <li>TTI degraded as trade counts grew (CPU + memory on client).</li>
                </ul>
              </div>
              <div className="rounded-lg border bg-accent/30 p-4 space-y-2">
                <p className="font-semibold text-foreground">After (90/10 server-first)</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Dashboard uses <code>/api/v1/trades</code> (server filtering + server stats).</li>
                  <li>Reports use <code>/api/v1/reports/stats</code> (server-only aggregations).</li>
                  <li>Client becomes mostly rendering + caching (React Query).</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge weight="light" className="h-5 w-5 text-primary" />
              Targets (p95)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="overflow-x-auto">
              <table className="w-full border">
                <thead>
                  <tr className="bg-accent">
                    <th className="p-3 text-left text-foreground">Endpoint</th>
                    <th className="p-3 text-left text-foreground">Target p95</th>
                    <th className="p-3 text-left text-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-3"><code>GET /api/v1/trades</code></td>
                    <td className="p-3">&lt; 500ms</td>
                    <td className="p-3">Typical filters (date range, 1–3 accounts)</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-3"><code>POST /api/v1/reports/stats</code></td>
                    <td className="p-3">&lt; 800ms</td>
                    <td className="p-3">Full report aggregation</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-3"><code>GET /api/dashboard/stats</code></td>
                    <td className="p-3">&lt; 400ms</td>
                    <td className="p-3">Dashboard summary metrics</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck weight="light" className="h-5 w-5 text-primary" />
              Cache, rate limiting, logging
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-foreground">Cache headers:</strong> user-specific APIs use short private caching.</li>
              <li><strong className="text-foreground">Rate limiting:</strong> heavy APIs guarded to prevent abuse.</li>
              <li><strong className="text-foreground">Logging:</strong> endpoint latency and errors tracked via the structured logger.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

