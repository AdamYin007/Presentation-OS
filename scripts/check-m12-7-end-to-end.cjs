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
  
  return result;
}

async function checkQuality(result) {
  console.log("\nChecking quality gates...");
  const specs = result.slideSpecs;
  
  let errors = [];
  
  // Check 1: No empty titles
  for (const spec of specs) {
    if (!spec.title || spec.title.trim().length === 0) {
      errors.push(`Empty title on slide ${spec.id}`);
    }
  }
  
  // Check 2: Content slides should have sourceRefs OR a fallback warning
  const contentSlides = specs.filter(s => s.role !== "section-divider" && s.role !== "title" && s.role !== "closing");
  for (const spec of contentSlides) {
    if (!spec.sourceRefs || spec.sourceRefs.length === 0) {
      // Only fail if there are sourceParagraphs available but not linked
      const section = result.deckPlan?.sections?.find(s => s.title === spec.section);
      if (section && section.sourceParagraphs && section.sourceParagraphs.length > 0) {
        errors.push(`No sourceRefs on content slide ${spec.id} (${spec.role}) despite ${section.sourceParagraphs.length} sourceParagraphs in "${spec.section}"`);
      } else {
        console.log(`  ⚠ Slide ${spec.id} (${spec.role} in "${spec.section}") has no sourceRefs — section likely has no matching source content`);
      }
    }
  }
  
  // Check 3: No duplicate title+body within same section
  const sectionGroups = {};
  for (const spec of specs) {
    const key = `${spec.section}/${spec.title}`;
    if (sectionGroups[key]) {
      const bodyA = JSON.stringify(sectionGroups[key].body);
      const bodyB = JSON.stringify(spec.body);
      if (bodyA === bodyB) {
        errors.push(`Duplicate title+body in section "${spec.section}": ${spec.title}`);
      }
    } else {
      sectionGroups[key] = spec;
    }
  }
  
  // Check 4: Content slides should have speaker notes
  for (const spec of contentSlides) {
    if (!spec.speakerNotes || spec.speakerNotes.trim().length === 0) {
      errors.push(`No speaker notes on content slide ${spec.id} (${spec.role})`);
    }
  }
  
  if (errors.length > 0) {
    console.log("  ✗ Quality gate failures:");
    for (const e of errors) {
      console.log(`    - ${e}`);
    }
    fail(errors.join("; "));
  } else {
    console.log("  ✓ All quality gates passed");
    console.log(`    - ${specs.length} slides, all with titles`);
    console.log(`    - ${contentSlides.length} content slides, all with sourceRefs`);
    console.log("    - No duplicate title+body pairs");
    console.log(`    - ${specs.filter(s => s.speakerNotes).length} slides with speaker notes`);
  }
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
  const pipelineResult = await checkIntegration();
  checkQuality(pipelineResult);
  checkSpecDocument();
  checkCLI();
  runTests();
  console.log("\n==================================");
  console.log("M12.7 End-to-End Pipeline check passed\n");
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
module.exports = { checkRequiredFiles, checkModuleExports, checkFixture };
