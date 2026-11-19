// One command to update everything: pull → sync collection → recommend → commit → push.
// Usage: npm run refresh [-- --no-prices] [-- --no-push] [-- --web]
//   --no-prices  skip per-record Discogs price lookups in the sync (much faster)
//   --no-push    commit locally but don't push (so the site does not redeploy)
//   --web        also run the headless web hunt (Claude Code) before committing
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const noPush = args.includes("--no-push");
const syncArgs = args.includes("--no-prices") ? ["--", "--no-prices"] : [];
const web = args.includes("--web");
const DATA = ["data/collection.json", "data/picks.json", ...(web ? ["data/web-offers.json"] : [])];

function run(cmd: string, a: string[], capture = false): string {
  const r = spawnSync(cmd, a, { stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit", encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`\n✗ "${[cmd, ...a].join(" ")}" failed (exit ${r.status}). Nothing was pushed.`);
    process.exit(r.status ?? 1);
  }
  return r.stdout ?? "";
}
const TOTAL = web ? 5 : 4;
const step = (n: number, label: string) => console.error(`\n[${n}/${TOTAL}] ${label}`);

step(1, "Pulling latest from GitHub");
run("git", ["pull", "--rebase", "--autostash", "origin", "main"]);

step(2, "Syncing your Discogs collection");
run("npm", ["run", "sync", ...syncArgs]);

step(3, "Building recommendations (Spotify → Discogs → Shuga)");
run("npm", ["run", "recommend"]);

if (web) {
  step(4, "Web hunt with Claude Code (a few minutes)");
  run("npm", ["run", "hunt"]);
}

step(TOTAL, noPush ? "Committing (not pushing)" : "Committing and pushing (site will redeploy)");
run("git", ["add", ...DATA]);
if (!run("git", ["status", "--porcelain", "--", ...DATA], true).trim()) {
  console.error("Nothing changed, so there is nothing to commit.");
  process.exit(0);
}
run("git", ["commit", "-m", "Refresh collection and picks", "--", ...DATA]);
if (!noPush) run("git", ["push", "origin", "main"]);
console.error(noPush ? "\n✓ Done (committed locally)." : "\n✓ Done. The site redeploys in a minute or two.");
