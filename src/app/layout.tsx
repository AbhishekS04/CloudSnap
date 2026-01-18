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



import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";
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

export const metadata: Metadata = {
  title: "CloudSnap",
  description: "Private High-Performance Asset Hosting by Abhishek Singh",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${playfair.variable}`}>
        <body className={`${outfit.className} bg-[#050505] text-zinc-100 antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

