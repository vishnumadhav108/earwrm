/**
 * The prototype hand-picked two near-black tones and a two-letter monogram per
 * release for its placeholder sleeves. Real releases need the same thing derived
 * deterministically, so a release always looks the same between renders and the
 * placeholder stays inside the prototype's palette (#1a1a1d .. #2d2726).
 */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function tone(hue: number, light: number): string {
  // Very low saturation, very low lightness — matches the seeded sleeve colours.
  const s = 0.09;
  const l = light;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const v = l - a * Math.max(-1, Math.min(Math.min(k - 3, 9 - k), 1));
    return Math.round(255 * v)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function sleeveColors(seed: string): { c1: string; c2: string } {
  const h = hash(seed);
  const hue = h % 360;
  return { c1: tone(hue, 0.112), c2: tone(hue, 0.152) };
}

export function initialsOf(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export const coverArtUrl = (mbid: string, size: 250 | 500 = 500) =>
  `https://coverartarchive.org/release-group/${mbid}/front-${size}`;

/**
 * Diary rows render from the cached `releases` table. If a row somehow points
 * at a release we have no metadata for, show a neutral placeholder rather than
 * blocking the screen on a rate-limited MusicBrainz lookup.
 */
export function placeholderRelease(id: string) {
  const { c1, c2 } = sleeveColors(id);
  return {
    id,
    title: "Unknown release",
    artist: "Unknown artist",
    year: null,
    type: "Album" as const,
    initials: "??",
    c1,
    c2,
    coverUrl: coverArtUrl(id),
  };
}
