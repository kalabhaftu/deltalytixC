/**
 * Webpack plugin to suppress preload warnings in development
 */

class SuppressPreloadWarningsPlugin {
  apply(compiler) {
    if (process.env.NODE_ENV !== 'development') {
      return // Only apply in development
    }

    compiler.hooks.done.tap('SuppressPreloadWarningsPlugin', (stats) => {
      if (stats.hasWarnings()) {
        // Filter out preload warnings
        stats.compilation.warnings = stats.compilation.warnings.filter(warning => {
          const warningString = warning.toString()
          return !warningString.includes('preload') && 
                 !warningString.includes('Serializing big strings')
        })
      }
    })

    // Also suppress console warnings
    const originalConsoleWarn = console.warn
    console.warn = function(...args) {
      const message = args.join(' ')
      if (message.includes('preload') || 
          message.includes('was preloaded using link preload') ||
          message.includes('Serializing big strings')) {
        return // Suppress these warnings
      }
      originalConsoleWarn.apply(console, args)
    }
  }
}

module.exports = SuppressPreloadWarningsPlugin
