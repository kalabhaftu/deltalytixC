export default {
  import: {
    type: {
      csvAi: {
        name: 'CSV-AI',
        description: 'Import trades from any CSV file using AI',
      },
      tradezella: {
        name: 'Tradezella',
        description: 'Import trades from Tradezella CSV file',
      },
      topstep: {
        name: 'Topstep',
        description: 'Import trades from Topstep CSV file',
        details: 'Only TopstepX trades are supported',
      },
      pdfImport: {
        name: 'PDF Import',
        description: 'Import trades from IBKR PDF file',
        details: 'Only IBKR PDF files are supported',
      },
      matchTrader: {
        name: 'Match Trader',
        description: 'Import trades from Match Trader CSV file',
        details: 'Fast import for Match Trader CSV files with auto-detection',
      },
      manualTradeEntry: {
        name: 'Manual Trade Entry',
        description: 'Add a single trade manually with complete details',
        details: 'Perfect for manual journal entries with all trade context and analysis',
      },
    },
    steps: {
      selectPlatform: 'Select Platform',
      selectPlatformDescription: 'Choose the platform you want to import from',
      uploadFile: 'Upload File',
      uploadFileDescription: 'Upload the CSV file you want to import',
      selectHeaders: 'Select Headers',
      selectHeadersDescription: 'Select the headers that contain the trade data',
      mapColumns: 'Map Columns',
      mapColumnsDescription: 'Map the columns in your CSV to the required fields',
      selectAccount: 'Select Account',
      selectAccountDescription: 'Select the account you want to import the trades to',
      reviewTrades: 'Review Trades',
      reviewTradesDescription: 'Review the trades that will be imported',
      processTrades: 'Process Trades',
      processTradesDescription: 'Processing your trades',
      connectAccount: 'Connect Account',
      connectAccountDescription: 'Connect your account to import trades',
      processFile: 'Process File',
      processFileDescription: 'Processing your file',
    },
  },
} as const