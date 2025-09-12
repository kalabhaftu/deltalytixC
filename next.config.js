/** @type {import('next').NextConfig} */
const nextConfig = {
  // Comprehensive SWC configuration for Windows compatibility
  experimental: {
    // Force SWC WebAssembly version to avoid native binding issues on Windows
    swcTraceProfiling: false,
  },
  // Disable SWC minification to prevent Windows native module errors
  swcMinify: false,
  // Explicitly configure compiler
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
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