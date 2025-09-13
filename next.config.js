/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase body size limit for Server Actions (for image uploads)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increased from default 1MB to 10MB
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
  // Disable source maps in development to reduce memory usage
  productionBrowserSourceMaps: false,
}

// Increase event emitter max listeners to prevent warnings
if (typeof process !== 'undefined') {
  process.setMaxListeners(20)
}

module.exports = nextConfig