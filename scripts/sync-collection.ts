// Pull your Discogs collection into data/collection.json.
// Usage: npm run sync [-- --no-prices]
// Records are written alphabetically by artist. Tracklists (Discogs) and Spotify album links are fetched once per
// record and reused from the previous collection.json on later syncs, so only new records cost extra requests.
import "../lib/env"; // loads .env
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { getCollection, getMarketStats, getTracklist } from "../lib/discogs";
import { sortByArtist } from "../lib/collection";
import { findAlbumUrl, getAppToken } from "../lib/spotify";
import type { CollectionFile, Vinyl } from "../lib/types";

const username = process.env.DISCOGS_USERNAME;
if (!username || !process.env.DISCOGS_TOKEN) {
  console.error("Set DISCOGS_USERNAME and DISCOGS_TOKEN (see .env.example).");
  process.exit(1);
}
const withPrices = !process.argv.includes("--no-prices");
const FILE = new URL("../data/collection.json", import.meta.url);

// What we already know from the last sync, keyed by Discogs release id.
const previous = new Map<number, Vinyl>();
if (existsSync(FILE)) {
  try { for (const v of (JSON.parse(readFileSync(FILE, "utf8")) as CollectionFile).items) previous.set(v.id, v); }
  catch { console.error("Could not read the previous collection.json; fetching everything fresh."); }
}

const items = sortByArtist(await getCollection(username));
console.error(`Fetched ${items.length} records.`);

// Tracklists + Spotify links: reuse what we have, fetch only what is missing.
let spotifyToken: string | null = null;
try { spotifyToken = await getAppToken(); } catch (e) { console.error(`Spotify login failed, skipping links: ${e}`); }
if (!spotifyToken) console.error("No SPOTIFY_CLIENT_ID/SECRET: the site will fall back to a Spotify search link.");

for (const v of items) {
  const old = previous.get(v.id);
  if (old?.tracks?.length) v.tracks = old.tracks;
  else {
    try { v.tracks = await getTracklist(v.id); } catch (e) { console.error(`tracklist failed for ${v.id}: ${e}`); }
  }
  if (old && old.spotifyUrl !== undefined) v.spotifyUrl = old.spotifyUrl;
  else if (spotifyToken) {
    try { v.spotifyUrl = await findAlbumUrl(spotifyToken, v); } catch (e) { console.error(`spotify failed for ${v.id}: ${e}`); }
  }
}

if (withPrices) {
  // The Discogs client throttles itself to stay under the rate limit.
  for (const [i, v] of items.entries()) {
    try { Object.assign(v, await getMarketStats(v.id)); } catch (e) { console.error(`price failed for ${v.id}: ${e}`); }
    if (i % 10 === 0) console.error(`prices ${i + 1}/${items.length}`);
  }
}

const out: CollectionFile = { generatedAt: new Date().toISOString(), source: "discogs", items };
writeFileSync(FILE, JSON.stringify(out, null, 2) + "\n");
console.error("Wrote data/collection.json");
