"use client";

import Link from "next/link";
import { ArrowRight, Box, Camera, Cloud, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] selection:bg-white/10 selection:text-white">
      {/* Background Radial Gradient */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center space-y-12 max-w-5xl"
        >
          {/* Main Heading */}
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-8xl md:text-9xl lg:text-[12rem] font-medium tracking-tighter leading-[0.8] text-white select-none">
              Cloud<span className="italic-display text-white/90">Snap</span>
            </h1>
            <span className="text-2xl md:text-3xl font-light text-zinc-500 font-display italic tracking-wide">
              The new standard.
            </span>
          </div>

          {/* Minimal CTA */}
          <div className="pt-12">
            <Link
              href="/dashboard"
              className="group relative inline-flex items-center gap-3 px-8 py-3 bg-white text-black rounded-full font-bold text-lg tracking-tight transition-all hover:scale-105 hover:bg-zinc-200"
            >
              <span>Enter Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer Decoration */}
      <div className="fixed bottom-10 left-10 hidden xl:block">
        <div className="text-[10px] font-medium tracking-widest text-zinc-700 vertical-text rotate-180 uppercase font-sans">
          CloudSnap v2.0 // EST 2026
        </div>
      </div>
    </div>
  );
}
