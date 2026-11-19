import type { Offer } from "../../lib/types";
import { isFancy, sameArtist, sameTitle } from "../matching";
import type { StoreAdapter } from "./types";

// Shuga Records (Chicago) runs on Shopify. Its robots.txt allows normal crawling of search pages
// (it only blocks cart/checkout/account), and Shopify's public storefront search returns JSON.
// We make a handful of low-volume, read-only requests and identify ourselves. No cart/checkout.
const HOST = "https://www.shugarecords.com";
const UA = "VinylFinder/0.2 (personal project; read-only price lookup)";
const STORE = "Shuga Records (Chicago)";

export interface ShopifyProduct { title: string; price: string; available: boolean; type?: string; url: string }

let last = 0;
async function politeFetch(url: string) {
  const wait = last + 1000 - Date.now();
  last = Math.max(Date.now(), last + 1000);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  return fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
}

/** "Artist - Album (2013) - New 2 LP Record ..." → { artist, album, condition } */
export function parseTitle(title: string) {
  const t = title.replace(/^DAMAGED COVER\s*-\s*/i, "");
  const m = t.match(/^(.+?)\s+[-–]\s+(.+?)\s+\((\d{4})\)\s*[-–]\s*(.*)$/);
  if (!m) return null;
  const cond = m[4].match(/^(New(?: \([^)]*\))?|Mint-?|NM-?|VG\+\+?|VG-?|EX\+?|G\+?)(?=\s)/i);
  return { artist: m[1], album: m[2], condition: cond?.[1] };
}

const nonStandard = (t: string) =>
  isFancy(t) || /unofficial|colou?red|splatter|marbled|translucent|alternate|\bRSD\b|record store day|damaged|slipmat/i.test(t);

/** Pick the cheapest in-stock listing that is really this album, standard pressings first. */
export function pickOffer(products: ShopifyProduct[], artist: string, title: string): Offer | null {
  const matches = products
    .filter((p) => p.available && p.type !== "Merch")
    .map((p) => ({ p, info: parseTitle(p.title) }))
    .filter((x) => x.info && sameArtist(x.info.artist, artist) && sameTitle(x.info.album, title));
  if (!matches.length) return null;
  const standard = matches.filter((x) => !nonStandard(x.p.title));
  const pool = standard.length ? standard : matches;
  const best = pool.sort((a, b) => Number(a.p.price) - Number(b.p.price))[0];
  return {
    store: STORE, kind: "live", local: true, inStock: true,
    url: HOST + best.p.url.split("?")[0], price: Number(best.p.price), condition: best.info!.condition,
  };
}

const searchLink = (artist: string, title: string): Offer => ({
  store: STORE, kind: "link", local: true, inStock: "unknown", price: null,
  url: `${HOST}/search?q=${encodeURIComponent(`${artist} ${title}`)}&type=product`,
});

export const shugaAdapter: StoreAdapter = {
  name: STORE,
  async search({ artist, title }) {
    try {
      const q = encodeURIComponent(`${artist} ${title}`);
      const res = await politeFetch(`${HOST}/search/suggest.json?q=${q}&resources[type]=product&resources[limit]=10`);
      if (!res.ok) throw new Error(`Shuga ${res.status}`);
      const products: ShopifyProduct[] = (await res.json()).resources?.results?.products ?? [];
      const offer = pickOffer(products, artist, title);
      return { offers: [offer ?? searchLink(artist, title)] };
    } catch (e) {
      console.error(`Shuga lookup failed (${e}); using a search link.`);
      return { offers: [searchLink(artist, title)] };
    }
  },
};
