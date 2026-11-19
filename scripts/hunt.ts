// Headless web hunt: asks Claude Code (`claude -p`) to research prices for your picks and write
// data/web-offers.json, then validates and merges the result deterministically.
// Usage: npm run hunt [-- --limit 6] [-- --minutes 15]
// Needs the Claude Code CLI installed and logged in. Uses your Claude plan's usage.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";

// Only the overall shape is checked here; individual bad offers are dropped (and reported) by merge-web.
const FileShape = z.object({ generatedAt: z.string(), offers: z.array(z.unknown()) });

const arg = (name: string, dflt: number) => {
  const i = process.argv.indexOf(`--${name}`);
  const n = i >= 0 ? Number(process.argv[i + 1]) : dflt;
  return Number.isFinite(n) && n > 0 ? n : dflt;
};
const limit = arg("limit", 6);
const minutes = arg("minutes", 15);

const picks = new URL("../data/picks.json", import.meta.url);
const offers = new URL("../data/web-offers.json", import.meta.url);
if (!existsSync(picks)) { console.error("No data/picks.json yet. Run `npm run recommend` first."); process.exit(1); }

const v = spawnSync("claude", ["--version"], { encoding: "utf8" });
if (v.error || v.status !== 0) {
  console.error("Claude Code CLI not found. Install it and log in (see https://docs.claude.com/en/docs/claude-code), then retry.");
  process.exit(1);
}

const before = existsSync(offers) ? readFileSync(offers, "utf8") : "";
const backup = new URL("../data/web-offers.backup.json", import.meta.url);
if (existsSync(offers)) copyFileSync(offers, backup);

const prompt =
  `Follow the instructions in .claude/skills/vinyl-web-hunt/SKILL.md exactly. LIMIT=${limit}. ` +
  `Today is ${new Date().toISOString()}. Your only output is data/web-offers.json.`;

console.error(`Researching up to ${limit} picks with Claude (time limit ${minutes} min)…`);
const r = spawnSync("claude", [
  "-p", prompt,
  // Pre-approved tools (nobody is there to click "approve"). Edits are limited to the one data file.
  "--allowedTools", "Read", "WebSearch", "WebFetch", "Edit(data/web-offers.json)", "Write(data/web-offers.json)",
  "--no-session-persistence",
], { stdio: ["ignore", "inherit", "inherit"], timeout: minutes * 60_000 });

if (r.error || r.status !== 0) {
  console.error(`\n✗ Claude run ${r.error ? "failed or timed out" : `exited with ${r.status}`}. Restoring the previous web-offers.json.`);
  if (existsSync(backup)) copyFileSync(backup, offers);
  process.exit(1);
}

// Check Claude left a well-formed file; if not, put the old one back.
try {
  FileShape.parse(JSON.parse(readFileSync(offers, "utf8")));
} catch (e) {
  console.error(`\n✗ Claude wrote an invalid web-offers.json (${(e as Error).message.split("\n")[0]}). Restoring the previous one.`);
  if (existsSync(backup)) copyFileSync(backup, offers); else writeFileSync(offers, '{"generatedAt":"","offers":[]}\n');
  process.exit(1);
}

if (readFileSync(offers, "utf8") === before) {
  console.error("\n⚠ web-offers.json is unchanged. Either nothing verifiable was found, or Claude was not allowed to write the file (check its report above).");
}

const m = spawnSync("npm", ["run", "merge-web"], { stdio: "inherit" });
process.exit(m.status ?? 0);
