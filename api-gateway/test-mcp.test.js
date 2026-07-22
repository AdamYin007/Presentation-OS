/**
 * AWE MCP Server — Test Suite
 */
"use strict";

const assert = require("assert");
const {
  registerClient,
  getClient,
  generatePresentation,
  listPacks,
  searchPacks,
  adaptAudience,
  createSession,
  endSession,
  getUsageStats,
  SUPPORTED_MODELS,
} = require("./mcp-server");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

console.log("=================================================================");
console.log("AWE MCP Server Tests");
console.log("=================================================================");

test("registerClient creates a client", () => {
  const client = registerClient("claude_123", "claude", { model: "claude-sonnet-4" });
  assert(client.id === "claude_123");
  assert(client.model === "claude");
});

test("getClient retrieves registered client", () => {
  const client = getClient("claude_123");
  assert(client && client.model === "claude");
});

test("getClient returns null for unknown client", () => {
  assert(getClient("unknown") === null);
});

test("SUPPORTED_MODELS contains all expected models", () => {
  assert(SUPPORTED_MODELS.claude);
  assert(SUPPORTED_MODELS.codex);
  assert(SUPPORTED_MODELS.copilot);
  assert(SUPPORTED_MODELS.hermes);
  assert(SUPPORTED_MODELS.openclaw);
});

test("generatePresentation validates input", async () => {
  registerClient("claude_test", "claude");

  const result = await generatePresentation("", {}, "claude_test");
  assert(result.ok === false);
  assert(result.errorCode === "INVALID_INPUT");
});

test("generatePresentation works for supported model", async () => {
  registerClient("claude_gen", "claude");

  const result = await generatePresentation("# Hello\n\n## Slide 1\n\nContent", {}, "claude_gen");
  assert(result.ok === true);
  assert(result.data.slideCount === 2);
  assert(result.data.model === "claude");
});

test("generatePresentation rejects unsupported model", async () => {
  registerClient("unknown_model", "unknown-model");

  const result = await generatePresentation("# Hello", {}, "unknown_model");
  assert(result.ok === false);
  assert(result.errorCode === "UNSUPPORTED_MODEL");
});

test("listPacks returns packs", async () => {
  registerClient("claude_list", "claude");

  const result = await listPacks({}, "claude_list");
  assert(result.ok === true);
  assert(result.data.length >= 3);
  assert(result.total === result.data.length);
});

test("searchPacks filters by query", async () => {
  registerClient("claude_search", "claude");

  const result = await searchPacks("finance", {}, "claude_search");
  assert(result.ok === true);
  assert(result.data.some((p) => p.name === "Finance Compliance"));
});

test("adaptAudience returns adaptation for known pair", async () => {
  registerClient("claude_adapt", "claude");

  const result = await adaptAudience("executive", "board", {}, "claude_adapt");
  assert(result.ok === true);
  assert(result.data.adaptations.terminologyLevel === "strategic");
});

test("createSession and endSession lifecycle", async () => {
  registerClient("claude_session", "claude");

  const session = await createSession("claude_session", "claude");
  assert(session.id.startsWith("session_"));

  const ended = await endSession(session.id);
  assert(ended.ok === true);
  assert(ended.messageCount === 0);
});

test("getUsageStats returns stats", () => {
  registerClient("claude_usage", "claude");

  // Generate some usage
  generatePresentation("# Test", {}, "claude_usage");

  const stats = getUsageStats("claude_usage");
  assert(stats.clientId === "claude_usage");
  assert(stats.totalRequests >= 1);
});

test("all models have required fields", () => {
  for (const [key, config] of Object.entries(SUPPORTED_MODELS)) {
    assert(config.name, `${key} missing name`);
    assert(config.provider, `${key} missing provider`);
    assert(Array.isArray(config.capabilities), `${key} missing capabilities`);
    assert(typeof config.maxTokens === "number", `${key} missing maxTokens`);
    assert(Array.isArray(config.tools), `${key} missing tools`);
  }
});

console.log("");
console.log("=================================================================");
console.log(`Results: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
