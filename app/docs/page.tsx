import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ArrowRight, Upload, BarChart3, Building2, BookOpen, Zap, Shield, TrendingUp, Database, Lock, Activity, FileCode, Workflow, GitBranch, Rocket, CheckCircle2, ChevronRight, Sparkles, Code, Server, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function DocsHome() {
  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative space-y-6">
          <div className="flex items-center gap-3">
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
              <Sparkles className="h-3 w-3 mr-1" />
              v2.0 Release
            </Badge>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            Deltalytix
            <span className="text-primary"> Documentation</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed">
            A comprehensive trading analytics platform designed for professional traders.
            Track performance, analyze patterns, and optimize your strategy with advanced metrics
            and real-time insights.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Button asChild size="lg" className="h-12 px-8 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
              <Link href="/docs/getting-started">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6">
              <Link href="/docs/features/importing">
                Explore Features
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 px-6">
              <Link href="/docs/for-developers/architecture">
                <Code className="mr-2 h-4 w-4" />
                Developer Docs
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Main Feature Cards */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Core Features</h2>
          <Link href="/docs/features/importing" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/docs/features/importing" className="group">
            <Card className="h-full border-2 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <CardHeader className="space-y-4">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">Trade Import</CardTitle>
                  <CardDescription className="mt-2 leading-relaxed">
                    Import trades from CSV files with intelligent AI-powered field mapping.
                    Supports major brokers and custom formats.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2.5">
                  {[
                    'Automatic column detection and mapping',
                    'Batch import up to 10,000 trades',
                    'Manual entry with validation'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Link>

          <Link href="/docs/features/dashboard" className="group">
            <Card className="h-full border-2 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <CardHeader className="space-y-4">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">Dashboard Analytics</CardTitle>
                  <CardDescription className="mt-2 leading-relaxed">
                    Fully customizable drag-and-drop dashboard with 20+ widgets.
                    Track KPIs and visualize performance in real-time.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2.5">
                  {[
                    'Win rate, profit factor, drawdown tracking',
                    'Advanced filtering by date, instrument, account',
                    'Equity curve and P&L charts'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Link>

          <Link href="/docs/features/prop-firm" className="group">
            <Card className="h-full border-2 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <CardHeader className="space-y-4">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">Prop Firm Tracking</CardTitle>
                  <CardDescription className="mt-2 leading-relaxed">
                    Comprehensive prop firm evaluation monitoring with automated breach
                    detection and phase progression tracking.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2.5">
                  {[
                    'Real-time daily/max drawdown monitoring',
                    'Automated profit target & consistency checks',
                    'Multi-phase evaluation support'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Technical Features */}
      <section className="space-y-8">
        <div className="text-center space-y-4">
          <Badge variant="outline" className="mb-2">Built for Performance</Badge>
          <h2 className="text-3xl md:text-4xl font-bold">Core Capabilities</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Modern architecture designed for speed, security, and scalability.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Zap,
              title: 'High Performance',
              description: 'Built on Next.js 15 with React Server Components. Optimized queries handle 100,000+ trades with sub-second response times.'
            },
            {
              icon: Shield,
              title: 'Enterprise Security',
              description: 'Supabase authentication with Row Level Security. Rate limiting on all sensitive endpoints. Zod validation on all inputs.'
            },
            {
              icon: TrendingUp,
              title: 'Precision Analytics',
              description: 'Decimal(20,10) precision for accurate calculations. Win rate excludes break-even trades for realistic metrics.'
            },
            {
              icon: BookOpen,
              title: 'AI-Powered Journaling',
              description: 'Document trades with screenshots and emotions. AI analysis identifies patterns and correlates with P&L.'
            },
            {
              icon: Activity,
              title: 'Real-Time Monitoring',
              description: 'Live P&L tracking with instant updates. Automated breach alerts for prop firm accounts.'
            },
            {
              icon: Workflow,
              title: 'Advanced Filtering',
              description: 'Filter by date, instruments, accounts, P&L range, time in position, weekday, and hour. Save custom presets.'
            }
          ].map((feature, i) => (
            <div key={i} className="group p-6 rounded-xl border bg-card hover:border-primary/50 hover:bg-accent/50 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Technology Stack */}
      <section className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Technology Stack</h2>
          <p className="text-muted-foreground">
            Modern, production-ready technologies powering Deltalytix.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { icon: FileCode, title: 'Frontend', primary: 'Next.js 15, React 19', secondary: 'TypeScript 5.7, Tailwind CSS' },
            { icon: Database, title: 'Database', primary: 'PostgreSQL 16', secondary: 'Prisma ORM 6.2' },
            { icon: Lock, title: 'Authentication', primary: 'Supabase Auth', secondary: 'OAuth, OTP' },
            { icon: BarChart3, title: 'Charts', primary: 'Recharts', secondary: 'Lightweight Charts' },
            { icon: GitBranch, title: 'State', primary: 'Zustand', secondary: 'React Query (TanStack)' },
            { icon: Activity, title: 'Monitoring', primary: 'Sentry', secondary: 'Error tracking' },
            { icon: Server, title: 'Testing', primary: 'Vitest, Playwright', secondary: 'E2E, Unit, Integration' },
            { icon: Globe, title: 'Deployment', primary: 'Vercel', secondary: 'Edge Functions, CDN' }
          ].map((tech, i) => (
            <div key={i} className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors space-y-3">
              <div className="flex items-center gap-2">
                <tech.icon className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">{tech.title}</span>
              </div>
              <div>
                <p className="text-sm text-foreground">{tech.primary}</p>
                <p className="text-xs text-muted-foreground">{tech.secondary}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Quick Links</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: '/docs/getting-started', icon: Rocket, title: 'Quick Start Guide', description: 'Get up and running in 5 minutes' },
            { href: '/docs/for-developers/architecture', icon: GitBranch, title: 'Architecture Overview', description: 'System design and data flow' },
            { href: '/docs/for-developers/database', icon: Database, title: 'Database Schema', description: 'Complete data model reference' }
          ].map((link, i) => (
            <Link key={i} href={link.href} className="group flex items-center gap-4 p-5 rounded-xl border bg-card hover:border-primary/50 hover:bg-accent/50 transition-all">
              <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <link.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold group-hover:text-primary transition-colors">{link.title}</p>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary ml-auto transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
