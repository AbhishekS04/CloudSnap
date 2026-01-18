import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-slate-900">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900">
          Private <span className="text-blue-600">Image Hosting</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          High-performance image optimization driven by Sharp and Supabase.
          Crystal clear WebP conversion, auto-resizing, and zero-compromise quality.
        </p>

        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
          >
            Go to Dashboard <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
