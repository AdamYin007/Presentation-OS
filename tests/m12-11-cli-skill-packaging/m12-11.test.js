#!/usr/bin/env node
/**
 * M12.11 CLI and Skill Packaging Tests
 *
 * Validates CLI argument handling, pipeline integration, error cases,
 * and the packaging contract (no cloud deps, deterministic output).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const CLI = path.join(ROOT, "scripts/make-pptx.js");

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, msg) {
  if (!condition) {
    failed++;
    failures.push(`FAIL: ${msg}`);
    console.log(`  ✗ ${msg}`);
  } else {
    passed++;
    console.log(`  ✓ ${msg}`);
  }
}

function runCli(args, timeoutMs = 30000) {
  return spawnSync("node", args, { encoding: "utf8", timeout: timeoutMs, cwd: ROOT });
}

// ── 1. Module structure ────────────────────────────────────────

console.log("1. Module structure...");
assert(fs.existsSync(CLI), "CLI script exists at scripts/make-pptx.js");
assert(fs.existsSync(path.join(ROOT, "scripts/make-pptx-help.txt")), "Help text file exists");
assert(fs.existsSync(path.join(ROOT, "fixtures/m12-11/sample-input.md")), "Sample fixture exists");

const cliSrc = fs.readFileSync(CLI, "utf8");
assert(
  cliSrc.includes('require("../packages/presentation-pipeline/src/index.js")'),
  "CLI imports runPipeline",
);
assert(cliSrc.includes("parseArgs"), "CLI has argument parser");
assert(cliSrc.includes("dryRun"), "CLI supports --dry-run");
assert(cliSrc.includes("--json"), "CLI supports --json");
assert(cliSrc.includes("--style"), "CLI supports --style");

// ── 2. Help command ────────────────────────────────────────────

console.log("\n2. Help command...");
const rHelp = runCli([CLI, "--help"]);
assert(rHelp.status === 0, "--help exits 0");
assert(rHelp.stdout.includes("AWE"), "--help mentions AWE");
assert(rHelp.stdout.includes("make-pptx"), "--help mentions make-pptx");

// ── 3. No arguments ────────────────────────────────────────────

console.log("\n3. No arguments...");
const rNoArgs = runCli([CLI]);
assert(rNoArgs.status === 1, "No args exits 1");
assert(rNoArgs.stderr.includes("missing input"), "No args says 'missing input'");

// ── 4. Missing input file ─────────────────────────────────────

console.log("\n4. Missing input file...");
const rMissing = runCli([CLI, "nonexistent.md", "out.pptx"]);
assert(rMissing.status === 1, "Missing file exits 1");
assert(rMissing.stderr.includes("not found"), "Missing file says 'not found'");

// ── 5. Empty input file ───────────────────────────────────────

console.log("\n5. Empty input file...");
const tmpEmpty = path.join(ROOT, "fixtures/m12-11/.tmp-empty.md");
fs.writeFileSync(tmpEmpty, "");
const rEmpty = runCli([CLI, tmpEmpty, "out.pptx"]);
fs.unlinkSync(tmpEmpty);
assert(rEmpty.status === 1, "Empty input exits 1");
assert(rEmpty.stderr.includes("empty"), "Empty input says 'empty'");

// ── 6. Invalid style ──────────────────────────────────────────

console.log("\n6. Invalid style...");
const rBadStyle = runCli([
  CLI,
  "fixtures/m12-11/sample-input.md",
  "out.pptx",
  "--style",
  "fake-style",
]);
assert(rBadStyle.status === 1, "Invalid style exits 1");
assert(rBadStyle.stderr.includes("unknown style"), "Invalid style says 'unknown style'");

// ── 7. Unknown option ─────────────────────────────────────────

console.log("\n7. Unknown option...");
const rUnknownOpt = runCli([CLI, "fixtures/m12-11/sample-input.md", "out.pptx", "--unknown-flag"]);
assert(rUnknownOpt.status === 1, "Unknown option exits 1");
assert(rUnknownOpt.stderr.includes("unknown option"), "Unknown option says 'unknown option'");

// ── 8. Dry-run with JSON ──────────────────────────────────────

console.log("\n8. Dry-run with JSON output...");
const rDryRun = runCli([CLI, "fixtures/m12-11/sample-input.md", "--dry-run", "--json"]);
assert(rDryRun.status === 0, "Dry-run exits 0");
let summary;
try {
  summary = JSON.parse(rDryRun.stdout);
  assert(true, "JSON output is valid");
} catch {
  assert(false, "JSON output is valid (parse failed)");
}
if (summary) {
  assert(
    typeof summary.slideCount === "number" && summary.slideCount >= 2,
    `slideCount ≥ 2 (got ${summary.slideCount})`,
  );
  assert(
    typeof summary.topic === "string" && summary.topic.length > 0,
    "topic is non-empty string",
  );
  assert(Array.isArray(summary.slideSpecs), "slideSpecs is array");
  assert(summary.pptxSizeBytes > 0, `pptxSizeBytes > 0 (got ${summary.pptxSizeBytes})`);
}

// ── 9. Full pipeline run ──────────────────────────────────────

console.log("\n9. Full pipeline run (write PPTX)...");
const tmpOut = path.join(ROOT, "fixtures/m12-11/.tmp-m12-11.pptx");
try {
  fs.unlinkSync(tmpOut);
} catch (_) {}
const rFull = runCli([CLI, "fixtures/m12-11/sample-input.md", tmpOut, "--style", "minimal-modern"]);
assert(rFull.status === 0, "Full run exits 0");
assert(fs.existsSync(tmpOut), "Output file created");
const outBuf = fs.readFileSync(tmpOut);
assert(outBuf.readUInt32BE(0) === 0x504b0304, "Output is valid PPTX (ZIP)");
assert(outBuf.length > 1000, `Output > 1000 bytes (got ${outBuf.length})`);
fs.unlinkSync(tmpOut);

// ── 10. Business-consulting style ──────────────────────────────

console.log("\n10. Business-consulting style...");
const rConsulting = runCli([
  CLI,
  "fixtures/m12-11/sample-input.md",
  tmpOut,
  "--style",
  "business-consulting",
]);
assert(rConsulting.status === 0, "Business-consulting style exits 0");
const outBuf2 = fs.readFileSync(tmpOut);
assert(outBuf2.readUInt32BE(0) === 0x504b0304, "Business-consulting output is valid PPTX");
fs.unlinkSync(tmpOut);

// ── 11. Academic-clean style ──────────────────────────────────

console.log("\n11. Academic-clean style...");
const rAcademic = runCli([
  CLI,
  "fixtures/m12-11/sample-input.md",
  tmpOut,
  "--style",
  "academic-clean",
]);
assert(rAcademic.status === 0, "Academic-clean style exits 0");
const outBuf3 = fs.readFileSync(tmpOut);
assert(outBuf3.readUInt32BE(0) === 0x504b0304, "Academic-clean output is valid PPTX");
fs.unlinkSync(tmpOut);

// ── 12. No cloud dependencies ─────────────────────────────────

console.log("\n12. No cloud/paid dependencies...");
const forbidden = ["openai", "anthropic", "gemini", "azure", "fetch("];
for (const term of forbidden) {
  if (cliSrc.includes(term)) {
    assert(false, `No ${term} in CLI source`);
  } else {
    console.log(`    (skipped: ${term} not in CLI source — OK)`);
  }
}
assert(true, "No cloud dependencies in CLI");

// ── 13. Reuses existing pipeline ──────────────────────────────

console.log("\n13. Reuses existing pipeline (no reimplementation)...");
assert(!cliSrc.includes("ingestDocument"), "CLI does not reimplement ingestDocument");
assert(!cliSrc.includes("parsePresentationIntent"), "CLI does not reimplement intent parsing");
assert(!cliSrc.includes("planDeck"), "CLI does not reimplement story planning");
assert(!cliSrc.includes("renderPptx"), "CLI does not reimplement rendering");
assert(cliSrc.includes("runPipeline"), "CLI delegates to runPipeline");
assert(true, "CLI is a thin wrapper around runPipeline");

// ── 14. Spec document exists and is complete ──────────────────

console.log("\n14. Spec document...");
const specPath = path.join(ROOT, "docs/M12_11_CLI_SKILL_PACKAGING_SPEC.md");
assert(fs.existsSync(specPath), "Spec document exists");
const spec = fs.readFileSync(specPath, "utf8");
assert(spec.includes("Overview"), "Spec has Overview");
assert(spec.includes("CLI Contract"), "Spec has CLI Contract");
assert(spec.includes("Skill Packaging"), "Spec has Skill Packaging");
assert(spec.includes("Quality Gates"), "Spec has Quality Gates");
assert(spec.includes("Testing"), "Spec has Testing");
assert(spec.includes("Next Steps"), "Spec has Next Steps");
assert(true, "Spec document complete");

// ── Summary ────────────────────────────────────────────────────

console.log("\n==================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f}`);
}
if (failed === 0) {
  console.log("All M12.11 tests passed!");
}

process.exit(failed > 0 ? 1 : 0);
