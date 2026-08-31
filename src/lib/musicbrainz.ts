import { throttled, TtlCache } from "./rateLimit";
import { isAbortError } from "./abort";
import { coverArtUrl, initialsOf, sleeveColors } from "./cover";
import type { Release, ReleaseDetail, ReleaseType } from "./types";

const MB = "https://musicbrainz.org/ws/2";

/**
 * MusicBrainz requires a descriptive User-Agent naming the application and a
 * way to contact whoever runs it, or it may block the client outright.
 */
const UA =
  process.env.MUSICBRAINZ_USER_AGENT ??
  "earwrm/0.1.0 ( https://github.com/vishnumadhav108/earwrm )";

// Search results churn less than they look; an hour keeps repeat lookups and
// back-navigation instant. Artist name -> MBID effectively never changes, so
// that one is cached for a day and spares a whole request on repeat searches.
const searchCache = new TtlCache<Release[]>(60 * 60_000);
// The title branch is cached separately from the merged result so the second
// stage of a search does not re-request what the first stage already fetched.
const titleCache = new TtlCache<Scored[]>(60 * 60_000);
const artistCache = new TtlCache<RawArtist | null>(24 * 60 * 60_000);
const detailCache = new TtlCache<ReleaseDetail>(24 * 60 * 60_000);

/**
 * MusicBrainz answers 503 when it is shedding load or the caller has gone over
 * the rate limit, which happens in bursts even at a compliant request spacing.
 * Retry those with backoff; treat everything else as a real failure.
 */
async function mb<T>(path: string, signal?: AbortSignal, tries = 4): Promise<T> {
  return throttled(async () => {
    for (let i = 0; i < tries; i++) {
      const res = await fetch(`${MB}${path}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal,
      });
      if (res.ok) return (await res.json()) as T;
      if (res.status === 503 && i < tries - 1) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        continue;
      }
      throw new Error(`MusicBrainz ${res.status} on ${path}`);
    }
    throw new Error(`MusicBrainz unreachable on ${path}`);
  }, signal);
}

/* ---------------------------------------------------------------- types --- */

/**
 * The brief calls for Album / Single / EP / Mixtape / Compilation. In
 * MusicBrainz only the first three are `primary-type`; Mixtape (spelled
 * "Mixtape/Street") and Compilation are `secondary-types`, and a release-group
 * can carry several secondaries at once. Secondary wins over primary so a
 * compilation album reads "Compilation", and anything whose secondary marks it
 * as live / soundtrack / spokenword / dj-mix / demo / remix / interview /
 * audiobook is dropped rather than shown under a wrong tag.
 */
const DROP_SECONDARY = new Set([
  "live",
  "soundtrack",
  "spokenword",
  "interview",
  "audiobook",
  "audio drama",
  "remix",
  "dj-mix",
  "demo",
  "field recording",
]);

export function releaseType(
  primary: string | null | undefined,
  secondary: string[] | null | undefined,
): ReleaseType | null {
  const sec = (secondary ?? []).map((s) => s.toLowerCase());
  if (sec.some((s) => DROP_SECONDARY.has(s))) return null;
  if (sec.includes("mixtape/street") || sec.includes("mixtape")) return "Mixtape";
  if (sec.includes("compilation")) return "Compilation";
  switch ((primary ?? "").toLowerCase()) {
    case "album":
      return "Album";
    case "single":
      return "Single";
    case "ep":
      return "EP";
    default:
      return null; // Broadcast, Other, or untyped
  }
}

/* --------------------------------------------------------------- shaping --- */

type RawGroup = {
  id: string;
  title: string;
  "primary-type"?: string | null;
  "secondary-types"?: string[] | null;
  "first-release-date"?: string | null;
  "artist-credit"?: { name: string; joinphrase?: string }[];
};

const creditName = (g: RawGroup) =>
  (g["artist-credit"] ?? [])
    .map((c) => c.name + (c.joinphrase ?? ""))
    .join("")
    .trim() || "Unknown artist";

function toRelease(g: RawGroup): Release | null {
  const type = releaseType(g["primary-type"], g["secondary-types"]);
  if (!type) return null;
  const yearRaw = (g["first-release-date"] ?? "").slice(0, 4);
  const { c1, c2 } = sleeveColors(g.id);
  return {
    id: g.id,
    title: g.title,
    artist: creditName(g),
    year: yearRaw ? Number(yearRaw) : null,
    type,
    initials: initialsOf(g.title),
    c1,
    c2,
    coverUrl: coverArtUrl(g.id),
  };
}

/** Lucene reserved characters, escaped so a raw user query can't break the search. */
const esc = (s: string) => s.replace(/([+\-!(){}[\]^"~*?:\\/]|&&|\|\|)/g, "\\$1");

/* ----------------------------------------------------------------- calls --- */

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const TYPE_BONUS: Record<ReleaseType, number> = {
  Album: 30, EP: 18, Mixtape: 18, Single: 6, Compilation: 2,
};

/**
 * MusicBrainz scores release-group search on the *title*, so searching an
 * artist name ("radiohead") returns unrelated releases titled "Radiohead" and
 * never reaches that artist's albums — they are past the 100-result window
 * entirely, so no amount of local re-ranking recovers them. Artist intent
 * therefore needs its own `arid:` query. Two branches run per search:
 *
 *   title  — release-groups whose title matches the query
 *   artist — if the query is exactly an artist's name, that artist's releases
 *
 * The results are merged and ranked together, so "in rainbows" still finds
 * Radiohead's album ahead of the obscure band actually called In Rainbows.
 */
function rank(r: Release, mbScore: number, q: string, artistBase: number | null): number {
  const nq = norm(q);
  const nt = norm(r.title);
  const na = norm(r.artist);
  let s = artistBase ?? mbScore;
  if (artistBase === null) {
    if (na === nq) s += 120;
    else if (na.includes(nq)) s += 90;
  }
  if (nt === nq) s += 240;
  else if (nt.startsWith(nq)) s += 60;
  return s + TYPE_BONUS[r.type];
}

/**
 * Secondary types to exclude on the artist branch, so an artist with hundreds
 * of live bootlegs still returns their studio albums inside the 100-result
 * window. Values must be unquoted — quoting breaks the negation — and
 * hyphenated types (dj-mix) parse as operators, so those are dropped locally
 * by `releaseType` instead. Singles and compilations are excluded here too:
 * they crowd out albums, and are still reachable by searching their title.
 */
const ARTIST_BRANCH_EXCLUDE = ["live", "remix", "demo", "soundtrack", "interview", "spokenword", "audiobook", "compilation"]
  .map((t) => `-secondarytype:${t}`)
  .join(" AND ");

type RawArtist = { id: string; name: string; score?: number };

/** Resolves the query to an artist only on an exact name match. */
async function exactArtist(q: string, signal?: AbortSignal): Promise<RawArtist | null> {
  const key = norm(q);
  const cached = artistCache.get(key);
  if (cached !== undefined) return cached;
  try {
    const data = await mb<{ artists?: RawArtist[] }>(
      `/artist?query=${encodeURIComponent(`artist:"${esc(q)}"`)}&limit=3&fmt=json`,
      signal,
    );
    const hit = (data.artists ?? []).find((a) => norm(a.name) === norm(q) && (a.score ?? 0) >= 90) ?? null;
    artistCache.set(key, hit);
    return hit;
  } catch (err) {
    if (isAbortError(err)) throw err;
    return null;
  }
}

type Scored = { r: Release; s: number };

/** Collapses one row per title+artist: reissues are separate release-groups. */
function dedupe(scored: Scored[], limit: number): Release[] {
  scored.sort((a, b) => b.s - a.s || (b.r.year ?? 0) - (a.r.year ?? 0));
  const seen = new Set<string>();
  const out: Release[] = [];
  for (const { r } of scored) {
    const k = `${norm(r.title)}|${norm(r.artist)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

/** Branch 1: release-groups whose title matches. One request. */
async function titleBranch(q: string, signal?: AbortSignal): Promise<Scored[]> {
  const key = q.toLowerCase();
  const cached = titleCache.get(key);
  if (cached) return cached;

  const term = esc(q);
  const data = await mb<{ "release-groups"?: (RawGroup & { score?: number })[] }>(
    `/release-group?query=${encodeURIComponent(`releasegroup:"${term}"^6 OR releasegroup:(${term})`)}&limit=40&fmt=json`,
    signal,
  );
  const out: Scored[] = [];
  for (const g of data["release-groups"] ?? []) {
    const r = toRelease(g);
    if (r) out.push({ r, s: rank(r, g.score ?? 0, q, null) });
  }
  titleCache.set(key, out);
  return out;
}

/**
 * Stage one of search: title matches only, so the UI has something to show
 * after a single upstream call instead of waiting on all three. Good enough on
 * its own whenever the user typed a release title.
 */
export async function searchTitles(query: string, limit = 25, signal?: AbortSignal): Promise<Release[]> {
  const q = query.trim();
  if (!q) return [];
  return dedupe([...(await titleBranch(q, signal))], limit);
}

/**
 * Stage two: the title branch plus, when the query is exactly an artist's name,
 * that artist's own releases. Costs up to two further requests, so it is run
 * after stage one has already painted.
 */
export async function searchReleases(query: string, limit = 25, signal?: AbortSignal): Promise<Release[]> {
  const q = query.trim();
  if (!q) return [];
  const key = q.toLowerCase();
  const hit = searchCache.get(key);
  if (hit) return hit;

  const scored: Scored[] = [...(await titleBranch(q, signal))];

  const artist = await exactArtist(q, signal);
  if (artist) {
    try {
      const byArtist = await mb<{ "release-groups"?: (RawGroup & { score?: number })[] }>(
        `/release-group?query=${encodeURIComponent(`arid:${artist.id} AND ${ARTIST_BRANCH_EXCLUDE} AND -primarytype:single`)}&limit=100&fmt=json`,
        signal,
      );
      const groups = byArtist["release-groups"] ?? [];
      // A title-only match tops out near 370 (relevance 100 + exact title +
      // album bonus). An artist with a real discography should beat that, so
      // their albums outrank unrelated releases that merely share the name.
      // A one-release "artist" is more likely a coincidence, so it scores low —
      // that is what keeps searching "in rainbows" on Radiohead's album rather
      // than on the obscure band actually called In Rainbows.
      const base = groups.length >= 5 ? 400 : 150;
      for (const g of groups) {
        const r = toRelease(g);
        if (r) scored.push({ r, s: rank(r, g.score ?? 0, q, base) });
      }
    } catch (err) {
      if (isAbortError(err)) throw err;
      // The title branch already produced results; artist enrichment is a bonus.
    }
  }

  const out = dedupe(scored, limit);
  searchCache.set(key, out);
  return out;
}

type RawRelease = { id: string; date?: string | null; status?: string | null; country?: string | null };

export async function getRelease(mbid: string, signal?: AbortSignal): Promise<ReleaseDetail | null> {
  const hit = detailCache.get(mbid);
  if (hit) return hit;

  const g = await mb<
    RawGroup & { releases?: RawRelease[]; relations?: { type: string; url?: { resource: string } }[] }
  >(`/release-group/${mbid}?inc=artist-credits+releases+url-rels&fmt=json`, signal);

  const base = toRelease(g);
  if (!base) return null;

  // Earliest official release carries the most representative tracklist + label.
  const releases = (g.releases ?? []).slice().sort((a, b) => (a.date ?? "9999") < (b.date ?? "9999") ? -1 : 1);
  const pick = releases.find((r) => r.status === "Official") ?? releases[0];

  let tracks: string[] | null = null;
  let label: string | null = null;
  if (pick) {
    try {
      const rel = await mb<{
        media?: { tracks?: { title: string }[] }[];
        "label-info"?: { label?: { name?: string } | null }[];
      }>(`/release/${pick.id}?inc=recordings+labels&fmt=json`, signal);
      const t = (rel.media ?? []).flatMap((m) => (m.tracks ?? []).map((x) => x.title));
      if (t.length) tracks = t;
      label = (rel["label-info"] ?? []).map((l) => l.label?.name).find(Boolean) ?? null;
    } catch {
      // A missing tracklist is not worth failing the whole screen over.
    }
  }

  const blurb = await blurbFor(g.relations ?? []);

  const detail: ReleaseDetail = { ...base, label, tracks, blurb };
  detailCache.set(mbid, detail);
  return detail;
}

/* ----------------------------------------------------------- the blurb --- */

const blurbCache = new TtlCache<string | null>(7 * 24 * 60 * 60_000);

/**
 * MusicBrainz has no editorial description. It does carry url-relations, so a
 * release-group can be followed to Wikidata and from there to the Wikipedia
 * lead sentence, which is what the prototype's seeded blurbs read like. Both
 * hops are free and keyless; either can be absent, in which case the release
 * detail simply renders without the line.
 */
async function blurbFor(relations: { type: string; url?: { resource: string } }[]): Promise<string | null> {
  const urlOf = (t: string) => relations.find((r) => r.type === t)?.url?.resource;

  let title: string | null = null;
  const direct = urlOf("wikipedia");
  if (direct) {
    const m = /\/wiki\/([^#?]+)/.exec(direct);
    if (m) title = decodeURIComponent(m[1]);
  }

  if (!title) {
    const wd = urlOf("wikidata");
    const qid = wd ? /\/(Q\d+)/.exec(wd)?.[1] : null;
    if (!qid) return null;
    const cached = blurbCache.get(qid);
    if (cached !== undefined) return cached;
    try {
      const res = await fetch(
        `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`,
        { headers: { "User-Agent": UA } },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        entities?: Record<string, { sitelinks?: Record<string, { title?: string }> }>;
      };
      title = data.entities?.[qid]?.sitelinks?.enwiki?.title ?? null;
    } catch {
      return null;
    }
    if (!title) {
      blurbCache.set(qid, null);
      return null;
    }
  }

  const key = `wp:${title}`;
  const cached = blurbCache.get(key);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { "User-Agent": UA } },
    );
    if (!res.ok) {
      blurbCache.set(key, null);
      return null;
    }
    const data = (await res.json()) as { extract?: string };
    const out = firstSentence(data.extract ?? "");
    blurbCache.set(key, out);
    return out;
  } catch {
    return null;
  }
}

function firstSentence(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  // Break on a period that is followed by a space and a capital, so "Vol. 2"
  // and "J. Cole" don't cut the sentence short.
  const m = /^(.+?[.!?])(?=\s+[A-Z"“(])/.exec(t);
  const s = (m ? m[1] : t).trim();
  return s.length > 260 ? s.slice(0, 257).trimEnd() + "…" : s;
}
