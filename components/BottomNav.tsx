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
      <a href="/dashboard" className="flex flex-col items-center gap-1 group">
        <div style={{ opacity: active === "home" ? 1 : 0.35 }} className="transition-opacity group-hover:opacity-70">
          <VinylLogo size={28} />
        </div>
        <span
          className="text-[10px] font-medium tracking-widest uppercase transition-colors"
          style={{ color: active === "home" ? "rgba(196,168,240,0.9)" : "rgba(196,168,240,0.3)" }}
        >
          Home
        </span>
      </a>

      <a href="/discover" className="flex flex-col items-center gap-1 group">
        <div
          className="w-7 h-7 flex items-center justify-center transition-opacity"
          style={{ opacity: active === "discover" ? 1 : 0.35 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="text-white/60" />
            <path d="M10 8l6 4-6 4V8z" fill="currentColor" className="text-white/60" />
          </svg>
        </div>
        <span
          className="text-[10px] font-medium tracking-widest uppercase transition-colors"
          style={{ color: active === "discover" ? "rgba(196,168,240,0.9)" : "rgba(196,168,240,0.3)" }}
        >
          Discover
        </span>
      </a>
    </nav>
  );
}
