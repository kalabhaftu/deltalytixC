'use client'

import { ArrowLeft, BookOpen, TrendingUp, BarChart3, Target, Calendar, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function PersonalJournalPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="inline-flex items-center rounded-lg bg-muted px-3 py-1 text-sm font-medium">
              <BookOpen className="h-4 w-4 mr-2" />
              Personal Trading Journal
            </div>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
              Track Every Trade,
              <br />
              <span className="text-primary">Perfect Your Strategy</span>
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              Your personal trading journal designed to help you analyze patterns, track performance, 
              and build winning strategies through detailed trade documentation.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <Card>
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-primary" />
                <CardTitle>Performance Tracking</CardTitle>
                <CardDescription>
                  Monitor your trading performance with detailed metrics including P&L, win rate, and risk-reward ratios.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Real-time P&L calculations</li>
                  <li>• Win/loss ratio analysis</li>
                  <li>• Risk management metrics</li>
                  <li>• Monthly performance reports</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-primary" />
                <CardTitle>Advanced Analytics</CardTitle>
                <CardDescription>
                  Dive deep into your trading patterns with comprehensive charts and statistical analysis.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Interactive trading charts</li>
                  <li>• Pattern recognition tools</li>
                  <li>• Time-based performance analysis</li>
                  <li>• Custom indicator support</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Target className="h-8 w-8 text-primary" />
                <CardTitle>Strategy Development</CardTitle>
                <CardDescription>
                  Build and refine your trading strategies with systematic trade documentation and analysis.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Trade setup documentation</li>
                  <li>• Strategy backtesting tools</li>
                  <li>• Entry/exit rule tracking</li>
                  <li>• Performance comparison</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Calendar className="h-8 w-8 text-primary" />
                <CardTitle>Trade Planning</CardTitle>
                <CardDescription>
                  Plan your trades in advance and track execution against your original strategy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Pre-market trade planning</li>
                  <li>• Execution tracking</li>
                  <li>• Market condition notes</li>
                  <li>• Strategy adherence scoring</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <DollarSign className="h-8 w-8 text-primary" />
                <CardTitle>Risk Management</CardTitle>
                <CardDescription>
                  Maintain disciplined risk management with position sizing tools and risk alerts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Position size calculators</li>
                  <li>• Risk/reward ratio tracking</li>
                  <li>• Drawdown monitoring</li>
                  <li>• Account protection alerts</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BookOpen className="h-8 w-8 text-primary" />
                <CardTitle>Trading Psychology</CardTitle>
                <CardDescription>
                  Track your emotional state and psychological patterns to improve trading discipline.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Mood tracking integration</li>
                  <li>• Emotional trade analysis</li>
                  <li>• Discipline scoring system</li>
                  <li>• Behavioral pattern insights</li>
                </ul>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Why Keep a Trading Journal?
            </h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              Professional traders know that consistent profitability comes from understanding your patterns, 
              not just picking winning trades.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">Data-Driven Improvement</Badge>
              <h3 className="text-2xl font-bold">Identify What Actually Works</h3>
              <p className="text-muted-foreground">
                Stop guessing and start knowing. Our analytics reveal which setups, timeframes, 
                and market conditions align with your most profitable trades.
              </p>
            </div>
            
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">Emotional Discipline</Badge>
              <h3 className="text-2xl font-bold">Build Trading Discipline</h3>
              <p className="text-muted-foreground">
                Track your adherence to trading rules and identify emotional patterns that 
                lead to poor decisions. Develop the psychological edge needed for consistent trading.
              </p>
            </div>
            
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">Risk Control</Badge>
              <h3 className="text-2xl font-bold">Master Risk Management</h3>
              <p className="text-muted-foreground">
                Monitor your risk exposure across all positions and time periods. 
                Prevent large losses with systematic risk tracking and alerts.
              </p>
            </div>
            
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">Continuous Learning</Badge>
              <h3 className="text-2xl font-bold">Accelerate Your Growth</h3>
              <p className="text-muted-foreground">
                Learn from every trade, both winners and losers. Build a personal database 
                of market knowledge that compounds over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Start Your Trading Journal Today
            </h2>
            <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
              Take control of your trading with systematic journaling and analytics. 
              No subscriptions, no limitations—just professional-grade tools for personal use.
            </p>
            <div className="space-x-4">
              <Button size="lg" asChild>
                <Link href="/authentication">Get Started Free</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
