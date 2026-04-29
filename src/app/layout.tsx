/*
__   __                                 _            _ _ _   _   _        _                 
\ \ / /                                | |          | (_) | | | | |      | |                
 \ V /___  _   _   ___ _ __   ___  __ _| | ___   _  | |_| |_| |_| | ___  | |__   ___  _   _ 
  \ // _ \| | | | / __| '_ \ / _ \/ _` | |/ / | | | | | | __| __| |/ _ \ | '_ \ / _ \| | | |
  | | (_) | |_| | \__ \ | | |  __/ (_| |   <| |_| | | | | |_| |_| |  __/ | |_) | (_) | |_| |
  \_/\___/ \__,_| |___/_| |_|\___|\__,_|_|\_\\__, | |_|_|\__|\__|_|\___| |_.__/ \___/ \__, |
                                              __/ |                                    __/ |
                                             |___/                                    |___/ 
*/



import type { Metadata, Viewport } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SWRegistration } from "@/components/SWRegistration";
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "CloudSnap | Private High-Performance Asset Hosting",
  description: "Secure, lightning-fast media and asset hosting platform built for developers. High-performance delivery with advanced optimization, powered by Abhishek Singh.",
  keywords: ["CloudSnap", "Asset Hosting", "Abhishek Singh", "Full Stack Developer", "Private Hosting", "Next.js", "Supabase", "Kolkata Developer"],
  authors: [{ name: "Abhishek Singh", url: "https://abhisheksingh.tech" }],
  creator: "Abhishek Singh",
  publisher: "Abhishek Singh",
  robots: "index, follow",
  manifest: "/manifest.json",
  icons: [
    { rel: "apple-touch-icon", url: "/icons/android-chrome-192x192.png" },
    { rel: "icon", url: "/icons/android-chrome-192x192.png" },
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://cloud-snapp.vercel.app",
    title: "CloudSnap | Private High-Performance Asset Hosting",
    description: "Secure, lightning-fast media and asset hosting platform. Powered by Abhishek Singh.",
    siteName: "CloudSnap",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CloudSnap - Private High-Performance Asset Hosting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CloudSnap | Private High-Performance Asset Hosting",
    description: "Secure media and asset hosting by Abhishek Singh.",
    creator: "@_abhishek2304",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CloudSnap",
  },
  formatDetection: {
    telephone: false,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "CloudSnap",
  "url": "https://cloud-snapp.vercel.app",
  "author": {
    "@type": "Person",
    "name": "Abhishek Singh",
    "jobTitle": "Full Stack Developer",
    "url": "https://abhisheksingh.tech",
    "sameAs": [
      "https://github.com/AbhishekS04",
      "https://www.linkedin.com/in/abhishek-singh-045312292",
      "https://x.com/_abhishek2304"
    ]
  },
  "description": "Private High-Performance Asset Hosting platform built by Abhishek Singh.",
};

import { UploadProvider } from "@/context/UploadContext";
import { UploadFAB } from "@/components/UploadFAB";
import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${playfair.variable}`}>
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </head>
        <body className={`${outfit.className} bg-[#050505] text-zinc-100 antialiased`}>
          <UploadProvider>
            <SWRegistration />
            <Toaster position="top-right" />
            {children}
            <UploadFAB />
            
            {/* Identity Verification (rel="me") */}
            <div className="sr-only" aria-hidden="true">
              <a href="https://github.com/AbhishekS04" rel="me">GitHub</a>
              <a href="https://www.linkedin.com/in/abhishek-singh-045312292" rel="me">LinkedIn</a>
              <a href="https://x.com/_abhishek2304" rel="me">Twitter</a>
              <a href="https://abhisheksingh.tech" rel="me">Portfolio</a>
            </div>
          </UploadProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

