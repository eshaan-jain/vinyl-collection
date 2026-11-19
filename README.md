# Vinyl

Your Discogs collection as a static site, plus a recommender that suggests records to buy and where.

```
data/          collection.json (synced from Discogs), picks.json (recommender output), taste.*.json
lib/           Discogs + Spotify clients, shared types
scripts/       sync-collection.ts
recommender/   run.ts, taste sources, store adapters (adapters/)
mcp/           MCP server exposing Discogs tools to Claude
site/          static Next.js site (My Vinyl + Picks tabs), reads data/*.json at build time
.github/       one manual workflow: sync from Discogs → build → deploy to GitHub Pages
```

## One-command refresh
`npm run refresh` = pull → sync collection → recommend → commit → push (the push redeploys the site).
Options: `npm run refresh -- --no-prices` (faster sync), `npm run refresh -- --no-push` (commit only).

## Adding a record
Add it in Discogs (the mobile app can scan the barcode). Then either run the **Sync & deploy**
workflow (Actions tab → Run workflow) or locally `npm run sync` and push.

## Setup
1. `npm install`; copy `.env.example` → `.env` and fill in your values (scripts load `.env` automatically; needs Node 20.12+).
2. Repo settings → Pages → Source: **GitHub Actions**. Add secret `DISCOGS_TOKEN` and variable `DISCOGS_USERNAME`.
   (Pages on a private repo needs a paid GitHub plan; otherwise make the repo public or host on Vercel.)
3. Actions → **Sync & deploy** → Run workflow.

## Recommender (runs locally or via Claude, not hosted)
- `npm run spotify:login` once (needs Spotify Premium for the dev app), then `npm run recommend`.
- No Spotify? Put your own `{artists, albums}` in `data/taste.json` (same shape as `data/taste.sample.json`).
- `npm run recommend -- --wantlist` also adds the picks to your Discogs wantlist.
- Stores live in `recommender/adapters/`. Live prices: **Discogs** and **Shuga Records** (Shopify public search; its robots.txt allows it; read-only, ~1 request/sec).
  **Dusty Groove** and **Reckless** are link-only on purpose: their robots.txt disallows AI crawlers and reserves rights against AI use, so we don't scrape them.
  Bandcamp and eBay are links too.

## Open-web search (Claude does the researching)
`data/web-offers.json` holds prices Claude finds on other retailers. The `vinyl-web-hunt` skill (see below) researches the
picks that need it, **verifies each price on the retailer's own page**, writes the file, then runs `npm run merge-web`
(also run automatically by `npm run recommend`). Offers are validated (https only, positive price, no Dusty Groove/Reckless)
and expire after 14 days. The site marks them "web price checked <date>".
```json
{ "generatedAt": "...", "offers": [
  { "artist": "Lauryn Hill", "title": "The Miseducation of Lauryn Hill", "store": "Example Records",
    "url": "https://example.com/product", "price": 29.99, "condition": "New",
    "note": "free shipping over $65", "checkedAt": "2026-11-19T20:00:00Z" } ] }
```

### Headless web hunt (`npm run hunt`)
Runs Claude Code non-interactively (`claude -p`) with the repo-local skill in `.claude/skills/vinyl-web-hunt/`.
Needs the Claude Code CLI installed and logged in; uses your Claude plan's usage. Claude may only read files, search/fetch the web,
and edit `data/web-offers.json`; it never runs git or commits. Afterwards the script validates the file (restoring the previous one if broken)
and runs `npm run merge-web`.
```
npm run hunt                       # up to 6 picks, 15 minute limit
npm run hunt -- --limit 3 --minutes 10
npm run refresh -- --web           # pull, sync, recommend, hunt, commit, push
```
Review with `git diff data/` before pushing if you like (`npm run refresh -- --web --no-push`).

## MCP server
`npm run mcp`, or add to Claude Desktop:
```json
{ "mcpServers": { "discogs": { "command": "npx", "args": ["tsx", "/ABSOLUTE/PATH/vinyl-collection/mcp/server.ts"],
  "env": { "DISCOGS_TOKEN": "...", "DISCOGS_USERNAME": "..." } } } }
```
