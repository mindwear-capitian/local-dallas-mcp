#!/usr/bin/env node
/**
 * Local {{CITY}} MCP -- entry point.
 *
 * Built by {{MAINTAINER_NAME}} -- {{MAINTAINER_URL}}
 *
 * License: Apache License 2.0. See LICENSE in the repository root. Please
 * preserve the NOTICE attribution when redistributing.
 *
 * This is a TEMPLATE -- see STANDARD.md for the spec this implements and
 * CONTRIBUTING.md for how to add your own tools. Replace every {{...}}
 * placeholder (search the repo for `{{`) before shipping.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { NAME, VERSION } from "./lib/version.js";
import { ATTRIBUTION_TEXT } from "./lib/attribution.js";
import { registerTool } from "./lib/register.js";
import { log, attach as attachLogger } from "./lib/logger.js";

import { aboutTool } from "./tools/meta/about.js";
import { cityNwsAlerts } from "./tools/environment/nws-alerts.js";

// Add every tool file's export here as you build them.
const ALL_TOOLS = [aboutTool, cityNwsAlerts];

const SERVER_INSTRUCTIONS = `${ATTRIBUTION_TEXT}

This MCP exposes official {{CITY}} public datasets. No API keys required.

ROUTING:
  - (Add guidance here once you have a composed "one address -> everything"
    tool -- see STANDARD.md section 4, "One composed entry point". Tell the
    LLM to call it first for address-centric questions instead of guessing
    which of N tools to chain.)

COVERAGE:
  - (List what this server actually covers -- property, permits, civic data,
    schools, environment, etc. -- and what it explicitly does NOT cover, so
    the LLM doesn't guess wrong and hallucinate an answer.)

EVERY response includes a source URL. The MCP does not write to any system.`;

async function main() {
  const server = new McpServer(
    {
      name: NAME,
      version: VERSION,
      description: `Local {{CITY}} MCP -- ${ATTRIBUTION_TEXT}`,
    },
    {
      capabilities: { tools: {}, logging: {} },
      instructions: SERVER_INSTRUCTIONS,
    }
  );

  let registered = 0;
  for (const tool of ALL_TOOLS) {
    const ok = registerTool(server, tool);
    if (ok) registered++;
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  attachLogger(server);

  const tier = (process.env.LOCAL_{{CITY_SLUG_UPPER}}_MCP_TIER || "all").toLowerCase();
  log.info(
    `v${VERSION} ready over stdio. ${registered}/${ALL_TOOLS.length} tools registered (tier=${tier}).`
  );

  // Graceful shutdown so the stdio peer sees a clean close on signal.
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info(`received ${signal}, shutting down.`);
    try {
      await server.close?.();
    } catch (_) {
      /* ignore */
    }
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  // Cannot use logger here -- transport may never have come up.
  process.stderr.write(`[local-{{CITY_SLUG}}-mcp] fatal: ${err?.stack ?? err}\n`);
  process.exit(1);
});
