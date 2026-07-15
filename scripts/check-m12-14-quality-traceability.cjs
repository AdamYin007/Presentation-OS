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

// ─── Configuration ──────────────────────────────────────────────────────

const ROOT = path.join(__dirname, "..");

const INPUT_MD = process.argv[2] || path.join(ROOT, "fixtures", "document-ingest", "sample-markdown.md");
const OUTPUT_DIR = process.argv[3] || path.join(ROOT, "examples", "business-review");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "quality-manifest.json");

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
  // Store with id for manifest
  const entry = checks[checks.length - 1];
  entry.id = id;
  entry.category = category;
}

// ─── Content Checks ────────────────────────────────────────────────────

function checkTitles(slideSpecs) {
  console.log("\nChecking slide titles...");
  let allFilled = true;
  let emptyTitles = [];
  for (const spec of slideSpecs) {
    if (!spec.title || spec.title.trim().length === 0) {
      allFilled = false;
      emptyTitles.push(spec.id);
    }
  }
  addCheck(
    "title-completeness",
    "content",
    allFilled,
    `All ${slideSpecs.length} slides have non-empty titles`
  );
  if (!allFilled) {
    console.log(`    Missing titles: ${emptyTitles.join(", ")}`);
  }
}

function checkSourceRefs(slideSpecs) {
  console.log("\nChecking source references...");

  const contentRoles = ["content", "data-chart", "architecture", "process"];
  const exemptRoles = ["section-divider", "closing", "title-slide", "agenda"];

  let contentSlides = 0;
  let slidesWithRefs = 0;
  let slidesMissingRefs = [];

  for (const spec of slideSpecs) {
    const role = spec.role || "";
    if (exemptRoles.includes(role)) continue;
    if (!contentRoles.includes(role)) continue;

    contentSlides++;
    if (spec.sourceRefs && spec.sourceRefs.length > 0) {
      slidesWithRefs++;
    } else {
      slidesMissingRefs.push(spec.id);
    }
  }

  if (contentSlides === 0) {
    addCheck("source-ref-coverage", "content", true, "No content slides to check (input may be minimal)");
    return;
  }

  const pct = Math.round((slidesWithRefs / contentSlides) * 100);
  addCheck(
    "source-ref-coverage",
    "content",
    pct >= 100,
    `${slidesWithRefs}/${contentSlides} content slides have sourceRefs (${pct}%) — REQUIRED: 100%`
  );

  if (slidesMissingRefs.length > 0) {
    addCheck(
      "source-ref-missing",
      "content",
      false,
      `${slidesMissingRefs.length} content slides lack sourceRefs: ${slidesMissingRefs.join(", ")}`,
      "fail"
    );
  }
}

function checkDuplicateContent(slideSpecs) {
  console.log("\nChecking for duplicate content...");

  const normalize = (str) =>
    str.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,!?;:]+$/, "");

  const pairs = new Map();
  let duplicates = 0;
  let duplicateDetails = [];

  for (const spec of slideSpecs) {
    const key = `${normalize(spec.title)}|${normalize(spec.keyMessage || "")}`;
    if (pairs.has(key)) {
      duplicates++;
      duplicateDetails.push({
        title: spec.title,
        slides: [pairs.get(key), spec.id],
      });
    } else {
      pairs.set(key, spec.id);
    }
  }

  addCheck(
    "duplicate-detection",
    "content",
    duplicates === 0,
    `Found ${duplicates} duplicate pairs out of ${pairs.size} unique — REQUIRED: 0 duplicates`
  );

  if (duplicates > 0) {
    addCheck(
      "duplicate-details",
      "content",
      false,
      `Duplicates: ${duplicateDetails.map((d) => `"${d.title}" in ${d.slides.join(", ")}`).join("; ")}`,
      "warn"
    );
  }
}

function checkSectionDividers(slideSpecs) {
  console.log("\nChecking section dividers...");

  const dividerSlides = slideSpecs.filter((s) => s.role === "section-divider");
  const hasDividers = dividerSlides.length >= 2;

  addCheck(
    "section-dividers",
    "structure",
    hasDividers,
    `Found ${dividerSlides.length} section dividers — RECOMMENDED: minimum 2`
  );

  if (dividerSlides.length > 0) {
    addCheck(
      "section-divider-structure",
      "structure",
      dividerSlides.every((s) => s.title && s.title.trim().length > 0),
      `All ${dividerSlides.length} section dividers have non-empty titles`
    );
  }
}

function checkClosingSlide(slideSpecs) {
  console.log("\nChecking closing slide...");

  const closingSlides = slideSpecs.filter((s) => s.role === "closing");
  const hasClosing = closingSlides.length === 1;

  addCheck(
    "closing-slide",
    "structure",
    hasClosing,
    `Found ${closingSlides.length} closing slide(s) — REQUIRED: exactly 1`
  );

  if (hasClosing) {
    const closing = closingSlides[0];
    const hasBody = Array.isArray(closing.body) ? closing.body.length > 0 : (closing.body && closing.body.trim().length > 0);
    addCheck(
      "closing-slide-content",
      "structure",
      true,
      `Closing slide present (${hasBody ? "has" : "no"} body content — reported as info)`
    );
    if (!hasBody) {
      warnings.push("Closing slide has no body content — consider adding summary or contact info");
    }
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
  const diversityRatio = totalSlides > 0 ? distinctLayouts / totalSlides : 0;

  addCheck(
    "layout-diversity",
    "structure",
    distinctLayouts >= Math.min(3, totalSlides),
    `${distinctLayouts} distinct layouts across ${totalSlides} slides (ratio: ${(diversityRatio * 100).toFixed(0)}%)`
  );
}

// ─── Pipeline Validation ───────────────────────────────────────────────

async function validatePipeline(inputPath, outputDir) {
  console.log("\nRunning pipeline...");

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const mdInput = fs.readFileSync(inputPath, "utf8");
  const result = await runPipeline(mdInput, { style: "minimal-modern" });

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Write PPTX buffer
  const pptxPath = path.join(outputDir, "output.pptx");
  fs.writeFileSync(pptxPath, result.pptxBuffer);
  console.log(`  ✓ PPTX written: ${pptxPath} (${result.pptxBuffer.length} bytes)`);

  return { ...result, pptxPath };
}

// ─── Optional Visual QA Check ──────────────────────────────────────────

function checkVisualQAAvailable() {
  console.log("\nChecking visual QA availability...");

  // Visual QA requires LibreOffice for PDF conversion
  // We just check if the dependency would be available
  try {
    require("child_process").execFileSync("libreoffice", ["--version"], { stdio: "pipe" });
    addCheck("visual-qa-libreoffice", "visual", true, "LibreOffice available for visual QA");
    return true;
  } catch (e) {
    addCheck(
      "visual-qa-libreoffice",
      "visual",
      false,
      "LibreOffice not available — visual QA skipped (PPTX validity and blank page checks omitted)",
      "warn"
    );
    return false;
  }
}

// ─── Manifest Emission ─────────────────────────────────────────────────

function emitManifest(inputPath, result, outputDir) {
  console.log("\nEmitting quality manifest...");

  const manifest = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    input: path.relative(ROOT, inputPath),
    pipeline: {
      format: "markdown",
      style: "minimal-modern",
      title: result.deckPlan?.title || path.basename(inputPath, ".md"),
    },
    deck: {
      slideCount: result.slideSpecs.length,
      contentSlides: result.slideSpecs.filter((s) =>
        ["content", "data-chart", "architecture", "process"].includes(s.role)
      ).length,
      sectionDividers: result.slideSpecs.filter((s) => s.role === "section-divider").length,
      closingSlide: result.slideSpecs.some((s) => s.role === "closing"),
    },
    checks: checks.map((c) => ({
      id: c.id,
      category: c.category,
      status: c.status,
      message: c.message,
    })),
    warnings: warnings.length > 0 ? warnings : undefined,
    summary: {
      passCount,
      failCount,
      warnCount,
      overallStatus: failCount === 0 ? "pass" : "fail",
    },
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`  ✓ Manifest written: ${MANIFEST_PATH}`);

  return manifest;
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log("M12.14 Quality Manifest Checker");
  console.log("===============================\n");

  // Step 1: Validate input exists
  if (!fs.existsSync(INPUT_MD)) {
    console.error(`Error: Input file not found: ${INPUT_MD}`);
    process.exit(1);
  }

  // Step 2: Run pipeline
  const result = await validatePipeline(INPUT_MD, OUTPUT_DIR);

  // Step 3: Run content + structural checks
  checkTitles(result.slideSpecs);
  checkSourceRefs(result.slideSpecs);
  checkDuplicateContent(result.slideSpecs);
  checkSectionDividers(result.slideSpecs);
  checkClosingSlide(result.slideSpecs);
  checkLayoutDiversity(result.slideSpecs);

  // Step 4: Check visual QA availability (optional, degrades gracefully)
  const visualAvailable = checkVisualQAAvailable();
  if (visualAvailable) {
    // In future: run actual visual QA checks here
    addCheck("visual-qa-skipped", "visual", true, "Visual QA skipped in this phase (implementation pending)");
  }

  // Step 5: Emit manifest
  const manifest = emitManifest(INPUT_MD, result, OUTPUT_DIR);

  // Step 6: Summary
  console.log("\n===============================");
  console.log(`Results: ${manifest.summary.passCount} passed, ${manifest.summary.failCount} failed, ${manifest.summary.warnCount} warnings`);
  console.log(`Manifest: ${MANIFEST_PATH}`);

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const w of warnings) {
      console.log(`  ⚠ ${w}`);
    }
  }

  console.log("");

  // Exit code
  if (failCount > 0) {
    console.error("Quality manifest check FAILED");
    process.exit(1);
  } else {
    console.log("Quality manifest check PASSED");
    process.exit(0);
  }
}

main().catch((e) => {
  console.error(`Fatal error: ${e.message}`);
  process.exit(1);
});
