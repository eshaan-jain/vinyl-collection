"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Vinyl } from "../../lib/types";
import { groupTracks, spotifyHref } from "../../lib/collection";
import Cover from "./Cover";

type Origin = { dx: number; dy: number; s: number };

export default function Shelf({ items, next }: { items: Vinyl[]; next: { artist: string; title: string; total: number } | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const origin = useRef<Origin>({ dx: 0, dy: 0, s: 0.3 });
  const [cur, setCur] = useState<Vinyl | null>(null);

  // Open as soon as the record is in state: the pop-up grows out of the sleeve that was clicked.
  useEffect(() => {
    const d = dialog.current;
    if (!cur || !d || d.open) return;
    const { dx, dy, s } = origin.current;
    d.style.setProperty("--dx", `${dx}px`);
    d.style.setProperty("--dy", `${dy}px`);
    d.style.setProperty("--s", String(s));
    d.showModal();
  }, [cur]);

  function open(v: Vinyl, e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    origin.current = {
      dx: Math.round(r.left + r.width / 2 - vw / 2),
      dy: Math.round(r.top + r.height / 2 - vh / 2),
      s: Math.max(0.2, Math.min(0.6, r.width / Math.min(1000, vw - 48))),
    };
    setCur(v);
  }

  const sides = cur ? groupTracks(cur.tracks) : [];

  return (
    <>
      <section className="shelf">
        {items.map((v) => (
          <button key={v.id} type="button" className="sleeve" aria-haspopup="dialog" onClick={(e) => open(v, e)}>
            <div className="frame">
              <div className="disc" />
              <div className="art"><Cover cover={v.cover} title={v.title} artist={v.artist} /></div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="name">{v.title}</div>
              <div className="line">{v.artist} · {v.year || "—"}</div>
              <div className="line small">{v.label}</div>
            </div>
          </button>
        ))}
        {next && (
          <Link href="/picks/" className="next">
            <span className="eyebrow">Next on the wall</span>
            <span>
              <span className="big">{next.title}</span>
              <span className="sub">{next.artist}</span>
              <span className="go">See all {next.total} recs →</span>
            </span>
          </Link>
        )}
      </section>

      <dialog
        ref={dialog}
        className="pop"
        aria-label={cur ? `${cur.title} by ${cur.artist}` : "Album details"}
        onClose={() => setCur(null)}
        onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }} // click on the backdrop
      >
        {cur && (
          <div className="pop-body">
            <button type="button" className="close" aria-label="Close" onClick={() => dialog.current?.close()}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
            </button>
            <div className="visual-col">
              <div className="visual">
                <a
                  className="mdisc"
                  href={spotifyHref(cur)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${cur.spotifyUrl ? "Open" : "Search for"} ${cur.title} on Spotify`}
                >
                  <span className="discspin">
                    <span className="dlabel">
                      <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="#f4efe6"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
                    </span>
                  </span>
                </a>
                <div className="art"><Cover cover={cur.cover} title={cur.title} artist={cur.artist} /></div>
              </div>
              <p className="hint">Hover the record to spin it. Click it to {cur.spotifyUrl ? "open the album" : "search for the album"} on Spotify.</p>
            </div>
            <div className="info">
              <div className="eyebrow">{cur.artist} · {cur.year || "—"}</div>
              <h2>{cur.title}</h2>
              <p className="facts">{cur.label}<br />{cur.format}</p>
              {sides.length > 0 ? (
                <div className="tracks">
                  {sides.map((s) => (
                    <div key={s.name}>
                      <h3>{s.name}</h3>
                      <ol>
                        {s.tracks.map((t, i) => (
                          <li key={i}><span className="n">{t.number}</span><span>{t.title}</span>{t.duration && <span className="d">{t.duration}</span>}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="notracks">Tracklist appears after the next sync.</p>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
