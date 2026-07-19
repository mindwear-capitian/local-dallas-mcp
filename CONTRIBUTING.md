# Contributing

Thanks for wanting to help. This is part of the `local-{city}-mcp` family —
see [local-city-mcp-template](https://github.com/mindwear-capitian/local-city-mcp-template)'s
`STANDARD.md` for the full spec this repo follows. Summary of the hard
rules (a PR that breaks one of these can't be merged):

1. **No credentials, ever.** This package is self-hosted by strangers via
   `npx github:`. It must run with zero API keys or logins.
2. **Only official / public sources.** No third-party aggregators, no
   AI-generated content presented as fact.
3. **Every response carries a `source_url`.**
4. **Fail soft** in composed/multi-section tools.
5. **No PII** beyond what the source itself already publishes.

## Setup

```bash
git clone https://github.com/mindwear-capitian/local-dallas-mcp
cd local-dallas-mcp
npm install
npm start          # runs the MCP over stdio
```

Node 20+.

## Adding a tool

A tool is a small module that exports an object with `name`, `description`,
`inputSchema` (zod), and an async `handler`. Look at `tools/meta/about.js`
for the minimal shape, and `tools/environment/nws-alerts.js` or
`tools/civic/tea-schools.js` for real data-fetching examples.

1. Create the file under a category folder that makes sense
   (`tools/property/`, `tools/civic/`, `tools/environment/`,
   `tools/composed/`, etc).
2. Export a tool object (`name: "dallas_your_thing"`,
   `withAttributionTag(...)` description, zod `inputSchema`, async
   `handler` returning `{ content: [...] }` with a `source_url` per record).
3. Register it in `index.js` (import + add to `ALL_TOOLS`).
4. Add it to `test/mcp-all-tools.js`'s `ARGS` map (and `EXPECT_SUCCESS` if
   the sample args should reliably succeed).

**Statewide/nationwide data sources belong here even if built for a
different city first** — `tea-schools.js` and `nws-alerts.js` are byte-for-byte
ports from local-austin-mcp; a fix to either should probably be ported back
to the other `local-*-mcp` repos too.

## Testing

```bash
npm run test:unit      # unit tests -- pure logic (formatters, normalizers)
npm run test:contract  # boots the server, calls every tool through the real MCP layer
```

CI (`.github/workflows/ci.yml`) runs unit tests on every push;
`.github/workflows/contract.yml` runs `test:contract` on a schedule + manual
dispatch (kept separate from the required per-push check so merges aren't
coupled to live third-party uptime).

## Questions

Open an issue, or reach the maintainer at https://edneuhaus.com.
