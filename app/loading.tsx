"use client";

export default function Loading() {
  return (
    <div className="min-h-screen bg-wasika-dark flex flex-col items-center justify-center p-6">
      <div className="relative w-16 h-16">
        {/* Shimmer effect for Logo/Spinner */}
        <div className="absolute inset-0 border-4 border-wasika-gold/20 rounded-full animate-pulse" />
        <div className="absolute inset-0 border-4 border-t-wasika-gold rounded-full animate-spin" />
      </div>
      <p className="mt-4 text-wasika-gold font-serif text-lg animate-pulse">
        Memuat Warisan...
      </p>
    </div>
  );
}
