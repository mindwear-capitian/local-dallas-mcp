import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeResult } from "../../lib/register.js";

test("normalizeResult promotes a [text, jsonText] pair to structuredContent", () => {
  const result = normalizeResult({
    content: [
      { type: "text", text: "human readable" },
      { type: "text", text: JSON.stringify({ count: 1, results: [] }) },
    ],
  });
  assert.deepEqual(result.structuredContent, { count: 1, results: [] });
  assert.equal(result.content.length, 1);
  assert.equal(result.content[0].text, "human readable");
});

test("normalizeResult leaves a single-block result unchanged", () => {
  const input = { content: [{ type: "text", text: "just markdown" }] };
  const result = normalizeResult(input);
  assert.equal(result, input);
});

test("normalizeResult leaves already-structured results unchanged", () => {
  const input = {
    content: [{ type: "text", text: "x" }],
    structuredContent: { already: true },
  };
  const result = normalizeResult(input);
  assert.equal(result, input);
});
