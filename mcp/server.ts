// MCP server exposing Discogs as tools Claude can call.
// Run: npm run mcp   (talks over stdio, so don't console.log to stdout!)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getCollection, searchVinyl, getMarketStats } from "../lib/discogs";

const server = new McpServer({ name: "discogs", version: "0.1.0" });

// A tool = name + description (what the AI reads) + input schema + handler.
server.tool(
  "search_vinyl",
  "Search Discogs for vinyl releases by artist and/or album title. Returns ids, years, labels and Discogs URLs.",
  { artist: z.string().optional(), title: z.string().optional(), limit: z.number().min(1).max(25).default(10) },
  async ({ artist, title, limit }) => {
    const results = await searchVinyl({ artist, title }, limit);
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  },
);

server.tool(
  "get_price_stats",
  "Get the lowest current marketplace price (USD) and number of copies for sale for a Discogs release id.",
  { release_id: z.number() },
  async ({ release_id }) => {
    const stats = await getMarketStats(release_id);
    return { content: [{ type: "text", text: JSON.stringify(stats) }] };
  },
);

server.tool(
  "get_my_collection",
  "List the vinyl records in the user's Discogs collection (uses DISCOGS_USERNAME).",
  {},
  async () => {
    const username = process.env.DISCOGS_USERNAME;
    if (!username) return { isError: true, content: [{ type: "text", text: "DISCOGS_USERNAME not set" }] };
    const items = await getCollection(username);
    return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
  },
);

async function main() {
  await server.connect(new StdioServerTransport());
  console.error("discogs MCP server running on stdio"); // stderr is safe; stdout is the protocol
}
main();
