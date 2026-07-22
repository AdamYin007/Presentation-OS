#!/usr/bin/env node
/**
 * M12.11 CLI and Skill Packaging Spec
 *
 * Defines the thin CLI entrypoint for the markdown-to-pptx pipeline
 * and the packaging model that makes it a reusable skill/CLI surface
 * without cloud or paid dependencies.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

// ── 1. Required files ──────────────────────────────────────────

function checkRequiredFiles() {
  console.log("1. Checking required files...");
  const files = [
    "scripts/make-pptx.js",
    "scripts/make-pptx-help.txt",
    "fixtures/m12-11/sample-input.md",
    "tests/m12-11-cli-skill-packaging/m12-11.test.js",
    "docs/M12_11_CLI_SKILL_PACKAGING_SPEC.md",
    "scripts/check-m12-11-cli-skill-packaging.cjs",
  ];
  for (const f of files) {
    const fp = path.join(ROOT, f);
    if (!fs.existsSync(fp)) fail(`Missing: ${f}`);
    console.log(`  ✓ ${f}`);
  }
}

// ── 2. CLI argument validation ─────────────────────────────────

function checkCLIArguments() {
  console.log("\n2. Checking CLI argument handling...");
  const { spawnSync } = require("child_process");
  const cli = path.join(ROOT, "scripts/make-pptx.js");

  // No arguments → error
  const r1 = spawnSync("node", [cli], { encoding: "utf8", timeout: 10000 });
  if (r1.status !== 1) fail("--no-args should exit 1, got " + r1.status);
  console.log("  ✓ No args → exit 1 with error");

  // --help → success, shows usage
  const r2 = spawnSync("node", [cli, "--help"], { encoding: "utf8", timeout: 10000 });
  if (r2.status !== 0) fail("--help should exit 0");
  if (!r2.stdout.includes("AWE")) fail("--help should contain 'AWE'");
  console.log("  ✓ --help → exit 0 with usage text");

  // Missing input file → error
  const r3 = spawnSync("node", [cli, "nonexistent.md", "out.pptx"], { encoding: "utf8", timeout: 10000 });
  if (r3.status !== 1) fail("missing input should exit 1, got " + r3.status);
  if (!r3.stderr.includes("not found")) fail("missing input should say 'not found'");
  console.log("  ✓ Missing input file → exit 1 with 'not found'");

  // Empty input file → error
  const tmpEmpty = path.join(ROOT, "fixtures", "m12-11", ".tmp-empty.md");
  fs.writeFileSync(tmpEmpty, "");
  const r4 = spawnSync("node", [cli, tmpEmpty, "out.pptx"], { encoding: "utf8", timeout: 10000 });
  fs.unlinkSync(tmpEmpty);
  if (r4.status !== 1) fail("empty input should exit 1, got " + r4.status);
  if (!r4.stderr.includes("empty")) fail("empty input should say 'empty'");
  console.log("  ✓ Empty input → exit 1 with 'empty'");

  // Unknown style → error
  const r5 = spawnSync("node", [cli, "fixtures/m12-11/sample-input.md", "out.pptx", "--style", "fake-style"], { encoding: "utf8", timeout: 10000 });
  if (r5.status !== 1) fail("unknown style should exit 1, got " + r5.status);
  console.log("  ✓ Unknown style → exit 1");

  // Unknown option → error
  const r6 = spawnSync("node", [cli, "fixtures/m12-11/sample-input.md", "out.pptx", "--unknown-flag"], { encoding: "utf8", timeout: 10000 });
  if (r6.status !== 1) fail("unknown option should exit 1, got " + r6.status);
  console.log("  ✓ Unknown option → exit 1");
}

// ── 3. CLI pipeline integration ────────────────────────────────

async function checkCLIPipeline() {
  console.log("\n3. Checking CLI → pipeline integration...");
  const { spawnSync } = require("child_process");
  const cli = path.join(ROOT, "scripts/make-pptx.js");
  const inputMd = path.join(ROOT, "fixtures/m12-11/sample-input.md");
  const outputPptx = path.join(ROOT, "fixtures/m12-11", ".tmp-output.pptx");

  // Clean up any previous temp
  try { fs.unlinkSync(outputPptx); } catch (_) {}

  // Dry-run + json
  const r1 = spawnSync("node", [cli, inputMd, "--dry-run", "--json"], {
    encoding: "utf8", timeout: 30000, cwd: ROOT
  });

  if (r1.status !== 0) {
    console.error(r1.stderr);
    fail("CLI dry-run+json should exit 0");
  }

  // Dry-run + json — parse JSON from stdout (may have conda preamble + trailing text)
  let stdoutClean = r1.stdout;
  // Strip any conda error preamble (starts with '#' and ends before '{')
  const jsonStart = stdoutClean.indexOf("{");
  if (jsonStart === -1) {
    console.error(r1.stderr);
    fail("No JSON found in stdout");
  }
  stdoutClean = stdoutClean.substring(jsonStart);
  
  // Find the matching closing brace (handle nested objects/arrays)
  let depth = 0;
  let jsonEnd = -1;
  for (let i = 0; i < stdoutClean.length; i++) {
    const ch = stdoutClean[i];
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) { jsonEnd = i + 1; break; }
    }
  }
  if (jsonEnd === -1) fail("Could not find matching closing brace for JSON");
  const jsonStr = stdoutClean.substring(0, jsonEnd);
  
  let summary;
  try {
    summary = JSON.parse(jsonStr);
  } catch (e) {
    fail(`JSON parse error: ${e.message}`);
  }
  if (!summary.slideCount || summary.slideCount < 2) {
    fail(`Expected ≥2 slides, got ${summary.slideCount}`);
  }
  console.log(`  ✓ Dry-run: ${summary.slideCount} slides, topic="${summary.topic}"`);

  // Full run → write file
  const r2 = spawnSync("node", [cli, inputMd, outputPptx, "--style", "minimal-modern"], {
    encoding: "utf8", timeout: 30000, cwd: ROOT
  });

  if (r2.status !== 0) {
    console.error(r2.stderr);
    fail("CLI full run should exit 0");
  }

  if (!fs.existsSync(outputPptx)) fail("Output PPTX file should exist");
  const buf = fs.readFileSync(outputPptx);
  if (buf.readUInt32BE(0) !== 0x504b0304) fail("Output should be valid PPTX (ZIP)");
  console.log(`  ✓ Full run: ${buf.length} bytes, valid PPTX`);

  // Cleanup
  fs.unlinkSync(outputPptx);
}

// ── 4. Spec document ───────────────────────────────────────────

function checkSpecDocument() {
  console.log("\n4. Checking spec document...");
  const spec = fs.readFileSync(path.join(ROOT, "docs/M12_11_CLI_SKILL_PACKAGING_SPEC.md"), "utf8");
  const required = ["Overview", "Architecture", "CLI Contract", "Skill Packaging", "Quality Gates", "Files", "Testing", "Next Steps"];
  for (const section of required) {
    if (!spec.includes(section)) fail(`Spec missing section: ${section}`);
    console.log(`  ✓ Spec contains: ${section}`);
  }
}

// ── 5. No cloud/paid dependencies ──────────────────────────────

function checkNoCloudDependencies() {
  console.log("\n5. Checking no cloud/paid dependencies...");
  const cliSrc = fs.readFileSync(path.join(ROOT, "scripts/make-pptx.js"), "utf8");
  const pipelineSrc = fs.readFileSync(path.join(ROOT, "packages/presentation-pipeline/src/pipeline.js"), "utf8");
  const combined = cliSrc + "\n" + pipelineSrc;

  const forbidden = [
    "openai", "anthropic", "gemini", "azure", "gcp", "aws",
    "fetch(", "axios", "got ", "request(", "https://api.",
  ];
  for (const term of forbidden) {
    if (combined.includes(term)) {
      fail(`Forbidden dependency found: ${term}`);
    }
  }
  console.log("  ✓ No cloud/paid API calls detected");
}

// ── 6. Package.json integration ────────────────────────────────

function checkPackageJson() {
  console.log("\n6. Checking package.json integration...");
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  if (!pkg.scripts["check:m12-11-cli-skill-packaging"]) {
    fail("package.json missing: scripts.check:m12-11-cli-skill-packaging");
  }
  if (!pkg.scripts.check.includes("check:m12-11-cli-skill-packaging")) {
    fail("package.json scripts.check does not include M12.11 checker");
  }
  console.log("  ✓ package.json has M12.11 checker script");
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  console.log("M12.11 CLI and Skill Packaging Checker");
  console.log("=======================================\n");

  checkRequiredFiles();
  checkCLIArguments();
  await checkCLIPipeline();
  checkSpecDocument();
  checkNoCloudDependencies();
  checkPackageJson();

  console.log("\n=======================================");
  console.log("M12.11 check passed!\n");
}

main().catch((e) => {
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
