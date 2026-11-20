// Pure helpers shared by the sync script and the site (no network, no fs), so they are easy to test.
import type { Track, Vinyl } from "./types";

const cmp = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true });

/** Alphabetical by artist, then year, then title. Returns a new array. */
export function sortByArtist<T extends Pick<Vinyl, "artist" | "year" | "title">>(items: T[]): T[] {
  return items.slice().sort(
    (a, b) => cmp(a.artist, b.artist) || (a.year || 0) - (b.year || 0) || cmp(a.title, b.title),
  );
}

export interface Side { name: string; tracks: { number: string; title: string; duration?: string }[] }

/**
 * Group a Discogs tracklist into sides/discs for display.
 * Handles "A1"/"B2" vinyl positions, "1-3" disc-track positions, plain "1" numbering,
 * and Discogs heading rows (type_ "heading", empty position), which are ignored.
 */
export function groupTracks(tracks: Track[] | undefined): Side[] {
  const sides = new Map<string, Side>();
  let plain = 0;
  for (const t of tracks ?? []) {
    const pos = (t.position ?? "").trim();
    if (!pos || !t.title) continue;
    let side: string, number: string;
    const vinyl = /^([A-Za-z]+)(\d+)/.exec(pos);
    const disc = /^(\d+)-(\d+)/.exec(pos);
    if (vinyl) { side = `Side ${vinyl[1].toUpperCase()}`; number = vinyl[2]; }
    else if (disc) { side = `Disc ${disc[1]}`; number = disc[2]; }
    else { side = "Tracks"; number = String(++plain); }
    if (!sides.has(side)) sides.set(side, { name: side, tracks: [] });
    sides.get(side)!.tracks.push({ number, title: t.title, duration: t.duration || undefined });
  }
  return [...sides.values()];
}

/** The album's Spotify link: the looked-up one, else a Spotify search that always works. */
export function spotifyHref(v: Pick<Vinyl, "artist" | "title" | "spotifyUrl">): string {
  if (v.spotifyUrl) return v.spotifyUrl;
  return "https://open.spotify.com/search/" + encodeURIComponent(`${v.artist} ${v.title}`);
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)|\[.*?\]/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

/** Pick the Spotify search result that is really this album; null if none is a confident match. */
export function matchSpotifyAlbum(
  want: { artist: string; title: string },
  results: { name: string; artists: { name: string }[]; external_urls?: { spotify?: string } }[],
): string | null {
  const artist = norm(want.artist), title = norm(want.title);
  for (const r of results) {
    const url = r.external_urls?.spotify;
    if (!url) continue;
    const t = norm(r.name);
    const titleOk = t === title || t.startsWith(title) || title.startsWith(t);
    const artistOk = r.artists.some((a) => {
      const n = norm(a.name);
      return artist.includes(n) || n.includes(artist);
    });
    if (titleOk && artistOk) return url;
  }
  return null;
}
