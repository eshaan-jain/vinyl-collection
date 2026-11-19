import { searchVinyl, getMarketStats } from "../../lib/discogs";
import type { StoreAdapter } from "./types";

/** Live price: lowest Discogs marketplace listing for the best-matching vinyl release. */
export const discogsAdapter: StoreAdapter = {
  name: "Discogs",
  async search({ artist, title }) {
    const [hit] = await searchVinyl({ artist, title }, 1);
    if (!hit) return { offers: [] };
    const stats = await getMarketStats(hit.id);
    return {
      release: { ...hit, ...stats },
      offers: [{
        store: "Discogs", kind: "live", url: `https://www.discogs.com/sell/release/${hit.id}`,
        price: stats.lowestPrice, inStock: (stats.forSale ?? 0) > 0, local: false,
      }],
    };
  },
};
