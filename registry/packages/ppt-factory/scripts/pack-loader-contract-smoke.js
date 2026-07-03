#!/usr/bin/env node
/**
 * Pack Loader Contract Smoke Validation
 *
 * Verifies the Pack Loader error contract without changing any runtime behavior.
 * Uses only Node built-in modules.
 * Creates temporary packs under os.tmpdir() — never modifies real presentation-packs.
 *
 * Usage:
 *   node registry/packages/ppt-factory/scripts/pack-loader-contract-smoke.js
 *
 * Exit 0: all contract checks pass.
 * Exit 1: one or more checks fail, with clear failure messages.
 */

var fs = require("fs");
var path = require("path");
var os = require("os");

// Import loader modules
var { loadPack, loadAllPacks } = require("../src/pack-loader");
var { inspectPack } = require("../src/pack-inspection");

var passed = 0;
var failed = 0;
var failures = [];

function check(label, condition, detail) {
  if (condition) {
    passed++;
    console.log("PASS " + label);
  } else {
    failed++;
    var msg = "FAIL " + label;
    if (detail) msg += " — " + detail;
    console.error(msg);
    failures.push(msg);
  }
}

// ── Temporary directory management ─────────────────────────────

var tempDirs = [];

function mktemp(prefix) {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix + "-"));
  tempDirs.push(dir);
  return dir;
}

function cleanup() {
  for (var i = 0; i < tempDirs.length; i++) {
    try { fs.rmSync(tempDirs[i], { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }
}

process.on("exit", cleanup);

// ── Successful-path checks ─────────────────────────────────────

// 1. loadPack("digital-pathology") returns ok:true
var lpResult = loadPack("digital-pathology");
check("loadPack digital-pathology", lpResult.ok === true, lpResult.error || "not ok");
check("  packId === digital-pathology", lpResult.ok && lpResult.context && lpResult.context.packId === "digital-pathology", lpResult.context ? lpResult.context.packId : "no context");
check("  context is frozen", lpResult.ok && Object.isFrozen(lpResult.context), Object.isFrozen(lpResult.context) ? "frozen" : "not frozen");

// 2. loadAllPacks() returns digital-pathology
var laResult = loadAllPacks();
check("loadAllPacks ok", laResult.ok === true, laResult.error || "not ok");
check("loadAllPacks includes digital-pathology", laResult.ok && laResult.contexts && laResult.contexts.some(function(c) { return c.packId === "digital-pathology"; }), laResult.contexts ? laResult.contexts.map(function(c){return c.packId;}).join(",") : "no contexts");

// Clear registry before inspectPack to avoid duplicate registration.
// NOTE: pack-registry is a module-level singleton. loadAllPacks() registers packs
// that persist across calls in the same Node process. inspectPack() internally
// calls loadPack(), which would hit DUPLICATE_PACK_ID without this clear.
// This is a test isolation requirement — production CLI commands run in separate
// Node processes, so this is not a concern for normal CLI usage.
var packRegistry = require("../src/pack-registry");
packRegistry.clear();

// 3. inspectPack("digital-pathology") returns ok:true
var ipResult = inspectPack("digital-pathology");
check("inspectPack digital-pathology", ipResult.ok === true, ipResult.error || "not ok");
check("  result.name present", ipResult.ok && ipResult.result && ipResult.result.name, ipResult.result ? ipResult.result.name : "no result");

// ── Negative-path checks ───────────────────────────────────────

// 4. Missing manifest: existing empty directory → MANIFEST_MISSING
var emptyDir = mktemp("smoke-missing-manifest");
var mmResult = loadPack(emptyDir);
check("MANIFEST_MISSING", mmResult.ok === false && mmResult.errorCode === "MANIFEST_MISSING", mmResult.errorCode || "no code");
check("  details.packRoot", mmResult.ok === false && mmResult.details && mmResult.details.packRoot, mmResult.details ? mmResult.details.packRoot : "no details");

// 5. Invalid JSON → MANIFEST_INVALID_JSON
var invalidJsonDir = mktemp("smoke-invalid-json");
fs.writeFileSync(path.join(invalidJsonDir, "pack.json"), "{ invalid json", "utf8");
var ijResult = loadPack(invalidJsonDir);
check("MANIFEST_INVALID_JSON", ijResult.ok === false && ijResult.errorCode === "MANIFEST_INVALID_JSON", ijResult.errorCode || "no code");
check("  details.manifestPath", ijResult.ok === false && ijResult.details && ijResult.details.manifestPath, ijResult.details ? ijResult.details.manifestPath : "no details");

// 6. Unsafe asset path (path traversal) → ASSET_UNSAFE_PATH
var unsafeDir = mktemp("smoke-unsafe-asset");
fs.writeFileSync(path.join(unsafeDir, "pack.json"), JSON.stringify({
  type: "presentation-pack",
  name: "unsafe-test",
  displayName: "Unsafe Test",
  version: "0.0.0",
  status: "experimental",
  domain: "test",
  supportedVersions: ["1.0.0"],
  description: "Smoke test unsafe asset",
  compatibleWith: "1.0.0",
  contents: {
    stories: ["../escape.json"],
    heroSequences: [],
    terminology: [],
    references: [],
    content: [],
    planners: [],
    adapters: [],
    themes: [],
    examples: []
  },
  runtime: { loadedByDefault: false, requiresPackLoader: true },
  governance: { coreChangesRequired: false, migrationMode: "copy-first" }
}, null, 2), "utf8");
fs.mkdirSync(path.join(unsafeDir, "stories"), { recursive: true });
var uaResult = loadPack(unsafeDir);
check("ASSET_UNSAFE_PATH", uaResult.ok === false && uaResult.errorCode === "ASSET_UNSAFE_PATH", uaResult.errorCode || "no code");
check("  details.validationError", uaResult.ok === false && uaResult.details && uaResult.details.validationError, uaResult.details ? uaResult.details.validationError.substring(0, 60) : "no details");

// 7. Missing declared asset → ASSET_MISSING
var missingAssetDir = mktemp("smoke-missing-asset");
fs.writeFileSync(path.join(missingAssetDir, "pack.json"), JSON.stringify({
  type: "presentation-pack",
  name: "missing-asset-test",
  displayName: "Missing Asset Test",
  version: "0.0.0",
  status: "experimental",
  domain: "test",
  supportedVersions: ["1.0.0"],
  description: "Smoke test missing asset",
  compatibleWith: "1.0.0",
  contents: {
    stories: ["stories/nonexistent.json"],
    heroSequences: [],
    terminology: [],
    references: [],
    content: [],
    planners: [],
    adapters: [],
    themes: [],
    examples: []
  },
  runtime: { loadedByDefault: false, requiresPackLoader: true },
  governance: { coreChangesRequired: false, migrationMode: "copy-first" }
}, null, 2), "utf8");
fs.mkdirSync(path.join(missingAssetDir, "stories"), { recursive: true });
var maResult = loadPack(missingAssetDir);
check("ASSET_MISSING", maResult.ok === false && maResult.errorCode === "ASSET_MISSING", maResult.errorCode || "no code");
check("  details.validationError", maResult.ok === false && maResult.details && maResult.details.validationError, maResult.details ? maResult.details.validationError.substring(0, 60) : "no details");

// 8. Nonexistent path → PACK_NOT_FOUND
var pnResult = loadPack("/nonexistent/path/that/definitely/does/not/exist/xyz");
check("PACK_NOT_FOUND", pnResult.ok === false && pnResult.errorCode === "PACK_NOT_FOUND", pnResult.errorCode || "no code");
check("  details.target", pnResult.ok === false && pnResult.details && pnResult.details.target, pnResult.details ? pnResult.details.target : "no details");

// ── Summary ────────────────────────────────────────────────────

console.log("");
if (failed === 0) {
  console.log("Contract: passed (" + passed + "/" + (passed + failed) + " checks)");
  process.exit(0);
} else {
  console.error("Contract: failed (" + passed + "/" + (passed + failed) + " checks, " + failed + " failures)");
  for (var i = 0; i < failures.length; i++) {
    console.error("  " + failures[i]);
  }
  process.exit(1);
}
