"use client";

import { VinylLogo } from "@/components/VinylLogo";

export function BottomNav({ active }: { active: "home" | "discover" }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-8 pt-3 pb-safe"
      style={{
        background: "rgba(10,8,20,0.85)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(196,168,240,0.08)",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
      }}
    >
      <a href="/dashboard" className="flex flex-col items-center gap-1 group relative px-5 py-1.5 rounded-2xl transition-all"
        style={active === "home" ? {
          background: "rgba(255,255,255,0.07)",
          boxShadow: "0 0 18px rgba(255,255,255,0.08)",
        } : {}}>
        <div className="w-7 h-7 flex items-center justify-center" style={{ opacity: active === "home" ? 1 : 0.35 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="text-white/70" />
            <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="text-white/70" />
          </svg>
        </div>
        <span
          className="text-[10px] font-medium tracking-widest uppercase"
          style={{ color: active === "home" ? "rgba(255,255,255,0.8)" : "rgba(196,168,240,0.3)" }}
        >
          Home
        </span>
      </a>

      <a href="/discover" className="flex flex-col items-center gap-1 group relative px-5 py-1.5 rounded-2xl transition-all"
        style={active === "discover" ? {
          background: "rgba(255,255,255,0.07)",
          boxShadow: "0 0 18px rgba(255,255,255,0.08)",
        } : {}}>
        <div style={{ opacity: active === "discover" ? 1 : 0.35 }}>
          <VinylLogo size={28} />
        </div>
        <span
          className="text-[10px] font-medium tracking-widest uppercase"
          style={{ color: active === "discover" ? "rgba(255,255,255,0.8)" : "rgba(196,168,240,0.3)" }}
        >
          Discover
        </span>
      </a>
    </nav>
  );
}
