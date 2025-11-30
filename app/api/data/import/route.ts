import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import JSZip from 'jszip'
import { applyRateLimit, importLimiter } from '@/lib/rate-limiter'

export const maxDuration = 300 // 5 minutes for large imports

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request, importLimiter)
  if (rateLimitResult) return rateLimitResult

  try {
    const authUserId = await getUserId()
    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { auth_user_id: authUserId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read ZIP file
    const buffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buffer)

    // Read metadata
    const metadataFile = zip.file('metadata.json')
    if (!metadataFile) {
      return NextResponse.json({ error: 'Invalid export file: missing metadata' }, { status: 400 })
    }
    
    const metadataContent = await metadataFile.async('string')
    const metadata = JSON.parse(metadataContent)

    // Map old IDs to new IDs for maintaining relationships
    const idMap = {
      accounts: new Map<string, string>(),
      masterAccounts: new Map<string, string>(),
      phaseAccounts: new Map<string, string>(),
      trades: new Map<string, string>(),
      backtestTrades: new Map<string, string>(),
      dailyNotes: new Map<string, string>(),
      templates: new Map<string, string>()
    }

    const results = {
      accounts: 0,
      trades: 0,
      masterAccounts: 0,
      phaseAccounts: 0,
      dailyAnchors: 0,
      breachRecords: 0,
      payouts: 0,
      backtestTrades: 0,
      dailyNotes: 0,
      dashboardTemplates: 0
    }

    // Import in correct order (respecting foreign key constraints)

    // 1. Import Accounts (Groups removed - no longer used)
    // 2. Import Accounts
    const accountsFile = zip.file('accounts.csv')
    if (accountsFile) {
      const accountsCsv = await accountsFile.async('string')
      const accounts = parseCSV(accountsCsv)
      
      for (const account of accounts) {
        const newAccount = await prisma.account.create({
          data: {
            id: crypto.randomUUID(),
            number: account.number,
            name: account.name || null,
            broker: account.broker || null,
            startingBalance: parseFloat(account.startingBalance) || 0,
            userId: user.id,
            createdAt: account.createdAt ? new Date(account.createdAt) : new Date()
          }
        })
        idMap.accounts.set(account.id, newAccount.id)
        results.accounts++
      }
    }

    // 3. Import Master Accounts
    const masterAccountsFile = zip.file('master_accounts.csv')
    if (masterAccountsFile) {
      const masterAccountsCsv = await masterAccountsFile.async('string')
      const masterAccounts = parseCSV(masterAccountsCsv)
      
      for (const ma of masterAccounts) {
        const newMA = await prisma.masterAccount.create({
          data: {
            id: crypto.randomUUID(),
            userId: user.id,
            accountName: ma.accountName,
            propFirmName: ma.propFirmName,
            accountSize: parseFloat(ma.accountSize),
            evaluationType: ma.evaluationType,
            currentPhase: parseInt(ma.currentPhase),
            status: ma.status || 'active',
            createdAt: ma.createdAt ? new Date(ma.createdAt) : new Date()
          }
        })
        idMap.masterAccounts.set(ma.id, newMA.id)
        results.masterAccounts++
      }
    }

    // 4. Import Phase Accounts
    const phaseAccountsFile = zip.file('phase_accounts.csv')
    if (phaseAccountsFile) {
      const phaseAccountsCsv = await phaseAccountsFile.async('string')
      const phaseAccounts = parseCSV(phaseAccountsCsv)
      
      for (const pa of phaseAccounts) {
        const newPA = await prisma.phaseAccount.create({
          data: {
            id: crypto.randomUUID(),
            masterAccountId: idMap.masterAccounts.get(pa.masterAccountId)!,
            phaseNumber: parseInt(pa.phaseNumber),
            phaseId: pa.phaseId || null,
            status: pa.status || 'active',
            profitTargetPercent: parseFloat(pa.profitTargetPercent),
            dailyDrawdownPercent: parseFloat(pa.dailyDrawdownPercent),
            maxDrawdownPercent: parseFloat(pa.maxDrawdownPercent),
            maxDrawdownType: pa.maxDrawdownType || 'static',
            minTradingDays: parseInt(pa.minTradingDays) || 0,
            timeLimitDays: pa.timeLimitDays ? parseInt(pa.timeLimitDays) : null,
            consistencyRulePercent: parseFloat(pa.consistencyRulePercent) || 0,
            profitSplitPercent: pa.profitSplitPercent ? parseFloat(pa.profitSplitPercent) : null,
            payoutCycleDays: pa.payoutCycleDays ? parseInt(pa.payoutCycleDays) : null,
            startDate: pa.startDate ? new Date(pa.startDate) : new Date(),
            endDate: pa.endDate ? new Date(pa.endDate) : null
          }
        })
        idMap.phaseAccounts.set(pa.id, newPA.id)
        results.phaseAccounts++
      }
    }

    // 5. Import Trades
    const tradesFile = zip.file('trades.csv')
    if (tradesFile) {
      const tradesCsv = await tradesFile.async('string')
      const trades = parseCSV(tradesCsv)
      
      for (let i = 0; i < trades.length; i++) {
        const trade = trades[i]
        const newTrade = await prisma.trade.create({
          data: {
            id: crypto.randomUUID(),
            accountNumber: trade.accountNumber,
            quantity: parseFloat(trade.quantity) || 0,
            entryId: trade.entryId || null,
            instrument: trade.instrument,
            entryPrice: trade.entryPrice,
            closePrice: trade.closePrice,
            entryDate: trade.entryDate,
            closeDate: trade.closeDate,
            pnl: parseFloat(trade.pnl),
            timeInPosition: parseFloat(trade.timeInPosition) || 0,
            userId: user.id,
            side: trade.side || null,
            commission: parseFloat(trade.commission) || 0,
            comment: trade.comment || null,
            cardPreviewImage: trade.cardPreviewImage || null,
            groupId: trade.groupId || null,
            accountId: trade.accountId ? idMap.accounts.get(trade.accountId) || null : null,
            phaseAccountId: trade.phaseAccountId ? idMap.phaseAccounts.get(trade.phaseAccountId) || null : null,
            symbol: trade.symbol || null,
            entryTime: trade.entryTime ? new Date(trade.entryTime) : null,
            exitTime: trade.exitTime ? new Date(trade.exitTime) : null,
            closeReason: trade.closeReason || null,
            stopLoss: trade.stopLoss || null,
            takeProfit: trade.takeProfit || null,
            modelId: trade.modelId || null,
            selectedRules: trade.selectedRules || null,
            createdAt: trade.createdAt ? new Date(trade.createdAt) : new Date()
          }
        })
        idMap.trades.set(trade.id, newTrade.id)
        results.trades++
      }
    }

    // 6. Import Daily Anchors
    const dailyAnchorsFile = zip.file('daily_anchors.csv')
    if (dailyAnchorsFile) {
      const dailyAnchorsCsv = await dailyAnchorsFile.async('string')
      const dailyAnchors = parseCSV(dailyAnchorsCsv)
      
      for (const da of dailyAnchors) {
        await prisma.dailyAnchor.create({
          data: {
            id: crypto.randomUUID(),
            phaseAccountId: idMap.phaseAccounts.get(da.phaseAccountId)!,
            date: new Date(da.date),
            anchorEquity: parseFloat(da.anchorEquity),
            computedAt: da.computedAt ? new Date(da.computedAt) : new Date()
          }
        })
        results.dailyAnchors++
      }
    }

    // 7. Import Breach Records
    const breachRecordsFile = zip.file('breach_records.csv')
    if (breachRecordsFile) {
      const breachRecordsCsv = await breachRecordsFile.async('string')
      const breachRecords = parseCSV(breachRecordsCsv)
      
      for (const br of breachRecords) {
        await prisma.breachRecord.create({
          data: {
            id: crypto.randomUUID(),
            phaseAccountId: idMap.phaseAccounts.get(br.phaseAccountId)!,
            breachType: br.breachType,
            breachAmount: parseFloat(br.breachAmount),
            currentEquity: parseFloat(br.currentEquity),
            accountSize: parseFloat(br.accountSize),
            dailyStartBalance: br.dailyStartBalance ? parseFloat(br.dailyStartBalance) : null,
            highWaterMark: br.highWaterMark ? parseFloat(br.highWaterMark) : null,
            tradeId: br.tradeId && idMap.trades.has(br.tradeId) ? idMap.trades.get(br.tradeId) || null : null,
            notes: br.notes || null,
            breachTime: br.breachTime ? new Date(br.breachTime) : new Date()
          }
        })
        results.breachRecords++
      }
    }

    // 8. Import Payouts
    const payoutsFile = zip.file('payouts.csv')
    if (payoutsFile) {
      const payoutsCsv = await payoutsFile.async('string')
      const payouts = parseCSV(payoutsCsv)
      
      for (const payout of payouts) {
        await prisma.payout.create({
          data: {
            id: crypto.randomUUID(),
            masterAccountId: idMap.masterAccounts.get(payout.masterAccountId)!,
            phaseAccountId: idMap.phaseAccounts.get(payout.phaseAccountId)!,
            amount: parseFloat(payout.amount),
            status: payout.status || 'pending',
            requestDate: payout.requestDate ? new Date(payout.requestDate) : new Date(),
            approvedDate: payout.approvedDate ? new Date(payout.approvedDate) : null,
            paidDate: payout.paidDate ? new Date(payout.paidDate) : null,
            rejectedDate: payout.rejectedDate ? new Date(payout.rejectedDate) : null,
            notes: payout.notes || null,
            rejectionReason: payout.rejectionReason || null
          }
        })
        results.payouts++
      }
    }

    // 9. Import Backtest Trades
    const backtestTradesFile = zip.file('backtest_trades.csv')
    if (backtestTradesFile) {
      const backtestTradesCsv = await backtestTradesFile.async('string')
      const backtestTrades = parseCSV(backtestTradesCsv)
      
      for (let i = 0; i < backtestTrades.length; i++) {
        const bt = backtestTrades[i]
        // Parse tags array if it's a string
        let tags = []
        if (bt.tags) {
          try {
            tags = typeof bt.tags === 'string' ? JSON.parse(bt.tags) : bt.tags
          } catch (e) {
            tags = []
          }
        }

        await prisma.backtestTrade.create({
          data: {
            id: crypto.randomUUID(),
            userId: user.id,
            pair: bt.pair,
            direction: bt.direction,
            outcome: bt.outcome,
            session: bt.session,
            model: bt.model,
            customModel: bt.customModel || null,
            riskRewardRatio: parseFloat(bt.riskRewardRatio),
            entryPrice: parseFloat(bt.entryPrice),
            stopLoss: parseFloat(bt.stopLoss),
            takeProfit: parseFloat(bt.takeProfit),
            exitPrice: parseFloat(bt.exitPrice),
            pnl: parseFloat(bt.pnl),
            imageOne: bt.imageOne || null,
            imageTwo: bt.imageTwo || null,
            imageThree: bt.imageThree || null,
            imageFour: bt.imageFour || null,
            imageFive: bt.imageFive || null,
            imageSix: bt.imageSix || null,
            cardPreviewImage: bt.cardPreviewImage || null,
            notes: bt.notes || null,
            tags: tags,
            dateExecuted: bt.dateExecuted ? new Date(bt.dateExecuted) : new Date(),
            backtestDate: bt.backtestDate ? new Date(bt.backtestDate) : null,
            createdAt: bt.createdAt ? new Date(bt.createdAt) : new Date(),
            updatedAt: bt.updatedAt ? new Date(bt.updatedAt) : new Date()
          }
        })
        results.backtestTrades++
      }
    }

    // 10. Import Daily Notes
    const dailyNotesFile = zip.file('daily_notes.csv')
    if (dailyNotesFile) {
      const dailyNotesCsv = await dailyNotesFile.async('string')
      const dailyNotes = parseCSV(dailyNotesCsv)
      
      for (const note of dailyNotes) {
        await prisma.dailyNote.upsert({
          where: {
            userId_accountId_date: {
              userId: user.id,
              accountId: '', // Empty string matches NULL in unique constraint
              date: new Date(note.date)
            }
          },
          update: {
            note: note.note
          },
          create: {
            id: crypto.randomUUID(),
            userId: user.id,
            accountId: null,
            date: new Date(note.date),
            note: note.note,
            createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
            updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date()
          }
        })
        results.dailyNotes++
      }
    }

    // 11. Import Dashboard Templates
    const templatesFile = zip.file('dashboard_templates.csv')
    if (templatesFile) {
      const templatesCsv = await templatesFile.async('string')
      const templates = parseCSV(templatesCsv)
      
      for (const template of templates) {
        // Parse layout JSON if it's a string
        let layout = []
        if (template.layout) {
          try {
            layout = typeof template.layout === 'string' ? JSON.parse(template.layout) : template.layout
          } catch (e) {
            layout = []
          }
        }

        try {
          await prisma.dashboardTemplate.create({
            data: {
              id: crypto.randomUUID(),
              userId: user.id,
              name: template.name,
              isDefault: template.isDefault === 'true' || template.isDefault === true,
              isActive: false, // Don't automatically activate imported templates
              layout: layout,
              createdAt: template.createdAt ? new Date(template.createdAt) : new Date(),
              updatedAt: template.updatedAt ? new Date(template.updatedAt) : new Date()
            }
          })
          results.dashboardTemplates++
        } catch (templateError: any) {
          // Handle unique constraint error - template with same name already exists
          if (templateError.code === 'P2002' && templateError.meta?.target?.includes('name')) {
            // Don't increment counter for duplicates
          } else {
            // Re-throw if it's not a duplicate constraint error
            throw templateError
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Data imported successfully',
      results
    })

  } catch (error) {
    return NextResponse.json(
      { error: `Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

// Helper function to parse CSV to array of objects
function parseCSV(csv: string): any[] {
  const lines = csv.trim().split('\n')
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const results = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    const values = parseCSVLine(line)
    const obj: any = {}

    headers.forEach((header, index) => {
      let value = values[index] || ''
      
      // Try to parse JSON if it looks like JSON
      if (value.startsWith('{') || value.startsWith('[')) {
        try {
          value = JSON.parse(value)
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      
      obj[header] = value
    })

    results.push(obj)
  }

  return results
}

// Helper to properly parse CSV lines (handles quoted values with commas)
function parseCSVLine(line: string): string[] {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Push last field
  result.push(current.trim())

  return result
}

