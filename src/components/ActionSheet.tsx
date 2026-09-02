"use client";

import { C } from "@/lib/theme";
import { placeholderRelease } from "@/lib/cover";
import { useStore } from "@/lib/store";
import { Cover, HEART_PATH, StarPicker, TypeBadge } from "./ui";

const PUR = C.accentLt;
const NFG = C.w62;

export function ActionSheet({
  releaseId, onClose, onReview, onAddToLists, onFavFull, onNotice,
}: {
  releaseId: string;
  onClose: () => void;
  onReview: () => void;
  onAddToLists: () => void;
  onFavFull: () => void;
  onNotice: (title: string, body: string) => void;
}) {
  const store = useStore();
  const a = store.releases[releaseId] ?? placeholderRelease(releaseId);
  const entry = store.entries.find((e) => e.releaseId === releaseId);
  const inQueue = store.queue.includes(releaseId);
  const isFav = store.favs.includes(releaseId);

  const action = (label: string, active: boolean, onClick: () => void, icon: React.ReactNode) => (
    <button onClick={onClick} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 9, color: active ? PUR : NFG }}>
      {icon}
      <span style={{ fontWeight: 600, fontSize: 8.5, lineHeight: 1, letterSpacing: ".1em" }}>{label}</span>
    </button>
  );

  const row = (label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        height: 46, display: "flex", alignItems: "center", justifyContent: "center",
        borderTop: `1px solid ${C.w07}`, fontWeight: 500, fontSize: 14, lineHeight: 1, color: "rgba(255,255,255,.9)",
      }}
    >
      {label}
    </button>
  );

  const share = async () => {
    const url = `https://musicbrainz.org/release-group/${a.id}`;
    const text = `${a.title} — ${a.artist}`;
    try {
      if (navigator.share) await navigator.share({ title: a.title, text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        onNotice("Copied", "The release link is on your clipboard.");
      }
    } catch {
      // The user dismissed the share sheet; nothing to report.
    }
  };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <button onClick={onClose} aria-label="Close" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.62)", animation: "fadeIn .16s ease" }} />
      <div
        style={{
          position: "relative", background: C.sheet, borderTop: `1px solid ${C.w10}`,
          borderRadius: "4px 4px 0 0", padding: "15px 18px 26px", animation: "upIn .2s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Cover release={a} size={42} stripe={4} font={10} border="rgba(255,255,255,.09)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.25, letterSpacing: "-.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {a.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, marginTop: 3 }}>
              <TypeBadge type={a.type} />
              <div style={{ fontWeight: 400, fontSize: 11.5, lineHeight: 1.3, color: C.w40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.artist}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ flex: "none", width: 28, height: 28, fontWeight: 400, fontSize: 14, lineHeight: 1, color: C.w40 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          {action("LISTENED", !!entry, () => store.toggleListened(releaseId), (
            <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M4 13.5v-2a8 8 0 0 1 16 0v2" />
              <rect x="2.6" y="13" width="4.2" height="7.4" rx="2.1" />
              <rect x="17.2" y="13" width="4.2" height="7.4" rx="2.1" />
            </svg>
          ))}
          {action("LIKE", !!store.liked[releaseId], () => store.toggleLike(releaseId), (
            <svg width="27" height="27" viewBox="0 0 24 24" fill={store.liked[releaseId] ? PUR : "none"} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d={HEART_PATH} />
            </svg>
          ))}
          {action("QUEUE", inQueue, () => store.toggleQueue(releaseId), (
            <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <circle cx="12" cy="12" r="8.4" /><polyline points="12,7.2 12,12.2 15.8,14" />
            </svg>
          ))}
        </div>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
          <StarPicker
            value={entry?.rating ?? 0}
            onChange={(v) => store.setEntry(releaseId, v, entry?.review ?? "")}
            size={29}
            gap={3}
            halfStars={store.settings.halfStars}
          />
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column" }}>
          {row(entry && (entry.rating > 0 || entry.review) ? "Edit review or log" : "Review or log", onReview)}
          {row("Add to lists", onAddToLists)}
          {row(isFav ? "Remove from favorites" : "Add to favorites", () => {
            if (store.toggleFav(releaseId) === "full") onFavFull();
            else onClose();
          })}
          {row("Share", () => void share())}
        </div>
      </div>
    </div>
  );
}
