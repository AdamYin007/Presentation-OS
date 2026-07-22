#!/usr/bin/env node
/**
 * M12.25 — Audience Engine Check
 *
 * Validates: module exports, speaker/audience profiles, contract derivation,
 * slide adjustments, deck hints, graceful degradation.
 */

"use strict";

const path = require("path");
const rootDir = path.join(__dirname, "..");

console.log("M12.25 Audience Engine Check");
console.log("============================\n");

let allPassed = true;

// ── 1. Module structure ──────────────────────────────────────
console.log("[1/3] Checking module structure...");

const requiredFiles = [
  "packages/presentation-audience-engine/package.json",
  "packages/presentation-audience-engine/src/index.js",
  "packages/presentation-audience-engine/src/schema.js",
  "packages/presentation-audience-engine/src/engine.js",
  "tests/presentation-audience-engine/audience-engine.test.js",
];

for (const f of requiredFiles) {
  const fullPath = path.join(rootDir, f);
  try {
    require.resolve(fullPath);
    console.log(`  ✓ ${f}`);
  } catch {
    console.error(`  ✗ Missing: ${f}`);
    allPassed = false;
  }
}

// ── 2. Unit tests ────────────────────────────────────────────
console.log("\n[2/3] Running unit tests...\n");
try {
  const testModule = require(path.join(rootDir, "tests/presentation-audience-engine/audience-engine.test.js"));
  console.log("  ✓ Unit tests passed");
} catch (err) {
  console.error(`  ✗ Unit tests failed: ${err.message}`);
  allPassed = false;
}

// ── 3. Pipeline integration ──────────────────────────────────
console.log("\n[3/3] Checking pipeline integration...");

try {
  const pipelineSrc = require("fs").readFileSync(path.join(rootDir, "packages/presentation-pipeline/src/pipeline.js"), "utf8");
  if (pipelineSrc.includes('require("../../presentation-audience-engine/src/index.js")')) {
    console.log("  ✓ Pipeline imports audience engine");
  } else {
    console.error("  ✗ Pipeline does not import audience engine");
    allPassed = false;
  }

  if (pipelineSrc.includes("adaptDeck")) {
    console.log("  ✓ Pipeline calls adaptDeck");
  } else {
    console.error("  ✗ Pipeline does not call adaptDeck");
    allPassed = false;
  }

  if (pipelineSrc.includes("audienceEngine")) {
    console.log("  ✓ audienceEngine option threaded through");
  } else {
    console.error("  ✗ audienceEngine option not found in pipeline");
    allPassed = false;
  }

  const deliverSrc = require("fs").readFileSync(path.join(rootDir, "scripts/deliver-pptx.js"), "utf8");
  if (deliverSrc.includes("--audience") && deliverSrc.includes("--speaker")) {
    console.log("  ✓ CLI flags present");
  } else {
    console.error("  ✗ CLI flags missing");
    allPassed = false;
  }
} catch (err) {
  console.error(`  ✗ Integration check failed: ${err.message}`);
  allPassed = false;
}

console.log("");
if (allPassed) {
  console.log("M12.25 Audience Engine check: PASSED ✓");
} else {
  console.log("M12.25 Audience Engine check: FAILED ✗");
  process.exit(1);
}
