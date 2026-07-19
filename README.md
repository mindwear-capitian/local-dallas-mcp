# local-city-mcp

The home for the `local-{city}-mcp` family: the spec, the list of cities
built so far, and the template repo for building a new one — all in one
place.

`local-{city}-mcp` is an MCP server that gives an AI assistant plain-English
access to official, public, no-key data about one metro area — property
records, permits, civic data, schools, environment, public safety, and
(where the maintainer has the right) real estate listings.

**Before you touch any code, read [STANDARD.md](STANDARD.md).** It's the
spec: the hard rules, the tool contract, the testing bar, and the licensing
pattern. Everything else here just tells you how to use the template
mechanically; STANDARD.md tells you why it's built this way.

Reference implementation this was extracted from:
[local-austin-mcp](https://github.com/mindwear-capitian/local-austin-mcp)
(41 tools, live in production).

## The list

| City | Repo | Tools | Maintainer | CI |
|---|---|---|---|---|
| Austin, TX | [local-austin-mcp](https://github.com/mindwear-capitian/local-austin-mcp) | 41 | [Ed Neuhaus](https://neuhausre.com) | [![CI](https://github.com/mindwear-capitian/local-austin-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/mindwear-capitian/local-austin-mcp/actions/workflows/ci.yml) |

*(Your city not here yet? Build one below, then open a PR adding a row.)*

### Using one

Add to your Claude Desktop config (or any MCP client's config):

```jsonc
{
  "mcpServers": {
    "local-austin": {
      "command": "npx",
      "args": ["-y", "github:mindwear-capitian/local-austin-mcp"]
    }
  }
}
```

Swap the repo for whichever city you want from the table above.

## Building a new one

1. **Use this template** — GitHub's "Use this template" button on this repo,
   or:

   ```bash
   gh repo create local-{city}-mcp --template mindwear-capitian/local-city-mcp-template
   ```

   > This copies everything in this repo, including this README's list
   > table. Replace this whole README with your own city's (see step 5) —
   > the table above is this repo's index, not part of your city's docs.

2. **Replace every placeholder.** Every file that needs per-city values uses
   bare `{{TOKEN}}` markers (no leading `$` — deliberate, so they never
   collide with `${{ }}` GitHub Actions expression syntax in
   `.github/workflows/ci.yml`, which you should leave untouched). Find them
   all with:

   ```bash
   grep -rl '{{[A-Z_]*}}' --include='*.js' --include='*.json' --include='*.md' .
   ```

   | Token | Example | Where it's used |
   |---|---|---|
   | `{{CITY}}` | `Denver` | Display name, in prose |
   | `{{CITY_SLUG}}` | `denver` | Tool prefix, package name, repo name |
   | `{{CITY_SLUG_UPPER}}` | `DENVER` | Env var name (`LOCAL_DENVER_MCP_TIER`) |
   | `{{MAINTAINER_NAME}}` | `Jane Doe` | Attribution, package.json author |
   | `{{MAINTAINER_URL}}` | `https://janedoe.com` | Attribution, homepage |
   | `{{GITHUB_USER}}` | `janedoe` | Repo URLs |
   | `{{DEFAULT_LAT}}` / `{{DEFAULT_LNG}}` | `39.74`, `-104.99` | Default map center for the example NWS tool |

   A one-shot sed pass works fine for a first pass — just review the diff
   before committing, since a couple of tokens (like `{{CITY}}` inside
   prose sentences) are case-sensitive on purpose.

3. **Run it:**

   ```bash
   npm install
   npm start          # runs the MCP over stdio
   npm test           # unit tests
   npm run test:contract  # boots the server, calls every tool via the real MCP layer
   ```

4. **Build your first real tool.** See CONTRIBUTING.md — copy
   `tools/environment/nws-alerts.js` (works for any US city untouched once
   you fill in the placeholders) as your pattern reference, or
   `tools/meta/about.js` for the minimal shape.

5. **When it's real:** replace this README with your city's own (tool
   table, `Sources of Truth` table, Architecture section — see
   [local-austin-mcp's README](https://github.com/mindwear-capitian/local-austin-mcp#readme)
   for the shape once you have more than a couple of tools).

6. **Get listed:** once `test:contract` is green in CI and you meet
   STANDARD.md §2, open a PR against **this repo** adding one row to the
   table above. See [CONTRIBUTING.md](CONTRIBUTING.md).

## What's already built for you

| File | What it gives every tool for free |
|---|---|
| `lib/register.js` | Central registration: default MCP annotations, error→friendly-frame wrapping, `structuredContent` auto-promotion, tier gating |
| `lib/retry.js` | `retryFetch()` with jittered backoff + `UpstreamError` + LLM-friendly error text ("the MCP is fine, the upstream is having a problem") |
| `lib/request-context.js` | Propagates the MCP request's `AbortSignal` into every downstream fetch via `AsyncLocalStorage`, so client-side cancellation actually cancels in-flight calls |
| `lib/output-schemas.js` | Shared Zod shapes (`searchShape`, `openObjectShape`, etc.) for `outputSchema` |
| `lib/geocode.js` | U.S. Census geocoder — free, no key, works nationwide |
| `lib/soda.js` | Generic Socrata (SODA) open-data client — works against any city or state's Socrata portal, not just your own (proven: same client, zero changes, powers both Austin's own permits/311/crime data AND the statewide Texas TEA school-ratings dataset) |
| `lib/semaphore.js` | Named per-source concurrency caps (`withLimit`) so a fan-out composed tool doesn't hammer one upstream |
| `lib/logger.js` | stderr + MCP logging-notification logger |
| `lib/tiers.js` | Optional `core`/`all` tool-tier gating for once you have 20+ tools |
| `tools/meta/about.js` | Minimal tool example + the required `about` capability tool |
| `tools/environment/nws-alerts.js` | A **real, working example tool** (National Weather Service alerts) — copy its shape |
| `test/mcp-all-tools.js` | The required contract test (STANDARD.md §6) |
| `.github/workflows/ci.yml` | Unit + contract test on Node 20 + 22 |

None of this is speculative — it's copied from a production server that
shipped 41 tools. Read `lib/register.js` and `lib/retry.js` top-of-file
comments for the reasoning if you're wondering why a piece exists.

## License

The template code (`lib/`, `tools/`, `index.js`, tests, CI) is Apache
License 2.0 (see [LICENSE](LICENSE)) — use it, fork it, build a commercial
product on it. Fill in `NOTICE` and `TRADEMARK.md` with your own name/marks
before you ship; the placeholders in those files are examples, not defaults
you inherit. This README's list-curation text is not separately licensed —
it's not code, do with it what you like.
