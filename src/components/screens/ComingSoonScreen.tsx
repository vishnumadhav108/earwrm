"use client";

import { C, TOP_LOG } from "@/lib/theme";
import type { Tab } from "../TabBar";

const COPY: Record<string, { name: string; icon: React.ReactNode }> = {
  discover: {
    name: "Discover",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.4" />
      </svg>
    ),
  },
  social: {
    name: "Social",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
        <circle cx="9" cy="12" r="5.4" /><circle cx="15.6" cy="12" r="5.4" />
      </svg>
    ),
  },
  library: {
    name: "Library",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <line x1="6" y1="17" x2="6" y2="9" /><line x1="12" y1="17" x2="12" y2="5" /><line x1="18" y1="17" x2="18" y2="12" />
      </svg>
    ),
  },
};

export function ComingSoonScreen({
  tab, initials, onProfile, onBackToLog,
}: { tab: Tab; initials: string; onProfile: () => void; onBackToLog: () => void }) {
  const soon = COPY[tab] ?? COPY.discover;
  return (
    <div
      style={{
        height: "100%", display: "flex", flexDirection: "column",
        padding: `${TOP_LOG}px 20px 128px`, animation: "fadeIn .2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={onProfile}
          style={{
            width: 34, height: 34, borderRadius: "50%", background: "#1d1d21", border: `1px solid ${C.w12}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 500, fontSize: 11, lineHeight: 1, letterSpacing: ".04em", color: C.w72,
          }}
        >
          {initials}
        </button>
        <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1, letterSpacing: "-.03em", color: C.w92 }}>earwrm</div>
        <div style={{ width: 34, height: 34 }} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center" }}>
        <div
          style={{
            width: 76, height: 76, borderRadius: "50%", border: `1px solid ${C.w10}`, background: C.w03,
            display: "flex", alignItems: "center", justifyContent: "center", color: C.w42,
          }}
        >
          {soon.icon}
        </div>
        <div style={{ fontWeight: 600, fontSize: 22, lineHeight: 1.15, letterSpacing: "-.028em" }}>{soon.name}</div>
        <div style={{ fontWeight: 500, fontSize: 10, lineHeight: 1, letterSpacing: ".2em", color: C.w32 }}>COMING SOON</div>
        <button
          onClick={onBackToLog}
          style={{
            marginTop: 8, height: 33, padding: "0 20px", borderRadius: 5,
            border: `1px solid ${C.w16}`, fontWeight: 600, fontSize: 13, lineHeight: 1, color: "rgba(255,255,255,.85)",
          }}
        >
          Back to Log
        </button>
      </div>
    </div>
  );
}
