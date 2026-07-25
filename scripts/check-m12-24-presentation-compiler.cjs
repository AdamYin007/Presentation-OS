#!/usr/bin/env node
/**
 * M12.24 — Presentation Compiler Check
 *
 * Validates: module exports, fast/standard/optimized modes,
 * overflow detection, pagination, theme resolution, resource deduplication,
 * full compile pipeline, and CLI integration.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
let allPassed = true;

// 1. Module exists
console.log("[1/3] Checking module structure...");
const pkgPath = path.join(rootDir, "packages/presentation-compiler/package.json");
if (!fs.existsSync(pkgPath)) {
  console.error("FAIL: packages/presentation-compiler/package.json missing");
  allPassed = false;
} else {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (pkg.name !== "@awe/presentation-compiler") {
    console.error(`FAIL: wrong package name: ${pkg.name}`);
    allPassed = false;
  }
  if (!fs.existsSync(path.join(rootDir, "packages/presentation-compiler/src/index.js"))) {
    console.error("FAIL: index.js missing");
    allPassed = false;
  }
  if (!fs.existsSync(path.join(rootDir, "packages/presentation-compiler/src/compiler.js"))) {
    console.error("FAIL: compiler.js missing");
    allPassed = false;
  }
  if (!fs.existsSync(path.join(rootDir, "packages/presentation-compiler/src/schema.js"))) {
    console.error("FAIL: schema.js missing");
    allPassed = false;
  }
  console.log("  ✓ Module structure OK");
}

// 2. Tests pass
console.log("\n[2/3] Running unit tests...");
try {
  require("child_process").execSync(
    "node tests/presentation-compiler/presentation-compiler.test.js",
    { cwd: rootDir, stdio: "inherit", timeout: 30000 }
  );
  console.log("  ✓ Unit tests passed");
} catch (err) {
  console.error("  ✗ Unit tests failed");
  allPassed = false;
}

// 3. Pipeline integration
console.log("\n[3/3] Checking pipeline integration...");
const pipelinePath = path.join(rootDir, "packages/presentation-pipeline/src/pipeline.js");
const pipelineContent = fs.readFileSync(pipelinePath, "utf8");
if (!pipelineContent.includes("presentation-compiler")) {
  console.error("FAIL: pipeline.js doesn't import presentation-compiler");
  allPassed = false;
} else {
  console.log("  ✓ Pipeline imports compiler");
}
if (!pipelineContent.includes("compilePresentation")) {
  console.error("FAIL: pipeline.js doesn't call compilePresentation");
  allPassed = false;
} else {
  console.log("  ✓ Pipeline calls compilePresentation");
}

const deliverPath = path.join(rootDir, "scripts/deliver-pptx.js");
const deliverContent = fs.readFileSync(deliverPath, "utf8");
if (!deliverContent.includes("--compiler") || !deliverContent.includes("--optimize")) {
  console.error("FAIL: deliver-pptx.js missing --compiler/--optimize flags");
  allPassed = false;
} else {
  console.log("  ✓ CLI flags present");
}

if (!deliverContent.includes("compiler: options.compiler")) {
  console.error("FAIL: deliver-pptx.js doesn't pass compiler to pipeline");
  allPassed = false;
} else {
  console.log("  ✓ Compiler option threaded through");
}

console.log("");
if (allPassed) {
  console.log("M12.24 Presentation Compiler check: PASSED ✓");
  process.exit(0);
} else {
  console.error("M12.24 Presentation Compiler check: FAILED ✗");
  process.exit(1);
}
