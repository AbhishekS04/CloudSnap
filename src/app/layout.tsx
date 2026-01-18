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

