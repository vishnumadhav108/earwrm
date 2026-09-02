"use client";

import { C, TOP } from "@/lib/theme";
import { placeholderRelease } from "@/lib/cover";
import { useDragReorder } from "@/lib/gestures";
import { useStore } from "@/lib/store";
import { BackButton, Cover, Overlay } from "../ui";

export function ProfileScreen({
  onBack, onSettings, onOpenRelease,
}: { onBack: () => void; onSettings: () => void; onOpenRelease: (id: string) => void }) {
  const store = useStore();
  const { profile, entries, queue, favs, releases, settings } = store;
  const rel = (id: string) => releases[id] ?? placeholderRelease(id);

  // Favourites are a five-across grid, so reordering measures horizontally.
  // The gap matches the grid's 7px column gap.
  const favDrag = useDragReorder({
    order: favs,
    rowAttr: "data-fav",
    onPreview: store.reorderFavs,
    onCommit: store.reorderFavs,
    axis: "x",
    gap: 7,
  });

  const name = profile.displayName || profile.username || "You";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "··";

  const stat = (value: number, label: string, first = false) => (
    <div style={{ flex: 1, padding: "15px 0", ...(first ? {} : { borderLeft: `1px solid ${C.w07}`, paddingLeft: 16 }) }}>
      <div style={{ fontWeight: 600, fontSize: 17, lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 5, fontWeight: 400, fontSize: 9.5, lineHeight: 1, letterSpacing: ".14em", color: C.w32 }}>{label}</div>
    </div>
  );

  return (
    <Overlay>
      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${TOP}px 16px 6px` }}>
        <BackButton onClick={onBack} style={{ marginLeft: -6 }} />
        <button onClick={onSettings} title="Settings" aria-label="Settings" style={{ width: 34, height: 34, marginRight: -4, display: "flex", alignItems: "center", justifyContent: "center", color: C.w60 }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <circle cx="10" cy="10" r="6" /><circle cx="10" cy="10" r="2.6" />
            <line x1="16" y1="10" x2="17.8" y2="10" /><line x1="14.24" y1="14.24" x2="15.51" y2="15.51" />
            <line x1="10" y1="16" x2="10" y2="17.8" /><line x1="5.76" y1="14.24" x2="4.49" y2="15.51" />
            <line x1="4" y1="10" x2="2.2" y2="10" /><line x1="5.76" y1="5.76" x2="4.49" y2="4.49" />
            <line x1="10" y1="4" x2="10" y2="2.2" /><line x1="14.24" y1="5.76" x2="15.51" y2="4.49" />
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              flex: "none", width: 64, height: 64, borderRadius: "50%", background: "#1e1e23",
              border: `1px solid ${C.w12}`, display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 500, fontSize: 19, lineHeight: 1, color: C.w78,
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 18, lineHeight: 1.2, letterSpacing: "-.022em" }}>{name}</div>
            <div style={{ marginTop: 4, fontWeight: 400, fontSize: 12, lineHeight: 1, color: C.w38 }}>
              @{profile.username || "you"}{profile.joined ? ` · joined ${profile.joined}` : ""}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 24, borderTop: `1px solid ${C.w07}`, borderBottom: `1px solid ${C.w07}` }}>
          {stat(entries.length, "LOGGED", true)}
          {stat(queue.length, "TO LISTEN")}
          {stat(entries.filter((e) => e.review).length, "REVIEWS")}
        </div>

        <div style={{ marginTop: 26 }}>
          <div style={{ fontWeight: 500, fontSize: 10, lineHeight: 1, letterSpacing: ".2em", color: C.w30 }}>FAVORITES</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 7, marginTop: 12 }}>
            {favs.map((id) => (
              <button
                key={id}
                data-fav="1"
                onClick={() => onOpenRelease(id)}
                onPointerDown={favDrag.dragStart(id)}
                style={{ aspectRatio: "1", touchAction: "none", cursor: "grab", opacity: favDrag.dragId === id ? 0.85 : 1 }}
              >
                <Cover release={rel(id)} fill radius={5} stripe={4} font={11} />
              </button>
            ))}
            {Array.from({ length: Math.max(0, 5 - favs.length) }).map((_, i) => (
              <div key={`slot-${i}`} style={{ aspectRatio: "1", borderRadius: 5, border: `1px dashed ${C.w10}` }} />
            ))}
          </div>
        </div>

        {settings.privateDiary && (
          <div style={{ marginTop: 28, padding: 15, borderRadius: 5, background: C.w035 }}>
            <div style={{ fontWeight: 500, fontSize: 13.5, lineHeight: 1.4 }}>Your diary is private</div>
            <div style={{ marginTop: 5, fontWeight: 400, fontSize: 12.5, lineHeight: 1.5, color: C.w42, textWrap: "pretty" }}>
              Only you can see your logs and reviews until you turn sharing on in Settings.
            </div>
          </div>
        )}
      </div>
    </Overlay>
  );
}
