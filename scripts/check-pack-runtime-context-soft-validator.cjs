#!/usr/bin/env node
/**
 * Standalone local validation script for PackRuntimeContext soft validator skeleton.
 *
 * This script is NOT wired into package.json, check:all, CI, or doctor.
 * It exists solely to verify the skeleton's return shape and basic behavior.
 *
 * Run: node scripts/check-pack-runtime-context-soft-validator.cjs
 */

"use strict";

var validator = require("../packages/cli/src/validation/pack-runtime-context-soft-validator.js");

var assert = require("assert");

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    console.error("FAIL: " + name);
    console.error("  " + e.message);
  }
}

function assertShape(result) {
  assert.strictEqual(typeof result.ok, "boolean", "ok must be boolean");
  assert(
    result.severity === "info" || result.severity === "warning" || result.severity === "error",
    "severity must be info|warning|error, got: " + result.severity
  );
  assert(Array.isArray(result.warnings), "warnings must be array");
  assert(Array.isArray(result.errors), "errors must be array");
  assert.strictEqual(typeof result.report, "object", "report must be object");
  assert.strictEqual(result.report.validatorId, "pack-runtime-context-soft-validator");
  assert.strictEqual(result.report.contractName, "PackRuntimeContext");
  // checkedAt is ISO string or null (when includeTimestamp=false)
  if (result.report.checkedAt !== null) {
    assert.strictEqual(typeof result.report.checkedAt, "string");
  }
  assert(Array.isArray(result.report.gates), "gates must be array");
}

// Fixture 1: minimal valid-ish context (has some sections, missing others)
var fixtureMinimal = {
  identity: { packId: "test-pack" },
  metadata: { name: "Test Pack", version: "0.1.0" },
  governance: { coreChangesAllowed: false, migrationMode: "copy-first" },
  runtime: { loadedByDefault: false, requiresPackLoader: true },
};

// Fixture 2: missing contractVersion (should produce warning, not error)
var fixtureMissingCV = {
  identity: { packId: "test-pack" },
  metadata: { name: "Test Pack" },
  governance: { coreChangesAllowed: false, migrationMode: "copy-first" },
  runtime: { loadedByDefault: false, requiresPackLoader: true },
  boundaries: { storyRegistryDefault: true },
  sourceOfTruth: { packsAreDefault: false },
  outputPolicy: {},
  validation: {},
};

// Fixture 3: invalid non-object context
var fixtureInvalid = "not-an-object";

// --- Tests ---

test("validatePackRuntimeContext is a function", function () {
  assert.strictEqual(typeof validator.validatePackRuntimeContext, "function");
});

test("minimal valid-ish context returns stable shape", function () {
  var result = validator.validatePackRuntimeContext(fixtureMinimal);
  assertShape(result);
});

test("minimal valid-ish context has no errors, only warnings", function () {
  var result = validator.validatePackRuntimeContext(fixtureMinimal);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.errors.length, 0);
  assert(result.warnings.length > 0, "should warn about missing sections");
});

test("missing contractVersion produces only warnings, no errors", function () {
  var result = validator.validatePackRuntimeContext(fixtureMissingCV);
  assertShape(result);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.errors.length, 0);
  // Should have at least the contractVersion absent warning
  var cvWarnings = result.warnings.filter(function (w) {
    return w.code === "INFO_CONTRACT_VERSION_ABSENT";
  });
  assert(cvWarnings.length >= 1, "should warn about missing contractVersion");
});

test("non-object context produces error", function () {
  var result = validator.validatePackRuntimeContext(fixtureInvalid);
  assertShape(result);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.severity, "error");
  assert.strictEqual(result.errors.length > 0, true);
  var errCodes = result.errors.map(function (e) { return e.code; });
  assert(errCodes.indexOf("ERROR_CONTEXT_NOT_OBJECT") !== -1, "should have ERROR_CONTEXT_NOT_OBJECT");
});

test("null context produces error", function () {
  var result = validator.validatePackRuntimeContext(null);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.errors.length, 1);
});

test("array context produces error", function () {
  var result = validator.validatePackRuntimeContext([1, 2, 3]);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.errors.length, 1);
});

test("options.includeTimestamp=false omits checkedAt", function () {
  var result = validator.validatePackRuntimeContext(fixtureMinimal, { includeTimestamp: false });
  assert.strictEqual(result.report.checkedAt, null);
});

test("options.source is accepted without error", function () {
  var result = validator.validatePackRuntimeContext(fixtureMinimal, { source: "test-script" });
  assertShape(result);
});

test("constants are exported", function () {
  assert(Array.isArray(validator.REQUIRED_TOP_LEVEL_SECTIONS));
  assert.strictEqual(validator.REQUIRED_TOP_LEVEL_SECTIONS.length, 8);
  assert(Array.isArray(validator.RESERVED_NAMESPACES));
  assert.strictEqual(validator.RESERVED_NAMESPACES.length, 4);
  assert.strictEqual(validator.CONTRACT_VERSION_WARNING_CODES.ABSENT, "INFO_CONTRACT_VERSION_ABSENT");
  assert.strictEqual(validator.CONTRACT_VERSION_WARNING_CODES.MALFORMED, "WARN_CONTRACT_VERSION_MALFORMED");
});

// --- Summary ---

console.log("");
console.log("Results: " + passed + " passed, " + failed + " failed");
console.log("");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("PackRuntimeContext soft validator skeleton check passed");
}
