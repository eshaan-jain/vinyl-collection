import type { StoreAdapter } from "./types";

// Link-only adapters: no live prices yet, just a search link per store.
// TODO (next step): verify each store's real search URL and whether it has a
// scrapeable / API-friendly inventory (check robots.txt + terms first), then
// upgrade the stores that allow it to kind: "live".
const q = (a: string, t: string) => encodeURIComponent(`${a} ${t}`);
const google = (site: string) => (a: string, t: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`site:${site} ${a} ${t}`)}`;

function link(name: string, local: boolean, url: (a: string, t: string) => string): StoreAdapter {
  return {
    name,
    async search({ artist, title }) {
      return { offers: [{ store: name, kind: "link", url: url(artist, title), price: null, inStock: "unknown", local }] };
    },
  };
}

export const linkAdapters: StoreAdapter[] = [
  // Chicago stores (local pickup possible). URLs are site-restricted web searches until verified.
  link("Dusty Groove (Chicago)", true, google("dustygroove.com")),
  link("Reckless Records (Chicago)", true, google("reckless.com")),
  link("Shuga Records (Chicago)", true, google("shugarecords.com")),
  // Online
  link("Bandcamp", false, (a, t) => `https://bandcamp.com/search?q=${q(a, t)}`),
  link("eBay", false, (a, t) => `https://www.ebay.com/sch/i.html?_nkw=${q(a, t + " vinyl")}`),
];
