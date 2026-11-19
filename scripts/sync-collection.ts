// Pull your Discogs collection into data/collection.json.
// Usage: npm run sync [-- --no-prices]
import "../lib/env"; // loads .env
import { writeFileSync } from "node:fs";
import { getCollection, getMarketStats } from "../lib/discogs";
import type { CollectionFile } from "../lib/types";

const username = process.env.DISCOGS_USERNAME;
if (!username || !process.env.DISCOGS_TOKEN) {
  console.error("Set DISCOGS_USERNAME and DISCOGS_TOKEN (see .env.example).");
  process.exit(1);
}
const withPrices = !process.argv.includes("--no-prices");

const items = await getCollection(username);
console.error(`Fetched ${items.length} records.`);

if (withPrices) {
  // The Discogs client throttles itself to stay under the rate limit.
  for (const [i, v] of items.entries()) {
    try { Object.assign(v, await getMarketStats(v.id)); } catch (e) { console.error(`price failed for ${v.id}: ${e}`); }
    if (i % 10 === 0) console.error(`prices ${i + 1}/${items.length}`);
  }
}

const out: CollectionFile = { generatedAt: new Date().toISOString(), source: "discogs", items };
writeFileSync(new URL("../data/collection.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.error("Wrote data/collection.json");
