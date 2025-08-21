# Performance Optimization Guide

## 🚀 Development Performance Tips

### Quick Commands
```bash
# Fastest development mode (recommended)
npm run dev:fast

# Standard development with turbo
npm run dev

# Clean cache if having issues
npm run clean

# Type check without running
npm run type-check

# Analyze bundle size
npm run build:analyze
```

### Environment Variables
Create `.env.development.local` with:
```env
NEXT_TELEMETRY_DISABLED=1
DISABLE_ESLINT_PLUGIN=true
FAST_REFRESH=true
NODE_OPTIONS="--max-old-space-size=4096"
TURBOPACK=true
```

### CPU Usage Reduction
1. **Use `npm run dev:fast`** - Uses optimized memory settings
2. **Close unused browser tabs** - Reduces memory pressure
3. **Use Turbopack** - Faster bundling (enabled by default)
4. **Disable telemetry** - Less background processing

### Memory Optimization
- Increased Node.js memory limit to 4GB
- TypeScript build info caching enabled
- Optimized webpack chunk splitting
- Reduced preload warnings

### Bundle Optimization
- Package imports optimized for major libraries
- SWC minification enabled
- Console removal in production
- Smaller chunk sizes to reduce load

## 🛠️ Troubleshooting

### High CPU Usage
1. Stop dev server: `Ctrl+C`
2. Clear cache: `npm run clean`
3. Restart with: `npm run dev:fast`

### Memory Issues
1. Check Task Manager for memory usage
2. Close other applications
3. Use `dev:fast` command for more memory

### Slow TypeScript
1. Restart TS server in VS Code
2. Run `npm run type-check` to isolate issues
3. Check exclude patterns in tsconfig.json

## 📊 Performance Monitoring
- Use `npm run build:analyze` to see bundle sizes
- Monitor Task Manager during development
- Use browser dev tools Performance tab
