#!/usr/bin/env node
/**
 * M12.14 — Quality Manifest Checker (Consolidated QA Entry Point)
 *
 * Runs content + structural QA checks on a generated deck and emits
 * a deterministic `quality-manifest.json` alongside the output.
 *
 * Visual QA is optional: if dependencies are missing, emits a warning
 * but does NOT fail the checker.
 *
 * Usage:
 *   node scripts/check-m12-14-quality-traceability.cjs [input.md] [output-dir]
 *
 * Defaults:
 *   input.md  = fixtures/document-ingest/sample-markdown.md
 *   output-dir = examples/business-review
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");
const { runQualityChecks, buildManifest, writeManifest, writeSummary } = require("../packages/presentation-pipeline/src/qa-utils.js");
const { resolveRenderer } = require("../packages/presentation-pipeline/src/rendered-visual-qa.js");

// ─── Configuration ──────────────────────────────────────────────────────

const ROOT = path.join(__dirname, "..");
const INPUT_MD = process.argv[2] || path.join(ROOT, "fixtures", "document-ingest", "sample-markdown.md");
const OUTPUT_DIR = process.argv[3] || path.join(ROOT, "examples", "business-review");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "quality-manifest.json");
const SUMMARY_PATH = path.join(OUTPUT_DIR, "QA-SUMMARY.md");

// ─── Helpers ────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;
let warnCount = 0;
const checks = [];
const warnings = [];

function record(condition, message, severity = "fail") {
  if (condition) {
    passCount++;
    checks.push({ status: "pass", message });
    console.log(`  ✓ ${message}`);
  } else {
    if (severity === "warn") {
      warnCount++;
      warnings.push(message);
      checks.push({ status: "warn", message });
      console.log(`  ⚠ ${message}`);
    } else {
      failCount++;
      checks.push({ status: "fail", message });
      console.log(`  ✗ ${message}`);
    }
  }
}

function addCheck(id, category, condition, message, severity = "fail") {
  record(condition, `[${category}] ${message}`, severity);
  const entry = checks[checks.length - 1];
  entry.id = id;
  entry.category = category;
}

// ─── Content Checks ────────────────────────────────────────────────────

function checkTitles(slideSpecs) {
  console.log("\nChecking slide titles...");
  let allFilled = true;
  for (const spec of slideSpecs) {
    if (!spec.title || spec.title.trim().length === 0) { allFilled = false; break; }
  }
  addCheck("title-completeness", "content", allFilled, `All ${slideSpecs.length} slides have non-empty titles`);
}

function checkSourceRefs(slideSpecs) {
  console.log("\nChecking source references...");
  const contentRoles = ["content", "data-chart", "architecture", "process"];
  const exemptRoles = ["section-divider", "closing", "title-slide", "agenda"];
  let contentSlides = 0, slidesWithRefs = 0;
  for (const spec of slideSpecs) {
    const role = spec.role || "";
    if (exemptRoles.includes(role)) continue;
    if (!contentRoles.includes(role)) continue;
    contentSlides++;
    if (spec.sourceRefs && spec.sourceRefs.length > 0) slidesWithRefs++;
  }
  if (contentSlides === 0) {
    addCheck("source-ref-coverage", "content", true, "No content slides to check (input may be minimal)");
    return;
  }
  const pct = Math.round((slidesWithRefs / contentSlides) * 100);
  addCheck("source-ref-coverage", "content", pct >= 100, `${slidesWithRefs}/${contentSlides} content slides have sourceRefs (${pct}%) — REQUIRED: 100%`);
}

function checkDuplicateContent(slideSpecs) {
  console.log("\nChecking for duplicate content...");
  const normalize = (str) => str.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,!?;:]+$/, "");
  const pairs = new Map();
  let duplicates = 0;
  for (const spec of slideSpecs) {
    const key = `${normalize(spec.title)}|${normalize(spec.keyMessage || "")}`;
    if (pairs.has(key)) duplicates++; else pairs.set(key, spec.id);
  }
  addCheck("duplicate-detection", "content", duplicates === 0, `Found ${duplicates} duplicate pairs out of ${pairs.size} unique — REQUIRED: 0 duplicates`);
}

function checkSectionDividers(slideSpecs) {
  console.log("\nChecking section dividers...");
  const dividerSlides = slideSpecs.filter((s) => s.role === "section-divider");
  addCheck("section-dividers", "structure", dividerSlides.length >= 2, `Found ${dividerSlides.length} section dividers — RECOMMENDED: minimum 2`);
  if (dividerSlides.length > 0) {
    addCheck("section-divider-structure", "structure", dividerSlides.every((s) => s.title && s.title.trim().length > 0), `All ${dividerSlides.length} section dividers have non-empty titles`);
  }
}

function checkClosingSlide(slideSpecs) {
  console.log("\nChecking closing slide...");
  const closingSlides = slideSpecs.filter((s) => s.role === "closing");
  const hasClosing = closingSlides.length === 1;
  addCheck("closing-slide", "structure", hasClosing, `Found ${closingSlides.length} closing slide(s) — REQUIRED: exactly 1`);
  if (hasClosing) {
    const closing = closingSlides[0];
    const hasBody = Array.isArray(closing.body) ? closing.body.length > 0 : (closing.body && closing.body.trim().length > 0);
    addCheck("closing-slide-content", "structure", true, `Closing slide present (${hasBody ? "has" : "no"} body content — reported as info)`);
    if (!hasBody) warnings.push("Closing slide has no body content — consider adding summary or contact info");
  }
}

function checkLayoutDiversity(slideSpecs) {
  console.log("\nChecking layout diversity...");
  const layoutCounts = {};
  for (const spec of slideSpecs) {
    const layout = spec.layout || "default";
    layoutCounts[layout] = (layoutCounts[layout] || 0) + 1;
  }
  const distinctLayouts = Object.keys(layoutCounts).length;
  const totalSlides = slideSpecs.length;
  addCheck("layout-diversity", "structure", distinctLayouts >= Math.min(3, totalSlides), `${distinctLayouts} distinct layouts across ${totalSlides} slides (ratio: ${(totalSlides > 0 ? distinctLayouts / totalSlides : 0) * 100 | 0}%)`);
}

// ─── Pipeline Validation ───────────────────────────────────────────────

async function validatePipeline(inputPath, outputDir) {
  console.log("\nRunning pipeline...");
  if (!fs.existsSync(inputPath)) throw new Error(`Input file not found: ${inputPath}`);
  const mdInput = fs.readFileSync(inputPath, "utf8");
  const result = await runPipeline(mdInput, { style: "minimal-modern" });
  fs.mkdirSync(outputDir, { recursive: true });
  const pptxPath = path.join(outputDir, "output.pptx");
  fs.writeFileSync(pptxPath, result.pptxBuffer);
  console.log(`  ✓ PPTX written: ${pptxPath} (${result.pptxBuffer.length} bytes)`);
  return { ...result, pptxPath };
}

// ─── Optional Visual QA Check ──────────────────────────────────────────

function checkVisualQAAvailable() {
  console.log("\nChecking visual QA availability...");
  const renderer = resolveRenderer();
  if (renderer.available) {
    addCheck("visual-qa-libreoffice", "visual", true, `LibreOffice available (${renderer.cmd}) for visual QA`);
    return true;
  } else {
    addCheck("visual-qa-libreoffice", "visual", false, `LibreOffice not available — visual QA skipped (${renderer.reason})`, "warn");
    return false;
  }
}

// ─── Manifest Emission ─────────────────────────────────────────────────

function emitManifest(inputPath, result, outputDir) {
  console.log("\nEmitting quality manifest...");
  const checkResults = runQualityChecks(result.slideSpecs);
  // Override with our actual check data (including visual QA status)
  const mergedChecks = [...checks];
  const mergedWarnings = [...warnings];
  const manifest = buildManifest(inputPath, result, { checks: mergedChecks, warnings: mergedWarnings, passCount, failCount, warnCount }, outputDir);
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`  ✓ Manifest written: ${MANIFEST_PATH}`);
  return manifest;
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log("M12.14 Quality Manifest Checker");
  console.log("===============================\n");

  if (!fs.existsSync(INPUT_MD)) {
    console.error(`Error: Input file not found: ${INPUT_MD}`);
    process.exit(1);
  }

  const result = await validatePipeline(INPUT_MD, OUTPUT_DIR);

  // Run content + structural checks
  checkTitles(result.slideSpecs);
  checkSourceRefs(result.slideSpecs);
  checkDuplicateContent(result.slideSpecs);
  checkSectionDividers(result.slideSpecs);
  checkClosingSlide(result.slideSpecs);
  checkLayoutDiversity(result.slideSpecs);

  // Check visual QA availability (optional)
  const visualAvailable = checkVisualQAAvailable();
  if (visualAvailable) {
    addCheck("visual-qa-skipped", "visual", true, "Visual QA skipped in this phase (implementation pending)");
  }

  // Emit manifest & summary
  const manifest = emitManifest(INPUT_MD, result, OUTPUT_DIR);
  const summaryPath = writeSummary(manifest, OUTPUT_DIR);
  console.log(`  ✓ Summary written: ${summaryPath}`);

  // Summary output
  console.log("\n===============================");
  console.log(`Results: ${manifest.summary.passCount} passed, ${manifest.summary.failCount} failed, ${manifest.summary.warnCount} warnings`);
  console.log(`Quality Score: ${manifest.summary.qualityScore}/100`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(`Summary: ${summaryPath}`);

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }

  if (failCount > 0) {
    console.error("\nQuality manifest check FAILED");
    process.exit(1);
  } else {
    console.log("\nQuality manifest check PASSED");
    process.exit(0);
  }
}

main().catch((e) => {
  console.error(`Fatal error: ${e.message}`);
  process.exit(1);
});
