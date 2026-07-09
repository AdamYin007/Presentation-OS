#!/usr/bin/env node
/**
 * M12.5 Theme and Layout System Checker
 */
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const assert = require("assert");
const ROOT = path.join(__dirname, "..");

function fail(m) { throw new Error(m); }

const REQUIRED_FILES = [
  "packages/theme-layout/package.json",
  "packages/theme-layout/src/index.js",
  "packages/theme-layout/src/schema.js",
  "packages/theme-layout/src/generator.js",
  "tests/theme-layout/theme-layout.test.js",
  "docs/M12_5_THEME_LAYOUT_SPEC.md",
];
const FIXTURE_FILES = [
  "examples/business-review/layout-plan.json",
];

const ALLOWED_DIFF_FILES = new Set([
  ...REQUIRED_FILES, ...FIXTURE_FILES,
  "docs/ROADMAP.md", "package.json",
  "scripts/check-m12-5-theme-layout.cjs",
  "packages/theme-layout/package.json",
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
  const mod = require(path.join(ROOT, "packages/theme-layout/src/index.js"));
  if (typeof mod.generateLayoutPlan !== "function") fail("Missing: generateLayoutPlan");
  if (typeof mod.LAYOUT_FAMILIES !== "object") fail("Missing: LAYOUT_FAMILIES");
  if (typeof mod.THEME_TOKENS !== "object") fail("Missing: THEME_TOKENS");
  if (typeof mod.getThemeTokens !== "function") fail("Missing: getThemeTokens");
  console.log("  ✓ generateLayoutPlan");
  console.log("  ✓ LAYOUT_FAMILIES");
  console.log("  ✓ THEME_TOKENS");
  console.log("  ✓ getThemeTokens");
}

function checkFixture() {
  console.log("\nChecking LayoutPlan fixture...");
  const plan = JSON.parse(fs.readFileSync(path.join(ROOT, "examples/business-review/layout-plan.json"), "utf8"));
  assert(plan.schemaVersion === "1.0.0", "Should have schemaVersion");
  assert(plan.theme && typeof plan.theme === "string", "Should have theme");
  assert(plan.themeTokens && Object.keys(plan.themeTokens).length > 0, "Should have themeTokens");
  assert(Array.isArray(plan.layouts), "Should have layouts array");
  assert(plan.layouts.length > 0, "Should have at least one layout");
  assert(Array.isArray(plan.layoutFamiliesUsed), "Should have layoutFamiliesUsed");
  assert(plan.layoutFamiliesUsed.length >= 3, `Should use >= 3 families, got ${plan.layoutFamiliesUsed.length}`);
  for (const l of plan.layouts) {
    for (const field of ["slideId","layoutFamily","theme","colors","spacing","fontSize","maxWidth"]) {
      if (!(field in l)) fail(`Layout missing field: ${field}`);
    }
  }
  console.log(`  ✓ Fixture: theme=${plan.theme}, ${plan.layouts.length} layouts`);
  console.log(`  ✓ Families: ${plan.layoutFamiliesUsed.join(", ")}`);
}

function checkIntegration() {
  console.log("\nChecking SlideSpec → LayoutPlan integration...");
  const specs = JSON.parse(fs.readFileSync(path.join(ROOT, "examples/business-review/slidespec.json"), "utf8"));
  const { generateLayoutPlan } = require(path.join(ROOT, "packages/theme-layout/src/index.js"));
  const plan = generateLayoutPlan(specs, { style: "minimal-modern" });
  assert(plan.totalSlides === specs.length, `Expected ${specs.length} layouts, got ${plan.totalSlides}`);
  console.log(`  ✓ SlideSpec (${specs.length}) → LayoutPlan (${plan.totalSlides})`);
}

function runTests() {
  console.log("\nRunning theme-layout tests...");
  try {
    const result = cp.execSync(`node "${path.join(ROOT, "tests/theme-layout/theme-layout.test.js")}"`, { cwd: ROOT, encoding: "utf8", timeout: 30000 });
    console.log(result.trim().split("\n").filter((l) => l.includes("PASS")).join("\n"));
  } catch (e) { fail("Tests failed"); }
}

function checkSpecDocument() {
  console.log("\nChecking spec document...");
  const spec = fs.readFileSync(path.join(ROOT, "docs/M12_5_THEME_LAYOUT_SPEC.md"), "utf8");
  for (const term of ["LayoutPlan", "theme", "layout", "font", "color", "M12.6"]) {
    if (!spec.toLowerCase().includes(term.toLowerCase())) fail(`Spec missing: ${term}`);
  }
  console.log("  ✓ Spec document complete");
}

function main() {
  console.log("M12.5 Theme and Layout System Checker");
  console.log("=====================================\n");
  checkRequiredFiles();
  checkModuleExports();
  checkFixture();
  checkIntegration();
  checkSpecDocument();
  runTests();
  console.log("\n=====================================");
  console.log("M12.5 Theme and Layout System check passed\n");
}

if (require.main === module) main();
module.exports = { checkRequiredFiles, checkModuleExports, checkFixture };
