import type { Vinyl } from "../lib/types";

export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const EDITION_WORDS = "deluxe|expanded|anniversary|remaster(?:ed)?|re-?release|edition|version|bonus|explicit|special|collector'?s?|tour|platinum";

/** "Because the Internet (Deluxe)" / "X - Remastered 2011" → "Because the Internet" / "X" */
export function cleanTitle(t: string): string {
  return t
    .replace(new RegExp(`\\s*[\\(\\[][^)\\]]*(?:${EDITION_WORDS})[^)\\]]*[\\)\\]]`, "gi"), "")
    .replace(new RegExp(`\\s+-\\s+[^-]*(?:${EDITION_WORDS})[^-]*$`, "i"), "")
    .trim() || t;
}

/** Deluxe / special / pricey variants you'd rather skip in favour of a standard LP. */
export const isFancy = (s: string) =>
  /deluxe|expanded|anniversary|box ?set|picture disc|collector|super|limited|special edition|bundle|signed|numbered|test pressing|promo|club edition|zoetrope|\b[3-9] ?x ?LP/i.test(s);

export const sameArtist = (a: string, b: string) => {
  const x = norm(a), y = norm(b);
  return x === y || x.includes(y) || y.includes(x);
};
export const sameTitle = (hit: string, wanted: string) => {
  const h = norm(cleanTitle(hit)), w = norm(cleanTitle(wanted));
  return h === w || (w.length > 5 && h.startsWith(w));
};

/** Keep results that are really this album, standard editions first (fall back to fancy ones if that's all there is). */
export function shortlist(hits: Vinyl[], artist: string, title: string, max = 3): Vinyl[] {
  const right = hits.filter((h) => sameArtist(h.artist, artist) && sameTitle(h.title, title));
  const standard = right.filter((h) => !isFancy(`${h.title} ${h.format}`));
  const isLpAlbum = (h: Vinyl) => /\bLP\b/.test(h.format) && /Album/.test(h.format);
  const pool = standard.length ? standard : right;
  return [...pool].sort((a, b) => Number(isLpAlbum(b)) - Number(isLpAlbum(a))).slice(0, max);
}

/** Discogs sometimes returns a blank "spacer" image instead of cover art. */
export const goodCover = (url?: string) => (url && !url.includes("spacer.gif") ? url : undefined);
