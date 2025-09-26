'use client'

import { motion } from 'framer-motion'
import { BacktestingDashboard } from '@/components/backtesting'
import { sampleBacktestingData } from '@/components/backtesting/demo-data'

export default function BacktestingPage() {
  return (
    <motion.div
      className="w-full p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Backtesting</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive backtesting analytics and performance metrics
          </p>
        </div>
      </div>

      {/* Backtesting Dashboard */}
      <BacktestingDashboard data={sampleBacktestingData} />
    </motion.div>
  )
}
