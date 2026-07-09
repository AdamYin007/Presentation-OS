#!/usr/bin/env node
/**
 * M12.2 Presentation Intent Parser Checker
 *
 * Validates that the M12.2 thin slice is complete and wired into the default
 * repository checks.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = path.join(__dirname, "..");

const REQUIRED_FILES = [
  "packages/intent-parser/package.json",
  "packages/intent-parser/src/index.js",
  "packages/intent-parser/src/parser.js",
  "packages/intent-parser/src/schema.js",
  "tests/intent-parser/intent-parser.test.js",
  "docs/M12_2_PRESENTATION_INTENT_PARSER_SPEC.md",
  "fixtures/intent-parser/chinese-education-prompt.txt",
  "fixtures/intent-parser/english-research-prompt.txt",
  "fixtures/intent-parser/sparse-source-prompt.txt",
  "fixtures/intent-parser/chinese-education-output.json",
  "fixtures/intent-parser/english-research-output.json",
];

const ALLOWED_DIFF_FILES = new Set([
  ...REQUIRED_FILES,
  "docs/ROADMAP.md",
  "package.json",
  "scripts/check-m12-1-document-ingestion.cjs",
  "scripts/check-m12-2-presentation-intent-parser.cjs",
  "scripts/check-m12-3-story-planner.cjs",
  "docs/M12_3_STORY_PLANNER_SPEC.md",
  "packages/story-planner/package.json",
  "packages/story-planner/src/index.js",
  "packages/story-planner/src/planner.js",
  "packages/story-planner/src/schema.js",
  "packages/story-planner/src/narrative-patterns.js",
  "tests/story-planner/story-planner.test.js",
  "examples/business-review/deck-plan.json",
]);

function fail(message) {
  throw new Error(message);
}

function readText(filePath) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function checkRequiredFiles() {
  console.log("Checking required files...");
  for (const file of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(ROOT, file))) {
      fail(`Required file missing: ${file}`);
    }
    console.log(`  PASS ${file}`);
  }
}

function checkModuleExports() {
  console.log("\nChecking module exports...");
  const modulePath = path.join(ROOT, "packages/intent-parser/src/index.js");
  const parser = require(modulePath);
  for (const name of ["parsePresentationIntent", "createDefaultPresentationIntent", "validatePresentationIntent"]) {
    if (typeof parser[name] !== "function") {
      fail(`Missing export: ${name}`);
    }
    console.log(`  PASS ${name}`);
  }
}

function checkContractBehavior() {
  console.log("\nChecking parser behavior...");
  const {
    parsePresentationIntent,
    validatePresentationIntent,
  } = require(path.join(ROOT, "packages/intent-parser/src/index.js"));

  const chinese = parsePresentationIntent(readText("fixtures/intent-parser/chinese-education-prompt.txt"));
  assertValid(chinese, validatePresentationIntent);
  if (chinese.language !== "zh-CN" || chinese.targetSlideCount !== 12 || chinese.purpose !== "teach") {
    fail("Chinese prompt did not produce expected intent fields");
  }
  console.log("  PASS Chinese prompt parsing");

  const english = parsePresentationIntent(readText("fixtures/intent-parser/english-research-prompt.txt"));
  assertValid(english, validatePresentationIntent);
  if (english.language !== "en-US" || english.targetSlideCount !== 10 || english.domain !== "research") {
    fail("English prompt did not produce expected intent fields");
  }
  console.log("  PASS English prompt parsing");

  const sparse = parsePresentationIntent(readText("fixtures/intent-parser/sparse-source-prompt.txt"), {
    sourceDocument: {
      title: "Annual Operating Review",
      paragraphs: Array.from({ length: 18 }, (_, i) => ({ sourceId: `para-${i}` })),
      sections: [],
      metadata: {},
    },
  });
  assertValid(sparse, validatePresentationIntent);
  if (sparse.topic !== "Annual Operating Review") {
    fail("Sparse prompt did not infer topic from source title");
  }
  if (!sparse.assumptions.some((item) => item.includes("SourceDocumentModel title"))) {
    fail("Sparse prompt did not record source-title assumption");
  }
  console.log("  PASS source-aware sparse prompt inference");
}

function assertValid(intent, validatePresentationIntent) {
  const result = validatePresentationIntent(intent);
  if (!result.ok) {
    fail(`Invalid PresentationIntent: ${result.errors.join(", ")}`);
  }
}

function checkFixtures() {
  console.log("\nChecking output fixtures...");
  const { validatePresentationIntent } = require(path.join(ROOT, "packages/intent-parser/src/index.js"));
  for (const file of [
    "fixtures/intent-parser/chinese-education-output.json",
    "fixtures/intent-parser/english-research-output.json",
  ]) {
    const parsed = JSON.parse(readText(file));
    assertValid(parsed, validatePresentationIntent);
    console.log(`  PASS ${file}`);
  }
}

function checkSpecAndRoadmap() {
  console.log("\nChecking spec and roadmap...");
  const spec = readText("docs/M12_2_PRESENTATION_INTENT_PARSER_SPEC.md");
  for (const term of ["PresentationIntent", "domain-agnostic", "assumptions", "M12.3 Story Planner"]) {
    if (!spec.includes(term)) {
      fail(`Spec missing required term: ${term}`);
    }
  }
  console.log("  PASS spec terms");

  const roadmap = readText("docs/ROADMAP.md");
  if (!roadmap.includes("[x] M12.2 Presentation Intent Parser")) {
    fail("ROADMAP must mark M12.2 complete");
  }
  if (!roadmap.includes("Next: M12.3 Story Planner")) {
    fail("ROADMAP must point to M12.3 as next");
  }
  console.log("  PASS roadmap");

  const packageJson = readText("package.json");
  if (!packageJson.includes("check:m12-2-presentation-intent-parser")) {
    fail("package.json must expose the M12.2 checker");
  }
  if (!packageJson.includes("check:m12-1-document-ingestion && npm run check:m12-2-presentation-intent-parser")) {
    fail("check script must include the M12.2 checker after M12.1");
  }
  console.log("  PASS package scripts");
}

function checkUnitTests() {
  console.log("\nRunning intent parser tests...");
  cp.execFileSync("node", ["tests/intent-parser/intent-parser.test.js"], {
    cwd: ROOT,
    stdio: "inherit",
  });
}

function checkAllowedDiff() {
  console.log("\nChecking M12.2 diff allowlist...");
  const changed = new Set();
  const branchDiff = cp.execFileSync("git", ["diff", "--name-only", "origin/develop...HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  branchDiff.split("\n").map((line) => line.trim()).filter(Boolean).forEach((line) => changed.add(line));

  const statusOut = cp.execFileSync("git", ["status", "--porcelain"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  statusOut.split("\n").map((line) => line.trim()).filter(Boolean).forEach((line) => {
    const normalized = line.replace(/^[A-Z?]+\s+/, "");
    if (normalized) addChangedPath(changed, normalized);
  });

  for (const file of changed) {
    if (!ALLOWED_DIFF_FILES.has(file)) {
      fail(`Unexpected changed file: ${file}`);
    }
  }
  console.log("  PASS changed files are within M12.2 scope");
}

function addChangedPath(changed, relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isFile()) {
    changed.add(relativePath);
    return;
  }

  for (const entry of fs.readdirSync(fullPath)) {
    addChangedPath(changed, path.join(relativePath, entry));
  }
}

function main() {
  console.log("M12.2 Presentation Intent Parser Checker");
  console.log("========================================\n");
  checkRequiredFiles();
  checkModuleExports();
  checkContractBehavior();
  checkFixtures();
  checkSpecAndRoadmap();
  checkUnitTests();
  checkAllowedDiff();
  console.log("\nM12.2 Presentation Intent Parser check passed\n");
}

if (require.main === module) {
  main();
}
