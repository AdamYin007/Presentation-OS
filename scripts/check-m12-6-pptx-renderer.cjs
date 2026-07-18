#!/usr/bin/env node
/**
 * M12.6 Editable PPTX Renderer Checker
 */
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const assert = require("assert");
const ROOT = path.join(__dirname, "..");

function fail(m) { throw new Error(m); }

const REQUIRED_FILES = [
  "packages/pptx-renderer/package.json",
  "packages/pptx-renderer/src/index.js",
  "packages/pptx-renderer/src/schema.js",
  "packages/pptx-renderer/src/renderer.js",
  "tests/pptx-renderer/pptx-renderer.test.js",
  "docs/M12_6_PPTX_RENDERER_SPEC.md",
];
const FIXTURE_FILES = [
  "examples/business-review/output.pptx",
];

async function ensureFixture() {
  const fixturePath = path.join(ROOT, FIXTURE_FILES[0]);
  if (!fs.existsSync(fixturePath)) {
    console.log("\nGenerating missing fixture: examples/business-review/output.pptx");
    const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");
    const md = fs.readFileSync(path.join(ROOT, "fixtures/document-ingest/sample-markdown.md"), "utf8");
    const result = await runPipeline(md, { title: "Business Review", style: "business-consulting" });
    fs.writeFileSync(fixturePath, result.pptxBuffer);
    console.log(`  ✓ Generated fixture: ${result.pptxBuffer.length} bytes`);
  }
}

const ALLOWED_DIFF_FILES = new Set([
  ...REQUIRED_FILES, ...FIXTURE_FILES,
  "docs/ROADMAP.md", "package.json",
  "scripts/check-m12-6-pptx-renderer.cjs",
  "packages/pptx-renderer/package.json",
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
  const mod = require(path.join(ROOT, "packages/pptx-renderer/src/index.js"));
  if (typeof mod.renderPptx !== "function") fail("Missing: renderPptx");
  if (typeof mod.generateBuffer !== "function") fail("Missing: generateBuffer");
  if (typeof mod.RENDER_OPTIONS_DEFAULTS !== "object") fail("Missing: RENDER_OPTIONS_DEFAULTS");
  if (typeof mod.validateRenderOptions !== "function") fail("Missing: validateRenderOptions");
  console.log("  ✓ renderPptx");
  console.log("  ✓ generateBuffer");
  console.log("  ✓ RENDER_OPTIONS_DEFAULTS");
  console.log("  ✓ validateRenderOptions");
}

function checkFixture() {
  console.log("\nChecking .pptx fixture...");
  const buf = fs.readFileSync(path.join(ROOT, "examples/business-review/output.pptx"));
  assert(buf.length > 0, "Fixture should not be empty");
  // Verify ZIP magic bytes
  const header = buf.slice(0, 4).toString("hex");
  assert(header === "504b0304", `Should be valid ZIP/PPTX, got ${header}`);
  console.log(`  ✓ Fixture: ${buf.length} bytes, valid PPTX format`);
}

async function checkIntegration() {
  console.log("\nChecking SlideSpec + LayoutPlan → .pptx integration...");
  const specs = JSON.parse(fs.readFileSync(path.join(ROOT, "examples/business-review/slidespec.json"), "utf8"));
  const plan = JSON.parse(fs.readFileSync(path.join(ROOT, "examples/business-review/layout-plan.json"), "utf8"));
  const { renderPptx, generateBuffer } = require(path.join(ROOT, "packages/pptx-renderer/src/index.js"));
  const pptx = renderPptx(specs, plan);
  assert(pptx.slides.length === specs.length, `Expected ${specs.length} slides, got ${pptx.slides.length}`);
  const buffer = await generateBuffer(pptx);
  assert(buffer.length > 0, "Buffer should not be empty");
  console.log(`  ✓ SlideSpec (${specs.length}) + LayoutPlan → .pptx (${buffer.length} bytes)`);
}

function runTests() {
  console.log("\nRunning pptx-renderer tests...");
  try {
    const result = cp.execSync(`node "${path.join(ROOT, "tests/pptx-renderer/pptx-renderer.test.js")}"`, { cwd: ROOT, encoding: "utf8", timeout: 30000 });
    console.log(result.trim().split("\n").filter((l) => l.includes("✓")).slice(0, 10).join("\n"));
  } catch (e) { fail("Tests failed"); }
}

function checkSpecDocument() {
  console.log("\nChecking spec document...");
  const spec = fs.readFileSync(path.join(ROOT, "docs/M12_6_PPTX_RENDERER_SPEC.md"), "utf8");
  for (const term of ["PptxGenJS", "renderPptx", "generateBuffer", "LayoutPlan", "M12.7"]) {
    if (!spec.toLowerCase().includes(term.toLowerCase())) fail(`Spec missing: ${term}`);
  }
  console.log("  ✓ Spec document complete");
}

function checkScope() {
  console.log("\nChecking scope boundaries...");
  const exports = Object.keys(require(path.join(ROOT, "packages/pptx-renderer/src/index.js")));
  for (const exp of exports) {
    if (exp.includes("docx") || exp.includes("pdf") || exp.includes("markdown")) {
      fail(`Export ${exp} leaks into non-PPTX domains`);
    }
  }
  console.log("  ✓ No cross-domain rendering leakage");
}

async function main() {
  console.log("M12.6 Editable PPTX Renderer Checker");
  console.log("=====================================\n");
  await ensureFixture();
  checkRequiredFiles();
  checkModuleExports();
  checkFixture();
  await checkIntegration();
  checkSpecDocument();
  checkScope();
  runTests();
  console.log("\n=====================================");
  console.log("M12.6 Editable PPTX Renderer check passed\n");
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
module.exports = { checkRequiredFiles, checkModuleExports, checkFixture };
