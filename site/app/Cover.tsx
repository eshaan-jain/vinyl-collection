// Album art: the real cover when we have one, else a typographic colour block (so it never looks broken).
const PALETTE = [
  { bg: "#3b2a1e", ink: "#f4efe6" }, { bg: "#c9b79c", ink: "#2a2118" }, { bg: "#5b2a86", ink: "#f4efe6" },
  { bg: "#e2bf8f", ink: "#2a2118" }, { bg: "#2f5d3a", ink: "#f4efe6" }, { bg: "#d9a441", ink: "#2a2118" },
  { bg: "#7d8fa6", ink: "#1b1712" },
];
const pick = (s: string) => PALETTE[[...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length];

export default function Cover({ cover, title, artist }: { cover?: string; title: string; artist: string }) {
  if (cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={cover} alt={`${title} by ${artist}`} loading="lazy" />;
  }
  const c = pick(artist + title);
  return (
    <div className="ph" style={{ background: c.bg, color: c.ink }} role="img" aria-label={`${title} by ${artist}`}>
      <span className="who">{artist}</span>
      <span className="what">{title}</span>
    </div>
  );
}
