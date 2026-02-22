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
      <a href="/dashboard" className="flex flex-col items-center gap-1 group relative px-5 py-1.5">
        <div
          className="w-7 h-7 flex items-center justify-center transition-all duration-300"
          style={{
            opacity: active === "home" ? 1 : 0.3,
            filter: active === "home" ? "drop-shadow(0 0 8px rgba(255,255,255,0.9))" : "none",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="text-white" />
            <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="text-white" />
          </svg>
        </div>
        <span
          className="text-[10px] font-medium tracking-widest uppercase transition-all duration-300"
          style={{ color: active === "home" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)" }}
        >
          Home
        </span>
        {active === "home" && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white"
            style={{ boxShadow: "0 0 6px 2px rgba(255,255,255,0.7)" }} />
        )}
      </a>

      <a href="/discover" className="flex flex-col items-center gap-1 group relative px-5 py-1.5">
        <div
          className="transition-all duration-300"
          style={{
            opacity: active === "discover" ? 1 : 0.3,
            filter: active === "discover" ? "drop-shadow(0 0 8px rgba(196,168,240,0.9))" : "none",
          }}
        >
          <VinylLogo size={28} />
        </div>
        <span
          className="text-[10px] font-medium tracking-widest uppercase transition-all duration-300"
          style={{ color: active === "discover" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)" }}
        >
          Discover
        </span>
        {active === "discover" && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
            style={{ background: "rgba(196,168,240,1)", boxShadow: "0 0 6px 2px rgba(196,168,240,0.8)" }} />
        )}
      </a>
    </nav>
  );
}
