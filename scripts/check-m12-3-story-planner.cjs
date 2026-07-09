#!/usr/bin/env node
/**
 * M12.3 Story Planner Checker
 *
 * Validates that the Story Planner implementation is complete:
 * - Required files exist
 * - Module exports are correct
 * - Schema validation works
 * - Sample DeckPlan fixture is valid
 * - Tests pass
 * - Spec document exists
 *
 * Run: node scripts/check-m12-3-story-planner.cjs
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function fail(message) {
  throw new Error(message);
}

function readText(filePath) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

// ── Required files ──

const REQUIRED_FILES = [
  "packages/story-planner/package.json",
  "packages/story-planner/src/index.js",
  "packages/story-planner/src/planner.js",
  "packages/story-planner/src/schema.js",
  "packages/story-planner/src/narrative-patterns.js",
  "tests/story-planner/story-planner.test.js",
  "docs/M12_3_STORY_PLANNER_SPEC.md",
];

const FIXTURE_FILES = [
  "examples/business-review/deck-plan.json",
];

const ALLOWED_DIFF_FILES = new Set([
  ...REQUIRED_FILES,
  ...FIXTURE_FILES,
  "docs/ROADMAP.md",
  "package.json",
  "scripts/check-m12-3-story-planner.cjs",
  "packages/story-planner/package.json",
  "docs/M12_4_SLIDESPEC_SPEC.md",
  // M12.5 Theme and Layout System
  "packages/theme-layout/package.json",
  "packages/theme-layout/src/index.js",
  "packages/theme-layout/src/schema.js",
  "packages/theme-layout/src/generator.js",
  "tests/theme-layout/theme-layout.test.js",
  "examples/business-review/layout-plan.json",
  "scripts/check-m12-5-theme-layout.cjs",
  "docs/M12_5_THEME_LAYOUT_SPEC.md",
  // M12.6 Editable PPTX Renderer
  "packages/pptx-renderer/package.json",
  "packages/pptx-renderer/src/index.js",
  "packages/pptx-renderer/src/schema.js",
  "packages/pptx-renderer/src/renderer.js",
  "tests/pptx-renderer/pptx-renderer.test.js",
  "examples/business-review/output.pptx",
  "scripts/check-m12-6-pptx-renderer.cjs",
  "docs/M12_6_PPTX_RENDERER_SPEC.md",
]);

// ── Checks ──

function checkRequiredFiles() {
  console.log("Checking required files...");

  for (const file of REQUIRED_FILES) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) {
      fail(`Required file missing: ${file}`);
    }
    console.log(`  ✓ ${file}`);
  }

  for (const file of FIXTURE_FILES) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) {
      fail(`Fixture missing: ${file}`);
    }
    console.log(`  ✓ ${file}`);
  }
}

function checkModuleExports() {
  console.log("\nChecking module exports...");

  const modulePath = path.join(ROOT, "packages/story-planner/src/index.js");
  const planner = require(modulePath);

  if (typeof planner.planDeck !== "function") {
    fail("Missing export: planDeck");
  }
  console.log("  ✓ planDeck");

  // Check schema module
  const schemaModule = require(path.join(ROOT, "packages/story-planner/src/schema.js"));
  if (typeof schemaModule.validateDeckPlan !== "function") {
    fail("Missing schema export: validateDeckPlan");
  }
  if (typeof schemaModule.createDefaultDeckPlan !== "function") {
    fail("Missing schema export: createDefaultDeckPlan");
  }
  console.log("  ✓ validateDeckPlan");
  console.log("  ✓ createDefaultDeckPlan");

  // Check narrative patterns module
  const patternsModule = require(path.join(ROOT, "packages/story-planner/src/narrative-patterns.js"));
  if (typeof patternsModule.selectNarrativePattern !== "function") {
    fail("Missing pattern export: selectNarrativePattern");
  }
  if (!Array.isArray(patternsModule.NARRATIVE_PATTERNS)) {
    fail("NARRATIVE_PATTERNS should be an array");
  }
  console.log(`  ✓ selectNarrativePattern (${patternsModule.NARRATIVE_PATTERNS.length} patterns)`);
}

function checkSchemaValidation() {
  console.log("\nChecking schema validation...");

  const { validateDeckPlan, createDefaultDeckPlan } = require(
    path.join(ROOT, "packages/story-planner/src/schema.js")
  );

  // Valid plan
  const validPlan = createDefaultDeckPlan({
    deckTitle: "Test",
    audience: "team",
    purpose: "inform",
    narrativePattern: "test",
    sections: [{ id: "s1", title: "Section", purpose: "Test", keyMessage: "Msg", slideAllocation: 1, sourceRefs: [] }],
    slides: [{ slideId: "slide-001", role: "content", objective: "Test", keyMessage: "Msg", candidateVisual: "none", sourceRefs: [] }],
  });
  const result = validateDeckPlan(validPlan);
  if (!result.ok) {
    fail(`Valid plan rejected: ${result.errors.join(", ")}`);
  }
  console.log("  ✓ Valid plan accepted");

  // Invalid plan
  const invalidResult = validateDeckPlan({});
  if (invalidResult.ok) {
    fail("Empty object should be rejected");
  }
  console.log("  ✓ Invalid plan rejected");
}

function checkFixture() {
  console.log("\nChecking DeckPlan fixture...");

  const fixtureContent = readText("examples/business-review/deck-plan.json");
  const fixture = JSON.parse(fixtureContent);

  // Validate structure
  const { validateDeckPlan } = require(path.join(ROOT, "packages/story-planner/src/schema.js"));
  const validation = validateDeckPlan(fixture);
  if (!validation.ok) {
    fail(`Fixture is invalid: ${validation.errors.join(", ")}`);
  }
  console.log("  ✓ Fixture passes schema validation");

  // Check key fields
  if (!fixture.deckTitle || typeof fixture.deckTitle !== "string") {
    fail("Fixture missing deckTitle");
  }
  if (!fixture.narrativePattern || typeof fixture.narrativePattern !== "string") {
    fail("Fixture missing narrativePattern");
  }
  if (!Array.isArray(fixture.sections) || fixture.sections.length === 0) {
    fail("Fixture should have sections");
  }
  if (!Array.isArray(fixture.slides) || fixture.slides.length === 0) {
    fail("Fixture should have slides");
  }
  if (!Array.isArray(fixture.assumptions)) {
    fail("Fixture assumptions should be an array");
  }
  if (!Array.isArray(fixture.warnings)) {
    fail("Fixture warnings should be an array");
  }

  // Verify each section has required fields
  for (let i = 0; i < fixture.sections.length; i++) {
    const sec = fixture.sections[i];
    for (const field of ["id", "title", "purpose", "keyMessage", "slideAllocation", "sourceRefs"]) {
      if (!(field in sec)) {
        fail(`Section[${i}] missing field: ${field}`);
      }
    }
  }

  // Verify each slide has required fields
  for (let i = 0; i < fixture.slides.length; i++) {
    const slide = fixture.slides[i];
    for (const field of ["slideId", "role", "objective", "keyMessage", "candidateVisual", "sourceRefs"]) {
      if (!(field in slide)) {
        fail(`Slide[${i}] missing field: ${field}`);
      }
    }
  }

  console.log(`  ✓ Fixture: ${fixture.sections.length} sections, ${fixture.slides.length} slides`);
  console.log(`  ✓ Narrative pattern: ${fixture.narrativePattern}`);
}

function checkSpecDocument() {
  console.log("\nChecking spec document...");

  const spec = readText("docs/M12_3_STORY_PLANNER_SPEC.md");

  const requiredTerms = [
    "DeckPlan",
    "narrative",
    "presentationIntent",
    "sourceDocument",
    "domain-agnostic",
    "deterministic",
    "M12.4",
    "SlideSpec",
  ];

  for (const term of requiredTerms) {
    if (!spec.toLowerCase().includes(term.toLowerCase())) {
      fail(`Spec document missing required term: ${term}`);
    }
  }

  console.log("  ✓ Spec document contains all required sections");
}

function runTests() {
  console.log("\nRunning Story Planner tests...");

  const cp = require("child_process");
  try {
    const result = cp.execSync(
      `node "${path.join(ROOT, "tests/story-planner/story-planner.test.js")}"`,
      { cwd: ROOT, encoding: "utf8", timeout: 30000 }
    );
    console.log(result.trim().split("\n").filter((l) => l.includes("PASS") || l.includes("Results")).join("\n"));
  } catch (e) {
    // Tests may print results before exit code
    const output = e.stdout || "";
    console.log(output.trim().split("\n").filter((l) => l.includes("PASS") || l.includes("FAIL") || l.includes("Results")).join("\n"));
    fail("Story Planner tests failed");
  }
}

function checkNoSlideSpecOrPPTX() {
  console.log("\nChecking scope boundaries...");

  const plannerCode = readText("packages/story-planner/src/planner.js");

  // Should NOT contain SlideSpec or PPTX rendering
  if (plannerCode.includes("pptxgenjs") || plannerCode.includes("pptx")) {
    fail("Story Planner must not depend on pptx rendering");
  }
  if (plannerCode.includes("designHints") && plannerCode.includes("qaHints")) {
    // These are SlideSpec fields — having both is a strong signal of SlideSpec leakage
    // But we allow single occurrences if they're just in comments
    const nonCommentMatches = plannerCode.split("\n").filter((line) =>
      line.includes("designHints") || line.includes("qaHints")
    ).filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"));
    if (nonCommentMatches.length > 2) {
      fail("Story Planner must not implement SlideSpec fields");
    }
  }

  console.log("  ✓ No SlideSpec/PPTX rendering leakage");
}

// ── Main ──

function main() {
  console.log("M12.3 Story Planner Checker");
  console.log("===========================\n");

  checkRequiredFiles();
  checkModuleExports();
  checkSchemaValidation();
  checkFixture();
  checkSpecDocument();
  runTests();
  checkNoSlideSpecOrPPTX();

  console.log("\n===========================");
  console.log("M12.3 Story Planner check passed\n");
}

if (require.main === module) {
  main();
}

module.exports = {
  checkRequiredFiles,
  checkModuleExports,
  checkSchemaValidation,
  checkFixture,
};
