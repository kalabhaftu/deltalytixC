'use client'

import { motion } from 'framer-motion'
import { TrendingUp, BarChart3, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
            Test your trading strategies with historical data
          </p>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="text-center">
          <CardHeader>
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Strategy Testing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Test your trading strategies against historical market data to evaluate performance.
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Performance Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Analyze detailed performance metrics including win rate, profit factor, and drawdown.
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Optimization Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Optimize your strategies with advanced parameter tuning and risk management tools.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card>
        <CardHeader>
          <CardTitle>Backtesting Engine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Backtesting Coming Soon
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              We're working on building a comprehensive backtesting engine.
              This feature will allow you to test trading strategies, analyze performance,
              and optimize your approach with historical data.
            </p>
            <div className="mt-6">
              <Button disabled>
                Start Backtesting
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
