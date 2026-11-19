// Usage: npm run recommend [-- --wantlist]
//  - builds your taste profile, skips albums you own, asks every store adapter,
//  - writes data/picks.json (the site's "Picks" tab), optionally adds picks to your Discogs wantlist.
import "../lib/env"; // loads .env
import { readFileSync, writeFileSync } from "node:fs";
import { addToWantlist } from "../lib/discogs";
import type { CollectionFile, Offer, Pick, PicksFile } from "../lib/types";
import { discogsAdapter } from "./adapters/discogs";
import { linkAdapters } from "./adapters/links";
import type { StoreAdapter } from "./adapters/types";
import { config } from "./config";
import { cleanTitle, goodCover, norm } from "./matching";
import { loadTaste } from "./taste";

const live = !!process.env.DISCOGS_TOKEN;
const adapters: StoreAdapter[] = [...(live ? [discogsAdapter] : []), ...linkAdapters];

const collection: CollectionFile = JSON.parse(readFileSync(new URL("../data/collection.json", import.meta.url), "utf8"));
const key = (artist: string, title: string) => norm(artist) + "|" + norm(cleanTitle(title));
const owned = new Set(collection.items.map((v) => key(v.artist, v.title)));
const { taste, source: tasteSource } = await loadTaste();
const weight = (artist: string) => taste.artists.find((a) => norm(a.name) === norm(artist))?.weight ?? 0.1;

const cost = (o: Offer) => (o.price ?? Infinity) + (o.local ? -config.localPickupBonus : config.shippingEstimate);

// Skip owned albums, and collapse standard + deluxe versions of the same album into one candidate.
const seen = new Set<string>();
const candidates = taste.albums
  .filter((a) => !owned.has(key(a.artist, a.title)) && !seen.has(key(a.artist, a.title)) && seen.add(key(a.artist, a.title)))
  .sort((a, b) => weight(b.artist) - weight(a.artist))
  .slice(0, config.maxPicks);

const picks: Pick[] = [];
const wantIds: number[] = [];
for (const c of candidates) {
  const results = await Promise.allSettled(adapters.map((a) => a.search(c)));
  const ok = results.flatMap((r, i) => (r.status === "fulfilled" ? [r.value] : (console.error(`${adapters[i].name}: ${r.reason}`), [])));
  const offers = ok.flatMap((r) => r.offers);
  const release = ok.find((r) => r.release)?.release;
  const best = offers.filter((o) => o.kind === "live" && o.price != null && o.inStock !== false).sort((a, b) => cost(a) - cost(b))[0] ?? null;
  const w = weight(c.artist);
  if (release) wantIds.push(release.id);
  picks.push({
    artist: c.artist, title: c.title, cover: goodCover(release?.cover) ?? c.cover, score: w, best, offers,
    reason: w > 0.5 ? `${c.artist} is one of your most-played artists, and you've saved this album.` : "You've saved this album but don't own it on vinyl.",
  });
}
picks.sort((a, b) => b.score - a.score);

const out: PicksFile = { generatedAt: new Date().toISOString(), source: live ? "live" : "sample", tasteSource, picks };
writeFileSync(new URL("../data/picks.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.error(`Wrote data/picks.json (${picks.length} picks, taste: ${tasteSource}, prices: ${live ? "live" : "links only"})`);

if (process.argv.includes("--wantlist")) {
  const user = process.env.DISCOGS_USERNAME;
  if (!user || !live) console.error("--wantlist needs DISCOGS_USERNAME and DISCOGS_TOKEN");
  else for (const id of wantIds) { await addToWantlist(user, id); await new Promise((r) => setTimeout(r, 1100)); }
}
