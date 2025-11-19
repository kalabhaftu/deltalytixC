export default function PropFirmDocs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Prop Firm Tracking</h1>
        <p className="text-xl text-muted-foreground">
          Track evaluation phases, drawdowns, and profit targets for prop firm challenges
        </p>
      </div>

      <div className="border-t pt-6 space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">Master Accounts</h2>
          <p className="text-muted-foreground mb-4">
            A Master Account represents a single prop firm evaluation journey. It contains:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Account name and size</li>
            <li>Prop firm name</li>
            <li>Evaluation type (1-step, 2-step, instant funding)</li>
            <li>Current phase number</li>
            <li>Active/Archived status</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Phase Accounts</h2>
          <p className="text-muted-foreground mb-4">
            Each phase of your evaluation has its own Phase Account with specific rules:
          </p>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Profit Target</h3>
              <p className="text-sm text-muted-foreground">
                Percentage of account size you need to achieve to pass
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Daily Drawdown</h3>
              <p className="text-sm text-muted-foreground">
                Maximum loss allowed in a single day
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Max Drawdown</h3>
              <p className="text-sm text-muted-foreground">
                Maximum total loss from starting balance or high water mark
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Min Trading Days</h3>
              <p className="text-sm text-muted-foreground">
                Minimum number of trading days required
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Consistency Rule</h3>
              <p className="text-sm text-muted-foreground">
                Maximum percentage of profit from a single trade/day
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Breach Detection</h2>
          <p className="text-muted-foreground mb-4">
            Deltalytix automatically monitors your trades and detects rule violations:
          </p>
          <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20 mb-4">
            <h4 className="font-semibold text-destructive mb-2">Daily Drawdown Breach</h4>
            <p className="text-sm text-muted-foreground">
              Triggered when losses exceed the daily limit. Calculated from daily starting equity.
            </p>
          </div>
          <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
            <h4 className="font-semibold text-destructive mb-2">Max Drawdown Breach</h4>
            <p className="text-sm text-muted-foreground">
              Triggered when total drawdown exceeds limit. Can be static (from start) or trailing (from high water mark).
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Creating a Prop Firm Account</h2>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>Navigate to <strong className="text-foreground">Prop Firm</strong> section</li>
            <li>Click <strong className="text-foreground">Create Account</strong></li>
            <li>Enter account details (name, size, firm)</li>
            <li>Select evaluation type</li>
            <li>Configure Phase 1 rules</li>
            <li>Import trades or link existing trades</li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Phase Progression</h2>
          <p className="text-muted-foreground mb-4">
            When you pass a phase:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Click <strong className="text-foreground">Transition to Next Phase</strong></li>
            <li>Previous phase is marked as "Passed"</li>
            <li>New phase is created with updated rules</li>
            <li>Account current phase number increments</li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Supported Prop Firms</h2>
          <p className="text-muted-foreground mb-4">
            Pre-configured templates available for:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Generic 1-Step Challenge</li>
            <li>Generic 2-Step Challenge</li>
            <li>Instant Funding</li>
            <li>Custom (define your own rules)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Daily Anchors</h2>
          <p className="text-muted-foreground">
            For daily drawdown calculations, Deltalytix automatically records your starting equity each day. This ensures accurate breach detection even if you trade across multiple sessions.
          </p>
        </section>

        <section className="bg-muted/50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Pro Tip</h3>
          <p className="text-muted-foreground">
            Archive old evaluations to keep your prop firm view clean. Archived accounts are hidden by default but can be viewed anytime.
          </p>
        </section>
      </div>
    </div>
  )
}

