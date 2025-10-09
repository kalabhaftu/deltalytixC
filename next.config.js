/** @type {import('next').NextConfig} */
const baseExperimental = {
  serverActions: {
    bodySizeLimit: '10mb', // Increased from default 1MB to 10MB
  },
  // Optimized Turbopack configuration with additional optimizations
  turbo: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
    // Enable Turbopack optimizations for faster compilation
    resolveAlias: {
      // Optimize common dependencies
      'react': 'react',
      'react-dom': 'react-dom',
    },
  },
}

const nextConfig = {
  // Increase body size limit for Server Actions (for image uploads)
  experimental: process.env.VERCEL ? {
    ...baseExperimental,
    clientReferenceManifest: true,
    serverComponentsExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  } : baseExperimental,
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Fallback for when external images/CDNs are unavailable
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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

    // Vercel-specific webpack optimizations
    if (process.env.VERCEL && !dev && isServer) {
      config.optimization = {
        ...config.optimization,
        providedExports: true,
      }
    }

    return config
  },

  // Ensure proper file generation
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },

  // Vercel-specific configuration
  trailingSlash: false,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
}

// Increase event emitter max listeners to prevent warnings
if (typeof process !== 'undefined') {
  process.setMaxListeners(20)
}

module.exports = nextConfig