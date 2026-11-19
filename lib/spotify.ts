// Spotify Web API helpers for the recommender (runs locally, not on the website).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { Taste } from "./types";

export const TOKEN_FILE = new URL("../.spotify-token.json", import.meta.url).pathname;
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
    albums: saved.items.map((i: any) => ({ title: i.album.name, artist: i.album.artists[0].name })),
  };
}
