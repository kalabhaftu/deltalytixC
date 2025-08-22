/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Fix for memory leak warnings
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      })
    }

    // Fix for punycode deprecation warning
    config.resolve.fallback = {
      ...config.resolve.fallback,
      punycode: false,
    }

    return config
  },
  // Disable source maps in development to reduce memory usage
  productionBrowserSourceMaps: false,
}

// Increase event emitter max listeners to prevent warnings
if (typeof process !== 'undefined') {
  process.setMaxListeners(20)
}

module.exports = nextConfig