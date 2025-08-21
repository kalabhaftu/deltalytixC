import { NextRequest, NextResponse } from 'next/server'
import { aiUsageMonitor } from '@/lib/ai-usage-monitor'

export async function GET(req: NextRequest) {
  try {
    // Get model parameter from query string
    const { searchParams } = new URL(req.url)
    const model = searchParams.get('model')
    
    const stats = aiUsageMonitor.getStats(model || undefined)
    const mostReliable = aiUsageMonitor.getMostReliableModel()
    
    return NextResponse.json({
      stats,
      mostReliableModel: mostReliable,
      summary: {
        totalModels: stats.length,
        totalRequests: stats.reduce((sum, s) => sum + s.requestCount, 0),
        totalSuccesses: stats.reduce((sum, s) => sum + s.successCount, 0),
        totalFailures: stats.reduce((sum, s) => sum + s.failureCount, 0),
        totalTokensUsed: stats.reduce((sum, s) => sum + s.totalTokensUsed, 0)
      }
    })
  } catch (error) {
    console.error('Error fetching AI usage stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage stats' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    aiUsageMonitor.reset()
    return NextResponse.json({ message: 'Usage stats reset successfully' })
  } catch (error) {
    console.error('Error resetting AI usage stats:', error)
    return NextResponse.json(
      { error: 'Failed to reset usage stats' },
      { status: 500 }
    )
  }
}
