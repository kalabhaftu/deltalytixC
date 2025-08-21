/** @type {import('next').NextConfig} */
const SuppressPreloadWarningsPlugin = require('./lib/suppress-preload-warnings.js')

const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'fhvmtnvjiotzztimdxbi.supabase.co',
      },
    ],
  },
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  experimental: {
    mdxRs: true,
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Optimize preloading to reduce warnings
    optimizePackageImports: ['@ai-sdk/openai', '@ai-sdk/react'],
    // Reduce preload warnings
    optimisticClientCache: false,
    // Disable aggressive preloading
    forceSwcTransforms: false,
  },
  webpack: (config, { dev, isServer }) => {
    // Fix webpack cache serialization warning
    if (dev) {
      // Suppress the specific warning about big strings
      config.infrastructureLogging = {
        ...config.infrastructureLogging,
        level: 'error',
        debug: false,
      }
      
      // Reduce module concatenation to prevent large strings
      if (config.optimization) {
        config.optimization.concatenateModules = false
      }

      // Reduce preload warnings by optimizing chunk loading
      config.resolve.alias = {
        ...config.resolve.alias,
        '@ai-sdk/openai': require.resolve('@ai-sdk/openai'),
        '@ai-sdk/react': require.resolve('@ai-sdk/react'),
      }

      // Disable aggressive preloading in development
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'async', // Only split async chunks to reduce preloading
      }
    }

    // Simple bundle optimization without aggressive splitting
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          maxSize: 250000, // Smaller chunks to reduce preload warnings
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              maxSize: 200000, // Limit vendor chunk size
            },
            common: {
              name: 'common',
              minChunks: 2,
              priority: -10,
              reuseExistingChunk: true,
              maxSize: 150000, // Limit common chunk size
            },
          },
        },
      }
    }

    // Add the preload warning suppression plugin
    config.plugins = config.plugins || []
    config.plugins.push(new SuppressPreloadWarningsPlugin())

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

module.exports = withMDX(nextConfig) 