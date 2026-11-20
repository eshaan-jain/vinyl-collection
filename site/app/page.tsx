import { loadCollection, loadPicks } from "../lib/data";
import Shelf from "./Shelf";

export default function MyVinyl() {
  const { items, source, generatedAt } = loadCollection();
  const { picks } = loadPicks();
  const top = picks[0];
  return (
    <>
      {source === "sample" && <div className="banner">Showing sample data. Run the <b>Sync &amp; deploy</b> workflow to pull your real Discogs collection.</div>}
      <section className="hero">
        <h1>The Shelf</h1>
        <dl className="stats">
          <div><dt>Records</dt><dd>{items.length}</dd></div>
          <div><dt>Synced</dt><dd>{new Date(generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</dd></div>
        </dl>
      </section>
      <Shelf items={items} next={top ? { artist: top.artist, title: top.title, total: picks.length } : null} />
    </>
  );
}
