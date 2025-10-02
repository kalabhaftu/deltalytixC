'use client'

import { motion } from 'framer-motion'
import { Rocket, Calendar, TrendingUp, BarChart3, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function BacktestingPage() {
  return (
    <motion.div
      className="w-full h-full flex items-center justify-center p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="max-w-2xl w-full p-12">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Icon */}
          <motion.div
            className="relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
            <div className="relative bg-primary/10 p-6 rounded-full">
              <Rocket className="h-16 w-16 text-primary" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-4xl font-bold text-foreground">
              Backtesting Coming Soon
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              We're building a powerful backtesting engine to help you validate your trading strategies.
            </p>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            className="grid grid-cols-2 gap-4 w-full mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {[
              { icon: Calendar, label: 'Historical Analysis' },
              { icon: TrendingUp, label: 'Performance Metrics' },
              { icon: BarChart3, label: 'Strategy Testing' },
              { icon: Clock, label: 'Time-based Backtests' },
            ].map((feature, index) => (
              <motion.div
                key={feature.label}
                className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/50"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <feature.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  {feature.label}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Status Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
            <span className="text-sm font-medium text-primary">In Development</span>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  )
}
