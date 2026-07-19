#!/usr/bin/env node
/**
 * M12.19 — Logo Safe Area Enforcement Tests
 *
 * Focused fixtures covering PASS, NEEDS_REVIEW, and FAIL scenarios.
 *
 * Usage:
 *   node tests/m12-19-logo-safe-area-enforcement.test.js
 *   npm run check:m12-19-logo-safe-area-enforcement
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { checkLogoSafeArea, DEFAULT_SAFE_AREA, SLIDE_WIDTH_PX, SLIDE_HEIGHT_PX } = require("../packages/logo-safe-area-gate/src/index.js");

const ROOT = path.join(__dirname, "..");
const FIXTURES_DIR = path.join(ROOT, "fixtures", "m12-19");
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

// ─── Test Fixtures ─────────────────────────────────────────────────────

function ensureFixtures() {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  // PASS fixture: all logos within safe area
  const passSpecs = [
    {
      id: "s1", index: 1, section: "Intro", role: "title-slide", title: "Title",
      keyMessage: "", body: [], visualType: "none", layout: "title-slide",
      speakerNotes: "", sourceRefs: [],
      designHints: { logo: { boundingBox: { x: 50, y: 50, width: 80, height: 30 } } },
    },
    {
      id: "s2", index: 2, section: "Content", role: "content", title: "Content Slide",
      keyMessage: "", body: ["Item 1"], visualType: "none", layout: "title-and-bullets",
      speakerNotes: "", sourceRefs: [],
      designHints: { logo: { boundingBox: { x: 1000, y: 600, width: 80, height: 30 } } },
    },
  ];

  // NEEDS_REVIEW fixture: logos declared but no bounding box
  const reviewSpecs = [
    {
      id: "s1", index: 1, section: "Intro", role: "title-slide", title: "Title",
      keyMessage: "", body: [], visualType: "none", layout: "title-slide",
      speakerNotes: "", sourceRefs: [],
      designHints: { logo: { x: 50, y: 50 } }, // no bounding box, no explicit box
    },
  ];

  // FAIL fixture: logo protrudes outside safe area
  const failSpecs = [
    {
      id: "s1", index: 1, section: "Intro", role: "title-slide", title: "Title",
      keyMessage: "", body: [], visualType: "none", layout: "title-slide",
      speakerNotes: "", sourceRefs: [],
      designHints: { logo: { boundingBox: { x: 0, y: 0, width: 200, height: 200 } } }, // way outside
    },
  ];

  // No-logo fixture: should return NEEDS_REVIEW
  const noLogoSpecs = [
    {
      id: "s1", index: 1, section: "Intro", role: "content", title: "Content",
      keyMessage: "", body: ["Item 1"], visualType: "none", layout: "title-and-bullets",
      speakerNotes: "", sourceRefs: [],
    },
  ];

  // Empty specs
  const emptySpecs = [];

  return { passSpecs, reviewSpecs, failSpecs, noLogoSpecs, emptySpecs };
}

// ─── Tests ─────────────────────────────────────────────────────────────

function testModuleExports() {
  console.log("\n[Test] Module exports");
  assert(typeof checkLogoSafeArea === "function", "checkLogoSafeArea is exported as function");
  assert(typeof DEFAULT_SAFE_AREA === "object", "DEFAULT_SAFE_AREA is exported");
  assert(typeof SLIDE_WIDTH_PX === "number", "SLIDE_WIDTH_PX is exported");
  assert(typeof SLIDE_HEIGHT_PX === "number", "SLIDE_HEIGHT_PX is exported");
  assertEqual(DEFAULT_SAFE_AREA.top, 40, "Default safe area top margin is 40px");
  assertEqual(DEFAULT_SAFE_AREA.bottom, 40, "Default safe area bottom margin is 40px");
  assertEqual(DEFAULT_SAFE_AREA.left, 40, "Default safe area left margin is 40px");
  assertEqual(DEFAULT_SAFE_AREA.right, 40, "Default safe area right margin is 40px");
}

function testPassScenario() {
  console.log("\n[Test] PASS scenario — logos within safe area");
  const { passSpecs } = ensureFixtures();
  const layoutPlan = { slideWidth: SLIDE_WIDTH_PX, slideHeight: SLIDE_HEIGHT_PX };
  const result = checkLogoSafeArea(passSpecs, layoutPlan);

  assertEqual(result.verdict, "PASS", "Verdict is PASS when all logos are within safe area");
  assertEqual(result.passCount, 2, "Both logos pass");
  assertEqual(result.failCount, 0, "Zero failures");
  assertEqual(result.warnCount, 0, "Zero warnings");
  assertEqual(result.totalLogosChecked, 2, "Two logos checked");
  assert(result.results.every(r => r.status === "pass"), "All results are pass status");
}

function testFailScenario() {
  console.log("\n[Test] FAIL scenario — logo outside safe area");
  const { failSpecs } = ensureFixtures();
  const layoutPlan = { slideWidth: SLIDE_WIDTH_PX, slideHeight: SLIDE_HEIGHT_PX };
  const result = checkLogoSafeArea(failSpecs, layoutPlan);

  assertEqual(result.verdict, "FAIL", "Verdict is FAIL when logo protrudes outside safe area");
  assertEqual(result.failCount, 1, "One failure detected");
  assertEqual(result.passCount, 0, "Zero passes");
  assert(result.issues.some(i => i.category === "logo_outside_safe_area"), "Issue category is logo_outside_safe_area");
  assert(result.results.some(r => r.status === "fail"), "At least one fail result");
}

function testNeedsReview_NoBoundingBox() {
  console.log("\n[Test] NEEDS_REVIEW scenario — logo declared without bounding box");
  const { reviewSpecs } = ensureFixtures();
  const layoutPlan = { slideWidth: SLIDE_WIDTH_PX, slideHeight: SLIDE_HEIGHT_PX };
  const result = checkLogoSafeArea(reviewSpecs, layoutPlan);

  assertEqual(result.verdict, "NEEDS_REVIEW", "Verdict is NEEDS_REVIEW when logo lacks bounding box");
  assertEqual(result.warnCount, 1, "One warning for missing bounding box");
  assertEqual(result.totalLogosChecked, 0, "No logos actually checked (no bounding box)");
  assert(result.issues.some(i => i.category === "logo_no_bounding_box"), "Issue category is logo_no_bounding_box");
}

function testNeedsReview_NoLogos() {
  console.log("\n[Test] NEEDS_REVIEW scenario — no logos declared at all");
  const { noLogoSpecs } = ensureFixtures();
  const layoutPlan = { slideWidth: SLIDE_WIDTH_PX, slideHeight: SLIDE_HEIGHT_PX };
  const result = checkLogoSafeArea(noLogoSpecs, layoutPlan);

  assertEqual(result.verdict, "NEEDS_REVIEW", "Verdict is NEEDS_REVIEW when no logos declared");
  assertEqual(result.totalLogosChecked, 0, "Zero logos checked");
}

function testEmptySpecs() {
  console.log("\n[Test] Empty specs — returns NEEDS_REVIEW");
  const { emptySpecs } = ensureFixtures();
  const layoutPlan = { slideWidth: SLIDE_WIDTH_PX, slideHeight: SLIDE_HEIGHT_PX };
  const result = checkLogoSafeArea(emptySpecs, layoutPlan);

  assertEqual(result.verdict, "NEEDS_REVIEW", "Empty specs returns NEEDS_REVIEW");
  assertEqual(result.totalLogosChecked, 0, "Zero logos checked");
}

function testCustomMargins() {
  console.log("\n[Test] Custom brand config margins");
  const { passSpecs } = ensureFixtures();
  const layoutPlan = { slideWidth: SLIDE_WIDTH_PX, slideHeight: SLIDE_HEIGHT_PX };
  const tightMargins = { top: 100, bottom: 100, left: 100, right: 100 };
  const result = checkLogoSafeArea(passSpecs, layoutPlan, { logoSafeArea: tightMargins });

  assertEqual(result.verdict, "FAIL", "Custom tight margins can turn an otherwise safe logo into FAIL");
  assert(result.margins.top === 100, "Custom top margin applied");
  assert(result.margins.right === 100, "Custom right margin applied");
}

function testVisualSpecLogoSource() {
  console.log("\n[Test] Logo from visualSpec instead of designHints");
  const specs = [
    {
      id: "s1", index: 1, section: "Intro", role: "content", title: "Test",
      keyMessage: "", body: [], visualType: "none", layout: "content",
      speakerNotes: "", sourceRefs: [],
      visualSpec: { logo: { boundingBox: { x: 50, y: 50, width: 80, height: 30 } } },
    },
  ];
  const layoutPlan = { slideWidth: SLIDE_WIDTH_PX, slideHeight: SLIDE_HEIGHT_PX };
  const result = checkLogoSafeArea(specs, layoutPlan);

  assertEqual(result.verdict, "PASS", "visualSpec logo detected and checked");
  assertEqual(result.totalLogosChecked, 1, "One logo checked from visualSpec");
  assert(result.results[0].source === "visualSpec", "Source identified as visualSpec");
}

function testMixedScenario() {
  console.log("\n[Test] Mixed scenario — some pass, some fail, some warn");
  const specs = [
    // Pass
    { id: "s1", index: 1, section: "A", role: "content", title: "A", keyMessage: "", body: [], visualType: "none", layout: "content", speakerNotes: "", sourceRefs: [], designHints: { logo: { boundingBox: { x: 50, y: 50, width: 80, height: 30 } } } },
    // Fail
    { id: "s2", index: 2, section: "B", role: "content", title: "B", keyMessage: "", body: [], visualType: "none", layout: "content", speakerNotes: "", sourceRefs: [], designHints: { logo: { boundingBox: { x: 0, y: 0, width: 200, height: 200 } } } },
    // Warn (no bbox)
    { id: "s3", index: 3, section: "C", role: "content", title: "C", keyMessage: "", body: [], visualType: "none", layout: "content", speakerNotes: "", sourceRefs: [], designHints: { logo: { x: 50 } } },
  ];
  const layoutPlan = { slideWidth: SLIDE_WIDTH_PX, slideHeight: SLIDE_HEIGHT_PX };
  const result = checkLogoSafeArea(specs, layoutPlan);

  assertEqual(result.passCount, 1, "One pass");
  assertEqual(result.failCount, 1, "One fail");
  assertEqual(result.warnCount, 1, "One warn");
  assertEqual(result.verdict, "FAIL", "Mixed scenario with any fail → overall FAIL");
}

function testScriptExists() {
  console.log("\n[Test] Checker script exists");
  const scriptPath = path.join(ROOT, "scripts", "check-m12-19-logo-safe-area-enforcement.cjs");
  assert(fs.existsSync(scriptPath), "check-m12-19-logo-safe-area-enforcement.cjs exists");
}

function testNpmScriptsRegistered() {
  console.log("\n[Test] NPM scripts registered in package.json");
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert(pkg.scripts["check:m12-19-logo-safe-area-enforcement"] !== undefined, "npm script check:m12-19-logo-safe-area-enforcement is registered");
}

function testPackageExists() {
  console.log("\n[Test] Package directory exists");
  const pkgPath = path.join(ROOT, "packages", "logo-safe-area-gate", "src", "index.js");
  assert(fs.existsSync(pkgPath), "packages/logo-safe-area-gate/src/index.js exists");
}

// ─── Run All Tests ─────────────────────────────────────────────────────

console.log("=".repeat(65));
console.log("M12.19 — Logo Safe Area Enforcement Tests");
console.log("=".repeat(65));

try {
  testModuleExports();
  testPassScenario();
  testFailScenario();
  testNeedsReview_NoBoundingBox();
  testNeedsReview_NoLogos();
  testEmptySpecs();
  testCustomMargins();
  testVisualSpecLogoSource();
  testMixedScenario();
  testScriptExists();
  testNpmScriptsRegistered();
  testPackageExists();
} catch (err) {
  console.error("\nUnexpected error during tests:", err.message);
  failedTests++;
}

console.log("\n" + "=".repeat(65));
console.log(`Results: ${passedTests}/${totalTests} passed, ${failedTests} failed`);
console.log("=".repeat(65));

if (failedTests > 0) process.exit(1);
process.exit(0);
