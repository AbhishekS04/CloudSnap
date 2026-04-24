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
};

// PWA configuration is disabled due to Webpack/Turbopack conflict
// Manual Service Worker is used instead via public/sw.js

export default nextConfig;
