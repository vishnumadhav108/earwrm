"use client";

import { useEffect, useState } from "react";
import { C, TOP } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { BackButton, Cover, Overlay, Stars, TypeBadge } from "../ui";
import type { Release, ReleaseDetail } from "@/lib/types";

/**
 * Community reviews are hidden: earwrm has one account per person and no way
 * for other listeners' reviews to exist yet. The prototype's REVIEWS section is
 * kept out rather than filled with invented people. Flip this to true once the
 * Social tab is real.
 */
const SHOW_COMMUNITY_REVIEWS = false;

export function ReleaseScreen({
  release, onBack, onOpenSheet, onEditLog,
}: { release: Release; onBack: () => void; onOpenSheet: () => void; onEditLog: () => void }) {
  const { entries, liked } = useStore();
  // Keyed by release id so navigating to another release shows no detail until
  // its own lookup lands, without resetting state from inside the effect.
  const [fetched, setFetched] = useState<{ id: string; detail: ReleaseDetail } | null>(null);
  const detail = fetched?.id === release.id ? fetched.detail : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/mb/release-group/${release.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setFetched({ id: release.id, detail: data.release as ReleaseDetail });
      } catch {
        // Detail is enrichment; the header already renders from cached metadata.
      }
    })();
    return () => { cancelled = true; };
  }, [release.id]);

  const mine = entries.find((e) => e.releaseId === release.id);
  const shown: Release = detail ?? release;

  const meta = [
    shown.year ?? null,
    detail?.label ?? null,
    detail?.tracks ? `${detail.tracks.length} TRACKS` : null,
  ].filter(Boolean).join(" · ");

  return (
    <Overlay>
      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${TOP}px 12px 6px` }}>
        <BackButton onClick={onBack} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 20px 44px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Cover release={shown} size={158} stripe={8} font={30} border={C.w10} />
          <div style={{ marginTop: 20, font: "600 20px/1.2 inherit", letterSpacing: "-.025em", textWrap: "pretty" }}>{shown.title}</div>
          <div style={{ marginTop: 6, font: "500 14px/1.3 inherit", color: C.w62 }}>{shown.artist}</div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            <TypeBadge type={shown.type} height={15} font={9} />
            {!!meta && <div style={{ font: "400 10.5px/1 inherit", letterSpacing: ".1em", color: C.w34 }}>{meta}</div>}
          </div>
          {!!detail?.blurb && (
            <div style={{ marginTop: 16, font: "400 13.5px/1.6 inherit", color: C.w55, textWrap: "pretty" }}>{detail.blurb}</div>
          )}
          <button
            onClick={onOpenSheet}
            title="Actions"
            aria-label="Actions"
            style={{
              marginTop: 20, width: 31, height: 31, borderRadius: "50%", border: `1px solid ${C.w28}`,
              background: "transparent", color: C.w80, display: "flex", alignItems: "center",
              justifyContent: "center", transition: "transform .14s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="6" x2="12" y2="18" /><line x1="6" y1="12" x2="18" y2="12" />
            </svg>
          </button>
        </div>

        {mine && (
          <div style={{ marginTop: 24, padding: 16, borderRadius: 5, background: C.w035, border: `1px solid ${C.w08}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ font: "500 10px/1 inherit", letterSpacing: ".2em", color: C.w45 }}>YOUR REVIEW</div>
            </div>
            <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 10 }}>
              {mine.rating > 0 && <Stars value={mine.rating} size={17} gap={2} />}
              {liked[release.id] && <span style={{ flex: "none", fontSize: 13, lineHeight: 1, color: C.accentLt }}>♥</span>}
            </div>
            {!!mine.review && (
              <div style={{ marginTop: 11, font: "400 14px/1.55 inherit", color: C.w82, textWrap: "pretty" }}>{mine.review}</div>
            )}
            <button
              onClick={onEditLog}
              style={{ width: "100%", height: 33, marginTop: 15, borderRadius: 10, border: `1px solid ${C.w16}`, font: "500 13px/1 inherit" }}
            >
              Edit
            </button>
          </div>
        )}

        {!!detail?.tracks?.length && (
          <div style={{ marginTop: 30 }}>
            <div style={{ font: "500 10px/1 inherit", letterSpacing: ".2em", color: C.w30, paddingBottom: 6 }}>TRACKLIST</div>
            {detail.tracks.map((t, i) => (
              <div key={`${i}-${t}`} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "9px 0", borderBottom: `1px solid ${C.w04}` }}>
                <div style={{ flex: "none", width: 18, font: "400 10.5px/1.4 inherit", color: C.w28 }}>
                  {i + 1 < 10 ? `0${i + 1}` : i + 1}
                </div>
                <div style={{ flex: 1, font: "400 13.5px/1.4 inherit", color: C.w78 }}>{t}</div>
              </div>
            ))}
          </div>
        )}

        {SHOW_COMMUNITY_REVIEWS && (
          <div style={{ marginTop: 32 }}>
            <div style={{ font: "500 10px/1 inherit", letterSpacing: ".2em", color: C.w30, paddingBottom: 10 }}>REVIEWS</div>
          </div>
        )}
      </div>
    </Overlay>
  );
}
