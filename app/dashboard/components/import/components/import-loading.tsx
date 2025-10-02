'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, BarChart3, LineChart, Activity, Zap, Target } from 'lucide-react'

const tradingQuotes = [
  {
    text: "The goal is to make money, not to be right.",
    author: "Alexander Elder"
  },
  {
    text: "Risk comes from not knowing what you're doing.",
    author: "Warren Buffett"
  },
  {
    text: "In trading, you have to be defensive and aggressive at the same time.",
    author: "Ray Dalio"
  },
  {
    text: "The market is a device for transferring money from the impatient to the patient.",
    author: "Warren Buffett"
  },
  {
    text: "Cut your losses short and let your winners run.",
    author: "Trading Wisdom"
  },
  {
    text: "The trend is your friend until it ends.",
    author: "Trading Proverb"
  },
  {
    text: "Plan your trade and trade your plan.",
    author: "Trading Discipline"
  },
  {
    text: "Markets can remain irrational longer than you can remain solvent.",
    author: "John Maynard Keynes"
  },
  {
    text: "Trading is not about being right. It's about making money.",
    author: "Mark Douglas"
  },
  {
    text: "The most important thing in trading is capital preservation.",
    author: "Paul Tudor Jones"
  },
  {
    text: "Don't focus on making money. Focus on protecting what you have.",
    author: "Paul Tudor Jones"
  },
  {
    text: "Every battle is won before it is fought.",
    author: "Sun Tzu"
  },
  {
    text: "Successful trading is about probability, not certainty.",
    author: "Trading Wisdom"
  },
  {
    text: "The best traders have no ego.",
    author: "Mark Minervini"
  },
  {
    text: "Time is your friend; impulse is your enemy.",
    author: "Jack Bogle"
  }
]

const icons = [TrendingUp, BarChart3, LineChart, Activity, Zap, Target]

export function ImportLoading() {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Rotate quotes every 4 seconds
    const quoteInterval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % tradingQuotes.length)
    }, 4000)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev // Don't go to 100% until actually done
        return prev + Math.random() * 3
      })
    }, 200)

    return () => {
      clearInterval(quoteInterval)
      clearInterval(progressInterval)
    }
  }, [])

  const currentQuote = tradingQuotes[currentQuoteIndex]
  const IconComponent = icons[currentQuoteIndex % icons.length]

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8 space-y-8">
      {/* Animated Icon */}
      <motion.div
        key={currentQuoteIndex}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20 
        }}
        className="relative"
      >
        <div className="absolute inset-0 blur-2xl opacity-50">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary via-blue-500 to-purple-500 animate-pulse" />
        </div>
        <motion.div
          animate={{ 
            rotate: 360,
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 backdrop-blur-sm border border-primary/30 flex items-center justify-center"
        >
          <IconComponent className="w-12 h-12 text-primary" />
        </motion.div>
      </motion.div>

      {/* Processing Text */}
      <div className="space-y-2 text-center">
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent"
        >
          Importing Your Trades
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted-foreground"
        >
          Analyzing and processing your trading data...
        </motion.p>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-md space-y-2">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <motion.p
          className="text-xs text-center text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {Math.round(progress)}% Complete
        </motion.p>
      </div>

      {/* Animated Quote */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuoteIndex}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl text-center space-y-3 relative"
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-blue-500/10 to-purple-500/10 blur-xl rounded-lg" />
          <blockquote className="relative text-lg font-medium italic text-foreground/90">
            &ldquo;{currentQuote.text}&rdquo;
          </blockquote>
          <cite className="relative text-sm text-muted-foreground not-italic">
            — {currentQuote.author}
          </cite>
        </motion.div>
      </AnimatePresence>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/20"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Processing Steps Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
        />
        <span>Checking for duplicates • Linking to account • Validating data</span>
      </motion.div>
    </div>
  )
}

