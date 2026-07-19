/**
 * Comprehensive end-to-end contract test. REQUIRED per STANDARD.md section 6.
 *
 * Spawns the MCP server over stdio, enumerates EVERY tool via tools/list, and
 * calls each one through the real MCP layer with representative arguments.
 *
 * Why this exists: a tool whose handler omits a required `structuredContent`
 * field (or whose `outputSchema` doesn't match what it actually returns) can
 * pass a smoke test that calls the handler directly, while still breaking
 * for a real MCP client that validates structured output (e.g. Claude
 * Desktop). This test calls through the actual MCP JSON-RPC layer, so it
 * catches that class of bug.
 *
 * Pass/fail rules per tool:
 *   - HARD FAIL  : response carries a top-level JSON-RPC `error`. That is a
 *                  protocol- or output-schema violation.
 *   - OK         : `result` returned. `result.isError` is acceptable (the
 *                  tool handled bad upstream/empty input gracefully -- the
 *                  contract still held).
 *
 * Add a row to ARGS for every tool you add. Add its name to EXPECT_SUCCESS
 * if the args you gave it should reliably return real data (so the happy
 * path's structuredContent actually gets exercised, not just the error path).
 *
 * Exit non-zero if any tool hard-fails.
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(__dirname, "..", "index.js");

// Representative args per PUBLIC tool name. Anything omitted is called with {}.
const ARGS = {
  about: {},
  "dallas_nws_alerts": {},
  "dallas_tea_schools": { district: "Dallas ISD", limit: 3 },
};

const EXPECT_SUCCESS = new Set(["about", "dallas_nws_alerts", "dallas_tea_schools"]);

const PER_CALL_TIMEOUT = 30000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn("node", [serverPath], { stdio: ["pipe", "pipe", "pipe"] });

let buf = "";
const responses = [];
server.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  let idx;
  while ((idx = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (line) {
      try {
        responses.push(JSON.parse(line));
      } catch {
        /* ignore non-JSON log lines on stdout */
      }
    }
  }
});
server.stderr.on("data", (c) => process.stderr.write(c));

function send(msg) {
  server.stdin.write(JSON.stringify(msg) + "\n");
}

async function expect(id, label, timeoutMs = PER_CALL_TIMEOUT) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const found = responses.find((r) => r.id === id);
    if (found) return found;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Timeout waiting for ${label}`);
}

async function main() {
  send({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "all-tools-test", version: "0.0.0" },
    },
  });
  await expect(1, "initialize");
  send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

  send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  const list = await expect(2, "tools/list");
  const tools = (list.result?.tools ?? []).map((t) => t.name);
  console.log(`Enumerated ${tools.length} tools.\n`);

  let id = 100;
  async function callTool(name, args) {
    const callId = id++;
    send({ jsonrpc: "2.0", id: callId, method: "tools/call", params: { name, arguments: args } });
    return expect(callId, name);
  }

  const rows = [];
  for (const name of tools) {
    const args = ARGS[name] ?? {};

    let res, status, note;
    try {
      res = await callTool(name, args);
      if (!res.error && res.result?.isError === true && EXPECT_SUCCESS.has(name)) {
        await sleep(1000);
        res = await callTool(name, args);
      }
    } catch (e) {
      rows.push({ name, status: "TIMEOUT", note: e.message });
      await sleep(200);
      continue;
    }

    if (res.error) {
      status = "FAIL";
      note = `JSON-RPC error ${res.error.code}: ${String(res.error.message).slice(0, 80)}`;
    } else {
      const content = res.result?.content?.[0]?.text ?? "";
      const isErr = res.result?.isError === true;
      const hasStructured = res.result?.structuredContent !== undefined;
      status = "OK";
      note = `${isErr ? "isError" : "ok"}${hasStructured ? "+struct" : ""}`;

      if (isErr && /Output validation error|-32602/.test(content)) {
        status = "FAIL";
        note = `output-validation error surfaced as isError frame: ${content.slice(0, 80)}`;
      } else if (isErr && EXPECT_SUCCESS.has(name)) {
        status = "WARN";
        note = `expected success, got isError (upstream/rate-limit?): ${content.slice(0, 60)}`;
      }
    }
    rows.push({ name, status, note });
    await sleep(200);
  }

  console.log("TOOL CONTRACT RESULTS");
  console.log("=".repeat(72));
  for (const r of rows) {
    const tag = r.status === "OK" ? "PASS" : r.status.padEnd(4);
    console.log(`${tag}  ${r.name.padEnd(32)} ${r.note}`);
  }
  console.log("=".repeat(72));

  const fails = rows.filter((r) => r.status === "FAIL" || r.status === "TIMEOUT");
  const warns = rows.filter((r) => r.status === "WARN");
  console.log(`\n${rows.length} tools | ${fails.length} FAIL | ${warns.length} WARN`);

  server.kill();
  if (fails.length) {
    console.log(`\nFAILED: ${fails.map((r) => r.name).join(", ")}`);
    process.exit(1);
  }
  console.log("\nALL TOOLS PASS MCP OUTPUT CONTRACT");
  process.exit(0);
}

main().catch((err) => {
  console.error(`FATAL: ${err.stack ?? err}`);
  server.kill();
  process.exit(1);
});
