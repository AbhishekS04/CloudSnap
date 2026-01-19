import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '1000mb',
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
// export default withPWA(nextConfig);
