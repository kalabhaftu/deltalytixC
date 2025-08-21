/** @type {import('next').NextConfig} */
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
    }

    // Simple bundle optimization without aggressive splitting
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          maxSize: 300000, // Larger chunks to prevent CSS/JS parsing errors
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            common: {
              name: 'common',
              minChunks: 2,
              priority: -10,
              reuseExistingChunk: true,
            },
          },
        },
      }
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

module.exports = withMDX(nextConfig) 