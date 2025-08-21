/** @type {import('next').NextConfig} */
const SuppressPreloadWarningsPlugin = require('./lib/suppress-preload-warnings.js')

// Bundle analyzer for optimization
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'fhvmtnvjiotzztimdxbi.supabase.co',
      },
    ],
  },
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  
  // Performance optimizations (swcMinify is deprecated in Next.js 15)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Turbopack configuration (stable in Next.js 15)
  experimental: {
    mdxRs: true,
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Turbopack configuration
    turbopack: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
    // Optimize preloading to reduce warnings
    optimizePackageImports: [
      '@ai-sdk/openai', 
      '@ai-sdk/react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@tanstack/react-table',
      'recharts',
      'lucide-react'
    ],
    // Reduce preload warnings
    optimisticClientCache: false,
    // Optimize CSS
    optimizeCss: true,
    // Memory optimizations for Next.js 15
    webpackMemoryOptimizations: true,
  },
  
  // Disable source maps in production for better performance
  productionBrowserSourceMaps: false,
  webpack: (config, { dev, isServer }) => {
    // Simplified webpack config for better Turbopack compatibility
    if (dev) {
      // Reduce console noise in development
      config.infrastructureLogging = {
        level: 'error',
      }
    }

    // Only apply optimizations for production webpack builds (not Turbopack)
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxSize: 250000,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
          },
        },
      }
    }

    // Add the preload warning suppression plugin (only for webpack, not Turbopack)
    if (!dev) {
      config.plugins = config.plugins || []
      config.plugins.push(new SuppressPreloadWarningsPlugin())
    }

    return config
  },
}

const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    // Remark and rehype plugins need to be imported dynamically
    // since they're ESM only
    remarkPlugins: [],  // We'll configure these in mdx.ts instead
    rehypePlugins: [],  // We'll configure these in mdx.ts instead
  },
})

module.exports = withBundleAnalyzer(withMDX(nextConfig)) 