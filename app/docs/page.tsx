import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ArrowRight, Upload, BarChart3, Building2, BookOpen, Zap, Shield, TrendingUp, Database, Lock, Activity, FileCode, Workflow, GitBranch, Rocket, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function DocsHome() {
  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <div className="space-y-6 pt-4">
        <Badge variant="outline" className="mb-2 text-primary border-primary/20">v2.0</Badge>
        <h1 className="text-5xl font-bold tracking-tight">Deltalytix Documentation</h1>
        <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed">
          A comprehensive trading analytics platform for professional traders. Track performance, 
          analyze patterns, and optimize your trading strategy with advanced metrics and real-time insights.
        </p>
        <div className="flex gap-4 mt-8">
          <Button asChild size="lg" className="h-11 px-8 font-semibold shadow-lg hover:shadow-primary/20 transition-all">
            <Link href="/docs/getting-started">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11 px-6 hover:bg-accent transition-all">
            <Link href="/docs/features/importing">
              View Features
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="h-11 px-6">
            <Link href="/docs/for-developers/architecture">
              Developer Docs
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Feature Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/docs/features/importing" className="group">
          <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all duration-200">
            <CardHeader className="space-y-4">
              <div className="p-3 bg-primary/10 rounded-lg w-fit group-hover:bg-primary/20 transition-colors">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="group-hover:text-primary transition-colors">Trade Import</CardTitle>
              <CardDescription className="leading-relaxed">
                Import trades from CSV files with intelligent AI-powered field mapping. 
                Supports major brokers (Exness, Match Trader, MT4/MT5) and custom formats.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-3">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                  <span>Automatic column detection and mapping</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                  <span>Batch import up to 10,000 trades</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                  <span>Manual entry with validation</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </Link>

        <Link href="/docs/features/dashboard" className="group">
          <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all duration-200">
            <CardHeader className="space-y-4">
              <div className="p-3 bg-primary/10 rounded-lg w-fit group-hover:bg-primary/20 transition-colors">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="group-hover:text-primary transition-colors">Dashboard Analytics</CardTitle>
              <CardDescription className="leading-relaxed">
                Fully customizable drag-and-drop dashboard with 20+ widgets. 
                Track KPIs, visualize performance, and identify patterns in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-3">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                  <span>Win rate, profit factor, drawdown tracking</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                  <span>Advanced filtering by date, instrument, account</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                  <span>Equity curve and P&L charts</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </Link>

        <Link href="/docs/features/prop-firm" className="group">
          <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all duration-200">
            <CardHeader className="space-y-4">
              <div className="p-3 bg-primary/10 rounded-lg w-fit group-hover:bg-primary/20 transition-colors">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="group-hover:text-primary transition-colors">Prop Firm Tracking</CardTitle>
              <CardDescription className="leading-relaxed">
                Comprehensive prop firm evaluation monitoring with automated breach detection 
                and phase progression tracking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-3">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                  <span>Real-time daily/max drawdown monitoring</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                  <span>Automated profit target & consistency checks</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                  <span>Multi-phase evaluation support</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Technical Features */}
      <div className="border-t pt-12 space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold">Core Capabilities</h2>
          <p className="text-muted-foreground text-lg">
            Built with performance, security, and scalability in mind.
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex gap-4 p-6 border rounded-lg hover:border-primary/50 transition-colors">
            <div className="p-3 bg-primary/10 rounded-lg h-fit shrink-0">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">High Performance</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Built on Next.js 15 with React Server Components for blazing-fast load times. 
                Optimized queries handle 100,000+ trades with sub-second response times. 
                ISR caching ensures minimal database load.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 border rounded-lg hover:border-primary/50 transition-colors">
            <div className="p-3 bg-primary/10 rounded-lg h-fit shrink-0">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Enterprise Security</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Supabase authentication with Row Level Security (RLS) policies. 
                Rate limiting on all sensitive endpoints (10 req/min for auth, 100/min for data). 
                All inputs validated with Zod schemas.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 border rounded-lg hover:border-primary/50 transition-colors">
            <div className="p-3 bg-primary/10 rounded-lg h-fit shrink-0">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Precision Analytics</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Decimal(20,10) precision for price data ensures accurate calculations. 
                Win rate excludes break-even trades for realistic metrics. 
                Advanced position sizing and risk/reward analysis built-in.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 border rounded-lg hover:border-primary/50 transition-colors">
            <div className="p-3 bg-primary/10 rounded-lg h-fit shrink-0">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">AI-Powered Journaling</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Document trades with screenshots, emotions, and detailed notes. 
                AI analysis identifies patterns in your psychology and correlates emotions with P&L. 
                Get personalized recommendations to improve discipline.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 border rounded-lg hover:border-primary/50 transition-colors">
            <div className="p-3 bg-primary/10 rounded-lg h-fit shrink-0">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Real-Time Monitoring</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Live P&L tracking with instant updates. 
                Automated breach alerts for prop firm accounts sent via email/notification. 
                WebSocket integration for real-time data sync across devices.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 border rounded-lg hover:border-primary/50 transition-colors">
            <div className="p-3 bg-primary/10 rounded-lg h-fit shrink-0">
              <Workflow className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Advanced Filtering</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Filter by date range, instruments, accounts, P&L range, time in position, 
                weekday, and hour of day. Combine multiple filters for granular analysis. 
                Save custom filter presets for quick access.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="border-t pt-12 space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold">Technology Stack</h2>
          <p className="text-muted-foreground text-lg">
            Modern, production-ready technologies powering Deltalytix.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div className="p-5 border rounded-lg hover:border-primary/50 transition-colors space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <FileCode className="h-4 w-4 text-primary" />
              <p className="font-semibold">Frontend</p>
            </div>
            <p className="text-sm text-muted-foreground">Next.js 15.2, React 19</p>
            <p className="text-xs text-muted-foreground">TypeScript 5.7, Tailwind CSS</p>
          </div>

          <div className="p-5 border rounded-lg hover:border-primary/50 transition-colors space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-primary" />
              <p className="font-semibold">Database</p>
            </div>
            <p className="text-sm text-muted-foreground">PostgreSQL 16</p>
            <p className="text-xs text-muted-foreground">Prisma ORM 6.2</p>
          </div>

          <div className="p-5 border rounded-lg hover:border-primary/50 transition-colors space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-primary" />
              <p className="font-semibold">Authentication</p>
            </div>
            <p className="text-sm text-muted-foreground">Supabase Auth</p>
            <p className="text-xs text-muted-foreground">OAuth, Magic Links</p>
          </div>

          <div className="p-5 border rounded-lg hover:border-primary/50 transition-colors space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <p className="font-semibold">Charts</p>
            </div>
            <p className="text-sm text-muted-foreground">Recharts</p>
            <p className="text-xs text-muted-foreground">Lightweight Charts</p>
          </div>

          <div className="p-5 border rounded-lg hover:border-primary/50 transition-colors space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="h-4 w-4 text-primary" />
              <p className="font-semibold">State Management</p>
            </div>
            <p className="text-sm text-muted-foreground">Zustand</p>
            <p className="text-xs text-muted-foreground">React Query (TanStack)</p>
          </div>

          <div className="p-5 border rounded-lg hover:border-primary/50 transition-colors space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-primary" />
              <p className="font-semibold">Monitoring</p>
            </div>
            <p className="text-sm text-muted-foreground">Sentry</p>
            <p className="text-xs text-muted-foreground">Error tracking, Performance</p>
          </div>

          <div className="p-5 border rounded-lg hover:border-primary/50 transition-colors space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <FileCode className="h-4 w-4 text-primary" />
              <p className="font-semibold">Testing</p>
            </div>
            <p className="text-sm text-muted-foreground">Vitest, Playwright</p>
            <p className="text-xs text-muted-foreground">E2E, Unit, Integration</p>
          </div>

          <div className="p-5 border rounded-lg hover:border-primary/50 transition-colors space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <p className="font-semibold">Deployment</p>
            </div>
            <p className="text-sm text-muted-foreground">Vercel</p>
            <p className="text-xs text-muted-foreground">Edge Functions, CDN</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="border-t pt-12 space-y-6">
        <h2 className="text-2xl font-bold">Quick Links</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/docs/getting-started" className="group flex items-center gap-3 p-4 border rounded-lg hover:border-primary/50 hover:bg-accent/50 transition-all">
            <Rocket className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium group-hover:text-primary transition-colors">Quick Start Guide</p>
              <p className="text-xs text-muted-foreground">Get up and running in 5 minutes</p>
            </div>
          </Link>

          <Link href="/docs/for-developers/architecture" className="group flex items-center gap-3 p-4 border rounded-lg hover:border-primary/50 hover:bg-accent/50 transition-all">
            <GitBranch className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium group-hover:text-primary transition-colors">Architecture Overview</p>
              <p className="text-xs text-muted-foreground">System design and data flow</p>
            </div>
          </Link>

          <Link href="/docs/for-developers/database" className="group flex items-center gap-3 p-4 border rounded-lg hover:border-primary/50 hover:bg-accent/50 transition-all">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium group-hover:text-primary transition-colors">Database Schema</p>
              <p className="text-xs text-muted-foreground">Complete data model reference</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
