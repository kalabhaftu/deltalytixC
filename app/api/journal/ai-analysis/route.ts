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
        account: {
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
        comment: true, // Trade notes
        tradingModel: true
      }
    })

    // Generate AI analysis
    const analysis = await generateAnalysis(journals, trades)

    return NextResponse.json({ analysis })
  } catch (error) {
    // Error generating AI analysis
    return NextResponse.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    )
  }
}

async function generateAnalysis(journals: any[], trades: any[]) {
  // Prepare data for AI
  const journalSummary = journals.map(j => ({
    date: j.date,
    emotion: j.emotion,
    note: j.note,
    account: j.account?.name || 'All Accounts'
  }))

  // Extract trade notes for analysis
  const tradeNotes = trades
    .filter(t => t.comment && t.comment.trim().length > 0)
    .map(t => ({
      date: t.entryDate,
      note: t.comment,
      pnl: t.pnl - (t.commission || 0),
      instrument: t.instrument,
      side: t.side
    }))

  const tradeStats = {
    totalTrades: trades.length,
    winningTrades: trades.filter(t => (t.pnl - (t.commission || 0)) > 0).length,
    losingTrades: trades.filter(t => (t.pnl - (t.commission || 0)) < 0).length,
    totalPnL: trades.reduce((sum, t) => sum + t.pnl - (t.commission || 0), 0),
    averagePnL: trades.length > 0 ? trades.reduce((sum, t) => sum + t.pnl - (t.commission || 0), 0) / trades.length : 0,
    tradesWithNotes: tradeNotes.length
  }

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

  // Call AI API (XAI/Grok)
  try {
    const apiKey = process.env.XAI_API_KEY
    const baseUrl = process.env.XAI_BASE_URL || 'https://api.x.ai/v1'
    const model = process.env.XAI_MODEL || 'grok-beta'

    if (!apiKey) {
      // Fallback to rule-based analysis if no API key
      return generateRuleBasedAnalysis(journalSummary, tradeStats, emotionCounts, emotionPerformance)
    }

    const prompt = `You are a professional trading psychology analyst. Analyze the following trading data and provide insights:

**Time Period**: ${journals.length > 0 ? `${new Date(journals[0].date).toLocaleDateString()} to ${new Date(journals[journals.length - 1].date).toLocaleDateString()}` : 'No data'}

**Trading Performance**:
- Total Trades: ${tradeStats.totalTrades}
- Winning Trades: ${tradeStats.winningTrades}
- Losing Trades: ${tradeStats.losingTrades}
- Total P&L: $${tradeStats.totalPnL.toFixed(2)}
- Win Rate: ${tradeStats.totalTrades > 0 ? ((tradeStats.winningTrades / tradeStats.totalTrades) * 100).toFixed(1) : 0}%

**Emotional States Tracked**:
${Object.entries(emotionCounts).map(([emotion, count]) => `- ${emotion}: ${count} days`).join('\n')}

**Performance by Emotional State**:
${Object.entries(emotionPerformance).map(([emotion, perf]) => 
  `- ${emotion}: ${perf.trades} trades, $${perf.totalPnL.toFixed(2)} P&L${perf.trades > 0 ? ` (avg: $${(perf.totalPnL / perf.trades).toFixed(2)})` : ''}`
).join('\n')}

**Daily Journal Entries** (sample):
${journalSummary.slice(0, 5).map(j => `- ${new Date(j.date).toLocaleDateString()}: ${j.emotion || 'No emotion'} - ${j.note.substring(0, 100)}${j.note.length > 100 ? '...' : ''}`).join('\n')}

**Trade Notes** (${tradeNotes.length} trades with notes):
${tradeNotes.slice(0, 10).map(t => `- ${new Date(t.date).toLocaleDateString()}: ${t.instrument} ${t.side} (P&L: $${t.pnl.toFixed(2)}) - ${t.note.substring(0, 80)}${t.note.length > 80 ? '...' : ''}`).join('\n')}

Provide a comprehensive analysis in JSON format with the following structure:
{
  "summary": "2-3 sentence overview of your trading psychology and performance",
  "emotionalPatterns": ["pattern 1", "pattern 2", "pattern 3"],
  "performanceInsights": ["insight 1", "insight 2", "insight 3"],
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Focus on:
1. Analyze BOTH daily journal entries AND individual trade notes
2. Correlation between emotions and trading performance
3. Patterns in successful vs unsuccessful trading days identified from trade notes
4. Psychological strengths and areas for improvement
5. Actionable recommendations for better trading psychology

IMPORTANT:
- Use second person ("you", "your") when addressing the trader
- DO NOT use emojis in your response
- Be professional and conversational`

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
            content: 'You are a professional trading psychology analyst. Provide insights in valid JSON format only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
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

