/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase body size limit for Server Actions (for image uploads)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increased from default 1MB to 10MB
    },
    // Optimized Turbopack configuration
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Disable source maps in development to reduce memory usage and compilation time
  productionBrowserSourceMaps: false,

  // Performance optimizations
  compiler: {
    // Remove console logs in production for better performance
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Optimize webpack cache (only applies when NOT using Turbopack)
  webpack: (config, { dev, isServer }) => {
    // Only apply webpack config when not using Turbopack
    if (dev && !process.env.TURBOPACK) {
      config.cache = {
        type: 'filesystem',
        maxMemoryGenerations: 1,
        cacheDirectory: '.next/cache/webpack',
      }
    }

    // Optimize for better performance
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      }
    }

    return config
  },
}

// Increase event emitter max listeners to prevent warnings
if (typeof process !== 'undefined') {
  process.setMaxListeners(20)
}

module.exports = nextConfig