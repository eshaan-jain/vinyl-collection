import { readFileSync } from "node:fs";
import path from "node:path";
import type { CollectionFile, PicksFile } from "../../lib/types";
import { sortByArtist } from "../../lib/collection";

// Read at build time from the repo's data/ folder (site is built with cwd = site/).
const read = <T,>(f: string): T => JSON.parse(readFileSync(path.join(process.cwd(), "..", "data", f), "utf8"));

/** Always A–Z by artist, even if collection.json was written by an older sync. */
export const loadCollection = (): CollectionFile => {
  const c = read<CollectionFile>("collection.json");
  return { ...c, items: sortByArtist(c.items) };
};
export const loadPicks = () => read<PicksFile>("picks.json");
