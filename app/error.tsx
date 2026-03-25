"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log explicitly to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-wasika-dark flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-red-950/30 rounded-full flex items-center justify-center text-red-500 mb-6 border border-red-500/20 shadow-lg shadow-red-500/10">
        <AlertCircle size={32} />
      </div>
      
      <h1 className="text-2xl font-serif text-wasika-gold mb-3">
        Waduh! Sepertinya ada hambatan...
      </h1>
      
      <p className="text-wasika-text-muted mb-8 max-w-sm leading-relaxed">
        Maaf atas ketidaknyamanannya. Tim kami sedang meninjau silsilah ini. Coba segarkan halaman atau hubungi panitia.
      </p>

      <button
        onClick={() => reset()}
        className="flex items-center gap-2 bg-gradient-to-r from-wasika-copper to-wasika-gold text-wasika-brown-dark px-8 py-3.5 rounded-[11px] font-bold shadow-xl active:scale-95 transition-all"
      >
        <RotateCcw size={20} />
        COBA LAGI
      </button>
      
      <p className="mt-8 text-[10px] text-wasika-text-muted opacity-30 select-none">
        Error Digest: {error.digest || "none"}
      </p>
    </div>
  );
}
