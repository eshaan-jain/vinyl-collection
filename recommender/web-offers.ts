// Offers found by Claude's open-web research live in data/web-offers.json.
// This file validates them (web content is untrusted) and merges them into picks.
import { z } from "zod";
import type { Offer, Pick } from "../lib/types";
import { cleanTitle, norm } from "./matching";
import { chooseBest } from "./rank";

// Stores whose robots.txt disallows AI crawlers: we keep these link-only (see adapters/links.ts).
const BLOCKED_HOSTS = ["dustygroove.com", "reckless.com"];
const MAX_AGE_DAYS = 14;

export const WebOffer = z.object({
  artist: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  store: z.string().min(1).max(60),
  url: z.string().url().refine((u) => u.startsWith("https://"), "must be https")
    .refine((u) => !BLOCKED_HOSTS.some((h) => new URL(u).hostname.endsWith(h)), "blocked store: link-only"),
  price: z.number().positive().max(1000),           // USD, before shipping
  condition: z.string().max(30).optional(),         // e.g. "New", "Used - VG+"
  note: z.string().max(120).optional(),             // e.g. "free shipping over $35"
  checkedAt: z.string().refine((d) => !Number.isNaN(Date.parse(d)), "must be a date"),
});
export const WebOffersFile = z.object({ generatedAt: z.string(), offers: z.array(WebOffer) });
export type WebOfferT = z.infer<typeof WebOffer>;

const key = (artist: string, title: string) => `${norm(artist)}|${norm(cleanTitle(title))}`;

/** Replace each pick's web offers with the current (fresh, valid) ones and re-pick the best. Idempotent. */
export function mergeWebOffers(picks: Pick[], raw: unknown, now = Date.now()): { picks: Pick[]; used: number; rejected: string[] } {
  const rejected: string[] = [];
  const valid: WebOfferT[] = [];
  const list = (raw as { offers?: unknown[] } | null)?.offers ?? [];
  list.forEach((o, i) => {
    const r = WebOffer.safeParse(o);
    if (r.success) valid.push(r.data);
    else rejected.push(`#${i} ${(o as any)?.store ?? "?"}: ${r.error.issues.map((x) => x.message).join("; ")}`);
  });
  const fresh = valid.filter((o) => now - Date.parse(o.checkedAt) <= MAX_AGE_DAYS * 864e5);
  let used = 0;
  const out = picks.map((p) => {
    const mine = fresh.filter((o) => key(o.artist, o.title) === key(p.artist, p.title));
    const toOffer = (o: WebOfferT): Offer => ({
      store: o.store, kind: "web", url: o.url, price: o.price, condition: o.condition,
      note: o.note, checkedAt: o.checkedAt, inStock: "unknown", local: false,
    });
    const offers = [...p.offers.filter((o) => o.kind !== "web"), ...mine.map(toOffer)];
    used += mine.length;
    return { ...p, offers, best: chooseBest(offers) };
  });
  return { picks: out, used, rejected };
}
