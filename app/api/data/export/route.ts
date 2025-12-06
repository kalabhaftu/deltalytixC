import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdSafe } from '@/server/auth'
import archiver from 'archiver'
import { PassThrough } from 'stream'

// Helper to sanitize and transform data
const sanitizeUser = (data: any) => {
  const { id, userId, auth_user_id, ...rest } = data
  return numberValuesToString(rest)
}

// Convert bigints/decimals to string/number if needed (though simple objects usually fine)
const numberValuesToString = (obj: any) => {
  return obj // Assuming standard JSON safe
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdSafe()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { auth_user_id: userId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const internalUserId = user.id

    // Parse Filters
    let filters: { from?: string; to?: string; accountIds?: string[]; instruments?: string[] } = {}
    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        filters = await request.json()
      } catch (e) {
        console.warn('Failed to parse export filters', e)
      }
    }

    // Prepare Where Clauses
    const dateFilter = (dateField: string) => {
      if (!filters.from && !filters.to) return {}
      return {
        [dateField]: {
          ...(filters.from ? { gte: new Date(filters.from) } : {}),
          ...(filters.to ? { lte: new Date(filters.to) } : {})
        }
      }
    }

    // Trade Filter: Date + Account
    const tradeWhere: any = {
      userId: internalUserId,
      ...dateFilter('entryDate')
    }

    if (filters.accountIds && filters.accountIds.length > 0) {
      tradeWhere['OR'] = [
        { accountId: { in: filters.accountIds } },
        { phaseAccountId: { in: filters.accountIds } }
      ]
    }

    if (filters.instruments && filters.instruments.length > 0) {
      tradeWhere['instrument'] = { in: filters.instruments }
    }

    // Fetch primary data (fast)
    // We export ALL metadata (Accounts, Models, Tags) to ensure referential integrity for imported trades.
    // We only filter the transactional data (Trades, Notes, etc).
    const [
      accounts,
      masterAccounts,
      tradingModels,
      tradeTags,
      dailyNotes,
      weeklyReviews,
      trades,
      backtestTrades
    ] = await Promise.all([
      prisma.account.findMany({ where: { userId: internalUserId } }),
      prisma.masterAccount.findMany({
        where: { userId: internalUserId },
        include: { PhaseAccount: true }
      }),
      prisma.tradingModel.findMany({ where: { userId: internalUserId } }),
      prisma.tradeTag.findMany({ where: { userId: internalUserId } }),
      prisma.dailyNote.findMany({
        where: {
          userId: internalUserId,
          ...dateFilter('date')
        }
      }),
      prisma.weeklyReview.findMany({
        where: {
          userId: internalUserId,
          ...dateFilter('startDate') // Approximate
        }
      }),
      prisma.trade.findMany({
        where: tradeWhere,
      }),
      prisma.backtestTrade.findMany({
        where: {
          userId: internalUserId,
          ...dateFilter('dateExecuted')
        }
      })
    ])

    const modelMap = new Map(tradingModels.map(m => [m.id, m.name]))

    const manifest = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      filters: filters, // Include metadata about what was filtered
      accounts: accounts.map(sanitizeUser),
      masterAccounts: masterAccounts.map(ma => ({
        ...sanitizeUser(ma),
        PhaseAccount: ma.PhaseAccount.map(p => {
          const { id, masterAccountId, ...rest } = p
          return rest
        })
      })),
      tradingModels: tradingModels.map(sanitizeUser),
      tradeTags: tradeTags.map(sanitizeUser),
      dailyNotes: dailyNotes.map(sanitizeUser),
      weeklyReviews: weeklyReviews.map(sanitizeUser),
      trades: trades.map(t => {
        const { id, userId, accountId, phaseAccountId, modelId, ...rest } = t
        return {
          ...rest,
          originalId: id,
          modelName: modelId ? modelMap.get(modelId) : null,
        }
      }),
      backtestTrades: backtestTrades.map(sanitizeUser)
    }

    // Set up Archive Stream
    const stream = new PassThrough()
    const archive = archiver('zip', { zlib: { level: 9 } })

    // Log archive warnings/errors
    archive.on('warning', (err) => {
      console.warn('Archive warning:', err)
    })
    archive.on('error', (err) => {
      console.error('Archive error:', err)
      stream.destroy(err) // Kill the stream
    })

    // Pipe archive to response stream
    archive.pipe(stream)

    // Execute heavy lifting asynchronously
    const processArchive = async () => {
      try {
        // 1. Add Manifest
        archive.append(JSON.stringify(manifest, null, 2), { name: 'data.json' })

        // 2. Fetch Images
        // Helper to download
        const downloadFile = async (url: string): Promise<Buffer | null> => {
          try {
            const res = await fetch(url)
            if (!res.ok) return null
            return Buffer.from(await res.arrayBuffer())
          } catch (e) {
            return null
          }
        }

        // We process trades in chunks to avoid blowing up memory or connections
        const CHUNK_SIZE = 5
        const allTradesWithImages = trades.filter(t => t.imageOne || t.imageTwo || t.imageThree || t.imageFour || t.imageFive || t.imageSix || t.cardPreviewImage)

        // Helper to process a single trade's images
        const processTradeImages = async (trade: any) => {
          const images = [
            { url: trade.imageOne, suffix: '1' },
            { url: trade.imageTwo, suffix: '2' },
            { url: trade.imageThree, suffix: '3' },
            { url: trade.imageFour, suffix: '4' },
            { url: trade.imageFive, suffix: '5' },
            { url: trade.imageSix, suffix: '6' },
            { url: trade.cardPreviewImage, suffix: 'preview' },
          ]

          for (const img of images) {
            if (img.url && img.url.startsWith('http')) {
              const ext = img.url.split('.').pop()?.split('?')[0] || 'png'
              const buffer = await downloadFile(img.url)
              if (buffer) {
                archive.append(buffer, { name: `images/trades/${trade.id}_${img.suffix}.${ext}` })
              }
            }
          }
        }

        // Chunk processing
        for (let i = 0; i < allTradesWithImages.length; i += CHUNK_SIZE) {
          const chunk = allTradesWithImages.slice(i, i + CHUNK_SIZE)
          await Promise.all(chunk.map(processTradeImages))
          // Small delay to yield event loop if needed?
        }

        // Process Backtest images
        const backtestsWithImages = backtestTrades.filter(t => t.imageOne || t.imageTwo || t.imageThree || t.imageFour || t.imageFive || t.imageSix || t.cardPreviewImage)
        const processBacktestImages = async (trade: any) => {
          const images = [
            { url: trade.imageOne, suffix: '1' },
            { url: trade.imageTwo, suffix: '2' },
            { url: trade.imageThree, suffix: '3' },
            { url: trade.imageFour, suffix: '4' },
            { url: trade.imageFive, suffix: '5' },
            { url: trade.imageSix, suffix: '6' },
            { url: trade.cardPreviewImage, suffix: 'preview' },
          ]
          for (const img of images) {
            if (img.url && img.url.startsWith('http')) {
              const ext = img.url.split('.').pop()?.split('?')[0] || 'png'
              const buffer = await downloadFile(img.url)
              if (buffer) {
                archive.append(buffer, { name: `images/backtest/${trade.id}_${img.suffix}.${ext}` })
              }
            }
          }
        }

        for (let i = 0; i < backtestsWithImages.length; i += CHUNK_SIZE) {
          const chunk = backtestsWithImages.slice(i, i + CHUNK_SIZE)
          await Promise.all(chunk.map(processBacktestImages))
        }

        // Finalize
        await archive.finalize()
      } catch (error) {
        console.error('Async archive processing error:', error)
        stream.destroy(error as Error)
      }
    }

    // Fire and forget
    processArchive()

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="deltalytix-export-${new Date().toISOString().split('T')[0]}.zip"`
      }
    })

  } catch (error) {
    console.error('Export init error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
