import { existsSync, readFileSync } from "node:fs";
import { getAccessToken, getTaste, hasSpotifyLogin } from "../lib/spotify";
import type { Taste } from "../lib/types";

const read = (name: string): Taste => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), "utf8"));

/** Taste source priority: Spotify login → data/taste.json (manual / export) → sample. */
export async function loadTaste(): Promise<{ taste: Taste; source: string }> {
  if (hasSpotifyLogin()) {
    try { return { taste: await getTaste(await getAccessToken()), source: "spotify" }; }
    catch (e) { console.error(`Spotify failed (${e}). Falling back.`); }
  }
  if (existsSync(new URL("../data/taste.json", import.meta.url))) return { taste: read("taste.json"), source: "data/taste.json" };
  return { taste: read("taste.sample.json"), source: "sample" };
}
