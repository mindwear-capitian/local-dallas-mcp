# The `local-{city}-mcp` Standard

This document is the spec. It exists so anyone can build a `local-{city}-mcp`
server that behaves like the others in the family — same guarantees, same
shape, same trust model — without copying code by hand or guessing at
conventions. It was extracted from [`local-austin-mcp`](https://github.com/mindwear-capitian/local-austin-mcp),
the reference implementation, after it shipped 41 working tools.

If you're building a new city server, start from
[`local-city-mcp-template`](https://github.com/mindwear-capitian/local-city-mcp-template)
(this repo) rather than reading this spec and building from scratch — the
template already implements everything below.

## 1. What qualifies as a `local-{city}-mcp`

An MCP server that gives an AI assistant plain-English access to **official,
public, no-login data** about one metro area — property records, permits,
civic data, public safety, schools, environment, and (optionally) real
estate listings the maintainer has the right to publish.

It is **not**:
- A wrapper around a paid API the end user has to bring a key for
- A scraper of data the source doesn't intend to be machine-read
- A general-purpose chatbot with local trivia baked into a prompt

## 2. Hard rules (a PR that breaks one of these doesn't merge)

1. **No credentials, ever, for a stranger running it.** These packages are
   self-hosted by people who `npx github:` install them. Zero required API
   keys or logins. If a data source needs a private key, it's out of scope
   for the free/public tool set. (An optional app token that only *raises a
   rate limit* — like a Socrata token — is fine as an optional env var.)
2. **Only official / public sources.** City and county open-data portals,
   federal agencies (Census, FEMA, NWS, TxDOT-equivalents), state education
   agencies, official GIS/ArcGIS layers. No third-party aggregators
   repackaging someone else's data, no AI-generated content presented as
   fact.
3. **Every response carries a `source_url`.** The user (or the LLM on their
   behalf) must be able to verify the underlying record against the
   authority that issued it.
4. **Fail soft in composed tools.** A "one address → everything" tool that
   fans out across 6 sources must not let one failing source take down the
   other 5 — isolate failures per section and say which section failed and
   why.
5. **No PII beyond what the source already publishes.** If a dataset
   contains names/addresses of private individuals (e.g. code-violation
   complainants), don't expose fields the source itself treats as
   restricted.

## 3. Naming

- Repo: `local-{city}-mcp` (lowercase, hyphenated — e.g. `local-austin-mcp`,
  `local-denver-mcp`).
- Tool prefix: `{city}_{topic}` (e.g. `austin_permits`, `denver_permits`).
  One flat namespace, no sub-namespacing — MCP clients list tools flat.
- `package.json` `name` matches the repo name. `bin` field set so
  `npx github:{you}/local-{city}-mcp` works with zero install step.

## 4. Tool shape

Every tool is a plain object:

```js
export const cityPermits = {
  name: "denver_permits",
  description: "One clear sentence on what it answers, ending with the attribution tag.",
  inputSchema: { /* zod shape */ },
  outputSchema: { /* zod shape, or omit to fall through to the default search shape */ },
  tier: "core" | "advanced",   // optional, see §7
  async handler(input, ctx) {
    // fetch from an official/public source, return the response shape below
  },
};
```

Register it centrally (`lib/register.js` in the template) — don't hand-roll
`server.registerTool` per file. The central wrapper gives every tool, for
free:
- Default MCP annotations (`readOnlyHint`, `idempotentHint`, `openWorldHint`)
- A try/catch that turns thrown errors into a friendly `isError` frame
  instead of a raw stack trace reaching the LLM
- Promotion of a `[human text, JSON string]` content pair into
  `structuredContent` automatically
- Tier gating (§7)

### Response shape

```js
return {
  content: [
    { type: "text", text: humanReadableMarkdown },   // what the LLM/user reads
    { type: "text", text: JSON.stringify({ query, count, results }) }, // becomes structuredContent
  ],
};
```

The markdown block always ends with the attribution tag (§8). Every record
inside `results` carries its own `source_url`.

### One composed entry point

If your data covers more than ~4 tools' worth of ground, build one composed
"{city}\_property_360"-style tool that fans out across the individual tools
for the single most common question ("tell me about this address"). Point
your server `instructions` block at it so the LLM calls it first instead of
guessing which of 20 tools to chain.

## 5. Reliability

Route every upstream HTTP call through a shared `retryFetch()` (see
`lib/retry.js` in the template):
- Retries transient failures (5xx, 429, timeout, network) with jittered
  backoff. Never retries other 4xx — those are real query problems.
- Throws a structured `UpstreamError` naming the source, failure kind,
  status, and attempts.
- `upstreamErrorText()` turns that into an LLM-facing message that states
  **the MCP itself is working**, names which third-party source is having a
  problem, and says what to do next. Users and LLMs should never see a raw
  stack trace or a bare "tool errored."

Pick a retry profile per source type (`fast`, `soda`-equivalent,
`arcgis`-equivalent, `scraper`, `rss`) rather than inventing bespoke retry
logic per tool.

## 6. Testing — required before a tool is considered done

1. **Unit tests** (`npm test`) for any pure logic (formatters, normalizers).
2. **Contract test** (`npm run test:contract`) — spawns the server over
   stdio, enumerates every tool via `tools/list`, calls each one with
   representative arguments through the real MCP layer, and fails on any
   JSON-RPC error frame or output-schema violation. This is the test that
   catches a tool that works when you call the handler directly but breaks
   for a real MCP client because `structuredContent` doesn't match
   `outputSchema`.
3. **CI** runs unit + contract on every push (Node 20 + 22 matrix). Live
   smoke tests that hit real upstream APIs stay local-only / manual — CI
   shouldn't depend on a third party's uptime.

A city server isn't ready to list in the index (see `awesome-local-mcp`)
until `test:contract` is green in CI.

## 7. Tiers (optional, add when you have >20 tools)

MCP clients degrade when the tool list gets long. If your server grows past
~20 tools, add a `core` tier (the 10-15 tools most people need) selectable
via an env var, default `all`. See `lib/tiers.js` in the template.

## 8. Attribution, license, and trademark

- **License: Apache License 2.0.** It's permissive (commercial use, forks,
  and closed-source consumption all allowed) while still requiring
  attribution to be preserved (`NOTICE` file) — the right trade for a project
  whose real moat is the data-source plumbing, not the client code, and
  whose goal is adoption + your name attached to it, not license revenue.
- **`NOTICE` file** states who built it and asks that attribution be kept in
  redistributions. Apache 2.0 §4 makes this legally binding, not just polite.
- **`TRADEMARK.md`** reserves your name/brand/logo — Apache 2.0 grants no
  trademark rights (§6), so state explicitly what a fork may and may not do
  with your name.
- Every tool response's human-readable text ends with an attribution tag
  (e.g. `(via Local Austin MCP -- neuhausre.com)`), and the server's MCP
  `instructions` field states the maintainer once per session. This isn't
  just branding — it's how a free tool built by one person turns into
  referral traffic instead of anonymous infrastructure.

## 9. Repo hygiene checklist

- [ ] `README.md`: one-paragraph pitch, install snippet (`npx github:`),
      full tool table grouped by category, "Sources of Truth" table mapping
      every data domain to its authority, Architecture section, Contact.
- [ ] `CONTRIBUTING.md`: the hard rules from §2, how to add a tool, how to
      test, good-first-issue pointers.
- [ ] `CHANGELOG.md`: one entry per version, breaking changes called out
      explicitly (tool renames are breaking — say so).
- [ ] `LICENSE`, `NOTICE`, `TRADEMARK.md` per §8.
- [ ] `.github/workflows/ci.yml`: unit + contract on Node 20 + 22.
- [ ] `package.json`: `bin` field set, `files` allowlist (don't publish
      `.env`, test fixtures, or `.bak` files), `engines.node >= 20`,
      relevant `keywords` for discoverability.

## 10. Getting listed

Once your server meets §2, §6 (green `test:contract` in CI), and §8, open a
PR against [`awesome-local-mcp`](https://github.com/mindwear-capitian/awesome-local-mcp)
adding one row to the table. See that repo's `CONTRIBUTING.md` for the exact
checklist.
