/** The only release-group types earwrm surfaces (per the project brief). */
export const RELEASE_TYPES = ["Album", "Single", "EP", "Mixtape", "Compilation"] as const;
export type ReleaseType = (typeof RELEASE_TYPES)[number];

/** A release-group, normalised out of MusicBrainz into what the UI renders. */
export type Release = {
  id: string; // MusicBrainz release-group MBID
  title: string;
  artist: string;
  year: number | null;
  type: ReleaseType;
  initials: string;
  c1: string;
  c2: string;
  coverUrl: string | null;
};

export type ReleaseDetail = Release & {
  label: string | null;
  blurb: string | null;
  tracks: string[] | null;
};

export type Entry = {
  releaseId: string;
  rating: number; // 0 = logged with no rating, else 0.5..5 in halves
  review: string;
  date: string; // ISO yyyy-mm-dd
};

export type ListRecord = {
  id: string;
  name: string;
  desc: string;
  ids: string[];
};

export type Settings = {
  privateDiary: boolean;
  halfStars: boolean;
  recap: boolean;
  autoQueue: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  privateDiary: true,
  halfStars: true,
  recap: false,
  autoQueue: true,
};
