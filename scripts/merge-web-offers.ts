// Merge data/web-offers.json (Claude's web research) into data/picks.json.
// Usage: npm run merge-web
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { PicksFile } from "../lib/types";
import { mergeWebOffers } from "../recommender/web-offers";

const picksPath = new URL("../data/picks.json", import.meta.url);
const webPath = new URL("../data/web-offers.json", import.meta.url);
const picks: PicksFile = JSON.parse(readFileSync(picksPath, "utf8"));
const raw = existsSync(webPath) ? JSON.parse(readFileSync(webPath, "utf8")) : { offers: [] };

const { picks: merged, used, rejected } = mergeWebOffers(picks.picks, raw);
writeFileSync(picksPath, JSON.stringify({ ...picks, picks: merged }, null, 2) + "\n");
console.error(`Merged ${used} web offer(s) into picks.json.`);
if (rejected.length) console.error(`Rejected ${rejected.length} invalid offer(s):\n  ` + rejected.join("\n  "));
