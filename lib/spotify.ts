// Spotify Web API helpers for the recommender (runs locally, not on the website).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Taste } from "./types";
import { matchSpotifyAlbum } from "./collection";

export const TOKEN_FILE = fileURLToPath(new URL("../.spotify-token.json", import.meta.url)) // not .pathname: that keeps %20 for spaces in folder names;
export const REDIRECT_URI = "http://127.0.0.1:8888/callback";
const SCOPES = "user-top-read user-library-read";

const basic = () =>
  Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");

export function authUrl(state: string) {
  return "https://accounts.spotify.com/authorize?" + new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!, response_type: "code",
    redirect_uri: REDIRECT_URI, scope: SCOPES, state,
  });
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic()}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new Error(`Spotify token ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>;
}

export async function exchangeCode(code: string) {
  const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI });
  writeFileSync(TOKEN_FILE, JSON.stringify({ refresh_token: t.refresh_token }));
}

export const hasSpotifyLogin = () => existsSync(TOKEN_FILE);

/** Refresh-token flow: log in once, then this works unattended (until Spotify expires the refresh token). */
export async function getAccessToken(): Promise<string> {
  const saved = JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: saved.refresh_token });
  if (t.refresh_token) writeFileSync(TOKEN_FILE, JSON.stringify({ refresh_token: t.refresh_token }));
  return t.access_token;
}

async function sp<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Spotify ${res.status} for ${path}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Taste profile = top artists (ranked) + saved albums. */
export async function getTaste(token: string): Promise<Taste> {
  const [top, saved] = await Promise.all([
    sp<any>(token, "/me/top/artists?limit=20&time_range=medium_term"),
    sp<any>(token, "/me/albums?limit=50"),
  ]);
  const n = top.items.length || 1;
  return {
    artists: top.items.map((a: any, i: number) => ({ name: a.name, weight: 1 - i / n })),
    albums: saved.items.map((i: any) => ({
      title: i.album.name,
      artist: i.album.artists[0].name,
      cover: i.album.images?.[1]?.url ?? i.album.images?.[0]?.url, // ~300px album art, used when Discogs has none
    })),
  };
}

/** App-only token (client credentials). Enough for catalog search; works unattended in GitHub Actions, no user login. */
export async function getAppToken(): Promise<string | null> {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) return null;
  const t = await tokenRequest({ grant_type: "client_credentials" });
  return t.access_token;
}

/** Spotify album URL for a record, or null when there is no confident match. */
export async function findAlbumUrl(token: string, want: { artist: string; title: string }): Promise<string | null> {
  const q = encodeURIComponent(`album:${want.title} artist:${want.artist}`);
  const data = await sp<any>(token, `/search?type=album&limit=5&q=${q}`);
  return matchSpotifyAlbum(want, data.albums?.items ?? []);
}
