// Thin Discogs API client shared by the sync script, the recommender and the MCP server.
// Docs: https://www.discogs.com/developers
import type { Track, Vinyl } from "./types";

const BASE = "https://api.discogs.com";
const UA = "VinylFinder/0.2 (personal project)";

// Discogs allows ~60 requests/min, so space calls ~1.1s apart (shared by every caller in the process).
let lastCall = 0;
async function throttle() {
  const wait = lastCall + 1100 - Date.now();
  lastCall = Math.max(Date.now(), lastCall + 1100);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

async function discogs<T>(path: string, params: Record<string, string> = {}, init: RequestInit = {}): Promise<T> {
  const token = process.env.DISCOGS_TOKEN;
  if (!token) throw new Error("DISCOGS_TOKEN is not set");
  await throttle();
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": UA, Authorization: `Discogs token=${token}`, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Discogs ${res.status} for ${url.pathname}: ${await res.text()}`);
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>);
}

const cleanArtist = (n: string) => n.replace(/ \(\d+\)$/, ""); // Discogs adds "(2)" to disambiguate

/** One page (100 items) of your collection; folder 0 = "All". */
export async function getCollectionPage(username: string, page = 1): Promise<{ items: Vinyl[]; pages: number }> {
  const data = await discogs<any>(`/users/${username}/collection/folders/0/releases`, {
    per_page: "100", page: String(page), sort: "added", sort_order: "desc",
  });
  const items = data.releases.map((r: any): Vinyl => {
    const b = r.basic_information;
    return {
      id: b.id,
      title: b.title,
      artist: b.artists?.map((a: any) => cleanArtist(a.name)).join(", ") ?? "Unknown",
      year: b.year,
      label: b.labels?.[0]?.name ?? "Unknown",
      format: b.formats?.map((f: any) => [f.name, ...(f.descriptions ?? [])].join(", ")).join(" / ") ?? "",
      cover: b.cover_image || b.thumb,
      url: `https://www.discogs.com/release/${b.id}`,
      dateAdded: r.date_added,
    };
  });
  return { items, pages: data.pagination?.pages ?? 1 };
}

/** Entire collection (all pages). */
export async function getCollection(username: string): Promise<Vinyl[]> {
  const first = await getCollectionPage(username, 1);
  const all = [...first.items];
  for (let p = 2; p <= first.pages; p++) all.push(...(await getCollectionPage(username, p)).items);
  return all;
}

/** Search the Discogs database for vinyl releases. */
export async function searchVinyl(query: { artist?: string; title?: string; q?: string }, perPage = 10): Promise<Vinyl[]> {
  const data = await discogs<any>("/database/search", {
    type: "release", format: "Vinyl", per_page: String(perPage),
    ...(query.artist ? { artist: query.artist } : {}),
    ...(query.title ? { release_title: query.title } : {}),
    ...(query.q ? { q: query.q } : {}),
  });
  return data.results.map((r: any): Vinyl => {
    const [artist, ...rest] = String(r.title).split(" - ");
    return {
      id: r.id, title: rest.join(" - ") || r.title, artist,
      year: Number(r.year) || 0, label: r.label?.[0] ?? "Unknown",
      format: (r.format ?? []).join(", "), cover: r.cover_image || r.thumb,
      url: `https://www.discogs.com${r.uri}`,
    };
  });
}

/** Marketplace stats: lowest listed price + number for sale. */
export async function getMarketStats(releaseId: number): Promise<{ lowestPrice: number | null; forSale: number | null }> {
  const d = await discogs<any>(`/marketplace/stats/${releaseId}`, { curr_abbr: "USD" });
  return { lowestPrice: d.lowest_price?.value ?? null, forSale: d.num_for_sale ?? null };
}

/** Add a release to your wantlist (Discogs can then alert you about listings). */
export async function addToWantlist(username: string, releaseId: number): Promise<void> {
  await discogs<void>(`/users/${username}/wants/${releaseId}`, {}, { method: "PUT" });
}

/** Tracklist of one release (positions like "A1", "B2"; Discogs also returns heading rows with an empty position). */
export async function getTracklist(releaseId: number): Promise<Track[]> {
  const d = await discogs<any>(`/releases/${releaseId}`);
  return (d.tracklist ?? [])
    .filter((t: any) => (t.type_ ?? "track") === "track" && t.title)
    .map((t: any): Track => ({ position: t.position ?? "", title: t.title, ...(t.duration ? { duration: t.duration } : {}) }));
}
