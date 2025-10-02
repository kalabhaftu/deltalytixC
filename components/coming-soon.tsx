/**
 * Coming Soon Component
 * 
 * Professional placeholder for features in development
 */

import { motion } from 'framer-motion'
import { Rocket, Clock, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ComingSoonProps {
  title?: string
  description?: string
  className?: string
  estimatedDate?: string
}

export function ComingSoon({
  title = "Coming Soon",
  description = "We're working hard to bring you this feature. Stay tuned!",
  className,
  estimatedDate,
}: ComingSoonProps) {
  return (
    <div className={cn("flex items-center justify-center min-h-[600px] p-6", className)}>
      <Card className="max-w-2xl w-full border-2 border-dashed border-border/50 bg-muted/30">
        <CardContent className="p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center space-y-6"
          >
            {/* Icon Animation */}
            <motion.div
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <div className="absolute inset-0 blur-xl bg-gradient-to-r from-success/30 via-info/30 to-warning/30 rounded-full" />
              <Rocket className="h-24 w-24 text-primary relative z-10" />
            </motion.div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground">
                {title}
              </h2>
              <p className="text-muted-foreground text-lg max-w-md">
                {description}
              </p>
            </div>

            {/* Estimated Date */}
            {estimatedDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-full">
                <Clock className="h-4 w-4" />
                <span>Estimated: {estimatedDate}</span>
              </div>
            )}

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 w-full">
              <FeatureCard
                icon={<Sparkles className="h-5 w-5" />}
                title="Advanced Analytics"
                description="Deep insights into your trading"
              />
              <FeatureCard
                icon={<Rocket className="h-5 w-5" />}
                title="Real-time Data"
                description="Live market updates"
              />
              <FeatureCard
                icon={<Clock className="h-5 w-5" />}
                title="Historical Analysis"
                description="Comprehensive backtesting"
              />
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center text-center space-y-2 p-4 rounded-lg bg-card border border-border/50">
      <div className="text-success">{icon}</div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

