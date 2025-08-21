# Performance Optimization Guide

## 🚀 Development Performance Tips

### Quick Commands
```bash
# Standard development with Turbopack (recommended)
npm run dev

# Fastest development mode with memory optimization
npm run dev:fast

# Fallback to standard webpack if Turbopack has issues
npm run dev:webpack

# Stable development mode (same as webpack)
npm run dev:stable

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
1. **Use `npm run dev`** - Uses Turbopack for faster bundling
2. **Use `npm run dev:fast`** - For high memory optimization
3. **Close unused browser tabs** - Reduces memory pressure
4. **Disable telemetry** - Less background processing (via environment variables)

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
1. Stop dev server: `Ctrl+C` in terminal
2. Clear cache: `npm run clean`
3. Restart with: `npm run dev` (or `npm run dev:fast` for extra memory)
4. If Turbopack issues: Use `npm run dev:webpack` as fallback

### Memory Issues
1. Check Task Manager for memory usage
2. Close other applications
3. Use `npm run dev:fast` for 4GB memory allocation

### Turbopack Configuration Errors
1. If you see "unsupported" warnings, use `npm run dev:webpack`
2. Turbopack is stable in Next.js 15+ but some configs may not work
3. The configuration has been optimized for compatibility

### Slow TypeScript
1. Restart TS server in VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
2. Run `npm run type-check` to isolate issues
3. Check exclude patterns in tsconfig.json

## 📊 Performance Monitoring
- Use `npm run build:analyze` to see bundle sizes
- Monitor Task Manager during development
- Use browser dev tools Performance tab
