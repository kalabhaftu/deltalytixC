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

  // Ensure proper file generation
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },

  // Vercel-specific configuration
  ...(process.env.VERCEL && {
    // Force proper route group handling
    trailingSlash: false,
    // Ensure all pages are properly generated
    pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
    // Force static generation for route groups
    outputFileTracing: true,
    // Ensure proper build tracing
    experimental: {
      ...nextConfig.experimental,
      // Force client reference manifest generation
      clientReferenceManifest: true,
      // Enable proper route group handling
      serverComponentsExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
    },
    // Disable problematic features that might cause issues
    images: {
      ...nextConfig.images,
      // Ensure image optimization works properly
      unoptimized: false,
    },
    // Additional build optimizations
    webpack: (config, { dev, isServer }) => {
      // Ensure proper handling of route groups
      if (!dev && isServer) {
        config.optimization = {
          ...config.optimization,
          // Ensure proper module handling
          providedExports: true,
        }
      }
      return config
    },
  }),
}

// Increase event emitter max listeners to prevent warnings
if (typeof process !== 'undefined') {
  process.setMaxListeners(20)
}

module.exports = nextConfig