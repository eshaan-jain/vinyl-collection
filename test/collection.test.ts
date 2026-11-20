import { test } from "node:test";
import assert from "node:assert/strict";
import { groupTracks, matchSpotifyAlbum, sortByArtist, spotifyHref } from "../lib/collection";
import { getTracklist } from "../lib/discogs";
import { findAlbumUrl } from "../lib/spotify";

const rec = (artist: string, title: string, year = 2000) => ({ artist, title, year });

test("sorts alphabetically by artist, then year, then title (case-insensitive)", () => {
  const sorted = sortByArtist([
    rec("Olivia Rodrigo", "Sour", 2021), rec("J. Cole", "Forest Hills", 2023), rec("childish Gambino", "Camp", 2011),
    rec("Claudine Longet", "Claudine", 1967), rec("J. Cole", "Born Sinner", 2013), rec("J. Cole", "4 Your Eyez Only", 2013),
  ]);
  assert.deepEqual(sorted.map((r) => r.title), ["Camp", "Claudine", "4 Your Eyez Only", "Born Sinner", "Forest Hills", "Sour"]);
});

test("sorting does not mutate its input and keeps a new record in place after a re-sync", () => {
  const input = [rec("Zed", "Z"), rec("Abba", "A")];
  const once = sortByArtist(input);
  assert.equal(input[0].artist, "Zed");
  const withNew = sortByArtist([...once, rec("Bjork", "B")]);
  assert.deepEqual(withNew.map((r) => r.artist), ["Abba", "Bjork", "Zed"]);
});

test("groups a vinyl tracklist into sides, ignoring headings", () => {
  const sides = groupTracks([
    { position: "", title: "Side heading" },
    { position: "A1", title: "One", duration: "3:10" }, { position: "A2", title: "Two" },
    { position: "B1", title: "Three" },
  ]);
  assert.deepEqual(sides.map((s) => [s.name, s.tracks.map((t) => t.title)]),
    [["Side A", ["One", "Two"]], ["Side B", ["Three"]]]);
  assert.equal(sides[0].tracks[0].duration, "3:10");
});

test("groups double LPs (A–D), disc-track positions and plain numbering", () => {
  assert.deepEqual(groupTracks([{ position: "C1", title: "x" }, { position: "D2", title: "y" }]).map((s) => s.name), ["Side C", "Side D"]);
  assert.deepEqual(groupTracks([{ position: "1-1", title: "x" }, { position: "2-1", title: "y" }]).map((s) => s.name), ["Disc 1", "Disc 2"]);
  const plain = groupTracks([{ position: "1", title: "x" }, { position: "2", title: "y" }]);
  assert.deepEqual(plain[0].tracks.map((t) => t.number), ["1", "2"]);
});

test("a record with no tracklist yields no sides (the UI hides the section)", () => {
  assert.deepEqual(groupTracks(undefined), []);
  assert.deepEqual(groupTracks([]), []);
});

test("spotifyHref uses the album link when present, else a search link", () => {
  assert.equal(spotifyHref({ artist: "A", title: "B", spotifyUrl: "https://open.spotify.com/album/xyz" }), "https://open.spotify.com/album/xyz");
  assert.equal(spotifyHref({ artist: "Childish Gambino", title: "Camp" }), "https://open.spotify.com/search/Childish%20Gambino%20Camp");
  assert.match(spotifyHref({ artist: "A&M", title: "x/y", spotifyUrl: null }), /^https:\/\/open\.spotify\.com\/search\/A%26M%20x%2Fy$/);
});

test("matches the right Spotify album and rejects look-alikes", () => {
  const ok = { name: "Older (and Wiser) (Deluxe)", artists: [{ name: "Lizzy McAlpine" }], external_urls: { spotify: "https://open.spotify.com/album/ok" } };
  const wrongArtist = { name: "Older", artists: [{ name: "Someone Else" }], external_urls: { spotify: "https://open.spotify.com/album/bad" } };
  const noUrl = { name: "Older", artists: [{ name: "Lizzy McAlpine" }] };
  assert.equal(matchSpotifyAlbum({ artist: "Lizzy McAlpine", title: "Older (and Wiser)" }, [wrongArtist, noUrl, ok]), "https://open.spotify.com/album/ok");
  assert.equal(matchSpotifyAlbum({ artist: "Lizzy McAlpine", title: "Older (and Wiser)" }, [wrongArtist]), null);
  assert.equal(matchSpotifyAlbum({ artist: "J. Cole", title: "2014 Forest Hills Drive" }, []), null);
});

test("getTracklist maps the Discogs release payload and drops heading/index rows", async () => {
  process.env.DISCOGS_TOKEN = "t";
  const real = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ tracklist: [
    { position: "", type_: "heading", title: "Side One", duration: "" },
    { position: "A1", type_: "track", title: "Intro", duration: "1:02" },
    { position: "A2", type_: "track", title: "Song", duration: "" },
    { position: "B1", type_: "index", title: "Medley" },
  ] }))) as typeof fetch;
  try {
    assert.deepEqual(await getTracklist(1), [{ position: "A1", title: "Intro", duration: "1:02" }, { position: "A2", title: "Song" }]);
  } finally { globalThis.fetch = real; }
});

test("findAlbumUrl asks Spotify's album search and returns the matched link", async () => {
  const real = globalThis.fetch;
  let asked = "";
  globalThis.fetch = (async (u: any) => {
    asked = String(u);
    return new Response(JSON.stringify({ albums: { items: [{ name: "Camp", artists: [{ name: "Childish Gambino" }], external_urls: { spotify: "https://open.spotify.com/album/camp" } }] } }));
  }) as typeof fetch;
  try {
    assert.equal(await findAlbumUrl("tok", { artist: "Childish Gambino", title: "Camp" }), "https://open.spotify.com/album/camp");
    assert.match(asked, /\/v1\/search\?type=album/);
  } finally { globalThis.fetch = real; }
});
