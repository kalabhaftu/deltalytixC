import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { BREAK_EVEN_THRESHOLD } from '@/lib/utils'

// GET - Generate AI analysis of journals and trades
export async function GET(request: Request) {
  try {
    const authUserId = await getUserId()
    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // getUserId() returns Supabase auth_user_id, but all data tables use internal user.id
    const user = await prisma.user.findUnique({
      where: { auth_user_id: authUserId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const internalUserId = user.id

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
      userId: internalUserId,
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
      userId: internalUserId,
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
        userId: internalUserId,
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

    // Fetch user's tags for context
    const userTags = await prisma.tradeTag.findMany({
      where: { userId: internalUserId },
      select: { id: true, name: true }
    })

    // Fetch user's trading models for context
    const tradingModels = await prisma.tradingModel.findMany({
      where: { userId: internalUserId },
      select: { id: true, name: true }
    })

    // Fetch weekly reviews for context
    const weeklyReviews = await prisma.weeklyReview.findMany({
      where: {
        userId: internalUserId,
        startDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      select: {
        startDate: true,
        expectation: true,
        actualOutcome: true,
        isCorrect: true,
        notes: true
      }
    })

    // Generate AI analysis
    const analysis = await generateAnalysis(journals, trades, propFirmAccounts, userTags, tradingModels, weeklyReviews)

    return NextResponse.json({ analysis })
  } catch (error) {
    // Error generating AI analysis
    return NextResponse.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    )
  }
}

async function generateAnalysis(journals: any[], trades: any[], propFirmAccounts: any[] = [], userTags: any[] = [], tradingModels: any[] = [], weeklyReviews: any[] = []) {
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
      pnl: t.pnl + (t.commission || 0),
      instrument: t.instrument,
      side: t.side,
      duration: t.closeDate ? (new Date(t.closeDate).getTime() - new Date(t.entryDate).getTime()) / 1000 / 60 : 0 // duration in minutes
    }))

  const tradeStats = {
    totalTrades: trades.length,
    winningTrades: trades.filter(t => (t.pnl + (t.commission || 0)) > BREAK_EVEN_THRESHOLD).length,
    losingTrades: trades.filter(t => (t.pnl + (t.commission || 0)) < -BREAK_EVEN_THRESHOLD).length,
    breakEvenTrades: trades.filter(t => Math.abs(t.pnl + (t.commission || 0)) <= BREAK_EVEN_THRESHOLD).length,
    totalPnL: trades.reduce((sum, t) => sum + t.pnl + (t.commission || 0), 0),
    averagePnL: trades.length > 0 ? trades.reduce((sum, t) => sum + t.pnl + (t.commission || 0), 0) / trades.length : 0,
    totalCommission: trades.reduce((sum, t) => sum + (t.commission || 0), 0),
    tradesWithNotes: tradeNotes.length
  }

  // Calculate profit factor
  const grossProfit = trades.filter(t => (t.pnl + (t.commission || 0)) > BREAK_EVEN_THRESHOLD).reduce((sum, t) => sum + t.pnl + (t.commission || 0), 0)
  const grossLoss = Math.abs(trades.filter(t => (t.pnl + (t.commission || 0)) < -BREAK_EVEN_THRESHOLD).reduce((sum, t) => sum + t.pnl + (t.commission || 0), 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

  // Calculate average win/loss
  const avgWin = tradeStats.winningTrades > 0 ? grossProfit / tradeStats.winningTrades : 0
  const avgLoss = tradeStats.losingTrades > 0 ? grossLoss / tradeStats.losingTrades : 0

  // P&L by instrument
  const pnlByInstrument: Record<string, { trades: number, pnl: number, wins: number }> = {}
  trades.forEach(t => {
    const netPnL = t.pnl + (t.commission || 0)
    if (!pnlByInstrument[t.instrument]) {
      pnlByInstrument[t.instrument] = { trades: 0, pnl: 0, wins: 0 }
    }
    pnlByInstrument[t.instrument].trades++
    pnlByInstrument[t.instrument].pnl += netPnL
    if (netPnL > BREAK_EVEN_THRESHOLD) pnlByInstrument[t.instrument].wins++
  })

  // Sort instruments by P&L
  const topInstruments = Object.entries(pnlByInstrument)
    .sort((a, b) => b[1].pnl - a[1].pnl)
    .slice(0, 5)

  // P&L by strategy (trading model)
  const pnlByStrategy: Record<string, { trades: number, pnl: number, wins: number }> = {}
  trades.forEach(t => {
    const strategy = (t as any).TradingModel?.name || 'No Strategy'
    const netPnL = t.pnl + (t.commission || 0)
    if (!pnlByStrategy[strategy]) {
      pnlByStrategy[strategy] = { trades: 0, pnl: 0, wins: 0 }
    }
    pnlByStrategy[strategy].trades++
    pnlByStrategy[strategy].pnl += netPnL
    if (netPnL > BREAK_EVEN_THRESHOLD) pnlByStrategy[strategy].wins++
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
    const netPnL = t.pnl + (t.commission || 0)
    pnlByWeekday[dayOfWeek].trades++
    pnlByWeekday[dayOfWeek].pnl += netPnL
  })

  // P&L by hour of day
  const pnlByHour: Record<number, { trades: number, pnl: number }> = {}
  trades.forEach(t => {
    const hour = new Date(t.entryDate).getHours()
    const netPnL = t.pnl + (t.commission || 0)
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
        (sum, t) => sum + t.pnl + (t.commission || 0),
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
      const netPnL = t.pnl + (t.commission || 0)
      biasPerformance[t.marketBias].trades++
      biasPerformance[t.marketBias].pnl += netPnL
      if (netPnL > BREAK_EVEN_THRESHOLD) biasPerformance[t.marketBias].wins++

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

  const newsDayPnL = trades.filter(t => t.newsDay).reduce((sum, t) => sum + t.pnl + (t.commission || 0), 0)
  const noNewsDayPnL = trades.filter(t => !t.newsDay).reduce((sum, t) => sum + t.pnl + (t.commission || 0), 0)

  const tradedDuringNewsPnL = trades.filter(t => t.newsDay && t.newsTraded).reduce((sum, t) => sum + t.pnl + (t.commission || 0), 0)
  const tradedBeforeAfterNewsPnL = trades.filter(t => t.newsDay && !t.newsTraded).reduce((sum, t) => sum + t.pnl + (t.commission || 0), 0)

  const newsDayWins = trades.filter(t => t.newsDay && (t.pnl + (t.commission || 0)) > BREAK_EVEN_THRESHOLD).length
  const newsDayLosses = trades.filter(t => t.newsDay && (t.pnl + (t.commission || 0)) < -BREAK_EVEN_THRESHOLD).length
  const newsDayWinRate = newsTradesStats.totalNewsDays > 0 ? (newsDayWins / newsTradesStats.totalNewsDays) * 100 : 0

  const noNewsDayWins = trades.filter(t => !t.newsDay && (t.pnl + (t.commission || 0)) > BREAK_EVEN_THRESHOLD).length
  const noNewsDayLosses = trades.filter(t => !t.newsDay && (t.pnl + (t.commission || 0)) < -BREAK_EVEN_THRESHOLD).length
  const noNewsDayWinRate = newsTradesStats.noNewsTraded > 0 ? (noNewsDayWins / newsTradesStats.noNewsTraded) * 100 : 0

  // Extract specific news events that were traded
  const newsEventsTrade: Record<string, { trades: number, pnl: number, wins: number, tradedDuring: number }> = {}
  trades.forEach(t => {
    if (t.newsDay && t.selectedNews) {
      const newsIds = t.selectedNews.split(',').filter(Boolean)
      const netPnL = t.pnl + (t.commission || 0)
      newsIds.forEach((newsId: string) => {
        if (!newsEventsTrade[newsId]) {
          newsEventsTrade[newsId] = { trades: 0, pnl: 0, wins: 0, tradedDuring: 0 }
        }
        newsEventsTrade[newsId].trades++
        newsEventsTrade[newsId].pnl += netPnL
        if (netPnL > BREAK_EVEN_THRESHOLD) newsEventsTrade[newsId].wins++
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
    const netPnL = t.pnl + (t.commission || 0)
    const isWin = netPnL > BREAK_EVEN_THRESHOLD

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
      const netPnL = t.pnl + (t.commission || 0)
      const isWin = netPnL > BREAK_EVEN_THRESHOLD
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
      const netPnL = t.pnl + (t.commission || 0)
      const isWin = netPnL > BREAK_EVEN_THRESHOLD

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

    const prompt = `You are a World-Class Trading Psychologist & Performance Coach (The "Top 1%" Mentor).
    You combine the sharp analytical skills of a quantitative researcher with the deep empathy of a supportive best friend.
    You have analyzed thousands of trader journals and know exactly how to spot hidden patterns, emotional leaks, and unexploited edges.
    
    YOUR MISSION:
    Go beyond surface-level observations. Dig deep into the data and journal entries to find the "Why" behind the results.
    Connect the dots between their emotional state (Journal), their behavior (Execution), and their results (P&L).
    Your goal is to provide specific, high-impact advice that will immediately improve their trading performance.
    
    TONE & DATA-DRIVEN FRIENDLINESS:
    - Be warm, energetic, and encouraging! (e.g., "I love seeing this consistency!", "Hey, we can fix this together.")
    - Use natural, conversational language. Speak like a human, not a robot.
    - Be direct but kind. If they are messing up, tell them gently but clearly.
    - EVERY claim you make is backed by their data. Cite their numbers!
    - NO DASHES or bullet points in the JSON strings. Use distinct sentences.
    
    ANALYSIS FRAMEWORK (The "Boss Level" Deep Dive):
    
    1. THE MENTAL GAME (Psychology & Tilt):
       - Scan for "Tilt Patterns": Do large losses follow specific emotions (Frustration, Anger)?
       - Look for "Confidence Traps": Do they trade too big after a win streak (Confidence)?
       - Correlate specific emotions to Win Rate and Avg P&L.
       
    2. THE EXECUTION EDGE (Time & Strategy):
       - Session Analysis: Are they burning money in the afternoon? (Common leak)
       - Order Types: Are they paying too much spread with Market orders?
       - Timeframes: Are they impatient on 1m charts but profitable on 15m?
       
    3. THE HIDDEN LEAKS (Risk Management):
       - Risk/Reward Skew: Is one bad trade wiping out 5 good ones?
       - News Trading: Are they gambling on CPI/NFP release prints?
       - Bias Drift: Are they trading Long when they said they are Bearish?
       
    4. THE "ONE THING" (Prioritization):
       - Identify the SINGLE most impactful change they can make right now.
    
    THE DATA (Study this carefully):
    
    **Time Period**: ${journals.length > 0 ? `${new Date(journals[0].date).toLocaleDateString()} to ${new Date(journals[journals.length - 1].date).toLocaleDateString()}` : 'No data'}
    
    **FUNDED ACCOUNT STATUS (Important Context)**:
    ${accountStatusSummary}
    ${propFirmAccounts.filter(acc => acc.status === 'failed').length > 0 ?
        `Note: There are some failed accounts in this period. Please address this sensitively and help identify lessons learned.` : ''}

    **USER'S TRADING SETUP**:
    Tags they use: ${userTags.length > 0 ? userTags.map(t => t.name).join(', ') : 'No custom tags'}
    Trading models/strategies: ${tradingModels.length > 0 ? tradingModels.map(m => m.name).join(', ') : 'No custom trading models'}

    **WEEKLY REVIEW INSIGHTS** (Their own market analysis):
    ${weeklyReviews.length > 0
        ? weeklyReviews.map(r =>
          `Week of ${new Date(r.startDate).toLocaleDateString()}: Expected ${r.expectation || 'not set'}, Actual ${r.actualOutcome || 'not set'}, ${r.isCorrect === true ? 'Correct prediction' : r.isCorrect === false ? 'Incorrect prediction' : 'Not evaluated'}${r.notes ? `. Notes: "${r.notes.slice(0, 100)}..."` : ''}`
        ).join('\n')
        : 'No weekly reviews recorded for this period'}

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
      "summary": "3 to 4 sentences. Acknowledge effort, address account status with empathy, then transition to specific psychological/performance critique. Use 'you' and be warm.",
      "emotionalPatterns": [
        "Pattern 1: Connect emotion (e.g. Frustration) to result (e.g. Larger losses). No dashes.",
        "Pattern 2: Observation about confidence or hesitation.",
        "Pattern 3: Comment on their journaling consistency."
      ],
      "performanceInsights": [
        "Insight 1: Specific P&L or Win Rate observation (e.g. 'You are printing money on NQ but giving it back on ES').",
        "Insight 2: Time of day or Session insight.",
        "Insight 3: Strategy or Bias alignment note."
      ],
      "strengths": [
        "Strength 1",
        "Strength 2"
      ],
      "weaknesses": [
        "Weakness 1 (Constructive)",
        "Weakness 2"
      ],
      "recommendations": [
        "Action 1 (Specific)",
        "Action 2",
        "Action 3",
        "Action 4"
      ]
    }

    TONE AND FORMATTING RULES:
    * Be warm, encouraging, and supportive like a trusted mentor
    * Use "you" and "your" throughout to make it personal
    * Celebrate wins and progress genuinely
    * Frame challenges as growth opportunities
    * CRITICAL: Do NOT use dashes or hyphens in your response (use commas, periods, or "to" instead)
    * Write in complete, flowing sentences
    * NO EMOJIS in the JSON values
    * If they have failed accounts, address it with empathy while providing actionable insights
    
    Now provide an analysis that will genuinely help this trader grow and succeed.`;

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
            content: `You are an elite, world-class trading mentor (Top 1% Performance Coach). 
            Your analysis is deep, specific, and data-driven.
            You connect emotional dots that the trader might miss.
            You use a warm, "Best Friend / Coach" persona.
            You NEVER use dashes or hyphens in your output text.
            Output ONLY valid JSON.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
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

  const summary = `Based on your ${tradeStats.totalTrades} trades${tradeNotes.length > 0 ? ` (${tradeNotes.length} with detailed notes)` : ''} and ${journals.length} journal entries, you have a ${winRate.toFixed(1)}% win rate with a total P&L of $${tradeStats.totalPnL.toFixed(2)}. ${bestEmotion ? `Your best performance occurs when feeling ${bestEmotion.emotion} (avg: $${bestEmotion.avgPnL.toFixed(2)} per trade).` : ''
    } ${journals.length > 5 || tradeNotes.length > 10 ? 'Your consistent documentation shows good self-awareness and discipline.' : 'More consistent journaling and trade notes could provide deeper insights into your trading patterns.'
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

