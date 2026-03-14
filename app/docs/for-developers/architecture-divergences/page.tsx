'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowsLeftRight, Shield, Wrench } from '@phosphor-icons/react'

export default function ArchitectureDivergencesDocs() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Badge variant="outline" className="mb-2">For Developers</Badge>
        <h1>Architecture Divergences (90/10 Migration)</h1>
        <p className="text-xl">
          Intentional deviations from the original plan (kept for stability and to match the current codebase).
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowsLeftRight weight="light" className="h-5 w-5 text-primary" />
              React Query vs SWR
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong className="text-foreground">Decision:</strong> React Query (TanStack Query) is the canonical client data layer.</p>
            <p><strong className="text-foreground">Reason:</strong> SWR migration would add churn without benefit; React Query already exists across the app.</p>
            <p><strong className="text-foreground">Impact:</strong> Data fetching uses <code>useQuery</code>/<code>useMutation</code> hooks. SWR hooks are not used.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench weight="light" className="h-5 w-5 text-primary" />
              Dashboard stats ownership
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong className="text-foreground">Decision:</strong> Dashboard stats stay canonical in <code>/api/dashboard/stats</code>, not forced through a generic statistics module.</p>
            <p><strong className="text-foreground">Reason:</strong> Dashboard has bespoke logic (account filter settings, prop-firm integration). Forcing it through generic helpers risks changing UX/behavior.</p>
            <p><strong className="text-foreground">Impact:</strong> Reports use <code>report-statistics.ts</code>; dashboard uses its own route with stable behavior.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield weight="light" className="h-5 w-5 text-primary" />
              Other decisions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-foreground">Accounts stats endpoint:</strong> no <code>/api/accounts/stats</code> added; existing page was acceptable.</li>
              <li><strong className="text-foreground">Major news events:</strong> served server-side via <code>/api/news-events</code> instead of client importing a large constant file.</li>
              <li><strong className="text-foreground">Cron security:</strong> cron endpoints require a secret header in production.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

