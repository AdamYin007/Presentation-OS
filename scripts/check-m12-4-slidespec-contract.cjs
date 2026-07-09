#!/usr/bin/env node
/**
 * M12.4 SlideSpec Contract Checker
 *
 * Validates:
 * - Required files exist
 * - Module exports are correct
 * - Schema validation works
 * - Sample SlideSpec fixture is valid
 * - Tests pass
 * - Spec document exists
 */

"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");

function fail(message) { throw new Error(message); }

// ── Required files ──

const REQUIRED_FILES = [
  "packages/slidespec/package.json",
  "packages/slidespec/src/index.js",
  "packages/slidespec/src/schema.js",
  "packages/slidespec/src/generator.js",
  "tests/slidespec/slidespec.test.js",
  "docs/M12_4_SLIDESPEC_SPEC.md",
];

const FIXTURE_FILES = [
  "examples/business-review/deck-plan.json",
  "examples/business-review/slidespec.json",
];

const ALLOWED_DIFF_FILES = new Set([
  ...REQUIRED_FILES,
  ...FIXTURE_FILES,
  "docs/ROADMAP.md",
  "package.json",
  "scripts/check-m12-3-story-planner.cjs",
  "scripts/check-m12-4-slidespec-contract.cjs",
  "packages/slidespec/package.json",
]);

// ── Checks ──

function checkRequiredFiles() {
  console.log("Checking required files...");
  for (const file of [...REQUIRED_FILES, ...FIXTURE_FILES]) {
    if (!fs.existsSync(path.join(ROOT, file))) fail(`Missing: ${file}`);
    console.log(`  ✓ ${file}`);
  }
}

function checkModuleExports() {
  console.log("\nChecking module exports...");
  const mod = require(path.join(ROOT, "packages/slidespec/src/index.js"));
  if (typeof mod.generateSlideSpecs !== "function") fail("Missing: generateSlideSpecs");
  if (typeof mod.validateSlideSpec !== "function") fail("Missing: validateSlideSpec");
  if (typeof mod.createDefaultSlideSpec !== "function") fail("Missing: createDefaultSlideSpec");
  console.log("  ✓ generateSlideSpecs");
  console.log("  ✓ validateSlideSpec");
  console.log("  ✓ createDefaultSlideSpec");
}

function checkSchemaValidation() {
  console.log("\nChecking schema validation...");
  const { validateSlideSpec, createDefaultSlideSpec } = require(path.join(ROOT, "packages/slidespec/src/schema.js"));

  const valid = createDefaultSlideSpec({ id: "x", index: 1, section: "s", role: "content", title: "t", keyMessage: "k", body: ["b"], visualType: "none", layout: "title-and-bullets", speakerNotes: "", sourceRefs: [] });
  assert(validateSlideSpec(valid).ok, "Valid spec should pass");
  console.log("  ✓ Valid spec accepted");

  assert(!validateSlideSpec({}).ok, "Empty should fail");
  console.log("  ✓ Empty object rejected");
}

function checkFixture() {
  console.log("\nChecking SlideSpec fixture...");
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, "examples/business-review/slidespec.json"), "utf8"));
  const { validateSlideSpec } = require(path.join(ROOT, "packages/slidespec/src/schema.js"));

  for (let i = 0; i < fixture.length; i++) {
    const v = validateSlideSpec(fixture[i]);
    if (!v.ok) fail(`Fixture slide[${i}] invalid: ${v.errors.join(", ")}`);
  }
  console.log(`  ✓ Fixture: ${fixture.length} SlideSpec entries`);

  // Check required fields present
  for (const spec of fixture) {
    for (const field of ["id","index","section","role","title","keyMessage","body","visualType","layout","speakerNotes","sourceRefs","designHints"]) {
      if (!(field in spec)) fail(`Missing field: ${field}`);
    }
  }
  console.log("  ✓ All required fields present");

  // Check speaker notes
  const withNotes = fixture.filter((s) => s.speakerNotes && s.speakerNotes.length > 0);
  console.log(`  ✓ Speaker notes on ${withNotes.length}/${fixture.length} slides`);

  // Check layouts mapped
  const layouts = new Set(fixture.map((s) => s.layout));
  console.log(`  ✓ Layouts used: ${[...layouts].join(", ")}`);

  // Check no PPTX leakage
  const jsonStr = JSON.stringify(fixture);
  if (jsonStr.includes("pptxgenjs")) fail("Fixture contains pptxgenjs reference");
  console.log("  ✓ No PPTX rendering leakage");
}

function checkDeckPlanIntegration() {
  console.log("\nChecking DeckPlan → SlideSpec integration...");
  const deckPlan = JSON.parse(fs.readFileSync(path.join(ROOT, "examples/business-review/deck-plan.json"), "utf8"));
  const { generateSlideSpecs } = require(path.join(ROOT, "packages/slidespec/src/index.js"));
  const specs = generateSlideSpecs(deckPlan);
  assert(specs.length === deckPlan.slides.length, `Expected ${deckPlan.slides.length} specs, got ${specs.length}`);
  console.log(`  ✓ DeckPlan (${deckPlan.slides.length} slides) → SlideSpec (${specs.length} entries)`);
}

function runTests() {
  console.log("\nRunning SlideSpec tests...");
  try {
    const result = cp.execSync(`node "${path.join(ROOT, "tests/slidespec/slidespec.test.js")}"`, { cwd: ROOT, encoding: "utf8", timeout: 30000 });
    console.log(result.trim().split("\n").filter((l) => l.includes("PASS")).join("\n"));
  } catch (e) {
    fail("Tests failed");
  }
}

function checkSpecDocument() {
  console.log("\nChecking spec document...");
  const spec = fs.readFileSync(path.join(ROOT, "docs/M12_4_SLIDESPEC_SPEC.md"), "utf8");
  for (const term of ["SlideSpec", "DeckPlan", "layout", "speakerNotes", "visualType", "M12.5"]) {
    if (!spec.toLowerCase().includes(term.toLowerCase())) fail(`Spec missing: ${term}`);
  }
  console.log("  ✓ Spec document complete");
}

function main() {
  console.log("M12.4 SlideSpec Contract Checker");
  console.log("================================\n");

  checkRequiredFiles();
  checkModuleExports();
  checkSchemaValidation();
  checkFixture();
  checkDeckPlanIntegration();
  checkSpecDocument();
  runTests();

  console.log("\n================================");
  console.log("M12.4 SlideSpec Contract check passed\n");
}

if (require.main === module) main();

module.exports = { checkRequiredFiles, checkModuleExports, checkFixture };
