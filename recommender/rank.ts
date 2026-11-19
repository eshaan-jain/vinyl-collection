import type { Offer } from "../lib/types";
import { config } from "./config";

/** Effective cost: price + estimated shipping (Chicago pickup has none). */
export const cost = (o: Offer) => (o.price ?? Infinity) + (o.local ? -config.localPickupBonus : config.shippingEstimate);

/** Cheapest offer that has a real price and isn't known to be out of stock. */
export const chooseBest = (offers: Offer[]): Offer | null =>
  offers
    .filter((o) => (o.kind === "live" || o.kind === "web") && o.price != null && o.inStock !== false)
    .sort((a, b) => cost(a) - cost(b))[0] ?? null;
