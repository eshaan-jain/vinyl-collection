import { searchVinyl, getMarketStats } from "../../lib/discogs";
import { cleanTitle, shortlist } from "../matching";
import type { StoreAdapter } from "./types";

/**
 * Live price from Discogs: find the standard vinyl pressings of this album (skipping deluxe /
 * special editions), then take the one with the lowest marketplace price (new + used both count).
 */
export const discogsAdapter: StoreAdapter = {
  name: "Discogs",
  async search({ artist, title }) {
    const clean = cleanTitle(title);
    let candidates = shortlist(await searchVinyl({ artist, title: clean }, 10), artist, title);
    if (!candidates.length && clean !== title) candidates = shortlist(await searchVinyl({ artist, title }, 10), artist, title);
    if (!candidates.length) return { offers: [] };

    const withStats = [];
    for (const c of candidates) withStats.push({ ...c, ...(await getMarketStats(c.id).catch(() => ({ lowestPrice: null, forSale: null }))) });
    const listed = withStats.filter((r) => r.lowestPrice != null && (r.forSale ?? 0) > 0).sort((a, b) => a.lowestPrice! - b.lowestPrice!);
    const best = listed[0] ?? withStats[0];

    return {
      release: best,
      offers: [{
        store: "Discogs", kind: "live", url: `https://www.discogs.com/sell/release/${best.id}`,
        price: best.lowestPrice ?? null, inStock: (best.forSale ?? 0) > 0, local: false,
      }],
    };
  },
};
