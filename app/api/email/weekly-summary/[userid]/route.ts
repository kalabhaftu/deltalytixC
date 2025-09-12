import { NextResponse } from "next/server"
import { headers } from 'next/headers'
import TraderStatsEmail from "@/components/emails/weekly-recap"
import MissingYouEmail from "@/components/emails/missing-data"
import { render } from "@react-email/render"
import { generateTradingAnalysis } from "./actions/analysis"
import { getUserData, computeTradingStats } from "./actions/user-data"
import { Resend } from "resend"

export async function POST(req: Request, props: { params: Promise<{ userid: string }> }) {
  const params = await props.params;
  try {
    // Verify that this is a legitimate request with the correct secret
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user data and compute stats
    const { user, trades } = await getUserData(params.userid)
    const stats = await computeTradingStats(trades, user.language)

    // If no trades, return missing you email data
    if (trades.length === 0) {
      const missingYouEmailHtml = await render(
        MissingYouEmail({
          firstName: 'trader', // Newsletter feature removed - using default name
          email: user.email,
          language: user.language
        })
      )

      return NextResponse.json({
        success: true,
        emailData: {
          from: 'Deltalytix <newsletter@eu.updates.deltalytix.app>',
          to: [user.email], // Newsletter feature removed - using user email
          replyTo: 'hugo.demenez@deltalytix.app',
          subject: user.language === 'fr' ? 'Nous manquons de vous voir sur Deltalytix' : 'We miss you on Deltalytix',
          html: missingYouEmailHtml
        }
      })
    }

    // Generate analysis using server action
    const analysis = await generateTradingAnalysis(
      stats.dailyPnL,
      'en'
    )

    // Ensure URL has protocol
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const apiUrl = baseUrl.startsWith('http') 
      ? baseUrl 
      : `http://${baseUrl}`

    const unsubscribeUrl = `${apiUrl}/api/email/unsubscribe?email=${encodeURIComponent(user.email)}`

    const weeklyStatsEmailHtml = await render(
      TraderStatsEmail({
        firstName: 'trader', // Newsletter feature removed - using default name
        dailyPnL: stats.dailyPnL,
        winLossStats: stats.winLossStats,
        email: user.email, // Newsletter feature removed - using user email
        resultAnalysisIntro: analysis.resultAnalysisIntro,
        tipsForNextWeek: analysis.tipsForNextWeek,
        language: user.language
      })
    )



    return NextResponse.json({
      success: true,
      emailData: {
        from: 'Deltalytix <newsletter@eu.updates.deltalytix.app>',
        to: [user.email],
        subject: user.language === 'fr' ? 'Vos statistiques de trading de la semaine 📈' : 'Your trading statistics for the week 📈',
        html: weeklyStatsEmailHtml,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
        replyTo: 'hugo.demenez@deltalytix.app'
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error', stack: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    )
  }
}
