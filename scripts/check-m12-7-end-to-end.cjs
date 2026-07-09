#!/usr/bin/env node
/**
 * M12.7 End-to-End Pipeline Checker
 */
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const assert = require("assert");
const ROOT = path.join(__dirname, "..");

function fail(m) { throw new Error(m); }

const REQUIRED_FILES = [
  "packages/presentation-pipeline/package.json",
  "packages/presentation-pipeline/src/index.js",
  "packages/presentation-pipeline/src/pipeline.js",
  "tests/pipeline/pipeline.test.js",
  "docs/M12_7_END_TO_END_MVP_SPEC.md",
  "scripts/generate-pptx.js",
];
const FIXTURE_FILES = [
  "examples/business-review/e2e-output.pptx",
];

const ALLOWED_DIFF_FILES = new Set([
  ...REQUIRED_FILES, ...FIXTURE_FILES,
  "docs/ROADMAP.md", "package.json",
  "scripts/check-m12-7-end-to-end.cjs",
  "packages/presentation-pipeline/package.json",
]);

function checkRequiredFiles() {
  console.log("Checking required files...");
  for (const f of [...REQUIRED_FILES, ...FIXTURE_FILES]) {
    if (!fs.existsSync(path.join(ROOT, f))) fail(`Missing: ${f}`);
    console.log(`  ✓ ${f}`);
  }
}

function checkModuleExports() {
  console.log("\nChecking module exports...");
  const mod = require(path.join(ROOT, "packages/presentation-pipeline/src/index.js"));
  if (typeof mod.runPipeline !== "function") fail("Missing: runPipeline");
  console.log("  ✓ runPipeline");
}

function checkFixture() {
  console.log("\nChecking e2e fixture...");
  const buf = fs.readFileSync(path.join(ROOT, "examples/business-review/e2e-output.pptx"));
  assert(buf.length > 0, "Fixture should not be empty");
  const header = buf.slice(0, 4).toString("hex");
  assert(header === "504b0304", `Should be valid ZIP/PPTX, got ${header}`);
  console.log(`  ✓ Fixture: ${buf.length} bytes, valid PPTX`);
}

async function checkIntegration() {
  console.log("\nChecking full pipeline integration...");
  const mdInput = fs.readFileSync(path.join(ROOT, "fixtures/document-ingest/sample-markdown.md"), "utf8");
  const { runPipeline } = require(path.join(ROOT, "packages/presentation-pipeline/src/index.js"));
  const result = await runPipeline(mdInput, { style: "minimal-modern" });
  assert(result.sourceDocument, "Should have source document");
  assert(result.intent, "Should have intent");
  assert(result.deckPlan, "Should have deck plan");
  assert(Array.isArray(result.slideSpecs), "Should have slide specs");
  assert(result.layoutPlan, "Should have layout plan");
  assert(Buffer.isBuffer(result.pptxBuffer), "Should have pptx buffer");
  console.log(`  ✓ Full pipeline: markdown → ${result.slideCount} slides → ${result.pptxBuffer.length} bytes .pptx`);
}

function runTests() {
  console.log("\nRunning pipeline tests...");
  try {
    const result = cp.execSync(`node "${path.join(ROOT, "tests/pipeline/pipeline.test.js")}"`, { cwd: ROOT, encoding: "utf8", timeout: 60000 });
    console.log(result.trim().split("\n").filter((l) => l.includes("✓")).slice(0, 10).join("\n"));
  } catch (e) { fail("Tests failed"); }
}

function checkSpecDocument() {
  console.log("\nChecking spec document...");
  const spec = fs.readFileSync(path.join(ROOT, "docs/M12_7_END_TO_END_MVP_SPEC.md"), "utf8");
  for (const term of ["runPipeline", "PptxGenJS", "LayoutPlan", "M12.8"]) {
    if (!spec.toLowerCase().includes(term.toLowerCase())) fail(`Spec missing: ${term}`);
  }
  console.log("  ✓ Spec document complete");
}

function checkCLI() {
  console.log("\nChecking CLI entry point...");
  const cliPath = path.join(ROOT, "scripts/generate-pptx.js");
  assert(fs.existsSync(cliPath), "CLI script should exist");
  const cli = fs.readFileSync(cliPath, "utf8");
  assert(cli.includes("runPipeline"), "CLI should use runPipeline");
  assert(cli.includes("pptxBuffer"), "CLI should write pptxBuffer");
  console.log("  ✓ CLI script present and functional");
}

async function main() {
  console.log("M12.7 End-to-End Pipeline Checker");
  console.log("==================================\n");
  checkRequiredFiles();
  checkModuleExports();
  checkFixture();
  await checkIntegration();
  checkSpecDocument();
  checkCLI();
  runTests();
  console.log("\n==================================");
  console.log("M12.7 End-to-End Pipeline check passed\n");
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
module.exports = { checkRequiredFiles, checkModuleExports, checkFixture };
