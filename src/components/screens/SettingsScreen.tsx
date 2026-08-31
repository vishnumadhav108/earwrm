"use client";

import { C, TOP } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { BackButton, Chevron, Overlay } from "../ui";
import type { Settings } from "@/lib/types";

const PREFS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: "privateDiary", label: "Private diary", hint: "Keep every log and review visible to you only." },
  { key: "halfStars", label: "Half-star ratings", hint: "Tap the left half of a star for .5 increments." },
  { key: "autoQueue", label: "Clear from queue on log", hint: "Logging an album removes it from the queue automatically." },
  { key: "recap", label: "Weekly recap", hint: "A Sunday summary of what you logged that week." },
];

export function SettingsScreen({
  email, onBack, onProfile, onAskDeleteAccount,
}: { email: string; onBack: () => void; onProfile: () => void; onAskDeleteAccount: () => void }) {
  const { profile, settings, setSettings, signOut } = useStore();
  const name = profile.displayName || profile.username || "You";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "··";

  const accountRows = [
    { label: "Username", value: `@${profile.username || "you"}` },
    { label: "Display name", value: name },
    { label: "Email", value: email || "—" },
    { label: "Password", value: "Change" },
  ];

  return (
    <Overlay>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, padding: `${TOP}px 16px 10px` }}>
        <BackButton onClick={onBack} style={{ marginLeft: -6 }} />
        <div style={{ font: "600 15px/1 inherit", letterSpacing: "-.02em" }}>Settings</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, borderBottom: `1px solid ${C.w05}` }}>
          <div
            style={{
              flex: "none", width: 42, height: 42, borderRadius: "50%", background: "#1d1d21",
              border: `1px solid ${C.w12}`, display: "flex", alignItems: "center", justifyContent: "center",
              font: "500 13px/1 inherit", letterSpacing: ".04em", color: C.w72,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "600 14.5px/1.2 inherit", letterSpacing: "-.015em" }}>{name}</div>
            <div style={{ marginTop: 3, font: "400 12px/1 inherit", color: C.w38 }}>@{profile.username || "you"}</div>
          </div>
          <button
            onClick={onProfile}
            style={{ flex: "none", height: 29, padding: "0 12px", borderRadius: 5, border: `1px solid ${C.w16}`, font: "500 12px/1 inherit", color: C.w80 }}
          >
            View profile
          </button>
        </div>

        <div style={{ margin: "20px 0 4px", font: "500 10px/1 inherit", letterSpacing: ".2em", color: C.w30 }}>ACCOUNT</div>
        {accountRows.map((a) => (
          <div
            key={a.label}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: `1px solid ${C.w05}`, textAlign: "left" }}
          >
            <div style={{ flex: 1, minWidth: 0, font: "500 13.5px/1.3 inherit" }}>{a.label}</div>
            <div style={{ flex: "none", font: "400 13px/1.3 inherit", color: C.w40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>
              {a.value}
            </div>
            <Chevron dir="right" size={15} color="rgba(255,255,255,.28)" />
          </div>
        ))}

        <div style={{ margin: "24px 0 4px", font: "500 10px/1 inherit", letterSpacing: ".2em", color: C.w30 }}>PREFERENCES</div>
        {PREFS.map((r) => {
          const on = settings[r.key];
          return (
            <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 0", borderBottom: `1px solid ${C.w05}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "500 14px/1.3 inherit" }}>{r.label}</div>
                <div style={{ marginTop: 3, font: "400 12px/1.4 inherit", color: C.w38, textWrap: "pretty" }}>{r.hint}</div>
              </div>
              <button
                onClick={() => setSettings({ [r.key]: !on })}
                role="switch"
                aria-checked={on}
                aria-label={r.label}
                style={{
                  flex: "none", width: 46, height: 28, borderRadius: 14, padding: 3, display: "flex",
                  justifyContent: on ? "flex-end" : "flex-start",
                  background: on ? C.accent : C.w14, transition: "background .18s",
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff" }} />
              </button>
            </div>
          );
        })}

        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 26 }}>
          <button
            onClick={() => void signOut()}
            style={{ height: 39, borderRadius: 5, border: `1px solid ${C.w16}`, font: "600 13.5px/1 inherit", color: C.w88 }}
          >
            Log out
          </button>
          <button
            onClick={onAskDeleteAccount}
            style={{ height: 39, borderRadius: 5, border: `1px solid ${C.dangerBorderSoft}`, font: "500 13.5px/1 inherit", color: C.danger }}
          >
            Delete account
          </button>
        </div>
        <div style={{ marginTop: 22, font: "400 11px/1.6 inherit", color: C.w24 }}>earwrm v0.1 · prototype build</div>
      </div>
    </Overlay>
  );
}
