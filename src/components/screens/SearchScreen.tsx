"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { C, TOP } from "@/lib/theme";
import { placeholderRelease } from "@/lib/cover";
import { useStore } from "@/lib/store";
import { Cover, Heart, Overlay, TypeBadge } from "../ui";
import type { Release } from "@/lib/types";

export type SearchMode = "plain" | "diary" | "queue" | "list";

const TITLES: Record<SearchMode, string> = {
  plain: "Search",
  diary: "Add",
  queue: "Add to queue",
  list: "Add to list",
};

/**
 * Results already fetched this session, keyed by query. Backspacing or
 * re-running a search is then instant instead of costing another round of
 * rate-limited MusicBrainz calls.
 */
const resultCache = new Map<string, Release[]>();

export function SearchScreen({
  mode, onBack, onPick, onHold,
}: { mode: SearchMode; onBack: () => void; onPick: (r: Release) => void; onHold: (r: Release) => void }) {
  const { releases, entries, queue, liked } = useStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Release[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressed = useRef(false);
  const inFlight = useRef<AbortController | null>(null);

  /**
   * The prototype seeded a "suggested for you" list. There is no recommendation
   * source behind this build, so an empty query falls back to what the user has
   * already touched rather than inventing suggestions.
   */
  const recent = useMemo(() => {
    const ids = [...entries.map((e) => e.releaseId), ...queue];
    const seen = new Set<string>();
    return ids
      .filter((id) => !seen.has(id) && seen.add(id))
      .slice(0, 8)
      .map((id) => releases[id] ?? placeholderRelease(id));
  }, [entries, queue, releases]);

  const onQuery = (value: string) => {
    setQuery(value);
    // Clearing and the "searching" flag belong to the keystroke, not to an
    // effect — the effect only owns the debounced request.
    setError(null);
    const q = value.trim();
    const cached = q ? resultCache.get(q.toLowerCase()) : undefined;
    if (cached) {
      setResults(cached);
      setBusy(false);
    } else {
      setBusy(!!q);
      if (!q) setResults([]);
    }
  };

  useEffect(() => {
    const q = query.trim();
    if (!q) return;

    // A cache hit was already applied by onQuery, which owns the keystroke;
    // the effect only needs to not fetch.
    if (resultCache.has(q.toLowerCase())) return;

    // 450ms: a MusicBrainz search costs up to three rate-limited upstream calls,
    // so it is worth waiting a little longer to be sure the user has stopped.
    const t = setTimeout(async () => {
      inFlight.current?.abort();
      const ctrl = new AbortController();
      inFlight.current = ctrl;
      const still = () => inFlight.current === ctrl;

      const run = async (stage: 1 | 2) => {
        const res = await fetch(
          `/api/mb/search?q=${encodeURIComponent(q)}${stage === 1 ? "&stage=1" : ""}`,
          { signal: ctrl.signal },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Search failed");
        return data.results as Release[];
      };

      try {
        // Stage 1 is a single upstream call, so results paint quickly.
        const quick = await run(1);
        if (!still()) return;
        setResults(quick);
        setError(null);
        setBusy(false);

        // Stage 2 adds the artist branch. It replaces the list in place, which
        // is what surfaces an artist's own albums for a query like "radiohead".
        const full = await run(2);
        if (!still()) return;
        resultCache.set(q.toLowerCase(), full);
        setResults(full);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // superseded
        if (!still()) return;
        setResults([]);
        setError("Search is unavailable right now. Try again in a moment.");
      } finally {
        if (still()) {
          inFlight.current = null;
          setBusy(false);
        }
      }
    }, 450);

    return () => {
      clearTimeout(t);
      // Abandon a request the user has already typed past, so the server drops
      // it instead of spending the rate-limit budget on a stale query.
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [query]);

  const showing = query.trim() ? results : recent;
  const label = !query.trim()
    ? recent.length ? "RECENTLY LOGGED" : ""
    : busy
      ? "SEARCHING…"
      : `${results.length} RESULT${results.length === 1 ? "" : "S"}`;

  // Passes the whole release, not just its id: long-press opens the action
  // sheet without going through onPick, so this is the only chance to cache the
  // metadata that every write from that sheet has a foreign key to.
  const beginHold = (r: Release) => {
    pressed.current = false;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      pressed.current = true;
      onHold(r);
    }, 380);
  };
  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  return (
    <Overlay>
      <div style={{ flex: "none", padding: `${TOP + 2}px 20px 12px` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={onBack} aria-label="Back" style={{ flex: "none", width: 30, height: 30, marginLeft: -8, display: "flex", alignItems: "center", justifyContent: "center", color: C.w75 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="12,4 6,10 12,16" />
            </svg>
          </button>
          <div style={{ flex: 1, textAlign: "center", fontWeight: 600, fontSize: 15, lineHeight: 1, letterSpacing: "-.02em" }}>{TITLES[mode]}</div>
          <div style={{ flex: "none", width: 22 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, height: 37, padding: "0 13px", borderRadius: 5, background: C.w06 }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,.42)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="9" cy="9" r="5.6" /><line x1="13.2" y1="13.2" x2="17" y2="17" />
          </svg>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search artists and releases"
            autoFocus
            style={{ flex: 1, minWidth: 0, fontWeight: 400, fontSize: 13.5, lineHeight: 1 }}
          />
          {!!query && (
            <button onClick={() => onQuery("")} style={{ fontWeight: 400, fontSize: 15, lineHeight: 1, color: C.w34 }}>✕</button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 40px" }}>
        {!!label && (
          <div style={{ fontWeight: 500, fontSize: 10, lineHeight: 1, letterSpacing: ".2em", color: C.w28, padding: "8px 0 6px" }}>{label}</div>
        )}
        {showing.map((a) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.w045}` }}>
            <button
              onClick={() => {
                if (pressed.current) {
                  pressed.current = false;
                  return;
                }
                onPick(a);
              }}
              onPointerDown={() => beginHold(a)}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              onContextMenu={(e) => e.preventDefault()}
              style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}
            >
              <Cover release={a} size={44} stripe={4} font={10} />
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <TypeBadge type={a.type} />
                  <div style={{ fontWeight: 400, fontSize: 11.5, lineHeight: 1.3, color: C.w40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.artist}{a.year ? ` · ${a.year}` : ""}
                  </div>
                  {liked[a.id] && <Heart size={8.5} />}
                </div>
              </div>
            </button>
          </div>
        ))}

        {!!query.trim() && !busy && results.length === 0 && (
          <div style={{ padding: "64px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
            <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>
              {error ? "Search is unavailable" : `No matches for “${query}”`}
            </div>
            <div style={{ fontWeight: 400, fontSize: 13, lineHeight: 1.5, color: C.w42, maxWidth: 240, textWrap: "pretty" }}>
              {error ?? "Check the spelling, or search by artist instead of release title."}
            </div>
            <button onClick={() => onQuery("")} style={{ marginTop: 4, fontWeight: 500, fontSize: 12.5, lineHeight: 1, color: C.w60 }}>
              Clear search
            </button>
          </div>
        )}
      </div>
    </Overlay>
  );
}
