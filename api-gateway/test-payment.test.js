/**
 * AWE Payment Service — Test Suite
 */
"use strict";

const assert = require("assert");
const { createUser, getUserByApiKey, checkUsage, checkRateLimit } = require("./payment-service");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err) { console.log(`  ✗ ${name}: ${err.message}`); failed++; }
}

console.log("=================================================================");
console.log("AWE Payment Service Tests");
console.log("=================================================================");

test("createUser returns user and API key", () => {
  const result = createUser("test@example.com", "free");
  assert(result.user && result.apiKey);
  assert(result.user.email === "test@example.com");
  assert(result.apiKey.startsWith("awe_"));
});

test("getUserByApiKey finds user", () => {
  const { apiKey } = createUser("find@example.com");
  const user = getUserByApiKey(apiKey);
  assert(user && user.email === "find@example.com");
});

test("getUserByApiKey returns null for invalid key", () => {
  assert(getUserByApiKey("invalid_key") === null);
});

test("checkUsage allows within limit", () => {
  const { user } = createUser("usage@example.com", "free");
  const result = checkUsage(user.id);
  assert(result.allowed === true);
  assert(result.remaining === 5);
});

test("checkRateLimit allows valid key", () => {
  const { apiKey } = createUser("rate@example.com", "free");
  const result = checkRateLimit(apiKey);
  assert(result.allowed === true);
  assert(result.limit === 10);
});

test("checkRateLimit blocks invalid key", () => {
  assert(checkRateLimit("invalid_key").allowed === false);
});

console.log("");
console.log("=================================================================");
console.log(`Results: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
