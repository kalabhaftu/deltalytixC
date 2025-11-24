import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import JSZip from 'jszip'
import { format } from 'date-fns'

export const maxDuration = 300 // 5 minutes for large exports

interface ExportFilters {
  accountIds?: string[]
  instruments?: string[]
  dateFrom?: string
  dateTo?: string
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const filters: ExportFilters = body.filters || {}

    // Create ZIP file
    const zip = new JSZip()

    // Export metadata
    const metadata = {
      exportDate: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email,
      timezone: user.timezone,
      version: '1.0.0'
    }
    zip.file('metadata.json', JSON.stringify(metadata, null, 2))

    // 1. Export Groups
    const groups = await prisma.group.findMany({
      where: { userId: user.id }
    })
    if (groups.length > 0) {
      const groupsCsv = convertToCSV(groups)
      zip.file('groups.csv', groupsCsv)
    }

    // 2. Export Accounts
    let accountsQuery: any = { userId: user.id }
    if (filters.accountIds && filters.accountIds.length > 0) {
      accountsQuery.id = { in: filters.accountIds }
    }
    
    const accounts = await prisma.account.findMany({
      where: accountsQuery
    })
    if (accounts.length > 0) {
      const accountsCsv = convertToCSV(accounts)
      zip.file('accounts.csv', accountsCsv)
    }

    // 3. Export Trades
    let tradesQuery: any = { userId: user.id }
    const conditions: any[] = []
    
    if (filters.accountIds && filters.accountIds.length > 0) {
      conditions.push({ accountId: { in: filters.accountIds } })
    }
    if (filters.instruments && filters.instruments.length > 0) {
      conditions.push({ instrument: { in: filters.instruments } })
    }
    if (filters.dateFrom) {
      conditions.push({ entryTime: { gte: new Date(filters.dateFrom) } })
    }
    if (filters.dateTo) {
      conditions.push({ entryTime: { lte: new Date(filters.dateTo) } })
    }
    
    if (conditions.length > 0) {
      tradesQuery.AND = conditions
    }

    const trades = await prisma.trade.findMany({
      where: tradesQuery
    })
    if (trades.length > 0) {
      const tradesCsv = convertToCSV(trades)
      zip.file('trades.csv', tradesCsv)
    }

    // 4. Export Master Accounts (Prop Firm)
    const masterAccounts = await prisma.masterAccount.findMany({
      where: { userId: user.id }
    })
    if (masterAccounts.length > 0) {
      const masterAccountsCsv = convertToCSV(masterAccounts)
      zip.file('master_accounts.csv', masterAccountsCsv)
    }

    // 5. Export Phase Accounts
    if (masterAccounts.length > 0) {
      const phaseAccounts = await prisma.phaseAccount.findMany({
        where: {
          masterAccountId: { in: masterAccounts.map(ma => ma.id) }
        }
      })
      if (phaseAccounts.length > 0) {
        const phaseAccountsCsv = convertToCSV(phaseAccounts)
        zip.file('phase_accounts.csv', phaseAccountsCsv)
      }

      // 6. Export Daily Anchors
      const dailyAnchors = await prisma.dailyAnchor.findMany({
        where: {
          phaseAccountId: { in: phaseAccounts.map(pa => pa.id) }
        }
      })
      if (dailyAnchors.length > 0) {
        const dailyAnchorsCsv = convertToCSV(dailyAnchors)
        zip.file('daily_anchors.csv', dailyAnchorsCsv)
      }

      // 7. Export Breach Records
      const breachRecords = await prisma.breachRecord.findMany({
        where: {
          phaseAccountId: { in: phaseAccounts.map(pa => pa.id) }
        }
      })
      if (breachRecords.length > 0) {
        const breachRecordsCsv = convertToCSV(breachRecords)
        zip.file('breach_records.csv', breachRecordsCsv)
      }

      // 8. Export Payouts
      const payouts = await prisma.payout.findMany({
        where: {
          masterAccountId: { in: masterAccounts.map(ma => ma.id) }
        }
      })
      if (payouts.length > 0) {
        const payoutsCsv = convertToCSV(payouts)
        zip.file('payouts.csv', payoutsCsv)
      }
    }

    // 9. Export Backtest Trades
    const backtestTrades = await prisma.backtestTrade.findMany({
      where: { userId: user.id }
    })
    if (backtestTrades.length > 0) {
      const backtestTradesCsv = convertToCSV(backtestTrades)
      zip.file('backtest_trades.csv', backtestTradesCsv)
    }

    // 10. Export Daily Notes
    let notesQuery: any = { userId: user.id }
    if (filters.dateFrom || filters.dateTo) {
      notesQuery.date = {}
      if (filters.dateFrom) notesQuery.date.gte = new Date(filters.dateFrom)
      if (filters.dateTo) notesQuery.date.lte = new Date(filters.dateTo)
    }

    const dailyNotes = await prisma.dailyNote.findMany({
      where: notesQuery
    })
    if (dailyNotes.length > 0) {
      const dailyNotesCsv = convertToCSV(dailyNotes)
      zip.file('daily_notes.csv', dailyNotesCsv)
    }

    // 11. Export Dashboard Templates
    const dashboardTemplates = await prisma.dashboardTemplate.findMany({
      where: { userId: user.id }
    })
    if (dashboardTemplates.length > 0) {
      const templatesCsv = convertToCSV(dashboardTemplates)
      zip.file('dashboard_templates.csv', templatesCsv)
    }

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    
    const filename = `deltalytix-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.zip`

    return new NextResponse(zipBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}

// Helper function to convert array of objects to CSV
function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const csvRows = []

  // Add headers
  csvRows.push(headers.join(','))

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]
      
      // Handle null/undefined
      if (value === null || value === undefined) return ''
      
      // Handle dates
      if (value instanceof Date) return value.toISOString()
      
      // Handle objects/arrays (stringify them)
      if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
      
      // Handle strings with commas, quotes, or newlines
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      
      return stringValue
    })
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}

