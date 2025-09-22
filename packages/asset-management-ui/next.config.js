/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Local-only architecture - API endpoints
  async rewrites() {
    return [
      {
        source: '/api/assets/:path*',
        destination: 'http://localhost:3003/api/assets/:path*',
      },
      {
        source: '/api/search/:path*',
        destination: 'http://localhost:3003/api/search/:path*',
      },
      {
        source: '/api/collaboration/:path*',
        destination: 'http://localhost:3003/api/collaboration/:path*',
      },
    ];
  },

  // Image optimization configuration
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 3600,
  },

  // Webpack configuration for asset management
  webpack: (config, { isServer }) => {
    // File loader for asset files
    config.module.rules.push({
      test: /\.(pdf|doc|docx|xls|xlsx)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/files/',
          outputPath: 'static/files/',
        },
      },
    });

    return config;
  },

  // Environment variables
  env: {
    ASSET_MANAGEMENT_API_URL: process.env.ASSET_MANAGEMENT_API_URL || 'http://localhost:3003',
    WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'ws://localhost:3003',
  },

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@heroicons/react'],
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;