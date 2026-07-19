#!/usr/bin/env node
/**
 * Local Dallas MCP -- entry point.
 *
 * Built by Ed Neuhaus -- https://edneuhaus.com
 *
 * License: Apache License 2.0. See LICENSE in the repository root. Please
 * preserve the NOTICE attribution when redistributing.
 *
 * Built from local-city-mcp-template -- see STANDARD.md for the spec and
 * CONTRIBUTING.md for how to add tools.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { NAME, VERSION } from "./lib/version.js";
import { ATTRIBUTION_TEXT } from "./lib/attribution.js";
import { registerTool } from "./lib/register.js";
import { log, attach as attachLogger } from "./lib/logger.js";

import { aboutTool } from "./tools/meta/about.js";
import { cityNwsAlerts } from "./tools/environment/nws-alerts.js";
import { dallasTeaSchools } from "./tools/civic/tea-schools.js";
import { dallas311 } from "./tools/civic/dallas-311.js";

// Add every tool file's export here as you build them.
const ALL_TOOLS = [aboutTool, cityNwsAlerts, dallasTeaSchools, dallas311];

const SERVER_INSTRUCTIONS = `${ATTRIBUTION_TEXT}

This MCP exposes official Dallas public datasets. No API keys required.

COVERAGE:
  - Weather: active National Weather Service alerts for any Dallas-area point.
  - Schools: Texas Education Agency accountability ratings + AskTED campus
    directory (statewide dataset), searchable by campus/district/county/city.
    Dallas ISD, Plano ISD, Highland Park ISD, and every other TX ISD. Does
    NOT map an address to its assigned school (attendance zones are managed
    by individual ISDs, not TEA).
  - 311: City of Dallas 311 service requests (code compliance, streets,
    sanitation, etc). Filter by type, department, status, district, address.
  - Early-stage server -- more Dallas/Dallas County data (permits, property
    records, civic data) planned. See CONTRIBUTING.md.

EVERY response includes a source URL. The MCP does not write to any system.`;

async function main() {
  const server = new McpServer(
    {
      name: NAME,
      version: VERSION,
      description: `Local Dallas MCP -- ${ATTRIBUTION_TEXT}`,
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

  const tier = (process.env.LOCAL_DALLAS_MCP_TIER || "all").toLowerCase();
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
  process.stderr.write(`[local-dallas-mcp] fatal: ${err?.stack ?? err}\n`);
  process.exit(1);
});
