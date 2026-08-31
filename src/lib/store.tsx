"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./supabase/client";
import { DEFAULT_SETTINGS, type Entry, type ListRecord, type Release, type Settings } from "./types";

const TODAY = () => new Date().toISOString().slice(0, 10);

/** `position` is a plain ordinal, so any reordering renumbers from zero. */
const queueRows = (userId: string, ids: string[]) =>
  ids.map((release_id, position) => ({ user_id: userId, release_id, position }));

const WRITE_FAILED = "That change didn't save. Check your connection and try again.";
const RELEASE_FAILED = "Couldn't save that — the release details never reached the server. Check your connection and try again.";

type Profile = { username: string; displayName: string; joined: string };

type Data = {
  ready: boolean;
  profile: Profile;
  releases: Record<string, Release>;
  entries: Entry[];
  queue: string[];
  lists: ListRecord[];
  favs: string[];
  liked: Record<string, boolean>;
  settings: Settings;
};

type Actions = {
  /** Non-null while the last write failed; the UI surfaces it and clears it. */
  error: string | null;
  clearError: () => void;
  /** Caches release metadata; resolves false if the row could not be written. */
  remember: (r: Release) => Promise<boolean>;
  setEntry: (id: string, rating: number, review: string) => void;
  removeEntry: (id: string) => void;
  toggleListened: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleQueue: (id: string) => void;
  removeFromQueue: (id: string) => void;
  reorderQueue: (ids: string[]) => void;
  createList: (name: string, seedId?: string | null) => void;
  updateList: (listId: string, name: string, desc: string) => void;
  deleteList: (listId: string) => void;
  addToList: (listId: string, releaseId: string) => boolean;
  removeFromList: (listId: string, releaseId: string) => void;
  reorderList: (listId: string, ids: string[]) => void;
  toggleFav: (id: string) => "added" | "removed" | "full";
  reorderFavs: (ids: string[]) => void;
  setSettings: (patch: Partial<Settings>) => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<(Data & Actions) | null>(null);

export const useStore = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside <StoreProvider>");
  return v;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const userId = useRef<string | null>(null);

  const [d, setD] = useState<Data>({
    ready: false,
    profile: { username: "", displayName: "", joined: "" },
    releases: {},
    entries: [],
    queue: [],
    lists: [],
    favs: [],
    liked: {},
    settings: DEFAULT_SETTINGS,
  });

  const [error, setError] = useState<string | null>(null);

  // Latest snapshot for event handlers, so a handler never reads stale state
  // through a closure when deciding what to write or what to roll back to.
  const dRef = useRef(d);
  useEffect(() => { dRef.current = d; });

  const patch = useCallback((p: Partial<Data> | ((s: Data) => Partial<Data>)) => {
    setD((s) => ({ ...s, ...(typeof p === "function" ? p(s) : p) }));
  }, []);

  /* ------------------------------------------------------------- hydrate -- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      userId.current = uid;

      const [profile, releases, entries, queue, lists, listItems, favorites, likes] = await Promise.all([
        supabase.from("profiles").select("username, display_name, settings, created_at").eq("id", uid).maybeSingle(),
        supabase.from("releases").select("*"),
        supabase.from("entries").select("release_id, rating, review, logged_on").order("logged_on", { ascending: false }),
        supabase.from("queue").select("release_id, position").order("position"),
        supabase.from("lists").select("id, name, description, position").order("position"),
        supabase.from("list_items").select("list_id, release_id, position").order("position"),
        supabase.from("favorites").select("release_id, position").order("position"),
        supabase.from("likes").select("release_id"),
      ]);
      if (cancelled) return;

      const relMap: Record<string, Release> = {};
      for (const r of releases.data ?? []) {
        relMap[r.id] = {
          id: r.id, title: r.title, artist: r.artist, year: r.year, type: r.type,
          initials: r.initials, c1: r.c1, c2: r.c2,
          coverUrl: `https://coverartarchive.org/release-group/${r.id}/front-500`,
        };
      }

      const itemsByList = new Map<string, string[]>();
      for (const li of listItems.data ?? []) {
        const arr = itemsByList.get(li.list_id) ?? [];
        arr.push(li.release_id);
        itemsByList.set(li.list_id, arr);
      }

      patch({
        ready: true,
        profile: {
          username: profile.data?.username ?? "",
          displayName: profile.data?.display_name ?? profile.data?.username ?? "",
          joined: (profile.data?.created_at ?? "").slice(0, 4),
        },
        settings: { ...DEFAULT_SETTINGS, ...(profile.data?.settings ?? {}) },
        releases: relMap,
        entries: (entries.data ?? []).map((e) => ({
          releaseId: e.release_id, rating: Number(e.rating), review: e.review ?? "", date: e.logged_on,
        })),
        queue: (queue.data ?? []).map((q) => q.release_id),
        lists: (lists.data ?? []).map((l) => ({
          id: l.id, name: l.name, desc: l.description ?? "", ids: itemsByList.get(l.id) ?? [],
        })),
        favs: (favorites.data ?? []).map((f) => f.release_id),
        liked: Object.fromEntries((likes.data ?? []).map((l) => [l.release_id, true])),
      });
    })();
    return () => { cancelled = true; };
  }, [supabase, patch]);

  /* -------------------------------------------------------------- actions -- */

  const uid = () => userId.current!;

  /**
   * Release metadata has to exist before anything can point at it: every user
   * table carries a foreign key to releases(id). The upsert used to be
   * fire-and-forget, so a queue insert could reach the database first — or the
   * cache write could fail outright — and the dependent insert then died on a
   * foreign key violation. Each in-flight upsert is tracked here so writes that
   * depend on it can wait, and back out cleanly when it failed.
   */
  const pendingRelease = useRef(new Map<string, Promise<boolean>>());

  const remember = useCallback((r: Release): Promise<boolean> => {
    const inflight = pendingRelease.current.get(r.id);
    if (inflight) return inflight;

    patch((s) => (s.releases[r.id] ? {} : { releases: { ...s.releases, [r.id]: r } }));

    const p = (async () => {
      try {
        const { error } = await supabase.from("releases").upsert({
          id: r.id, title: r.title, artist: r.artist, year: r.year,
          type: r.type, initials: r.initials, c1: r.c1, c2: r.c2,
        });
        if (error) throw error;
        return true;
      } catch (err) {
        // A dropped connection rejects rather than returning { error }, which is
        // how a bare "Failed to fetch" escaped before. Either way this resolves
        // false so dependent writes back out instead of hitting the FK.
        console.error("earwrm: cache release failed", err);
        // Forget the failure so a later attempt retries instead of reusing it.
        pendingRelease.current.delete(r.id);
        return false;
      }
    })();

    pendingRelease.current.set(r.id, p);
    return p;
  }, [supabase, patch]);

  /** Resolves once the release row is known to exist (or known to have failed). */
  const ensureRelease = useCallback(async (id: string): Promise<boolean> => {
    const inflight = pendingRelease.current.get(id);
    if (inflight) return inflight;
    // Present since hydration, so the row is already in the database.
    return !!dRef.current.releases[id];
  }, []);

  /** Persists an already-applied optimistic change; rolls it back on failure. */
  const persist = useCallback(async (
    label: string,
    revert: () => void,
    run: () => PromiseLike<{ error: unknown }>,
  ): Promise<boolean> => {
    try {
      const { error } = await run();
      if (error) throw error;
      return true;
    } catch (err) {
      // Covers both a returned { error } and an outright rejection (offline).
      console.error(`earwrm: ${label} failed`, err);
      revert();
      setError(WRITE_FAILED);
      return false;
    }
  }, []);

  /** Same, but waits for the release row so the write cannot violate its FK. */
  const persistWithRelease = useCallback(async (
    id: string,
    label: string,
    revert: () => void,
    run: () => PromiseLike<{ error: unknown }>,
  ): Promise<boolean> => {
    if (!(await ensureRelease(id))) {
      revert();
      setError(RELEASE_FAILED);
      return false;
    }
    return persist(label, revert, run);
  }, [ensureRelease, persist]);

  const removeFromQueue = useCallback((id: string) => {
    const prev = dRef.current.queue;
    patch({ queue: prev.filter((q) => q !== id) });
    void persist("queue remove", () => patch({ queue: prev }), () =>
      supabase.from("queue").delete().eq("user_id", uid()).eq("release_id", id));
  }, [supabase, patch, persist]);

  const toggleQueue = useCallback((id: string) => {
    const prev = dRef.current.queue;
    if (prev.includes(id)) return removeFromQueue(id);
    const next = [id, ...prev];
    patch({ queue: next });
    // New items go to the front, which renumbers the queue. This used to seed
    // `position` with -Date.now() to force new rows to sort first; that is well
    // past int4 range, so every add failed with "value out of range for type
    // integer" (22003). Writing real ordinals keeps the column honest.
    void persistWithRelease(id, "queue add", () => patch({ queue: prev }), () =>
      supabase.from("queue").upsert(queueRows(uid(), next)));
  }, [supabase, patch, removeFromQueue, persistWithRelease]);

  const reorderQueue = useCallback((ids: string[]) => {
    const prev = dRef.current.queue;
    patch({ queue: ids });
    void persist("queue order", () => patch({ queue: prev }), () =>
      supabase.from("queue").upsert(queueRows(uid(), ids)));
  }, [supabase, patch, persist]);

  const setEntry = useCallback((id: string, rating: number, review: string) => {
    const prevEntries = dRef.current.entries;
    const prevQueue = dRef.current.queue;
    const old = prevEntries.find((e) => e.releaseId === id);
    const entry: Entry = { releaseId: id, rating, review, date: old?.date ?? TODAY() };
    const entries = [entry, ...prevEntries.filter((e) => e.releaseId !== id)]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const clears = dRef.current.settings.autoQueue && prevQueue.includes(id);

    patch({ entries, queue: clears ? prevQueue.filter((q) => q !== id) : prevQueue });

    void (async () => {
      const revert = () => patch({ entries: prevEntries, queue: prevQueue });
      const ok = await persistWithRelease(id, "log entry", revert, () =>
        supabase.from("entries").upsert({ user_id: uid(), release_id: id, rating, review }));
      if (ok && clears) {
        await persist("queue clear", revert, () =>
          supabase.from("queue").delete().eq("user_id", uid()).eq("release_id", id));
      }
    })();
  }, [supabase, patch, persist, persistWithRelease]);

  const removeEntry = useCallback((id: string) => {
    const prev = dRef.current.entries;
    patch({ entries: prev.filter((e) => e.releaseId !== id) });
    void persist("delete entry", () => patch({ entries: prev }), () =>
      supabase.from("entries").delete().eq("user_id", uid()).eq("release_id", id));
  }, [supabase, patch, persist]);

  const toggleListened = useCallback((id: string) => {
    if (dRef.current.entries.some((e) => e.releaseId === id)) removeEntry(id);
    else setEntry(id, 0, "");
  }, [removeEntry, setEntry]);

  const toggleLike = useCallback((id: string) => {
    const prev = dRef.current.liked;
    const on = !prev[id];
    patch({ liked: { ...prev, [id]: on } });
    const revert = () => patch({ liked: prev });
    void persistWithRelease(id, "like", revert, () =>
      on
        ? supabase.from("likes").upsert({ user_id: uid(), release_id: id })
        : supabase.from("likes").delete().eq("user_id", uid()).eq("release_id", id));
  }, [supabase, patch, persistWithRelease]);

  const createList = useCallback((name: string, seedId?: string | null) => {
    const id = crypto.randomUUID();
    const prev = dRef.current.lists;
    patch({ lists: [...prev, { id, name, desc: "", ids: seedId ? [seedId] : [] }] });
    void (async () => {
      const revert = () => patch({ lists: prev });
      // Ordinal, appended to the end. This used to be Date.now() % 100000,
      // which put new lists in an effectively random position.
      const ok = await persist("create list", revert, () =>
        supabase.from("lists").insert({ id, user_id: uid(), name, description: "", position: prev.length }));
      if (ok && seedId) {
        await persistWithRelease(seedId, "seed list", revert, () =>
          supabase.from("list_items").insert({ list_id: id, release_id: seedId, position: 0 }));
      }
    })();
  }, [supabase, patch, persist, persistWithRelease]);

  const updateList = useCallback((listId: string, name: string, desc: string) => {
    const prev = dRef.current.lists;
    patch({ lists: prev.map((l) => (l.id === listId ? { ...l, name, desc } : l)) });
    void persist("update list", () => patch({ lists: prev }), () =>
      supabase.from("lists").update({ name, description: desc }).eq("id", listId));
  }, [supabase, patch, persist]);

  const deleteList = useCallback((listId: string) => {
    const prev = dRef.current.lists;
    patch({ lists: prev.filter((l) => l.id !== listId) });
    void persist("delete list", () => patch({ lists: prev }), () =>
      supabase.from("lists").delete().eq("id", listId));
  }, [supabase, patch, persist]);

  /** Returns false when the release is already in the list, so the caller can say so. */
  const addToList = useCallback((listId: string, releaseId: string): boolean => {
    const prev = dRef.current.lists;
    const list = prev.find((l) => l.id === listId);
    if (!list || list.ids.includes(releaseId)) return false;
    patch({ lists: prev.map((l) => (l.id === listId ? { ...l, ids: [...l.ids, releaseId] } : l)) });
    void persistWithRelease(releaseId, "list add", () => patch({ lists: prev }), () =>
      supabase.from("list_items").insert({ list_id: listId, release_id: releaseId, position: list.ids.length }));
    return true;
  }, [supabase, patch, persistWithRelease]);

  const removeFromList = useCallback((listId: string, releaseId: string) => {
    const prev = dRef.current.lists;
    patch({ lists: prev.map((l) => (l.id === listId ? { ...l, ids: l.ids.filter((x) => x !== releaseId) } : l)) });
    void persist("list remove", () => patch({ lists: prev }), () =>
      supabase.from("list_items").delete().eq("list_id", listId).eq("release_id", releaseId));
  }, [supabase, patch, persist]);

  const reorderList = useCallback((listId: string, ids: string[]) => {
    const prev = dRef.current.lists;
    patch({ lists: prev.map((l) => (l.id === listId ? { ...l, ids } : l)) });
    void persist("list order", () => patch({ lists: prev }), () =>
      supabase.from("list_items").upsert(ids.map((release_id, position) => ({ list_id: listId, release_id, position }))));
  }, [supabase, patch, persist]);

  /** Profile favourites are capped at five, matching the prototype's dialog. */
  const toggleFav = useCallback((id: string): "added" | "removed" | "full" => {
    const prev = dRef.current.favs;
    const has = prev.includes(id);
    if (!has && prev.length >= 5) return "full";
    const next = has ? prev.filter((x) => x !== id) : [...prev, id];
    patch({ favs: next });
    const revert = () => patch({ favs: prev });
    void persistWithRelease(id, "favourite", revert, () =>
      has
        ? supabase.from("favorites").delete().eq("user_id", uid()).eq("release_id", id)
        : supabase.from("favorites").upsert({ user_id: uid(), release_id: id, position: next.length - 1 }));
    return has ? "removed" : "added";
  }, [supabase, patch, persistWithRelease]);

  const reorderFavs = useCallback((ids: string[]) => {
    const prev = dRef.current.favs;
    patch({ favs: ids });
    void persist("favourite order", () => patch({ favs: prev }), () =>
      supabase.from("favorites").upsert(ids.map((release_id, position) => ({ user_id: uid(), release_id, position }))));
  }, [supabase, patch, persist]);

  const setSettings = useCallback((p: Partial<Settings>) => {
    const prev = dRef.current.settings;
    const settings = { ...prev, ...p };
    patch({ settings });
    void persist("settings", () => patch({ settings: prev }), () =>
      supabase.from("profiles").update({ settings }).eq("id", uid()));
  }, [supabase, patch, persist]);

  const clearError = useCallback(() => setError(null), []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }, [supabase, router]);

  const value = useMemo(
    () => ({
      ...d, error, clearError,
      remember, setEntry, removeEntry, toggleListened, toggleLike, toggleQueue, removeFromQueue,
      reorderQueue, createList, updateList, deleteList, addToList, removeFromList, reorderList,
      toggleFav, reorderFavs, setSettings, signOut,
    }),
    [d, error, clearError, remember, setEntry, removeEntry, toggleListened, toggleLike, toggleQueue,
     removeFromQueue, reorderQueue, createList, updateList, deleteList, addToList, removeFromList,
     reorderList, toggleFav, reorderFavs, setSettings, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
