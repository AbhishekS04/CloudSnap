import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Raise the body limit for Next.js's internal proxy layer.
    // This is what caused "Request body exceeded 10MB" — the proxy buffers the body
    // BEFORE the route handler even runs. Must be >= your largest allowed upload.
    // Docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize
    proxyClientMaxBodySize: '200mb',

    // Raise the Server Actions body limit (used for form submissions via server actions).
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
  serverExternalPackages: [
    'fluent-ffmpeg',
    'ffmpeg-static',
    '@ffprobe-installer/ffprobe',
  ],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
      {
        source: '/api/cdn/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=31536000, stale-while-revalidate=59, immutable',
          },
        ],
      },
    ];
  },
};

// PWA configuration is disabled due to Webpack/Turbopack conflict
// Manual Service Worker is used instead via public/sw.js

export default nextConfig;
