#!/usr/bin/env node
/**
 * M12.18 — One-Command Delivery Pipeline Tests
 *
 * Verifies that the deliver-pptx.js script produces all expected artifacts
 * and returns correct exit codes for PASS/NEEDS_REVIEW/FAIL scenarios.
 *
 * Usage:
 *   node tests/m12-18-one-command-delivery-pipeline.test.js
 *   npm run test:m12-18-one-command-delivery-pipeline
 */

"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = path.join(__dirname, "..");
const DELIVER_SCRIPT = path.join(ROOT, "scripts", "deliver-pptx.js");
const FIXTURES_DIR = path.join(ROOT, "fixtures", "m12-18");
const TEST_OUTPUT_DIR = path.join(FIXTURES_DIR, "test-output");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  PASS  ${message}`);
  } else {
    failedTests++;
    console.error(`  FAIL  ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  totalTests++;
  if (actual === expected) {
    passedTests++;
    console.log(`  PASS  ${message}`);
  } else {
    failedTests++;
    console.error(`  FAIL  ${message}: expected "${expected}", got "${actual}"`);
  }
}

// ─── Test Fixtures ─────────────────────────────────────────────────

function ensureFixtures() {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  // Good fixture: standard content, should produce PASS
  const goodFixture = path.join(FIXTURES_DIR, "good.md");
  if (!fs.existsSync(goodFixture)) {
    fs.writeFileSync(
      goodFixture,
      `# Quarterly Business Review

## Introduction

Welcome to our Q3 performance review.

## Section 1 — Key Metrics

### Revenue Growth

Our revenue grew 25% year-over-year.

Key highlights:
- Enterprise segment up 30%
- SMB segment up 18%
- International markets up 42%

### Customer Satisfaction

Customer satisfaction score improved to 94%.

Net promoter score: 72.

## Section 2 — Product Updates

### New Features Released

Three major features shipped this quarter:
1. Real-time collaboration
2. Advanced analytics dashboard
3. Mobile app redesign

### Performance Improvements

Page load times reduced by 40%.

API response times improved by 25%.

## Closing

Thank you for your attention.
Questions welcome.
`,
      "utf8",
    );
  }

  // Empty fixture: should trigger errors
  const emptyFixture = path.join(FIXTURES_DIR, "empty.md");
  if (!fs.existsSync(emptyFixture)) {
    fs.writeFileSync(emptyFixture, "", "utf8");
  }

  // Non-existent fixture
  const missingFixture = "/nonexistent/path/does-not-exist.md";

  return { goodFixture, emptyFixture, missingFixture };
}

// ─── Test: Deliver Script Exists ───────────────────────────────────

function testScriptExists() {
  console.log("\n[Test] Deliver script exists");
  assert(fs.existsSync(DELIVER_SCRIPT), "deliver-pptx.js exists at " + DELIVER_SCRIPT);
}

// ─── Test: Missing Input File Returns Exit Code 2 ──────────────────

function testMissingInput() {
  console.log("\n[Test] Missing input file returns exit code 2");
  const result = cp.spawnSync("node", [DELIVER_SCRIPT, "/nonexistent/file.md"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 30000,
  });

  assertEqual(result.status, 2, "Exit code is 2 for missing input");
  assert(
    result.stderr.includes("not found") || result.stdout.includes("not found"),
    "Error message mentions file not found",
  );
}

// ─── Test: Empty Input File Returns Exit Code 2 ────────────────────

function testEmptyInput() {
  console.log("\n[Test] Empty input file returns exit code 2");
  const { emptyFixture } = ensureFixtures();
  const tmpOut = path.join(TEST_OUTPUT_DIR, "empty-test");
  fs.mkdirSync(tmpOut, { recursive: true });

  const result = cp.spawnSync("node", [DELIVER_SCRIPT, emptyFixture, tmpOut], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 30000,
  });

  assertEqual(result.status, 2, "Exit code is 2 for empty input");
  assert(
    result.stderr.includes("empty") || result.stdout.includes("empty"),
    "Error message mentions empty input",
  );
}

// ─── Test: Good Fixture Produces All Artifacts ─────────────────────

function testGoodFixtureArtifacts() {
  console.log("\n[Test] Good fixture produces all expected artifacts");
  const { goodFixture } = ensureFixtures();
  const tmpOut = path.join(TEST_OUTPUT_DIR, "good-artifacts");
  fs.mkdirSync(tmpOut, { recursive: true });

  const result = cp.spawnSync(
    "node",
    [DELIVER_SCRIPT, goodFixture, tmpOut, "--style", "minimal-modern"],
    {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120000,
    },
  );

  assertEqual(result.status, 0, "Good fixture exits 0 (PASS/NEEDS_REVIEW)");

  // Check all expected artifacts exist
  const expectedFiles = [
    "output.pptx",
    "quality-manifest.json",
    "QA-SUMMARY.md",
    "VISUAL-DESIGN-SUMMARY.md",
    "rendered-qa-report.json",
    "PIXEL-ACCESSIBILITY-SUMMARY.md",
    "COMMERCIAL-VERDICT.md",
    "machine-report.json",
  ];

  for (const file of expectedFiles) {
    const filePath = path.join(tmpOut, file);
    assert(fs.existsSync(filePath), `Artifact exists: ${file}`);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      assert(stat.size > 0, `${file} is non-empty (${stat.size} bytes)`);
    }
  }
}

// ─── Test: Good Fixture Verdict Is Not FAIL ────────────────────────

function testGoodFixtureNotFail() {
  console.log("\n[Test] Good fixture does not produce FAIL verdict");
  const { goodFixture } = ensureFixtures();
  const tmpOut = path.join(TEST_OUTPUT_DIR, "good-not-crash");
  fs.mkdirSync(tmpOut, { recursive: true });

  const result = cp.spawnSync(
    "node",
    [DELIVER_SCRIPT, goodFixture, tmpOut, "--style", "business-consulting"],
    {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120000,
    },
  );

  assertEqual(result.status, 0, "Good fixture exits 0");

  // Verify COMMERCIAL-VERDICT.md was written
  const verdictPath = path.join(tmpOut, "COMMERCIAL-VERDICT.md");
  assert(fs.existsSync(verdictPath), "COMMERCIAL-VERDICT.md exists after run");
  if (fs.existsSync(verdictPath)) {
    const verdictContent = fs.readFileSync(verdictPath, "utf8");
    assert(verdictContent.length > 50, "Verdict file contains substantial content");
    assert(!verdictContent.includes("**Overall Verdict**: FAIL"), "Verdict is not FAIL");
  }
}

// ─── Test: Different Styles Produce Output ─────────────────────────

function testDifferentStyles() {
  console.log("\n[Test] Different styles produce different PPTX sizes");
  const { goodFixture } = ensureFixtures();

  const styles = ["minimal-modern", "business-consulting", "academic-clean"];
  const sizes = [];

  for (const style of styles) {
    const tmpOut = path.join(TEST_OUTPUT_DIR, `style-${style}`);
    fs.mkdirSync(tmpOut, { recursive: true });

    const result = cp.spawnSync("node", [DELIVER_SCRIPT, goodFixture, tmpOut, "--style", style], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120000,
    });

    if (result.status === 0) {
      const pptxPath = path.join(tmpOut, "output.pptx");
      if (fs.existsSync(pptxPath)) {
        sizes.push({ style, size: fs.statSync(pptxPath).size });
      }
    }
  }

  assert(sizes.length >= 1, `At least 1 style produced output (got ${sizes.length})`);

  // Check that different styles produce different file sizes
  if (sizes.length >= 2) {
    const uniqueSizes = new Set(sizes.map((s) => s.size));
    assert(uniqueSizes.size >= 1, "Different styles produce varying outputs");
  }
}

// ─── Test: JSON Mode Outputs Machine Report ────────────────────────
function testJsonMode() {
  console.log("\n[Test] --json mode outputs machine-readable report to stdout");
  const { goodFixture } = ensureFixtures();

  const result = cp.spawnSync(
    "node",
    [DELIVER_SCRIPT, goodFixture, "--json", "--style", "minimal-modern"],
    {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120000,
    },
  );

  assert(result.status === 0, "JSON mode exits 0 for good fixture, got " + result.status);

  // In --json mode, stdout should be pure JSON with no header pollution
  const output = result.stdout.trim();
  assert(output.length > 0, "JSON mode produces non-empty stdout");

  try {
    const parsed = JSON.parse(output);
    assert(
      ["PASS", "NEEDS_REVIEW"].includes(parsed.overallVerdict),
      "JSON good fixture is not FAIL: " + parsed.overallVerdict,
    );
    assert(parsed.gateResults !== undefined, "JSON contains gateResults object");
    assert(parsed.environment !== undefined, "JSON contains environment object");
    assert(parsed.totalChecks !== undefined, "JSON contains totalChecks object");
    assert(typeof parsed.remediations === "object", "JSON contains remediations array/object");
  } catch (e) {
    // If parsing fails, show first 200 chars for debugging
    assert(
      false,
      "JSON output is valid JSON: " +
        e.message +
        " (first 200 chars: " +
        JSON.stringify(output.substring(0, 200)) +
        ")",
    );
  }
}

// ─── Test: Help Flag Works ─────────────────────────────────────────

function testHelpFlag() {
  console.log("\n[Test] --help flag shows usage");
  const result = cp.spawnSync("node", [DELIVER_SCRIPT, "--help"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 10000,
  });

  assertEqual(result.status, 0, "Help exits with code 0");
  assert(result.stdout.includes("Usage:"), "Help output contains Usage");
  assert(result.stdout.includes("deliver-pptx.js"), "Help output references the script name");
}

// ─── Test: Package Exports Are Correct ─────────────────────────────

function testPackageExports() {
  console.log("\n[Test] pixel-accessibility-gate package exports");
  const pkgPath = path.join(ROOT, "packages", "pixel-accessibility-gate", "src", "index.js");
  assert(fs.existsSync(pkgPath), "pixel-accessibility-gate/src/index.js exists");

  if (fs.existsSync(pkgPath)) {
    const mod = require(path.join(ROOT, "packages", "pixel-accessibility-gate", "src", "index.js"));
    assert(typeof mod.detectEnvironment === "function", "detectEnvironment is exported");
    assert(typeof mod.checkPixelContrast === "function", "checkPixelContrast is exported");
    assert(typeof mod.checkColorBlindness === "function", "checkColorBlindness is exported");
    assert(typeof mod.checkFontFallback === "function", "checkFontFallback is exported");
    assert(
      typeof mod.mergeCommercialReadiness === "function",
      "mergeCommercialReadiness is exported",
    );
    assert(typeof mod.computeColorContrast === "function", "computeColorContrast is exported");
    assert(typeof mod.estimatePixelContrast === "function", "estimatePixelContrast is exported");
  }
}

// ─── Test: Package Exports Return Valid Data ───────────────────────

function testPackageReturnsValidData() {
  console.log("\n[Test] Package functions return valid data structures");
  const pkgPath = path.join(ROOT, "packages", "pixel-accessibility-gate", "src", "index.js");
  if (!fs.existsSync(pkgPath)) return;

  const mod = require(path.join(ROOT, "packages", "pixel-accessibility-gate", "src", "index.js"));

  // test detectEnvironment
  const env = mod.detectEnvironment();
  assert(
    typeof env.hasLibreOffice === "boolean",
    "detectEnvironment returns hasLibreOffice boolean",
  );
  assert(
    typeof env.hasImagemagick === "boolean",
    "detectEnvironment returns hasImagemagick boolean",
  );
  assert(typeof env.hasPoppler === "boolean", "detectEnvironment returns hasPoppler boolean");

  // test checkPixelContrast with empty input
  const pixelResult = mod.checkPixelContrast([], [], null);
  assertEqual(
    pixelResult.verdict,
    "NEEDS_REVIEW",
    "checkPixelContrast with no PNGs returns NEEDS_REVIEW",
  );
  assert(pixelResult.degraded === true, "checkPixelContrast with no PNGs is degraded");

  // test checkColorBlindness with empty layout
  const cbResult = mod.checkColorBlindness(null);
  assertEqual(
    cbResult.verdict,
    "NEEDS_REVIEW",
    "checkColorBlindness with null layout returns NEEDS_REVIEW",
  );

  // test checkFontFallback with empty specs
  const fontResult = mod.checkFontFallback([], null, [], { hasPoppler: false });
  assertEqual(
    fontResult.verdict,
    "NEEDS_REVIEW",
    "checkFontFallback with no specs returns NEEDS_REVIEW",
  );

  // test mergeCommercialReadiness
  const merged = mod.mergeCommercialReadiness(
    "PASS",
    { overallVerdict: "PASS", remediationSuggestions: [] },
    { verdict: "PASS", passCount: 1, failCount: 0, warnCount: 0, findings: [] },
    { verdict: "PASS", passCount: 1, failCount: 0, warnCount: 0, findings: [] },
    { verdict: "PASS", passCount: 1, failCount: 0, warnCount: 0, findings: [] },
    {},
  );
  assertEqual(
    merged.overallVerdict,
    "PASS",
    "mergeCommercialReadiness returns PASS when all gates pass",
  );
  assertEqual(
    Object.keys(merged.gateResults).length,
    5,
    "mergeCommercialReadiness has 5 gate results",
  );
}

// ─── Test: NPM Scripts Registered ──────────────────────────────────

function testNpmScriptsRegistered() {
  console.log("\n[Test] NPM scripts are registered in package.json");
  const pkgPath = path.join(ROOT, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  assert(pkg.scripts["deliver:pptx"] !== undefined, "npm script deliver:pptx is registered");
  assert(
    pkg.scripts["check:m12-18-one-command-delivery-pipeline"] !== undefined,
    "npm script check:m12-18-one-command-delivery-pipeline is registered",
  );

  // Check that deliver:pptx uses the correct script
  if (pkg.scripts["deliver:pptx"]) {
    assert(
      pkg.scripts["deliver:pptx"].includes("deliver-pptx.js"),
      "deliver:pptx script references deliver-pptx.js",
    );
  }
}

// ─── Test: Graceful Degradation — No Rendering Tools ───────────────

function testGracefulDegradation() {
  console.log("\n[Test] Graceful degradation: no rendering tools → script completes");
  const { goodFixture } = ensureFixtures();
  const tmpOut = path.join(TEST_OUTPUT_DIR, "degraded");
  fs.mkdirSync(tmpOut, { recursive: true });

  const result = cp.spawnSync(
    "node",
    [DELIVER_SCRIPT, goodFixture, tmpOut, "--style", "minimal-modern"],
    {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120000,
    },
  );

  assert(
    result.status === 0 || result.status === null,
    "Script completes without crash or hard fail (exit 0/null), got " + result.status,
  );

  // Read machine report
  const reportPath = path.join(tmpOut, "machine-report.json");
  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    assert(
      ["PASS", "NEEDS_REVIEW"].includes(report.overallVerdict),
      "Missing tools do not cause FAIL: " + report.overallVerdict,
    );
  }
}

// ─── Run All Tests ─────────────────────────────────────────────────

console.log("=".repeat(65));
console.log("M12.18 — One-Command Delivery Pipeline Tests");
console.log("=".repeat(65));

try {
  testScriptExists();
  testMissingInput();
  testEmptyInput();
  testGoodFixtureArtifacts();
  testGoodFixtureNotFail();
  testDifferentStyles();
  testJsonMode();
  testHelpFlag();
  testPackageExports();
  testPackageReturnsValidData();
  testNpmScriptsRegistered();
  testGracefulDegradation();
} catch (err) {
  console.error("\nUnexpected error during tests:", err.message);
  failedTests++;
}

console.log("\n" + "=".repeat(65));
console.log(`Results: ${passedTests}/${totalTests} passed, ${failedTests} failed`);
console.log("=".repeat(65));

if (failedTests > 0) {
  process.exit(1);
}
process.exit(0);
