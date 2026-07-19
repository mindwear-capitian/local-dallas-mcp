# Local Dallas MCP

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-stdio-purple)](https://modelcontextprotocol.io/)

> **Your AI's local guide to Dallas.** A Model Context Protocol (MCP) server giving Claude (and any MCP client) plain-English access to official Dallas-area public data — no API keys, no logins.

**License:** Open source under **[Apache License 2.0](LICENSE)** — free to use, modify, and build on, including commercially. Please keep the [NOTICE](NOTICE) attribution when you redistribute.
**Built by:** [Ed Neuhaus](https://edneuhaus.com).
**Source:** https://github.com/mindwear-capitian/local-dallas-mcp
**Part of a family:** [local-city-mcp-template](https://github.com/mindwear-capitian/local-city-mcp-template) — the spec, the template, and the full list of cities built so far.

> 🚧 **Early-stage.** Three tools live today (weather alerts, school ratings, 311). More Dallas/Dallas-area civic and property data planned — see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Install

Add to your Claude Desktop config:

```jsonc
// claude_desktop_config.json
{
  "mcpServers": {
    "local-dallas": {
      "command": "npx",
      "args": ["-y", "github:mindwear-capitian/local-dallas-mcp"]
    }
  }
}
```

Restart Claude Desktop. No API keys required for any tool.

### Claude Code

```bash
claude mcp add local-dallas npx -y github:mindwear-capitian/local-dallas-mcp
```

---

## Try it

- *"Is there an active weather alert for Dallas right now?"*
- *"What's the TEA rating for Dallas ISD?"*
- *"Show me A-rated elementary schools in Dallas county."*
- *"Any open code compliance 311 requests in council district 10?"*

---

## Tools (3 live)

| Tool | What it does |
|------|--------------|
| `dallas_nws_alerts` | Active National Weather Service alerts (severe thunderstorm, tornado, flood, heat, freeze, fire weather) for a Dallas location. Defaults to central Dallas when no address given. |
| `dallas_tea_schools` | Texas Education Agency school lookup — A-F accountability ratings + AskTED campus directory (statewide dataset). Search by campus, district, county, or city. Example districts: Dallas ISD, Plano ISD, Highland Park ISD. |
| `dallas_311` | City of Dallas 311 service requests (code compliance, streets, sanitation, etc). Filter by type, department, status, council district, or address. |
| `about` | Version + capability summary. |

## Sources of Truth

| Domain | Source |
|--------|--------|
| Weather alerts | National Weather Service (api.weather.gov) |
| School ratings | Texas Education Agency Statewide Accountability Ratings 2022-2023 + AskTED directory (data.texas.gov) — statewide dataset, same source used by [local-austin-mcp](https://github.com/mindwear-capitian/local-austin-mcp) |
| 311 service requests | City of Dallas Open Data (dallasopendata.com), dataset `gc4d-8a49` |
| Geocoding | U.S. Census geocoder |

## Architecture

Node.js (ES modules), `@modelcontextprotocol/sdk` over stdio. Built from [local-city-mcp-template](https://github.com/mindwear-capitian/local-city-mcp-template) — see that repo's `STANDARD.md` for the spec (hard rules, tool contract, testing bar, licensing pattern) this server follows. Every response includes a `source_url`.

## Contact

Built by [Ed Neuhaus](https://edneuhaus.com). Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
