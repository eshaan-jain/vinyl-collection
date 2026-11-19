import type { Offer, Vinyl } from "../../lib/types";

export interface SearchQuery { artist: string; title: string }
export interface AdapterResult { offers: Offer[]; release?: Vinyl }

/** A "store adapter": give it an album, get back where/how much. Add a store = add one file. */
export interface StoreAdapter {
  name: string;
  search(q: SearchQuery): Promise<AdapterResult>;
}
