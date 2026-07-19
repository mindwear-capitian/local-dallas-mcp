/**
 * Tool tiers.
 *
 * `core` is the minimum set most people need from this MCP. Useful once your
 * server grows past ~20 tools -- some MCP clients render the tools/list
 * payload to the LLM and degrade quality past a soft cap (roughly 20-25).
 *
 * Set LOCAL_DALLAS_MCP_TIER=core in the client config to load
 * only this set. Default (unset or "all") loads everything.
 *
 * Empty by default -- this file only matters once you're adding tools past
 * the point where a full tools/list becomes unwieldy. Add public tool names
 * here as your server grows. Names here are the PUBLIC (post-rename, if you
 * use one) names registered with the server.
 */

export const CORE_TOOL_NAMES = new Set([
  "about",
  // Add your most-used tool names here once you have more than ~15 tools.
]);

export function tierFromEnv() {
  return String(process.env.LOCAL_DALLAS_MCP_TIER || "all").toLowerCase();
}
