// One-time local login: opens a tiny server on 127.0.0.1:8888, saves a refresh token to .spotify-token.json
import "../lib/env"; // loads .env
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { authUrl, exchangeCode } from "../lib/spotify";

if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
  console.error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first (see .env.example).");
  process.exit(1);
}
const state = randomBytes(16).toString("hex");
const server = createServer(async (req, res) => {
  const url = new URL(req.url!, "http://127.0.0.1:8888");
  if (url.pathname !== "/callback") { res.writeHead(404).end(); return; }
  if (url.searchParams.get("state") !== state || !url.searchParams.get("code")) { res.writeHead(400).end("Bad state"); return; }
  await exchangeCode(url.searchParams.get("code")!);
  res.end("Spotify connected. You can close this tab.");
  console.error("Saved .spotify-token.json");
  server.close();
});
server.listen(8888, "127.0.0.1", () => console.error(`Open this URL in your browser:\n${authUrl(state)}`));
