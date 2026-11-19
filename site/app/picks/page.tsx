import { loadPicks } from "../../lib/data";

export default function Picks() {
  const { picks, source, tasteSource, generatedAt } = loadPicks();
  return (
    <>
      <h1>Picks</h1>
      <p className="sub">Albums you listen to that aren&apos;t in your collection · updated {new Date(generatedAt).toLocaleDateString("en-US")} · taste from {tasteSource}</p>
      {source === "sample" && <div className="banner">Sample picks: no live prices yet. Store links are searches until each store is verified.</div>}
      {picks.map((p) => (
        <div className="rec" key={p.artist + p.title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.cover ? <img src={p.cover} alt={p.title} /> : <div className="rec-ph" style={{ width: 140, height: 140, borderRadius: 8, background: "#000" }} />}
          <div>
            <h3 style={{ margin: 0 }}>{p.title}</h3>
            <div className="meta">{p.artist}</div>
            <p>{p.reason}</p>
            {p.best && <div className="price">Best: ${p.best.price}{p.best.condition ? ` (${p.best.condition})` : ""} at {p.best.store}{p.best.local ? " (local pickup)" : " + shipping"}{p.best.kind === "web" && p.best.checkedAt ? <span className="meta"> · web price checked {new Date(p.best.checkedAt).toLocaleDateString("en-US")}</span> : null}</div>}
            <div className="links">
              {p.offers.map((o) => (
                <a key={o.store + o.url} href={o.url} title={o.checkedAt ? `Price checked ${new Date(o.checkedAt).toLocaleDateString("en-US")}` : undefined} target="_blank" rel="noreferrer" className={o === p.best ? "best" : ""}>
                  {o.store}{o.price != null ? ` · $${o.price}` : ""}{o.condition ? ` (${o.condition})` : ""}
                </a>
              ))}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
