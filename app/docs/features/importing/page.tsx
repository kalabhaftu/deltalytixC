export default function ImportingDocs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Trade Import</h1>
        <p className="text-xl text-muted-foreground">
          Import trades from CSV files with AI-assisted column mapping
        </p>
      </div>

      <div className="border-t pt-6 space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">Supported Import Methods</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">CSV Import</h3>
              <p className="text-sm text-muted-foreground">
                Upload CSV files from any broker. AI automatically detects columns like instrument, entry price, P&L, etc.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Manual Entry</h3>
              <p className="text-sm text-muted-foreground">
                Manually add individual trades with full details including images, tags, and comments.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">CSV Import Process</h2>
          <ol className="list-decimal list-inside space-y-4">
            <li className="text-muted-foreground">
              <strong className="text-foreground">Upload CSV File</strong>
              <p className="ml-6 mt-1">Select your CSV file exported from your broker or trading platform</p>
            </li>
            <li className="text-muted-foreground">
              <strong className="text-foreground">AI Column Detection</strong>
              <p className="ml-6 mt-1">The AI analyzes your CSV and automatically maps columns to trade fields</p>
            </li>
            <li className="text-muted-foreground">
              <strong className="text-foreground">Manual Mapping (Optional)</strong>
              <p className="ml-6 mt-1">Review and adjust column mappings if needed</p>
            </li>
            <li className="text-muted-foreground">
              <strong className="text-foreground">Select Account</strong>
              <p className="ml-6 mt-1">Choose an existing account or create a new one</p>
            </li>
            <li className="text-muted-foreground">
              <strong className="text-foreground">Preview & Import</strong>
              <p className="ml-6 mt-1">Review the first few trades and click Import</p>
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Required CSV Columns</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Column</th>
                  <th className="text-left p-3 font-semibold">Required</th>
                  <th className="text-left p-3 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3"><code>instrument</code></td>
                  <td className="p-3">Yes</td>
                  <td className="p-3">Trading symbol (e.g., EURUSD, ES, NQ)</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3"><code>entryPrice</code></td>
                  <td className="p-3">Yes</td>
                  <td className="p-3">Entry price with full decimal precision</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3"><code>closePrice</code></td>
                  <td className="p-3">Yes</td>
                  <td className="p-3">Exit price with full decimal precision</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3"><code>pnl</code></td>
                  <td className="p-3">Yes</td>
                  <td className="p-3">Profit/loss in dollars</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3"><code>entryDate</code></td>
                  <td className="p-3">Yes</td>
                  <td className="p-3">Entry timestamp (ISO format preferred)</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3"><code>closeDate</code></td>
                  <td className="p-3">Yes</td>
                  <td className="p-3">Exit timestamp (ISO format preferred)</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3"><code>quantity</code></td>
                  <td className="p-3">Yes</td>
                  <td className="p-3">Trade size/lots</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3"><code>side</code></td>
                  <td className="p-3">No</td>
                  <td className="p-3">Long/Short or Buy/Sell</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3"><code>commission</code></td>
                  <td className="p-3">No</td>
                  <td className="p-3">Trading fees (defaults to 0)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Supported Brokers & Platforms</h2>
          <p className="text-muted-foreground mb-4">
            While Deltalytix accepts any CSV format, these platforms have been tested:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Rithmic (Performance Report export)</li>
            <li>TradeZella export format</li>
            <li>Match-Trader platforms</li>
            <li>Generic CSV with required columns</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Partial Closes & Trade Grouping</h2>
          <p className="text-muted-foreground mb-4">
            If you scale out of positions (partial closes), Deltalytix automatically groups trades by <code>entryId</code>. This ensures accurate win rate calculations:
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm mb-2"><strong>Example:</strong></p>
            <p className="text-sm text-muted-foreground">
              Entry: 2 lots EURUSD @ 1.1000<br />
              Close 1: 1 lot @ 1.1050 (+$50)<br />
              Close 2: 1 lot @ 1.1100 (+$100)<br />
              <strong>Result:</strong> Grouped as 1 winning trade with $150 P&L
            </p>
          </div>
        </section>

        <section className="bg-muted/50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">🔒 Data Privacy</h3>
          <p className="text-muted-foreground">
            All trade data is encrypted and stored securely. Only you can access your trades. CSV files are processed and discarded immediately after import.
          </p>
        </section>
      </div>
    </div>
  )
}

