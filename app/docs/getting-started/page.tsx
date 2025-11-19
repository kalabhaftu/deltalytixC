import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Info, Zap, FileText, BarChart3, TrendingUp, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function GettingStarted() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Badge variant="outline" className="mb-2">Quick Start Guide</Badge>
        <h1>Getting Started with Deltalytix</h1>
        <p className="text-xl">
          Set up your trading analytics platform and import your first trades in under 5 minutes.
        </p>
      </div>

      <div className="space-y-10">
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <h2>Prerequisites</h2>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What you'll need</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Authentication Account</p>
                    <p className="text-sm text-muted-foreground">
                      Discord, Google, or Email account for secure login via Supabase Auth
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Trading History (Optional)</p>
                    <p className="text-sm text-muted-foreground">
                      CSV export from your broker (MT4/MT5, Exness, Match Trader, TradeZella, or custom format). 
                      You can also enter trades manually later.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Modern Browser</p>
                    <p className="text-sm text-muted-foreground">
                      Chrome, Firefox, Safari, or Edge (latest version recommended for optimal performance)
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <span className="font-bold text-primary px-1">1</span>
            </div>
            <h2>Create Your Account</h2>
          </div>

          <div className="space-y-4 pl-11">
            <ol className="space-y-6">
              <li className="space-y-2">
                <p className="font-medium text-foreground">Navigate to the login page</p>
                <div className="bg-accent/50 border rounded-lg p-4">
                  <code className="text-sm text-primary font-semibold">https://deltalytix-c.vercel.app/</code>
                </div>
              </li>

              <li className="space-y-2">
                <p className="font-medium text-foreground">Choose your authentication method</p>
                <p className="text-sm text-muted-foreground">
                  Click one of the following options:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <strong>Continue with Discord</strong> - Fastest option for Discord users
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <strong>Continue with Google</strong> - For Google/Gmail accounts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <strong>Email Magic Link</strong> - Passwordless login via email
                  </li>
                </ul>
              </li>

              <li className="space-y-2">
                <p className="font-medium text-foreground">Authorize the application</p>
                <p className="text-sm text-muted-foreground">
                  Follow the OAuth flow or check your email for the magic link. 
                  Deltalytix only requests basic profile information (email, name, avatar).
                </p>
              </li>

              <li className="space-y-2">
                <p className="font-medium text-foreground">Welcome to your dashboard</p>
                <p className="text-sm text-muted-foreground">
                  After successful authentication, you'll be redirected to your personalized dashboard. 
                  First-time users will see a default template with essential widgets.
                </p>
              </li>
            </ol>

            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Security Note</p>
                    <p className="text-sm text-muted-foreground">
                      All authentication is handled by Supabase with industry-standard security. 
                      We never store your OAuth tokens or passwords. Rate limiting is enabled 
                      (10 requests per minute for auth endpoints) to prevent abuse.
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
              <span className="font-bold text-primary">2</span>
            </div>
            <h2>Import Your Trades</h2>
          </div>

          <div className="space-y-4 pl-11">
            <p className="text-muted-foreground">
              Deltalytix supports multiple import methods. Choose the one that works best for you:
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-primary/30">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">CSV Import (Recommended)</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Bulk import from broker exports with AI-powered field mapping
                  </p>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-2">
                      <span className="text-primary font-semibold">1.</span>
                      <span>Click the <strong>Import</strong> button in the navbar</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-semibold">2.</span>
                      <span>Select <strong>CSV Import</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-semibold">3.</span>
                      <span>Upload your CSV file (up to 10,000 trades)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-semibold">4.</span>
                      <span>Review the AI-detected column mappings</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-semibold">5.</span>
                      <span>Select an account or create a new one</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-semibold">6.</span>
                      <span>Preview the import and confirm</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Manual Entry</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add individual trades with full control over every field
                  </p>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-2">
                      <span className="text-primary font-semibold">1.</span>
                      <span>Go to <strong>Data</strong> in the dropdown menu</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-semibold">2.</span>
                      <span>Click <strong>Add Trade</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-semibold">3.</span>
                      <span>Fill in the trade details (instrument, P&L, dates, etc.)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-semibold">4.</span>
                      <span>Add notes, screenshots, and tags (optional)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-semibold">5.</span>
                      <span>Submit and see it instantly on your dashboard</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </div>

            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Supported CSV Formats</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        MT4/MT5 exports (Account History → Save as Report)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Exness (Trading History → Download CSV)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Match Trader (Reports → CSV Export)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        TradeZella exports
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Custom formats (AI will attempt to map columns)
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <span className="font-bold text-primary">3</span>
            </div>
            <h2>Explore Your Dashboard</h2>
          </div>

          <div className="space-y-4 pl-11">
            <p className="text-muted-foreground">
              After importing trades, your dashboard comes to life with real-time analytics:
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">KPI Widgets</h4>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span><strong>Win Rate</strong> - Percentage of winning trades (excludes break-even)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span><strong>Profit Factor</strong> - Ratio of gross profit to gross loss</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span><strong>Average Win/Loss</strong> - Mean P&L per trade type</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span><strong>Current Streak</strong> - Consecutive wins or losses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span><strong>Total P&L</strong> - Cumulative profit/loss</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Visualizations</h4>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span><strong>Calendar</strong> - Daily P&L heatmap with journal integration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span><strong>Equity Curve</strong> - Account balance over time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span><strong>P&L by Instrument</strong> - Performance breakdown by asset</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span><strong>P&L by Strategy</strong> - Tag-based strategy analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span><strong>Recent Trades</strong> - Latest activity with quick actions</span>
                  </li>
                </ul>
              </div>
            </div>

            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Pro Tip: Use Filters</p>
                    <p className="text-sm text-muted-foreground">
                      Click the filter icon in the navbar to narrow your analysis by date range, 
                      accounts, instruments, P&L range, weekday, or hour of day. This helps you 
                      identify patterns and optimize specific aspects of your trading.
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
              <span className="font-bold text-primary">4</span>
            </div>
            <h2>Customize Your Workspace</h2>
          </div>

          <div className="space-y-4 pl-11">
            <p className="text-muted-foreground">
              Make Deltalytix truly yours with a fully customizable drag-and-drop interface:
            </p>

            <ol className="space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="text-primary font-semibold">1.</span>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Enter Edit Mode</p>
                  <p className="text-muted-foreground">
                    Click the pencil icon in the top-right corner of your dashboard
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="text-primary font-semibold">2.</span>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Drag to Reposition</p>
                  <p className="text-muted-foreground">
                    Click and hold any widget, then drag it to a new location. 
                    Other widgets will automatically adjust to accommodate the move.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="text-primary font-semibold">3.</span>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Resize Widgets</p>
                  <p className="text-muted-foreground">
                    Grab the bottom-right corner of any widget and drag to resize. 
                    Widgets snap to the grid for clean alignment.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="text-primary font-semibold">4.</span>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Add New Widgets</p>
                  <p className="text-muted-foreground">
                    Click the + button to open the widget gallery. Choose from 20+ available widgets 
                    including charts, tables, KPIs, and more.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="text-primary font-semibold">5.</span>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Save Your Layout</p>
                  <p className="text-muted-foreground">
                    Click "Save Changes" to persist your layout. You can create multiple templates 
                    for different trading strategies or analysis views.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <h2>Next Steps</h2>
          </div>

          <div className="space-y-4 pl-11">
            <p className="text-muted-foreground">
              You're all set! Here are some advanced features to explore:
            </p>

            <div className="grid gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg h-fit">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground">Set Up Prop Firm Accounts</h4>
                      <p className="text-sm text-muted-foreground">
                        If you're in a prop firm evaluation, create a master account to track 
                        phases, drawdowns, and profit targets. Get real-time breach detection 
                        and automated phase progression.
                      </p>
                      <p className="text-sm">
                        <Link href="/docs/features/prop-firm" className="text-primary hover:underline">
                          Learn more about prop firm tracking →
                        </Link>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg h-fit">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground">Start a Trading Journal</h4>
                      <p className="text-sm text-muted-foreground">
                        Document your trading psychology with daily notes, emotions, and screenshots. 
                        Use AI analysis to identify patterns between your mental state and P&L performance.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg h-fit">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground">Add Tags for Strategy Tracking</h4>
                      <p className="text-sm text-muted-foreground">
                        Categorize trades with custom tags (e.g., "Breakout", "Support/Resistance"). 
                        Use the "P&L by Strategy" widget to compare performance across different approaches.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg h-fit">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground">Use Advanced Export</h4>
                      <p className="text-sm text-muted-foreground">
                        Export filtered trade data to CSV for external analysis or tax reporting. 
                        Supports custom column selection and date range filtering.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <Card className="border-primary bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertCircle className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Need Help?</h3>
                <p className="text-sm text-muted-foreground">
                  If you encounter any issues or have questions, check out the{' '}
                  <Link href="/docs/features/dashboard" className="text-primary font-medium hover:underline">
                    Dashboard Documentation
                  </Link>{' '}
                  or the{' '}
                  <Link href="/docs/for-developers/architecture" className="text-primary font-medium hover:underline">
                    Architecture Guide
                  </Link>{' '}
                  for technical details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
