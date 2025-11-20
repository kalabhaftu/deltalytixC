import { prisma } from '../lib/prisma'

/**
 * Diagnostic script to check if chartLinks, timeframes, orderType, etc. are saved in the database
 */

async function checkTradeFields() {
  try {
    console.log('🔍 Checking trade fields in database...\n')

    // Get a recent trade with all fields
    const recentTrade = await prisma.trade.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        instrument: true,
        entryDate: true,
        // Timeframes
        biasTimeframe: true,
        narrativeTimeframe: true,
        driverTimeframe: true,
        entryTimeframe: true,
        structureTimeframe: true,
        // Other new fields
        orderType: true,
        chartLinks: true,
        marketBias: true,
        newsDay: true,
        selectedNews: true,
        newsTraded: true,
      }
    })

    if (!recentTrade) {
      console.log('❌ No trades found in database')
      return
    }

    console.log('✅ Most recent trade found:')
    console.log(`ID: ${recentTrade.id}`)
    console.log(`Instrument: ${recentTrade.instrument}`)
    console.log(`Entry Date: ${recentTrade.entryDate}`)
    console.log('\n📊 Timeframe Fields:')
    console.log(`  biasTimeframe: ${recentTrade.biasTimeframe || 'NULL'}`)
    console.log(`  narrativeTimeframe: ${recentTrade.narrativeTimeframe || 'NULL'}`)
    console.log(`  driverTimeframe: ${recentTrade.driverTimeframe || 'NULL'}`)
    console.log(`  entryTimeframe: ${recentTrade.entryTimeframe || 'NULL'}`)
    console.log(`  structureTimeframe: ${recentTrade.structureTimeframe || 'NULL'}`)
    
    console.log('\n🔗 Chart Links:')
    console.log(`  chartLinks: ${recentTrade.chartLinks || 'NULL'}`)
    if (recentTrade.chartLinks) {
      const links = recentTrade.chartLinks.split(',')
      console.log(`  Parsed (${links.length} links):`)
      links.forEach((link, i) => console.log(`    ${i + 1}. ${link}`))
    }

    console.log('\n📋 Other Fields:')
    console.log(`  orderType: ${recentTrade.orderType || 'NULL'}`)
    console.log(`  marketBias: ${recentTrade.marketBias || 'NULL'}`)
    console.log(`  newsDay: ${recentTrade.newsDay}`)
    console.log(`  selectedNews: ${recentTrade.selectedNews || 'NULL'}`)
    console.log(`  newsTraded: ${recentTrade.newsTraded}`)

    // Check all trades with chartLinks
    console.log('\n🔎 Checking all trades with chart links...')
    const tradesWithLinks = await prisma.trade.findMany({
      where: {
        chartLinks: {
          not: null
        }
      },
      select: {
        id: true,
        instrument: true,
        chartLinks: true,
        entryDate: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    if (tradesWithLinks.length === 0) {
      console.log('❌ No trades found with chart links')
    } else {
      console.log(`✅ Found ${tradesWithLinks.length} trade(s) with chart links:`)
      tradesWithLinks.forEach((trade, i) => {
        console.log(`\n${i + 1}. ${trade.instrument} (${trade.entryDate})`)
        console.log(`   ID: ${trade.id}`)
        console.log(`   Links: ${trade.chartLinks}`)
      })
    }

    // Check trades with timeframes
    console.log('\n⏱️  Checking all trades with timeframes...')
    const tradesWithTimeframes = await prisma.trade.findMany({
      where: {
        OR: [
          { biasTimeframe: { not: null } },
          { narrativeTimeframe: { not: null } },
          { driverTimeframe: { not: null } },
          { entryTimeframe: { not: null } },
          { structureTimeframe: { not: null } },
        ]
      },
      select: {
        id: true,
        instrument: true,
        entryDate: true,
        biasTimeframe: true,
        narrativeTimeframe: true,
        driverTimeframe: true,
        entryTimeframe: true,
        structureTimeframe: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    if (tradesWithTimeframes.length === 0) {
      console.log('❌ No trades found with timeframes')
    } else {
      console.log(`✅ Found ${tradesWithTimeframes.length} trade(s) with timeframes:`)
      tradesWithTimeframes.forEach((trade, i) => {
        console.log(`\n${i + 1}. ${trade.instrument} (${trade.entryDate})`)
        console.log(`   ID: ${trade.id}`)
        console.log(`   Bias: ${trade.biasTimeframe || '-'}, Narrative: ${trade.narrativeTimeframe || '-'}, Driver: ${trade.driverTimeframe || '-'}`)
        console.log(`   Entry: ${trade.entryTimeframe || '-'}, Structure: ${trade.structureTimeframe || '-'}`)
      })
    }

    // Check the specific trade from the screenshot
    console.log('\n🎯 Checking the specific trade from screenshot (US100 SELL)...')
    const us100Trade = await prisma.trade.findFirst({
      where: {
        instrument: {
          contains: 'US100',
          mode: 'insensitive'
        },
        side: 'SELL'
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        instrument: true,
        entryDate: true,
        biasTimeframe: true,
        narrativeTimeframe: true,
        driverTimeframe: true,
        entryTimeframe: true,
        structureTimeframe: true,
        orderType: true,
        chartLinks: true,
        marketBias: true,
      }
    })

    if (us100Trade) {
      console.log('✅ Found US100 SELL trade:')
      console.log(`   ID: ${us100Trade.id}`)
      console.log(`   Entry Date: ${us100Trade.entryDate}`)
      console.log(`   Timeframes: Bias=${us100Trade.biasTimeframe}, Narrative=${us100Trade.narrativeTimeframe}, Driver=${us100Trade.driverTimeframe}, Entry=${us100Trade.entryTimeframe}, Structure=${us100Trade.structureTimeframe}`)
      console.log(`   Order Type: ${us100Trade.orderType || 'NULL'}`)
      console.log(`   Market Bias: ${us100Trade.marketBias || 'NULL'}`)
      console.log(`   Chart Links: ${us100Trade.chartLinks || 'NULL'}`)
    } else {
      console.log('❌ US100 SELL trade not found')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTradeFields()

