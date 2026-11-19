import { loadCollection } from "../lib/data";

export default function MyVinyl() {
  const { items, source, generatedAt } = loadCollection();
  return (
    <>
      <h1>My Vinyl</h1>
      <p className="sub">{items.length} records · synced {new Date(generatedAt).toLocaleDateString("en-US")}</p>
      {source === "sample" && <div className="banner">Showing sample data. Run the <b>Sync &amp; deploy</b> workflow to pull your real Discogs collection.</div>}
      <div className="grid">
        {items.map((v) => (
          <a key={v.id} href={v.url} target="_blank" rel="noreferrer" className="card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.cover} alt={v.title} />
            <div className="body">
              <h3>{v.title}</h3>
              <span className="meta">{v.artist} · {v.year || "—"}</span>
              <span className="meta">{v.label} · {v.format}</span>
              {v.lowestPrice != null && <span className="price">from ${v.lowestPrice} <span className="meta">({v.forSale} for sale)</span></span>}
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
