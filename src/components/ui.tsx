"use client";

import { useCallback, useRef, useState } from "react";
import { C } from "@/lib/theme";
import type { Release } from "@/lib/types";

/* --------------------------------------------------------------- ratings -- */

/** Splits a 0..5 rating into five fill percentages, as the prototype's `cells`. */
export const cells = (v: number) =>
  [1, 2, 3, 4, 5].map((i) => {
    const d = v - (i - 1);
    return { pct: d >= 1 ? "100%" : d >= 0.5 ? "50%" : "0%" };
  });

export function Stars({ value, size, gap = 1.5 }: { value: number; size: number; gap?: number }) {
  return (
    <div style={{ display: "flex", gap }}>
      {cells(value).map((s, i) => (
        <span
          key={i}
          style={{ position: "relative", display: "inline-block", fontSize: size, lineHeight: 1, color: "rgba(255,255,255,.16)" }}
        >
          ★
          <span
            style={{
              position: "absolute", left: 0, top: 0, overflow: "hidden",
              whiteSpace: "nowrap", color: C.accentLt, width: s.pct,
            }}
          >
            ★
          </span>
        </span>
      ))}
    </div>
  );
}

export function EmptyStars({ size, gap = 1.5 }: { size: number; gap?: number }) {
  return (
    <div style={{ display: "flex", gap }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ fontSize: size, lineHeight: 1, color: "rgba(255,255,255,.16)" }}>
          ☆
        </span>
      ))}
    </div>
  );
}

/**
 * Drag-to-rate. Pointer x across the row maps to half-star steps; dragging back
 * past the left edge clears to zero, matching the prototype's rateFromEvent.
 */
export function StarPicker({
  value, onChange, size, gap, halfStars = true,
}: { value: number; onChange: (v: number) => void; size: number; gap: number; halfStars?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const from = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = clientX - r.left;
    if (x <= 5) return onChange(0);
    const per = r.width / 5;
    const step = halfStars ? 2 : 1;
    let v = Math.ceil((x / per) * step) / step;
    v = Math.max(0, Math.min(5, v));
    if (v !== value) onChange(v);
  }, [onChange, value, halfStars]);

  return (
    <div
      ref={ref}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        from(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && from(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      style={{ display: "flex", gap, padding: "4px 0", touchAction: "none", cursor: "pointer" }}
    >
      {cells(value).map((s, i) => (
        <span
          key={i}
          style={{
            position: "relative", display: "inline-block", fontSize: size,
            lineHeight: 1, color: "rgba(255,255,255,.15)", pointerEvents: "none",
          }}
        >
          ★
          <span style={{ position: "absolute", left: 0, top: 0, overflow: "hidden", whiteSpace: "nowrap", color: C.accentLt, width: s.pct }}>
            ★
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * The prototype's like heart: the same outline the action sheet's LIKE icon
 * draws, filled purple for the "on" state that a row indicator always is.
 */
export const HEART_PATH =
  "M12 20.2C12 20.2 4.4 15.6 4.4 10.6A4.1 4.1 0 0 1 12 8.1a4.1 4.1 0 0 1 7.6 2.5c0 5-7.6 9.6-7.6 9.6z";

/**
 * `size` is the drawn height of the heart, so callers can match it to the ink
 * of the stars beside it. The viewBox is cropped to the path's own bounds —
 * the shape only fills the middle 15.24x14.1 of the icon set's 24-unit box —
 * so width and height describe the glyph rather than a box of mostly padding.
 */
export function Heart({ size }: { size: number }) {
  return (
    <svg
      width={size * (15.24 / 14.1)}
      height={size}
      viewBox="4.38 6.1 15.24 14.1"
      fill={C.accentLt}
      aria-hidden
      style={{ flex: "none", display: "block" }}
    >
      <path d={HEART_PATH} />
    </svg>
  );
}

/* ---------------------------------------------------------------- sleeve -- */

/**
 * The prototype only ever draws a striped monogram, because it had no real art.
 * Cover Art Archive coverage is patchy, so the stripes stay as the base layer
 * and real art fades in over them when the request succeeds.
 */
export function Cover({
  release, size, radius = 3, stripe, font, border = C.w08, fill = false,
}: { release: Release; size?: number; radius?: number; stripe: number; font: number; border?: string; fill?: boolean }) {
  // Track which release's art has loaded rather than resetting a boolean in an
  // effect, so switching release re-hides the image during the same render.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const loaded = loadedId === release.id;

  return (
    <div
      style={{
        flex: "none", width: fill ? "100%" : size, height: fill ? "100%" : size,
        borderRadius: radius, overflow: "hidden",
        position: "relative", border: `1px solid ${border}`,
        background: `repeating-linear-gradient(135deg,${release.c1} 0 ${stripe}px,${release.c2} ${stripe}px ${stripe * 2}px)`,
      }}
    >
      <div
        style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", fontWeight: 500, fontSize: font, lineHeight: 1, color: C.w38,
        }}
      >
        {release.initials}
      </div>
      {release.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={release.coverUrl}
          alt=""
          loading="lazy"
          key={release.id}
          onLoad={() => setLoadedId(release.id)}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", opacity: loaded ? 1 : 0, transition: "opacity .18s",
          }}
        />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- chrome -- */

export function TypeBadge({ type, height = 14, font = 8.5 }: { type: string; height?: number; font?: number }) {
  return (
    <div
      style={{
        flex: "none", height, padding: "0 5px", borderRadius: 3, border: `1px solid ${C.w15}`,
        display: "flex", alignItems: "center", fontWeight: 500, fontSize: font, lineHeight: 1,
        letterSpacing: ".08em", textTransform: "uppercase", color: C.w42,
      }}
    >
      {type}
    </div>
  );
}

export const Chevron = ({ dir = "left", size = 20, color = C.w75 }: { dir?: "left" | "right"; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
    <polyline points={dir === "left" ? "12,4 6,10 12,16" : "8,4 14,10 8,16"} />
  </svg>
);

export function BackButton({ onClick, style }: { onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      aria-label="Back"
      style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: C.w75, ...style }}
    >
      <Chevron />
    </button>
  );
}

export function PlusButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 28, height: 28, borderRadius: "50%", border: `1px dashed ${C.w28}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 400, fontSize: 13, lineHeight: 1, color: C.w60,
      }}
    >
      ＋
    </button>
  );
}

/** Bottom-anchored dialog used by the delete confirmations and notices. */
export function Dialog({
  title, body, children, z = 80,
}: { title: string; body: string; children: React.ReactNode; z?: number }) {
  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: z, background: "rgba(0,0,0,.72)",
        display: "flex", alignItems: "flex-end", padding: 20, animation: "fadeIn .16s ease",
      }}
    >
      <div
        style={{
          width: "100%", borderRadius: 10, background: C.modal, border: `1px solid rgba(255,255,255,.09)`,
          padding: "22px 20px", animation: "upIn .2s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 15.5, lineHeight: 1.3 }}>{title}</div>
        <div style={{ marginTop: 7, fontWeight: 400, fontSize: 13.5, lineHeight: 1.5, color: C.w48, textWrap: "pretty" }}>{body}</div>
        {children}
      </div>
    </div>
  );
}

export const EmptyState = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ padding: "74px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
    <div
      style={{
        width: 44, height: 44, borderRadius: "50%", border: `1px dashed ${C.w22}`, display: "flex",
        alignItems: "center", justifyContent: "center", fontWeight: 400, fontSize: 17, lineHeight: 1, color: C.w45, marginBottom: 2,
      }}
    >
      ＋
    </div>
    <div style={{ fontWeight: 600, fontSize: 15.5, lineHeight: 1.3 }}>{title}</div>
    <div style={{ fontWeight: 400, fontSize: 13, lineHeight: 1.6, color: C.w42, maxWidth: 260, textWrap: "pretty" }}>{children}</div>
  </div>
);

/** Screen container for the overlay screens that slide up over the tab content. */
export const Overlay = ({ children, z }: { children: React.ReactNode; z?: number }) => (
  <div
    style={{
      position: "absolute", inset: 0, zIndex: z, background: C.bg, display: "flex",
      flexDirection: "column", animation: "upIn .22s cubic-bezier(.2,.8,.2,1)",
    }}
  >
    {children}
  </div>
);
