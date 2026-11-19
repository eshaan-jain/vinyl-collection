import { readFileSync } from "node:fs";
import path from "node:path";
import type { CollectionFile, PicksFile } from "../../lib/types";

// Read at build time from the repo's data/ folder (site is built with cwd = site/).
const read = <T,>(f: string): T => JSON.parse(readFileSync(path.join(process.cwd(), "..", "data", f), "utf8"));
export const loadCollection = () => read<CollectionFile>("collection.json");
export const loadPicks = () => read<PicksFile>("picks.json");
