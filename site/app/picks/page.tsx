import { loadPicks } from "../../lib/data";
import type { Offer, Pick } from "../../../lib/types";
import Cover from "../Cover";

const SHOW = 6; // the rest sit behind "Show all"
const usd = (n: number) => `$${n.toFixed(2)}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const same = (a: Offer, b: Offer | null) => !!b && a.store === b.store && a.url === b.url;

function chipLabel(o: Offer): string {
  if (o.price == null) return o.kind === "link" ? o.store : `${o.store} · out of stock`;
  return [o.store, usd(o.price), o.condition?.toLowerCase(), o.local ? "local pickup" : null].filter(Boolean).join(" · ");
}

function Rec({ p }: { p: Pick }) {
  const b = p.best;
  return (
    <article className="rec">
      <div className="frame">
        <div className="disc" />
        <div className="art"><Cover cover={p.cover} title={p.title} artist={p.artist} /></div>
      </div>
      <div className="main">
        <h2>{p.title}</h2>
        <div className="artist">{p.artist}</div>
        <p className="reason">{p.reason}</p>
        <div className="chips">
          {p.offers.map((o) => (
            <a
              key={o.store + o.url}
              href={o.url}
              target="_blank"
              rel="noreferrer"
              className={`chip ${same(o, b) ? "best" : o.price == null ? "link" : ""}`}
              title={o.checkedAt ? `Price checked ${day(o.checkedAt)}` : undefined}
            >
              {chipLabel(o)}
            </a>
          ))}
        </div>
      </div>
      <div className="price">
        <div className="label">{b ? "Best price" : "No live price"}</div>
        <div className="amount">{b ? usd(b.price!) : "—"}</div>
        <div className="note">
          {b
            ? `${b.store}${b.local ? " · local pickup" : " + shipping"}${b.kind === "web" && b.checkedAt ? ` · checked ${day(b.checkedAt)}` : ""}`
            : "Search the stores"}
        </div>
      </div>
    </article>
  );
}

export default function Recs() {
  const { picks, source, tasteSource, generatedAt } = loadPicks();
  const first = picks.slice(0, SHOW);
  const rest = picks.slice(SHOW);
  return (
    <>
      {source === "sample" && <div className="banner">Sample recs: no live prices yet. Store links are searches until each store is verified.</div>}
      <section className="hero">
        <h1>What&apos;s Next</h1>
        <dl className="stats">
          <div><dt>Picks</dt><dd>{picks.length}</dd></div>
          <div><dt>Taste from</dt><dd style={{ textTransform: "capitalize" }}>{tasteSource}</dd></div>
          <div><dt>Updated</dt><dd>{new Date(generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</dd></div>
        </dl>
      </section>
      <section>
        {first.map((p) => <Rec key={p.artist + p.title} p={p} />)}
        {rest.length > 0 && (
          <details className="more">
            <summary>Show all {picks.length} picks →</summary>
            {rest.map((p) => <Rec key={p.artist + p.title} p={p} />)}
          </details>
        )}
      </section>
    </>
  );
}
