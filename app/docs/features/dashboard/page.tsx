export default function DashboardDocs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-xl text-muted-foreground">
          Customizable analytics dashboard with KPIs, charts, and calendar views
        </p>
      </div>

      <div className="border-t pt-6 space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">KPI Widgets</h2>
          <p className="text-muted-foreground mb-4">
            Key performance indicators displayed at the top of your dashboard:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Account Balance & P&L</h3>
              <p className="text-sm text-muted-foreground">
                Current account balance and total profit/loss
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Trade Win Rate</h3>
              <p className="text-sm text-muted-foreground">
                Percentage of winning trades (excludes break-even)
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Day Win Rate</h3>
              <p className="text-sm text-muted-foreground">
                Percentage of profitable trading days
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Profit Factor</h3>
              <p className="text-sm text-muted-foreground">
                Ratio of gross profits to gross losses
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Average Win/Loss</h3>
              <p className="text-sm text-muted-foreground">
                Average dollar amount per winning vs losing trade
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Current Streak</h3>
              <p className="text-sm text-muted-foreground">
                Consecutive winning or losing trades
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Chart Widgets</h2>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="text-primary font-semibold">•</span>
              <div>
                <strong>Net Daily P&L:</strong>
                <span className="text-muted-foreground ml-2">Bar chart of daily profits and losses</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-semibold">•</span>
              <div>
                <strong>Daily Cumulative P&L:</strong>
                <span className="text-muted-foreground ml-2">Line chart showing cumulative performance</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-semibold">•</span>
              <div>
                <strong>Account Balance:</strong>
                <span className="text-muted-foreground ml-2">Track account equity over time</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-semibold">•</span>
              <div>
                <strong>Weekday P&L:</strong>
                <span className="text-muted-foreground ml-2">Performance by day of week</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-semibold">•</span>
              <div>
                <strong>Trade Duration:</strong>
                <span className="text-muted-foreground ml-2">Performance vs time in position</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-semibold">•</span>
              <div>
                <strong>P&L by Instrument:</strong>
                <span className="text-muted-foreground ml-2">Top performing instruments</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-semibold">•</span>
              <div>
                <strong>P&L by Strategy:</strong>
                <span className="text-muted-foreground ml-2">Performance by trading model</span>
              </div>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Calendar View</h2>
          <p className="text-muted-foreground mb-4">
            Two calendar views available as widgets:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Mini Calendar</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Compact Monday-Friday view with weekly totals
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Simple P&L per day</li>
                <li>• Weekly summary on right</li>
                <li>• Monthly total at bottom</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Advanced Calendar</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Full-featured calendar with multiple views
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Monthly & weekly views</li>
                <li>• Daily trade breakdown modal</li>
                <li>• Journal integration</li>
                <li>• Screenshot capability</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Customization</h2>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>Click the <strong className="text-foreground">Edit</strong> button (pencil icon)</li>
            <li>Dashboard enters <strong className="text-foreground">Edit Mode</strong></li>
            <li>Drag widgets to reposition them</li>
            <li>Drag corners/edges to resize widgets</li>
            <li>Click <strong className="text-foreground">+ Add Widget</strong> to add new widgets</li>
            <li>Click <strong className="text-foreground">Save</strong> to persist changes</li>
            <li>Click <strong className="text-foreground">Cancel</strong> to discard changes</li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Filters</h2>
          <p className="text-muted-foreground mb-4">
            All dashboard data respects active filters:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong className="text-foreground">Date Range:</strong> Filter by specific time periods</li>
            <li><strong className="text-foreground">Accounts:</strong> Show data from specific accounts only</li>
            <li><strong className="text-foreground">Instruments:</strong> Focus on specific trading symbols</li>
            <li><strong className="text-foreground">P&L Range:</strong> Filter trades by profit/loss amount</li>
            <li><strong className="text-foreground">Tags:</strong> Show trades with specific tags</li>
          </ul>
        </section>

        <section className="bg-muted/50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Dashboard Templates</h3>
          <p className="text-muted-foreground">
            Save multiple dashboard layouts as templates. Switch between them using the template selector at the top of the dashboard. Perfect for different trading styles or analysis needs.
          </p>
        </section>
      </div>
    </div>
  )
}

