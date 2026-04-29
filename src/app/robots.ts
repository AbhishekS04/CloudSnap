import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/_next/'],
      },
      {
        userAgent: ['Googlebot', 'OAI-SearchBot', 'Applebot-Extended', 'cohere-ai', 'anthropic-ai', 'Bytespider'],
        allow: '/',
      }
    ],
    sitemap: 'https://cloud-snapp.vercel.app/sitemap.xml',
  };
}
