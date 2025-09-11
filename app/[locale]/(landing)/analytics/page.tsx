'use client'

import { ArrowLeft, Server, Shield, BarChart3, Database, Zap, Lock, Eye, Gauge, TrendingUp, PieChart, Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function AnalyticsPage() {
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
              <Server className="h-4 w-4 mr-2" />
              Self-Hosted Analytics
            </div>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
              Analytics That Stay
              <br />
              <span className="text-primary">Under Your Control</span>
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              Run powerful trading analytics on your own infrastructure. Complete privacy, 
              unlimited data retention, and full customization without relying on external services.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy & Control Benefits */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-primary" />
                <CardTitle>Complete Data Privacy</CardTitle>
                <CardDescription>
                  Your trading data never leaves your servers. Zero external dependencies for analytics processing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Local data processing only</li>
                  <li>• No third-party analytics</li>
                  <li>• GDPR compliant by design</li>
                  <li>• Air-gapped deployment option</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Lock className="h-8 w-8 text-primary" />
                <CardTitle>Secure by Default</CardTitle>
                <CardDescription>
                  Enterprise-grade security with encrypted storage and secure access controls.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Encrypted data at rest</li>
                  <li>• Secure authentication</li>
                  <li>• Role-based access</li>
                  <li>• Audit trail logging</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Database className="h-8 w-8 text-primary" />
                <CardTitle>Unlimited Data Retention</CardTitle>
                <CardDescription>
                  Store years of trading history without worrying about data limits or additional costs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• No storage limitations</li>
                  <li>• Historical data preservation</li>
                  <li>• Efficient data compression</li>
                  <li>• Backup and recovery tools</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Gauge className="h-8 w-8 text-primary" />
                <CardTitle>High Performance</CardTitle>
                <CardDescription>
                  Optimized for speed with local processing, caching, and efficient data structures.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Sub-second query responses</li>
                  <li>• Real-time data processing</li>
                  <li>• Intelligent caching</li>
                  <li>• Scalable architecture</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-8 w-8 text-primary" />
                <CardTitle>Offline Capable</CardTitle>
                <CardDescription>
                  Work with your analytics even without internet connectivity. Everything runs locally.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Offline-first design</li>
                  <li>• Local data synchronization</li>
                  <li>• No internet dependency</li>
                  <li>• Portable installations</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Eye className="h-8 w-8 text-primary" />
                <CardTitle>Full Transparency</CardTitle>
                <CardDescription>
                  See exactly how your analytics are calculated with open-source algorithms.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Open calculation methods</li>
                  <li>• Auditable algorithms</li>
                  <li>• Customizable metrics</li>
                  <li>• No black box analytics</li>
                </ul>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>

      {/* Analytics Features */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Professional-Grade Analytics
            </h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              Everything you need to analyze your trading performance, all running on your own infrastructure.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            <Card>
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-primary" />
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• P&L analysis and tracking</li>
                  <li>• Sharpe and Sortino ratios</li>
                  <li>• Maximum drawdown analysis</li>
                  <li>• Win rate and profit factor</li>
                  <li>• Risk-adjusted returns</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-primary" />
                <CardTitle>Advanced Charting</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Interactive price charts</li>
                  <li>• Custom technical indicators</li>
                  <li>• Multi-timeframe analysis</li>
                  <li>• Trade overlay visualizations</li>
                  <li>• Pattern recognition tools</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <PieChart className="h-8 w-8 text-primary" />
                <CardTitle>Portfolio Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Asset allocation breakdown</li>
                  <li>• Correlation analysis</li>
                  <li>• Sector exposure tracking</li>
                  <li>• Risk concentration alerts</li>
                  <li>• Diversification metrics</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Activity className="h-8 w-8 text-primary" />
                <CardTitle>Risk Management</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Position sizing analysis</li>
                  <li>• Value at Risk (VaR) calculations</li>
                  <li>• Stress testing scenarios</li>
                  <li>• Monte Carlo simulations</li>
                  <li>• Risk parity optimization</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Database className="h-8 w-8 text-primary" />
                <CardTitle>Data Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• CSV import/export tools</li>
                  <li>• Broker API connections</li>
                  <li>• Real-time data feeds</li>
                  <li>• Custom data sources</li>
                  <li>• Automated synchronization</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Gauge className="h-8 w-8 text-primary" />
                <CardTitle>Custom Dashboards</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Drag-and-drop widgets</li>
                  <li>• Customizable layouts</li>
                  <li>• Real-time updates</li>
                  <li>• Export capabilities</li>
                  <li>• Mobile responsive design</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Deployment Options */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Deploy Anywhere
            </h2>
            <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
              Choose your preferred deployment method. From local installations to cloud servers, 
              Deltalytix adapts to your infrastructure needs.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Local Machine</CardTitle>
                <CardDescription className="text-center">
                  Run on your personal computer with Docker
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>• Single-user setup</div>
                  <div>• No internet required</div>
                  <div>• Maximum privacy</div>
                  <div>• Easy backup</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">Home Server</CardTitle>
                <CardDescription className="text-center">
                  Deploy on NAS or home server
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>• Always-on access</div>
                  <div>• Multiple device support</div>
                  <div>• Local network only</div>
                  <div>• Automated backups</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">VPS/Cloud</CardTitle>
                <CardDescription className="text-center">
                  Deploy on any cloud provider
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>• Global accessibility</div>
                  <div>• Scalable resources</div>
                  <div>• Professional setup</div>
                  <div>• SSL certificates</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">Enterprise</CardTitle>
                <CardDescription className="text-center">
                  On-premises or private cloud
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>• High availability</div>
                  <div>• Custom integrations</div>
                  <div>• Compliance ready</div>
                  <div>• Professional support</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Technical Requirements
            </h2>
            <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
              Lightweight and efficient. Deltalytix runs on minimal hardware while delivering 
              maximum performance.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Minimum Requirements</CardTitle>
                <CardDescription>
                  Perfect for personal use and small datasets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>CPU:</span>
                    <span className="text-muted-foreground">2 cores, 2.0 GHz</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RAM:</span>
                    <span className="text-muted-foreground">4 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage:</span>
                    <span className="text-muted-foreground">20 GB SSD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>OS:</span>
                    <span className="text-muted-foreground">Linux, macOS, Windows</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommended Specs</CardTitle>
                <CardDescription>
                  Optimal performance for extensive trading history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>CPU:</span>
                    <span className="text-muted-foreground">4+ cores, 3.0+ GHz</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RAM:</span>
                    <span className="text-muted-foreground">8+ GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage:</span>
                    <span className="text-muted-foreground">100+ GB NVMe SSD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Network:</span>
                    <span className="text-muted-foreground">1 Gbps (optional)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Take Control of Your Analytics
            </h2>
            <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
              Deploy Deltalytix on your own infrastructure and enjoy unlimited analytics 
              without compromising on privacy or performance.
            </p>
            <div className="space-x-4">
              <Button size="lg" asChild>
                <Link href="/authentication">Start Self-Hosting</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/open-source#download">View Setup Guide</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
