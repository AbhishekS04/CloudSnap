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
  title: "CloudSnap",
  description: "Private High-Performance Asset Hosting by Abhishek Singh",
  manifest: "/manifest.json",
  icons: [
    { rel: "apple-touch-icon", url: "/icons/android-chrome-192x192.png" },
    { rel: "icon", url: "/icons/android-chrome-192x192.png" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CloudSnap",
  },
  formatDetection: {
    telephone: false,
  },
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
        <body className={`${outfit.className} bg-[#050505] text-zinc-100 antialiased`}>
          <UploadProvider>
            <SWRegistration />
            <Toaster position="top-right" />
            {children}
            <UploadFAB />
          </UploadProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

