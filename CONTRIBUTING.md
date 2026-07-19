# Contributing

This file covers three different audiences — pick the section that applies.

## A) You're building a NEW local-{city}-mcp from this template

You're not really "contributing to" this repo — you're using it as a
starting point. See the README's "Building a new one" section for the
placeholder-replacement mechanics. The rules below still apply to what you
build; they're the same rules the reference implementation
(`local-austin-mcp`) follows, extracted into [STANDARD.md](STANDARD.md).

## B) Your city's server is done and you want it listed here

Open a PR adding **one row** to the table in this repo's README. Before you
do, confirm all of the following — reviewers will check:

- [ ] Repo is named `local-{city}-mcp`.
- [ ] Runs with **zero required credentials** (`npx github:{you}/local-{city}-mcp`
      just works — no signup, no API key).
- [ ] Every tool pulls from an **official, public source** — no third-party
      aggregators, no AI-generated content presented as fact.
- [ ] Every response includes a `source_url`.
- [ ] Has a `test:contract` script (spawns the server, calls every tool
      through the real MCP protocol layer, validates output) and it's
      **green in CI** — link the passing Actions run in your PR.
- [ ] Has a LICENSE (Apache-2.0 recommended — see [STANDARD.md §8](STANDARD.md#8-attribution-license-and-trademark) —
      but any OSI-approved permissive license is fine).
- [ ] README documents its tools and sources of truth (a table like
      [local-austin-mcp's](https://github.com/mindwear-capitian/local-austin-mcp#tools-41-live)).

**PR format:** add your row, keep alphabetical by city, keep the CI badge —
it's how anyone browsing the list can tell at a glance whether a listed
server is currently healthy.

**Removal policy:** a listed server may be removed if the repo is
deleted/archived, CI has been red for an extended period with no response
to an issue, or it's found to violate the hard rules below (e.g. started
requiring a credential).

## C) You're contributing back to THIS repo (the template/spec/list itself)

Improvements to the shared `lib/` infrastructure, the example tools, the
spec, or the list curation are welcome — e.g. a bug in `retryFetch`'s
backoff, a clearer `STANDARD.md` section, a better worked-example tool, a
broken link in the list. Anything genuinely city-specific belongs in a
city's own repo, not here.

## Ground rules (apply to every local-{city}-mcp, hard constraints)

Full detail in [STANDARD.md](STANDARD.md) §2. Summary:

1. **No credentials, ever.** These packages are self-hosted by strangers via
   `npx github:`. Zero required API keys or logins.
2. **Only official / public sources.** No third-party aggregators, no
   AI-generated content presented as fact.
3. **Every response carries a `source_url`.**
4. **Fail soft** in composed/multi-section tools.
5. **No PII** beyond what the source itself already publishes.

## Setup

```bash
git clone https://github.com/{{GITHUB_USER}}/local-{{CITY_SLUG}}-mcp
cd local-{{CITY_SLUG}}-mcp
npm install
npm start          # runs the MCP over stdio
```

Node 20+.

## Adding a tool

A tool is a small module that exports an object with `name`, `description`,
`inputSchema` (zod), and an async `handler`. Look at `tools/meta/about.js`
for the minimal shape, and `tools/environment/nws-alerts.js` for a full
real-data-fetching example (geocoding, `retryFetch`, structured output,
graceful error handling).

1. Create the file under a category folder that makes sense for your data
   (`tools/property/`, `tools/civic/`, `tools/environment/`,
   `tools/composed/`, etc. — match `local-austin-mcp`'s categories where they
   fit, add new ones where they don't).
2. Export a tool object:

   ```js
   import { z } from "zod";
   import { withAttributionTag, ATTRIBUTION_TAG } from "../../lib/attribution.js";
   import { retryFetch, upstreamErrorText } from "../../lib/retry.js";

   export const yourTool = {
     name: "{{CITY_SLUG}}_your_thing",
     description: withAttributionTag("One clear sentence on what it answers."),
     inputSchema: { address: z.string().describe("Street address") },
     async handler({ address }) {
       // fetch from an official/public source via retryFetch()
       // return { content: [{ type: "text", text }, { type: "text", text: JSON.stringify({...}) }] }
       // every record in the JSON body needs a source_url
     },
   };
   ```

3. Register it in `index.js` (import + add to `ALL_TOOLS`).
4. Add it to `test/mcp-all-tools.js`'s `ARGS` map (and `EXPECT_SUCCESS` if
   the sample args should reliably succeed).

## Testing

```bash
npm run test:unit      # unit tests -- pure logic (formatters, normalizers)
npm run test:contract  # boots the server, calls every tool through the real MCP layer
```

CI (`.github/workflows/ci.yml`) runs both on Node 20 and 22 on every push.
Both must pass before a PR merges. `test:contract` is the one that catches a
tool whose `structuredContent` doesn't actually match its `outputSchema` —
see STANDARD.md §6 for why that class of bug matters.

## Getting listed

See section B above — once your server is real and green in CI, open a PR
against **this repo** adding one row to the README's list table.

## Questions

Open an issue on whichever repo the question is actually about (this repo,
or your city's own repo).
