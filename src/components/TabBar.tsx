"use client";

import { C } from "@/lib/theme";

export type Tab = "discover" | "social" | "log" | "library";

const ICONS: Record<Tab, React.ReactNode> = {
  discover: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.2" />
    </svg>
  ),
  social: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="9.4" cy="12" r="5.1" /><circle cx="15.2" cy="12" r="5.1" />
    </svg>
  ),
  log: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <line x1="8.5" y1="9" x2="15.5" y2="9" /><line x1="8.5" y1="13.5" x2="13" y2="13.5" />
    </svg>
  ),
  library: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="6" y1="18" x2="6" y2="10" /><line x1="12" y1="18" x2="12" y2="5" /><line x1="18" y1="18" x2="18" y2="13" />
    </svg>
  ),
};

function TabButton({ tab, label, active, onClick }: { tab: Tab; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        gap: 4, padding: "5px 0", color: active ? C.on : C.off,
      }}
    >
      {ICONS[tab]}
      <span style={{ font: "600 8px/1 inherit", letterSpacing: ".11em" }}>{label}</span>
    </button>
  );
}

export function TabBar({ tab, onTab, onAdd }: { tab: Tab; onTab: (t: Tab) => void; onAdd: () => void }) {
  return (
    <div
      style={{
        position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 40,
        padding: "0 4px var(--safe-b)", background: C.bg, borderTop: `1px solid ${C.w08}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", paddingTop: 6 }}>
        <TabButton tab="discover" label="DISCOVER" active={tab === "discover"} onClick={() => onTab("discover")} />
        <TabButton tab="social" label="SOCIAL" active={tab === "social"} onClick={() => onTab("social")} />
        <div style={{ flex: "none", width: 46, display: "flex", justifyContent: "center" }}>
          <button
            onClick={onAdd}
            aria-label="Search"
            style={{
              width: 31, height: 31, borderRadius: "50%", border: `1.5px solid ${C.accent}`,
              background: "transparent", display: "flex", alignItems: "center",
              justifyContent: "center", color: C.accentLt, transition: "transform .14s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="6" x2="12" y2="18" /><line x1="6" y1="12" x2="18" y2="12" />
            </svg>
          </button>
        </div>
        <TabButton tab="log" label="LOG" active={tab === "log"} onClick={() => onTab("log")} />
        <TabButton tab="library" label="LIBRARY" active={tab === "library"} onClick={() => onTab("library")} />
      </div>
    </div>
  );
}
