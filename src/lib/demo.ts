import { coverArtUrl, initialsOf, sleeveColors } from "./cover";
import { DEFAULT_SETTINGS, type Entry, type ListRecord, type Release } from "./types";

/**
 * The seed for demo mode: a diary that already looks lived in, so a first-time
 * visitor lands on the populated state from the Claude Design prototype rather
 * than on the empty one. Every id is a real MusicBrainz release-group MBID, so
 * Cover Art Archive serves genuine sleeves and the release screen can still
 * fetch tracklists and blurbs the same way it does for a signed-in user.
 *
 * Nothing here is ever written anywhere. `demoData()` rebuilds the whole state
 * from scratch on every call, which is what makes a reload wipe the session.
 */

type Seed = { id: string; title: string; artist: string; year: number };

const SEEDS: Seed[] = [
  { id: "6e335887-60ba-38f0-95af-fae7774336bf", title: "In Rainbows", artist: "Radiohead", year: 2007 },
  { id: "8588c5a5-b491-37a4-8d51-2227346a072e", title: "Aja", artist: "Steely Dan", year: 1977 },
  { id: "9605c075-c64c-366b-ad7f-ec98523fc162", title: "Voodoo", artist: "D’Angelo", year: 2000 },
  { id: "0da340a0-6ad7-4fc2-a272-6f94393a7831", title: "Blonde", artist: "Frank Ocean", year: 2016 },
  {
    id: "6086062c-f943-4b85-b1cb-43558425ec1c",
    title: "The Idler Wheel Is Wiser Than the Driver of the Screw and Whipping Cords Will Serve You More Than Ropes Will Ever Do",
    artist: "Fiona Apple",
    year: 2012,
  },
  { id: "28298e2c-4d70-3eed-a0f5-a3280c662b3d", title: "Illmatic", artist: "Nas", year: 1994 },
  { id: "48117b90-a16e-34ca-a514-19c702df1158", title: "Discovery", artist: "Daft Punk", year: 2001 },
  { id: "271faeb3-fdd1-3ebb-80aa-97b3116e9341", title: "Vespertine", artist: "Björk", year: 2001 },
  { id: "77cf47ba-58cd-3f3d-a5f9-79bf89860421", title: "A Love Supreme", artist: "John Coltrane", year: 1965 },
  { id: "5cbcdd9f-4b7d-3b3c-b9f2-6b0e75971157", title: "Sound of Silver", artist: "LCD Soundsystem", year: 2007 },
  { id: "e75c0549-ad55-39e3-8025-c72c5d4a3c5d", title: "Kid A", artist: "Radiohead", year: 2000 },
  { id: "416bb5e5-c7d1-3977-8fd7-7c9daf6c2be6", title: "Rumours", artist: "Fleetwood Mac", year: 1977 },
  { id: "d9103c72-3807-4378-9ce7-b6f3e8fdd547", title: "To Pimp a Butterfly", artist: "Kendrick Lamar", year: 2015 },
  { id: "cb76227e-3ac0-3002-9a10-615a5b73cc59", title: "Loveless", artist: "my bloody valentine", year: 1991 },
];

/** Named ids, so the diary and lists below read as albums rather than UUIDs. */
const ID = {
  inRainbows: SEEDS[0].id,
  aja: SEEDS[1].id,
  voodoo: SEEDS[2].id,
  blonde: SEEDS[3].id,
  idlerWheel: SEEDS[4].id,
  illmatic: SEEDS[5].id,
  discovery: SEEDS[6].id,
  vespertine: SEEDS[7].id,
  loveSupreme: SEEDS[8].id,
  soundOfSilver: SEEDS[9].id,
  kidA: SEEDS[10].id,
  rumours: SEEDS[11].id,
  butterfly: SEEDS[12].id,
  loveless: SEEDS[13].id,
} as const;

/**
 * Everything seeded is an Album; the other release types show up as soon as the
 * visitor searches. Colours and monogram come from the same helpers a real
 * search result goes through, so a seeded sleeve and a fetched one are alike.
 */
const toRelease = (s: Seed): Release => ({
  ...s,
  type: "Album",
  initials: initialsOf(s.title),
  ...sleeveColors(s.id),
  coverUrl: coverArtUrl(s.id),
});

/** Diary dates are relative so the demo never looks like a stale snapshot. */
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const ENTRIES: { id: string; ago: number; rating: number; review: string }[] = [
  { id: ID.inRainbows, ago: 0, rating: 4.5, review: "Weird Fishes still rearranges my whole chest." },
  { id: ID.aja, ago: 1, rating: 5, review: "" },
  { id: ID.voodoo, ago: 3, rating: 0, review: "" },
  { id: ID.blonde, ago: 6, rating: 4, review: "Nights splitting in half gets me every single time." },
  { id: ID.idlerWheel, ago: 9, rating: 0, review: "" },
  { id: ID.illmatic, ago: 13, rating: 5, review: "Ten tracks, not one wasted bar." },
  { id: ID.discovery, ago: 18, rating: 3.5, review: "" },
  { id: ID.soundOfSilver, ago: 24, rating: 4.5, review: "All My Friends is the only nine minutes I never skip." },
  { id: ID.vespertine, ago: 31, rating: 4, review: "" },
];

const LISTS: ListRecord[] = [
  {
    id: "demo-list-sunday",
    name: "Sunday morning",
    desc: "Slow starts, nothing louder than the kettle.",
    ids: [ID.loveSupreme, ID.vespertine, ID.idlerWheel],
  },
  {
    id: "demo-list-drives",
    name: "Late drives",
    desc: "",
    ids: [ID.blonde, ID.soundOfSilver, ID.discovery, ID.kidA],
  },
];

/** A fresh, unshared copy of the demo diary. */
export function demoData() {
  const releases: Record<string, Release> = {};
  for (const s of SEEDS) releases[s.id] = toRelease(s);

  const entries: Entry[] = ENTRIES.map((e) => ({
    releaseId: e.id,
    rating: e.rating,
    review: e.review,
    date: daysAgo(e.ago),
  }));

  return {
    ready: true,
    profile: { username: "demo", displayName: "Demo Listener", joined: String(new Date().getFullYear()) },
    releases,
    entries,
    queue: [ID.rumours, ID.butterfly, ID.loveless],
    lists: LISTS.map((l) => ({ ...l, ids: [...l.ids] })),
    favs: [ID.inRainbows, ID.illmatic, ID.blonde, ID.aja, ID.kidA],
    liked: { [ID.inRainbows]: true, [ID.illmatic]: true, [ID.blonde]: true, [ID.soundOfSilver]: true },
    settings: { ...DEFAULT_SETTINGS },
  };
}
