export interface Vinyl {
  id: number;            // Discogs release id
  title: string;
  artist: string;
  year: number;
  label: string;
  format: string;        // e.g. 'LP, Album, 180g'
  cover: string;
  url: string;           // Discogs release page
  dateAdded?: string;
  lowestPrice?: number | null; // USD, Discogs marketplace
  forSale?: number | null;
  tracks?: Track[];            // from the Discogs release; absent until the sync has fetched it
  spotifyUrl?: string | null;  // album link; null = looked up, no confident match; absent = not looked up yet
}

/** One row of a Discogs tracklist. position is "A1", "B2", "1-3" or "" (headings). */
export interface Track {
  position: string;
  title: string;
  duration?: string;
}

export interface Taste {
  artists: { name: string; weight: number }[];
  albums: { title: string; artist: string; cover?: string }[];
}

/** One place you could buy a record. "live" = real price; "link" = just a search link. */
export interface Offer {
  store: string;
  kind: "live" | "link" | "web";  // web = found by Claude's web research (see data/web-offers.json)
  url: string;
  price: number | null;      // USD, before shipping
  condition?: string;
  inStock: boolean | "unknown";
  local: boolean;            // Chicago store (pickup possible)
  checkedAt?: string;        // when a web offer's price was last checked
  note?: string;
}

export interface Pick {
  artist: string;
  title: string;
  cover?: string;
  reason: string;
  score: number;
  best: Offer | null;        // cheapest live offer after estimated shipping
  offers: Offer[];
}

export interface CollectionFile { generatedAt: string; source: "discogs" | "sample"; items: Vinyl[] }
export interface PicksFile { generatedAt: string; source: "live" | "sample"; tasteSource: string; picks: Pick[] }
