"use client";

import { VinylLogo } from "@/components/VinylLogo";

export function BottomNav({ active }: { active: "home" | "discover" | "songs" }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-6 pt-3 pb-safe"
      style={{
        background: "rgba(10,8,20,0.85)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(196,168,240,0.08)",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
      }}
    >
      {/* Home */}
      <a href="/dashboard" className="flex flex-col items-center gap-1 group relative px-4 py-1.5">
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

      {/* Discover */}
      <a href="/discover" className="flex flex-col items-center gap-1 group relative px-4 py-1.5">
        <div
          className="transition-all duration-300"
          style={{
            opacity: active === "discover" ? 1 : 0.3,
            filter: active === "discover" ? "drop-shadow(0 0 8px rgba(196,168,240,0.9))" : "none",
          }}
        >
          {/* Static when on discover page, animated otherwise */}
          <VinylLogo size={28} animated={active !== "discover"} />
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

      {/* Songs */}
      <a href="/songs" className="flex flex-col items-center gap-1 group relative px-4 py-1.5">
        <div
          className="w-7 h-7 flex items-center justify-center transition-all duration-300"
          style={{
            opacity: active === "songs" ? 1 : 0.3,
            filter: active === "songs" ? "drop-shadow(0 0 8px rgba(196,168,240,0.9))" : "none",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 21C12 21 4 15.5 4 9.5C4 7.01 5.79 5 8 5C9.5 5 10.84 5.82 12 7C13.16 5.82 14.5 5 16 5C18.21 5 20 7.01 20 9.5C20 15.5 12 21 12 21Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              className="text-white"
              fill={active === "songs" ? "rgba(196,168,240,0.3)" : "none"}
            />
          </svg>
        </div>
        <span
          className="text-[10px] font-medium tracking-widest uppercase transition-all duration-300"
          style={{ color: active === "songs" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)" }}
        >
          Songs
        </span>
        {active === "songs" && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
            style={{ background: "rgba(196,168,240,1)", boxShadow: "0 0 6px 2px rgba(196,168,240,0.8)" }} />
        )}
      </a>
    </nav>
  );
}
