import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

// GET - Generate AI analysis of journals and trades
export async function GET(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const accountId = searchParams.get('accountId')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    // Fetch journals in date range
    const journalsWhere: any = {
      userId,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    if (accountId) {
      journalsWhere.accountId = accountId
    }

    const journals = await prisma.dailyNote.findMany({
      where: journalsWhere,
      orderBy: { date: 'asc' },
      include: {
        Account: {
          select: {
            name: true,
            number: true
          }
        }
      }
    })

    // Fetch trades in date range
    const tradesWhere: any = {
      userId,
      entryDate: {
        gte: startDate,
        lte: endDate
      }
    }

    if (accountId) {
      tradesWhere.accountId = accountId
    }

    const trades = await prisma.trade.findMany({
      where: tradesWhere,
      orderBy: { entryDate: 'asc' },
      select: {
        id: true,
        instrument: true,
        side: true,
        pnl: true,
        commission: true,
        entryDate: true,
        closeDate: true,
        quantity: true,
        entryPrice: true,
        closePrice: true,
        comment: true, // Trade notes
        modelId: true,
        TradingModel: {
          select: {
            name: true
          }
        },
        marketBias: true,
        newsDay: true,
        selectedNews: true,
        newsTraded: true,
        biasTimeframe: true,
        narrativeTimeframe: true,
        driverTimeframe: true,
        entryTimeframe: true,
        structureTimeframe: true,
        orderType: true,
        entryTime: true,
        exitTime: true
      }
    })

    // Fetch funded/active accounts status (MasterAccounts for prop firms)
    const propFirmAccounts = await prisma.masterAccount.findMany({
      where: {
        userId,
        isArchived: false
      },
      select: {
        accountName: true,
        propFirmName: true,
        status: true,
        accountSize: true,
        currentPhase: true
      }
    })

    // Generate AI analysis
    const analysis = await generateAnalysis(journals, trades, propFirmAccounts)

    return NextResponse.json({ analysis })
  } catch (error) {
    // Error generating AI analysis
    return NextResponse.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    )
  }
}

async function generateAnalysis(journals: any[], trades: any[], propFirmAccounts: any[] = []) {
  // Prepare data for AI
  const journalSummary = journals.map(j => ({
    date: j.date,
    emotion: j.emotion,
    note: j.note,
    account: j.Account?.name || 'All Accounts'
  }))

  // Format prop firm account status for AI
  const accountStatusSummary = propFirmAccounts.length > 0 
    ? propFirmAccounts.map(acc => 
        `- ${acc.accountName} (${acc.propFirmName}): Status=${acc.status}, Phase=${acc.currentPhase}, Size=$${acc.accountSize}`
      ).join('\n')
    : 'No funded prop firm accounts found'

  // Extract trade notes for analysis
  const tradeNotes = trades
    .filter(t => t.comment && t.comment.trim().length > 0)
    .map(t => ({
      date: t.entryDate,
      note: t.comment,
      pnl: t.pnl - (t.commission || 0),
      instrument: t.instrument,
      side: t.side,
      duration: t.closeDate ? (new Date(t.closeDate).getTime() - new Date(t.entryDate).getTime()) / 1000 / 60 : 0 // duration in minutes
    }))

  const tradeStats = {
    totalTrades: trades.length,
    winningTrades: trades.filter(t => (t.pnl - (t.commission || 0)) > 0).length,
    losingTrades: trades.filter(t => (t.pnl - (t.commission || 0)) < 0).length,
    breakEvenTrades: trades.filter(t => (t.pnl - (t.commission || 0)) === 0).length,
    totalPnL: trades.reduce((sum, t) => sum + t.pnl - (t.commission || 0), 0),
    averagePnL: trades.length > 0 ? trades.reduce((sum, t) => sum + t.pnl - (t.commission || 0), 0) / trades.length : 0,
    totalCommission: trades.reduce((sum, t) => sum + (t.commission || 0), 0),
    tradesWithNotes: tradeNotes.length
  }

  // Calculate profit factor
  const grossProfit = trades.filter(t => (t.pnl - (t.commission || 0)) > 0).reduce((sum, t) => sum + t.pnl - (t.commission || 0), 0)
  const grossLoss = Math.abs(trades.filter(t => (t.pnl - (t.commission || 0)) < 0).reduce((sum, t) => sum + t.pnl - (t.commission || 0), 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

  // Calculate average win/loss
  const avgWin = tradeStats.winningTrades > 0 ? grossProfit / tradeStats.winningTrades : 0
  const avgLoss = tradeStats.losingTrades > 0 ? grossLoss / tradeStats.losingTrades : 0

  // P&L by instrument
  const pnlByInstrument: Record<string, { trades: number, pnl: number, wins: number }> = {}
  trades.forEach(t => {
    const netPnL = t.pnl - (t.commission || 0)
    if (!pnlByInstrument[t.instrument]) {
      pnlByInstrument[t.instrument] = { trades: 0, pnl: 0, wins: 0 }
    }
    pnlByInstrument[t.instrument].trades++
    pnlByInstrument[t.instrument].pnl += netPnL
    if (netPnL > 0) pnlByInstrument[t.instrument].wins++
  })

  // Sort instruments by P&L
  const topInstruments = Object.entries(pnlByInstrument)
    .sort((a, b) => b[1].pnl - a[1].pnl)
    .slice(0, 5)

  // P&L by strategy (trading model)
  const pnlByStrategy: Record<string, { trades: number, pnl: number, wins: number }> = {}
  trades.forEach(t => {
    const strategy = (t as any).TradingModel?.name || 'No Strategy'
    const netPnL = t.pnl - (t.commission || 0)
    if (!pnlByStrategy[strategy]) {
      pnlByStrategy[strategy] = { trades: 0, pnl: 0, wins: 0 }
    }
    pnlByStrategy[strategy].trades++
    pnlByStrategy[strategy].pnl += netPnL
    if (netPnL > 0) pnlByStrategy[strategy].wins++
  })

  // P&L by weekday
  const pnlByWeekday: Record<string, { trades: number, pnl: number }> = {
    Sunday: { trades: 0, pnl: 0 },
    Monday: { trades: 0, pnl: 0 },
    Tuesday: { trades: 0, pnl: 0 },
    Wednesday: { trades: 0, pnl: 0 },
    Thursday: { trades: 0, pnl: 0 },
    Friday: { trades: 0, pnl: 0 },
    Saturday: { trades: 0, pnl: 0 }
  }
  trades.forEach(t => {
    const dayOfWeek = new Date(t.entryDate).toLocaleDateString('en-US', { weekday: 'long' })
    const netPnL = t.pnl - (t.commission || 0)
    pnlByWeekday[dayOfWeek].trades++
    pnlByWeekday[dayOfWeek].pnl += netPnL
  })

  // P&L by hour of day
  const pnlByHour: Record<number, { trades: number, pnl: number }> = {}
  trades.forEach(t => {
    const hour = new Date(t.entryDate).getHours()
    const netPnL = t.pnl - (t.commission || 0)
    if (!pnlByHour[hour]) {
      pnlByHour[hour] = { trades: 0, pnl: 0 }
    }
    pnlByHour[hour].trades++
    pnlByHour[hour].pnl += netPnL
  })

  // Find best/worst hours
  const hourEntries = Object.entries(pnlByHour).map(([hour, data]) => ({ hour: parseInt(hour), ...data }))
  const bestHours = hourEntries.filter(h => h.trades >= 3).sort((a, b) => b.pnl - a.pnl).slice(0, 3)
  const worstHours = hourEntries.filter(h => h.trades >= 3).sort((a, b) => a.pnl - b.pnl).slice(0, 3)

  // Count emotions
  const emotionCounts: Record<string, number> = {}
  journals.forEach(j => {
    if (j.emotion) {
      emotionCounts[j.emotion] = (emotionCounts[j.emotion] || 0) + 1
    }
  })

  // Group trades by emotion (find trades on days with specific emotions)
  const emotionPerformance: Record<string, { trades: number, totalPnL: number }> = {}
  journals.forEach(j => {
    if (j.emotion) {
      const dateStr = new Date(j.date).toISOString().split('T')[0]
      const dayTrades = trades.filter(t => t.entryDate.startsWith(dateStr))
      
      if (!emotionPerformance[j.emotion]) {
        emotionPerformance[j.emotion] = { trades: 0, totalPnL: 0 }
      }
      
      emotionPerformance[j.emotion].trades += dayTrades.length
      emotionPerformance[j.emotion].totalPnL += dayTrades.reduce(
        (sum, t) => sum + t.pnl - (t.commission || 0),
        0
      )
    }
  })

  // Market Bias Analysis
  const biasPerformance: Record<string, { trades: number, pnl: number, wins: number, alignedWithSide: number }> = {
    BULLISH: { trades: 0, pnl: 0, wins: 0, alignedWithSide: 0 },
    BEARISH: { trades: 0, pnl: 0, wins: 0, alignedWithSide: 0 },
    UNDECIDED: { trades: 0, pnl: 0, wins: 0, alignedWithSide: 0 },
  }
  
  let tradesWithBias = 0
  let tradesAlignedWithBias = 0
  
  trades.forEach(t => {
    if (t.marketBias) {
      tradesWithBias++
      const netPnL = t.pnl - (t.commission || 0)
      biasPerformance[t.marketBias].trades++
      biasPerformance[t.marketBias].pnl += netPnL
      if (netPnL > 0) biasPerformance[t.marketBias].wins++
      
      // Check if trade direction aligns with bias
      const isLong = t.side?.toUpperCase() === 'BUY' || t.side?.toLowerCase() === 'long'
      const isShort = t.side?.toUpperCase() === 'SELL' || t.side?.toLowerCase() === 'short'
      
      if ((t.marketBias === 'BULLISH' && isLong) || (t.marketBias === 'BEARISH' && isShort)) {
        biasPerformance[t.marketBias].alignedWithSide++
        tradesAlignedWithBias++
      }
    }
  })
  
  const biasAlignment = tradesWithBias > 0 ? (tradesAlignedWithBias / tradesWithBias) * 100 : 0

  // News Trading Analysis
  const newsTradesStats = {
    totalNewsDays: trades.filter(t => t.newsDay).length,
    tradedDuringNews: trades.filter(t => t.newsDay && t.newsTraded).length,
    tradedBeforeAfterNews: trades.filter(t => t.newsDay && !t.newsTraded).length,
    noNewsTraded: trades.filter(t => !t.newsDay).length,
  }
  
  const newsDayPnL = trades.filter(t => t.newsDay).reduce((sum, t) => sum + t.pnl - (t.commission || 0), 0)
  const noNewsDayPnL = trades.filter(t => !t.newsDay).reduce((sum, t) => sum + t.pnl - (t.commission || 0), 0)
  
  const tradedDuringNewsPnL = trades.filter(t => t.newsDay && t.newsTraded).reduce((sum, t) => sum + t.pnl - (t.commission || 0), 0)
  const tradedBeforeAfterNewsPnL = trades.filter(t => t.newsDay && !t.newsTraded).reduce((sum, t) => sum + t.pnl - (t.commission || 0), 0)
  
  const newsDayWins = trades.filter(t => t.newsDay && (t.pnl - (t.commission || 0)) > 0).length
  const newsDayLosses = trades.filter(t => t.newsDay && (t.pnl - (t.commission || 0)) < 0).length
  const newsDayWinRate = newsTradesStats.totalNewsDays > 0 ? (newsDayWins / newsTradesStats.totalNewsDays) * 100 : 0
  
  const noNewsDayWins = trades.filter(t => !t.newsDay && (t.pnl - (t.commission || 0)) > 0).length
  const noNewsDayLosses = trades.filter(t => !t.newsDay && (t.pnl - (t.commission || 0)) < 0).length
  const noNewsDayWinRate = newsTradesStats.noNewsTraded > 0 ? (noNewsDayWins / newsTradesStats.noNewsTraded) * 100 : 0
  
  // Extract specific news events that were traded
  const newsEventsTrade: Record<string, { trades: number, pnl: number, wins: number, tradedDuring: number }> = {}
  trades.forEach(t => {
    if (t.newsDay && t.selectedNews) {
      const newsIds = t.selectedNews.split(',').filter(Boolean)
      const netPnL = t.pnl - (t.commission || 0)
      newsIds.forEach((newsId: string) => {
        if (!newsEventsTrade[newsId]) {
          newsEventsTrade[newsId] = { trades: 0, pnl: 0, wins: 0, tradedDuring: 0 }
        }
        newsEventsTrade[newsId].trades++
        newsEventsTrade[newsId].pnl += netPnL
        if (netPnL > 0) newsEventsTrade[newsId].wins++
        if (t.newsTraded) newsEventsTrade[newsId].tradedDuring++
      })
    }
  })

  // Timeframe Analysis
  const timeframeStats: Record<string, { trades: number, pnl: number, wins: number }> = {
    '1m': { trades: 0, pnl: 0, wins: 0 },
    '5m': { trades: 0, pnl: 0, wins: 0 },
    '15m': { trades: 0, pnl: 0, wins: 0 },
    '30m': { trades: 0, pnl: 0, wins: 0 },
    '1h': { trades: 0, pnl: 0, wins: 0 },
    '4h': { trades: 0, pnl: 0, wins: 0 },
    'd': { trades: 0, pnl: 0, wins: 0 },
    'w': { trades: 0, pnl: 0, wins: 0 },
    'm': { trades: 0, pnl: 0, wins: 0 },
  }

  const timeframeLabelMap: Record<string, string> = {
    '1m': '1 Minute',
    '5m': '5 Minutes',
    '15m': '15 Minutes',
    '30m': '30 Minutes',
    '1h': '1 Hour',
    '4h': '4 Hours',
    'd': 'Daily',
    'w': 'Weekly',
    'm': 'Monthly',
  }

  // Count usage by timeframe type (entry is most important)
  trades.forEach(t => {
    const netPnL = t.pnl - (t.commission || 0)
    const isWin = netPnL > 0

    // Count entry timeframe (primary indicator)
    if ((t as any).entryTimeframe && timeframeStats[(t as any).entryTimeframe]) {
      timeframeStats[(t as any).entryTimeframe].trades++
      timeframeStats[(t as any).entryTimeframe].pnl += netPnL
      if (isWin) timeframeStats[(t as any).entryTimeframe].wins++
    }
  })

  // Filter out unused timeframes
  const usedTimeframes = Object.entries(timeframeStats)
    .filter(([_, data]) => data.trades > 0)
    .sort((a, b) => b[1].pnl - a[1].pnl) // Sort by P&L

  // Order Type Analysis
  const orderTypeStats: Record<string, { trades: number, pnl: number, wins: number }> = {
    'market': { trades: 0, pnl: 0, wins: 0 },
    'limit': { trades: 0, pnl: 0, wins: 0 },
  }

  trades.forEach(t => {
    if ((t as any).orderType) {
      const netPnL = t.pnl - (t.commission || 0)
      const isWin = netPnL > 0
      const orderType = (t as any).orderType

      if (orderTypeStats[orderType]) {
        orderTypeStats[orderType].trades++
        orderTypeStats[orderType].pnl += netPnL
        if (isWin) orderTypeStats[orderType].wins++
      }
    }
  })

  const usedOrderTypes = Object.entries(orderTypeStats)
    .filter(([_, data]) => data.trades > 0)
    .sort((a, b) => b[1].pnl - a[1].pnl)

  // Session Analysis
  const { getTradingSession } = await import('@/lib/time-utils')
  const sessionStats: Record<string, { trades: number, pnl: number, wins: number }> = {}

  trades.forEach(t => {
    if ((t as any).entryTime) {
      const session = getTradingSession((t as any).entryTime)
      const netPnL = t.pnl - (t.commission || 0)
      const isWin = netPnL > 0

      if (!sessionStats[session]) {
        sessionStats[session] = { trades: 0, pnl: 0, wins: 0 }
      }

      sessionStats[session].trades++
      sessionStats[session].pnl += netPnL
      if (isWin) sessionStats[session].wins++
    }
  })

  const usedSessions = Object.entries(sessionStats)
    .filter(([_, data]) => data.trades > 0)
    .sort((a, b) => b[1].pnl - a[1].pnl)

  // Call AI API (XAI/Grok)
  try {
    const apiKey = process.env.XAI_API_KEY
    const baseUrl = process.env.XAI_BASE_URL || 'https://api.x.ai/v1'
    const model = process.env.XAI_MODEL || 'grok-beta'

    if (!apiKey) {
      // Fallback to rule-based analysis if no API key
      return generateRuleBasedAnalysis(journalSummary, tradeStats, emotionCounts, emotionPerformance)
    }

    const prompt = `You are a legendary trading psychology coach with 20+ years of experience. Think Jordan Belfort meets Mark Douglas meets a best friend who keeps it 100.
    Your mission: Analyze this trader's data like their career depends on it—because it does.
    
    CORE DIRECTIVES:
    1. **Read Between the Lines**: Their journal is full of raw, unfiltered feelings. "Fuck this market", "nailed it", "revenge mode"—these aren't just words, they're RED FLAGS or GREEN LIGHTS. Call them out.
    2. **Connect Emotions to Money**: Show them the BRUTAL truth. "You say you're 'confident' but your P&L says you're overtrading. That's not confidence, that's ego."
    3. **Talk Like a Human**: No corporate BS. Be direct, be real. If they're self-sabotaging, tell them straight. If they're crushing it, hype them up.
    4. **Account Status = Reality Check**: If they have FAILED or BREACHED accounts, don't sugarcoat it. Dig into the trades/notes leading up to the failure. Was it tilt? Was it breaking rules? Call it out by name.
    5. **Spot the Tilt**: Rapid losses + frustrated notes = revenge trading. Say it loud and clear.
    6. **Market Bias Alignment**: They're recording their market sentiment (BULLISH/BEARISH/UNDECIDED). Check if they're trading WITH their bias or AGAINST it. If they say "bullish" but take short trades and lose, call that out. If they're profitable when aligned with their bias, tell them to stick to it.
    7. **News Trading Awareness**: They're tracking high-impact news events (NFP, FOMC, CPI, etc.) and whether they traded DURING or BEFORE/AFTER the release. Check their performance: Are they getting wrecked by news volatility? Are they better off avoiding news? If they're profitable on non-news days but losing on news days, tell them to STOP trading news. If specific events (like NFP or FOMC) are consistently hurting them, call it out by name.
    8. **Timeframe Analysis**: They're tracking 5 timeframes for each trade: Bias, Narrative, Driver, Entry, and Structure. The Entry timeframe is PRIMARY. Check which entry timeframes are working best. If they're profitable on 15m entries but losing on 1m scalps, tell them to stop the 1m noise. If their best P&L is on 4H entries, tell them to focus there and stop chasing lower timeframes.
    9. **Order Type & Session Performance**: They're tracking if they use Market Orders (instant execution) or Limit Orders (wait for price). Check which works better for them. Also check which trading sessions (Asian, London, New York, Overlaps) are most profitable. If they're losing during Asian session but winning during New York, tell them to focus on NY hours only.
    10. **Use the Dashboard Metrics**: You have P&L by instrument, strategy, weekday, hour, news events, entry timeframe, order type, AND trading session. USE ALL THIS DATA. If they lose money on Fridays, tell them to take Fridays off. If they make money on NQ but lose on ES, tell them to stop trading ES. If they're profitable 9-11 AM but lose money after 2 PM, call it out. If limit orders work better than market orders, tell them. If London session is their sweet spot but Asian session bleeds money, call it out.
    11. **Give Actionable Advice**: Not generic advice like "be disciplined." SPECIFIC advice based on their data: "Stop trading after 2 PM—your worst 3 hours are 14:00, 15:00, and 16:00" or "Focus on NQ—you're up $2,500 on it but down $800 on ES" or "Avoid NFP days—you've lost $1,200 across 5 NFP releases" or "Stick to 15m entries—you're up $3,200 on those but down $900 on 1m scalps" or "Use limit orders—you're up $1,800 with limits vs down $600 with market orders" or "Trade London/NY overlap only—that's where you make money"
    
    THE DATA:

    **Time Period**: ${journals.length > 0 ? `${new Date(journals[0].date).toLocaleDateString()} to ${new Date(journals[journals.length - 1].date).toLocaleDateString()}` : 'No data'}

    **FUNDED ACCOUNT STATUS (Critical Context)**:
    ${accountStatusSummary}
    ${propFirmAccounts.filter(acc => acc.status === 'failed').length > 0 ? 
      `[ALERT] Failed accounts detected. Analyze what went wrong based on the trades and journal entries below.` : ''}

    **Trading Performance (Dashboard Metrics)**:
    - Total Trades: ${tradeStats.totalTrades} (W: ${tradeStats.winningTrades}, L: ${tradeStats.losingTrades}, BE: ${tradeStats.breakEvenTrades})
    - Win Rate: ${tradeStats.totalTrades > 0 ? ((tradeStats.winningTrades / tradeStats.totalTrades) * 100).toFixed(1) : 0}%
    - Total P&L: $${tradeStats.totalPnL.toFixed(2)}
    - Gross Profit: $${grossProfit.toFixed(2)} | Gross Loss: -$${grossLoss.toFixed(2)}
    - Profit Factor: ${profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
    - Average Win: $${avgWin.toFixed(2)} | Average Loss: -$${avgLoss.toFixed(2)}
    - Risk/Reward Ratio: ${avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A'}
    - Total Commission Paid: $${tradeStats.totalCommission.toFixed(2)}

    **P&L by Instrument (Top 5)**:
    ${topInstruments.length > 0 
      ? topInstruments.map(([inst, data]) => 
          `- ${inst}: ${data.trades} trades, $${data.pnl.toFixed(2)} P&L, ${data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(1) : 0}% WR`
        ).join('\n')
      : 'No trades'}

    **P&L by Strategy/Model**:
    ${Object.entries(pnlByStrategy).length > 0 
      ? Object.entries(pnlByStrategy).map(([strat, data]) => 
          `- ${strat}: ${data.trades} trades, $${data.pnl.toFixed(2)} P&L, ${data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(1) : 0}% WR`
        ).join('\n')
      : 'No strategy data'}

    **P&L by Weekday** (Identify best/worst days):
    ${Object.entries(pnlByWeekday)
      .filter(([_, data]) => data.trades > 0)
      .map(([day, data]) => 
        `- ${day}: ${data.trades} trades, $${data.pnl.toFixed(2)} P&L, ${data.trades > 0 ? `Avg: $${(data.pnl / data.trades).toFixed(2)}` : ''}`
      ).join('\n') || 'No weekday data'}

    **Best Trading Hours** (By P&L, min 3 trades):
    ${bestHours.length > 0 
      ? bestHours.map(h => `- ${h.hour}:00: ${h.trades} trades, $${h.pnl.toFixed(2)} P&L`).join('\n')
      : 'Insufficient data'}

    **Worst Trading Hours** (By P&L, min 3 trades):
    ${worstHours.length > 0 
      ? worstHours.map(h => `- ${h.hour}:00: ${h.trades} trades, $${h.pnl.toFixed(2)} P&L`).join('\n')
      : 'Insufficient data'}

    **Emotional States (Self-Reported)**:
    ${Object.entries(emotionCounts).map(([emotion, count]) => `- ${emotion}: ${count} days`).join('\n') || 'No emotions tracked'}

    **Performance by Emotion** (THIS IS KEY DATA):
    ${Object.entries(emotionPerformance).map(([emotion, perf]) => 
      `- ${emotion}: ${perf.trades} trades, $${perf.totalPnL.toFixed(2)} P&L${perf.trades > 0 ? ` (avg: $${(perf.totalPnL / perf.trades).toFixed(2)})` : ''}`
    ).join('\n') || 'No emotion-performance correlation data'}

    **Market Bias Analysis** (CRITICAL: Are they following their bias?):
    - Trades with recorded bias: ${tradesWithBias} out of ${tradeStats.totalTrades} trades
    - Trades aligned with bias: ${tradesAlignedWithBias} (${biasAlignment.toFixed(1)}%)
    ${Object.entries(biasPerformance)
      .filter(([_, data]) => data.trades > 0)
      .map(([bias, data]) => {
        const winRate = data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(1) : 0
        const alignmentRate = data.trades > 0 ? ((data.alignedWithSide / data.trades) * 100).toFixed(1) : 0
        return `- ${bias} Bias: ${data.trades} trades, $${data.pnl.toFixed(2)} P&L, ${winRate}% WR, ${alignmentRate}% aligned with bias`
      }).join('\n') || 'No bias data recorded'}
    ${tradesWithBias > 0 && biasAlignment < 50 ? 
      `[WARNING] Only ${biasAlignment.toFixed(1)}% of trades align with stated bias. They're trading AGAINST their market sentiment—potential counter-trend losses!` : ''}

    **News Trading Analysis** (High-Impact Events):
    - News Day Trades: ${newsTradesStats.totalNewsDays} trades ($${newsDayPnL.toFixed(2)} P&L, ${newsDayWinRate.toFixed(1)}% WR)
    - Traded DURING News Release: ${newsTradesStats.tradedDuringNews} trades ($${tradedDuringNewsPnL.toFixed(2)} P&L)
    - Traded BEFORE/AFTER News: ${newsTradesStats.tradedBeforeAfterNews} trades ($${tradedBeforeAfterNewsPnL.toFixed(2)} P&L)
    - Non-News Day Trades: ${newsTradesStats.noNewsTraded} trades ($${noNewsDayPnL.toFixed(2)} P&L, ${noNewsDayWinRate.toFixed(1)}% WR)
    ${Object.entries(newsEventsTrade).length > 0 ? `
    **Specific News Events Traded**:
    ${Object.entries(newsEventsTrade).map(([eventId, data]) => {
      const winRate = data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(1) : 0
      return `- ${eventId}: ${data.trades} trades, $${data.pnl.toFixed(2)} P&L, ${winRate}% WR, ${data.tradedDuring} during release`
    }).join('\n')}` : ''}
    ${newsTradesStats.tradedDuringNews > 0 && tradedDuringNewsPnL < 0 ? 
      `[WARNING] Negative P&L when trading DURING news releases. News volatility might be hurting performance—consider waiting for clarity!` : ''}
    ${newsTradesStats.totalNewsDays > 0 && noNewsDayWinRate > newsDayWinRate + 10 ? 
      `[INSIGHT] Win rate is ${(noNewsDayWinRate - newsDayWinRate).toFixed(1)}% higher on non-news days. Consider avoiding high-impact news!` : ''}

    ${usedTimeframes.length > 0 ? `**Entry Timeframe Performance** (Multi-Timeframe Analysis):
    ${usedTimeframes.map(([tf, data]) => {
      const winRate = data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(1) : 0
      return `- ${timeframeLabelMap[tf]}: ${data.trades} trades, $${data.pnl.toFixed(2)} P&L, ${winRate}% WR`
    }).join('\n')}
    ${usedTimeframes.length > 1 && usedTimeframes[0][1].pnl > 0 && usedTimeframes[usedTimeframes.length - 1][1].pnl < 0 ? 
      `[INSIGHT] Best timeframe: ${timeframeLabelMap[usedTimeframes[0][0]]} (+$${usedTimeframes[0][1].pnl.toFixed(2)}). Worst: ${timeframeLabelMap[usedTimeframes[usedTimeframes.length - 1][0]]} ($${usedTimeframes[usedTimeframes.length - 1][1].pnl.toFixed(2)}). Stick to what works!` : ''}
    ` : ''}

    ${usedOrderTypes.length > 0 ? `**Order Type Performance**:
    ${usedOrderTypes.map(([type, data]) => {
      const winRate = data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(1) : 0
      const label = type === 'market' ? 'Market Orders' : 'Limit Orders'
      return `- ${label}: ${data.trades} trades, $${data.pnl.toFixed(2)} P&L, ${winRate}% WR`
    }).join('\n')}
    ${usedOrderTypes.length === 2 && usedOrderTypes[0][1].pnl > 0 && usedOrderTypes[1][1].pnl < 0 ? 
      `[INSIGHT] ${usedOrderTypes[0][0] === 'market' ? 'Market orders' : 'Limit orders'} are working better (+$${usedOrderTypes[0][1].pnl.toFixed(2)}) vs ${usedOrderTypes[1][0] === 'market' ? 'market' : 'limit'} ($${usedOrderTypes[1][1].pnl.toFixed(2)}).` : ''}
    ` : ''}

    ${usedSessions.length > 0 ? `**Trading Session Performance**:
    ${usedSessions.map(([session, data]) => {
      const winRate = data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(1) : 0
      return `- ${session}: ${data.trades} trades, $${data.pnl.toFixed(2)} P&L, ${winRate}% WR`
    }).join('\n')}
    ${usedSessions.length > 1 && usedSessions[0][1].pnl > 0 && usedSessions[usedSessions.length - 1][1].pnl < 0 ? 
      `[INSIGHT] Best session: ${usedSessions[0][0]} (+$${usedSessions[0][1].pnl.toFixed(2)}). Worst: ${usedSessions[usedSessions.length - 1][0]} ($${usedSessions[usedSessions.length - 1][1].pnl.toFixed(2)}). Focus on your best times!` : ''}
    ` : ''}

    **Daily Journal Entries** (READ EVERY WORD - The vibe is in here):
    ${journalSummary.map(j => `- ${new Date(j.date).toLocaleDateString()}: [${j.emotion || 'No emotion'}] "${j.note}" (${j.account})`).join('\n') || 'No journal entries'}

    **Individual Trade Notes** (Look for patterns in wins vs losses):
    ${tradeNotes.slice(0, 20).map(t => `- ${new Date(t.date).toLocaleDateString()}: ${t.instrument} ${t.side} | ${t.pnl >= 0 ? 'WIN' : 'LOSS'}: $${t.pnl.toFixed(2)} | ${t.duration.toFixed(0)}min | "${t.note}"`).join('\n') || 'No trade notes available'}

    YOUR ANALYSIS (JSON FORMAT):
    {
      "summary": "3-5 sentences. Be REAL. Start with their account status if relevant (e.g., 'Look, you failed 2 accounts this month...'). Then hit them with the truth about their trading psychology. Are they on the right track or are they spiraling? Use 'you'.",
      "emotionalPatterns": [
        "At least 3-5 patterns. Examples: 'You trade like garbage when you're anxious—$250 avg loss vs $120 avg win when calm.'",
        "'Your notes say confident but your trades scream overconfident—3 failed trades after big wins.'",
        "'You're revenge trading after losses. Journal on 11/18: angry + $500 loss = classic tilt.'"
      ],
      "performanceInsights": [
        "At least 3-5 insights based on the dashboard metrics above. Examples: 'Your win rate is solid at 58% but your avg loss ($250) is 2x your avg win ($120)—fix your risk/reward.'",
        "'You make money on NQ ($2,500) but lose on ES (-$800)—stick to what works or cut ES entirely.'",
        "'Fridays are killing you: -$1,200 across 15 trades. Just don't trade Fridays.'",
        "'Your best hours are 9-11 AM ($1,800 profit). After 2 PM you're down $900. Stop trading in the afternoon.'",
        "'You're trading against your bias—60% of your bearish bias trades were longs and you lost money. Trust your bias or don't record it.'"
      ],
      "strengths": [
        "At least 2-3. Examples: 'You're journaling consistently—that's rare and shows you're serious.'",
        "'When you follow your plan, you win. 12 out of 15 rule-following trades were green.'"
      ],
      "weaknesses": [
        "At least 2-3. BE BRUTALLY HONEST. Examples: 'You overtrade when stressed. 8 trades on 11/14 = all red.'",
        "'You're breaking your own rules. You know this. Your notes prove it.'"
      ],
      "recommendations": [
        "At least 4-5 SPECIFIC, actionable steps based on their data. Examples: 'Stop trading after 2 PM. Your data shows you lose money after 14:00.'",
        "'Only trade NQ. Drop ES—you've lost $800 on it while making $2,500 on NQ.'",
        "'Take Fridays off. You're down $1,200 on Fridays vs +$900 on Tuesdays.'",
        "'Set a hard rule: No more than 3 trades per session when anxious—your journal shows 8-trade days are always red.'",
        "'Review your journal every morning. If you logged \"stressed\" yesterday, reduce size by 50% today.'",
        "'Use ICT_2022 strategy more—it has a 65% WR vs 48% on PRICE_ACTION.'"
      ]
    }

    TONE:
    - Professional but RAW. Think "tough love mentor," not "corporate coach."
    - Use "you" and "your" throughout. Make it personal.
    - Call out BS. Praise discipline. Be real.
    - NO EMOJIS in the JSON values (remove them if the AI adds any).
    - If they have failed accounts, address it directly and analyze why based on their data.
    
    Now GO. Give them the analysis they NEED, not the one they want.`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are a world-class trading psychology mentor who speaks candidly and directly. 
            You analyze patterns in informal language, emotional states, and trading behavior. 
            You provide tough love when needed and genuine praise when earned. 
            You understand that traders are HUMAN—not robots—and you speak their language. 
            Output ONLY valid JSON. No markdown, no code blocks, just pure JSON.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 3000
      })
    })

    if (!response.ok) {
      return generateRuleBasedAnalysis(journalSummary, tradeStats, emotionCounts, emotionPerformance, tradeNotes)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return generateRuleBasedAnalysis(journalSummary, tradeStats, emotionCounts, emotionPerformance, tradeNotes)
    }

    // Parse JSON response and remove emojis
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        // Remove emojis from all strings
        return removeEmojis(parsed)
      }
      return generateRuleBasedAnalysis(journalSummary, tradeStats, emotionCounts, emotionPerformance, tradeNotes)
    } catch (parseError) {
      return generateRuleBasedAnalysis(journalSummary, tradeStats, emotionCounts, emotionPerformance, tradeNotes)
    }
  } catch (error) {
    return generateRuleBasedAnalysis(journalSummary, tradeStats, emotionCounts, emotionPerformance, tradeNotes)
  }
}

// Remove emojis from analysis
function removeEmojis(obj: any): any {
  if (typeof obj === 'string') {
    // Remove emojis using regex
    return obj.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu, '').trim()
  } else if (Array.isArray(obj)) {
    return obj.map(item => removeEmojis(item))
  } else if (typeof obj === 'object' && obj !== null) {
    const cleaned: any = {}
    for (const key in obj) {
      cleaned[key] = removeEmojis(obj[key])
    }
    return cleaned
  }
  return obj
}

function generateRuleBasedAnalysis(
  journals: any[],
  tradeStats: any,
  emotionCounts: Record<string, number>,
  emotionPerformance: Record<string, { trades: number, totalPnL: number }>,
  tradeNotes: any[] = []
) {
  const winRate = tradeStats.totalTrades > 0 
    ? (tradeStats.winningTrades / tradeStats.totalTrades) * 100 
    : 0

  // Find best and worst emotions
  const emotionsWithPerf = Object.entries(emotionPerformance)
    .filter(([_, perf]) => perf.trades > 0)
    .map(([emotion, perf]) => ({
      emotion,
      avgPnL: perf.totalPnL / perf.trades,
      trades: perf.trades
    }))
    .sort((a, b) => b.avgPnL - a.avgPnL)

  const bestEmotion = emotionsWithPerf[0]
  const worstEmotion = emotionsWithPerf[emotionsWithPerf.length - 1]

  const summary = `Based on your ${tradeStats.totalTrades} trades${tradeNotes.length > 0 ? ` (${tradeNotes.length} with detailed notes)` : ''} and ${journals.length} journal entries, you have a ${winRate.toFixed(1)}% win rate with a total P&L of $${tradeStats.totalPnL.toFixed(2)}. ${
    bestEmotion ? `Your best performance occurs when feeling ${bestEmotion.emotion} (avg: $${bestEmotion.avgPnL.toFixed(2)} per trade).` : ''
  } ${
    journals.length > 5 || tradeNotes.length > 10 ? 'Your consistent documentation shows good self-awareness and discipline.' : 'More consistent journaling and trade notes could provide deeper insights into your trading patterns.'
  }`

  const emotionalPatterns = []
  if (bestEmotion && worstEmotion) {
    emotionalPatterns.push(`Best performance when ${bestEmotion.emotion}: $${bestEmotion.avgPnL.toFixed(2)} avg per trade`)
    emotionalPatterns.push(`Challenging performance when ${worstEmotion.emotion}: $${worstEmotion.avgPnL.toFixed(2)} avg per trade`)
  }
  if (emotionCounts['anxious'] && emotionCounts['anxious'] > 3) {
    emotionalPatterns.push(`Frequent anxiety noted (${emotionCounts['anxious']} days) - may indicate overtrading or position sizing issues`)
  }
  if (emotionCounts['confident'] && emotionPerformance['confident']) {
    emotionalPatterns.push(`Confidence correlates with ${emotionPerformance['confident'].trades} trades averaging $${(emotionPerformance['confident'].totalPnL / emotionPerformance['confident'].trades).toFixed(2)}`)
  }

  const performanceInsights = []
  if (winRate >= 60) {
    performanceInsights.push(`Strong win rate of ${winRate.toFixed(1)}% indicates good trade selection`)
  } else if (winRate < 40) {
    performanceInsights.push(`Win rate of ${winRate.toFixed(1)}% suggests need to refine entry criteria or risk management`)
  }
  
  if (tradeStats.totalPnL > 0) {
    performanceInsights.push(`Net positive P&L of $${tradeStats.totalPnL.toFixed(2)} shows overall profitability`)
  } else {
    performanceInsights.push(`Net negative P&L indicates need for strategy adjustment`)
  }

  if (tradeStats.totalTrades > 0) {
    performanceInsights.push(`Average P&L per trade: $${tradeStats.averagePnL.toFixed(2)}`)
  }

  const strengths = []
  if (journals.length >= 10 || tradeNotes.length >= 15) {
    strengths.push('Consistent documentation habit demonstrates discipline and self-awareness')
  }
  if (tradeNotes.length > 0) {
    strengths.push(`Detailed trade notes on ${tradeNotes.length} trades show commitment to improvement`)
  }
  if (winRate >= 50) {
    strengths.push('Positive win rate shows effective trade selection')
  }
  if (tradeStats.totalPnL > 0) {
    strengths.push('Net profitable trading over the analyzed period')
  }
  if (Object.keys(emotionCounts).length >= 5) {
    strengths.push('Good emotional awareness and tracking')
  }

  const weaknesses = []
  if (journals.length < 5 && tradeStats.totalTrades > 10) {
    weaknesses.push('Inconsistent journaling relative to trading frequency')
  }
  if (winRate < 45) {
    weaknesses.push('Low win rate may indicate need for better entry criteria')
  }
  if (worstEmotion && worstEmotion.avgPnL < -50) {
    weaknesses.push(`Poor performance when ${worstEmotion.emotion} - avoid trading in this state`)
  }

  const recommendations = []
  if (bestEmotion) {
    recommendations.push(`Focus on trading when feeling ${bestEmotion.emotion} - your best performance state`)
  }
  if (worstEmotion && worstEmotion.avgPnL < 0) {
    recommendations.push(`Avoid trading or reduce position size when ${worstEmotion.emotion}`)
  }
  if (journals.length < 10) {
    recommendations.push('Increase journaling frequency to identify more patterns')
  }
  recommendations.push('Review journal entries before trading to build self-awareness')
  recommendations.push('Set specific trading rules for different emotional states')

  return {
    summary,
    emotionalPatterns: emotionalPatterns.slice(0, 5),
    performanceInsights: performanceInsights.slice(0, 5),
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    recommendations: recommendations.slice(0, 5)
  }
}

