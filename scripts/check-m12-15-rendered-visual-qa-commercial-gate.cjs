#!/usr/bin/env node
/**
 * M12.15 — Rendered Visual QA and Commercial Delivery Gate
 *
 * Runs full pipeline, inspects PPTX package, converts to PDF if possible,
 * analyzes rendered pages, validates layout geometry, and emits a commercial
 * delivery verdict (PASS / NEEDS_REVIEW / FAIL).
 *
 * Usage:
 *   node scripts/check-m12-15-rendered-visual-qa-commercial-gate.cjs [input.md] [output-dir]
 *
 * Defaults:
 *   input.md  = fixtures/document-ingest/sample-markdown.md
 *   output-dir = examples/business-review
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");
const {
  resolveRenderer,
  checkPptxPackage,
  renderToPdf,
  getPdfPageCount,
  getPdfTextByPage,
  renderPdfToPng,
  analyzePngInkRatio,
  validateLayoutGeometry,
  validateRenderedPages,
  computeVerdict,
} = require("../packages/presentation-pipeline/src/rendered-visual-qa.js");
const { runQualityChecks, buildManifest, writeManifest, writeSummary } = require("../packages/presentation-pipeline/src/qa-utils.js");

// ─── Configuration ──────────────────────────────────────────────────

const ROOT = path.join(__dirname, "..");
const INPUT_MD = process.argv[2] || path.join(ROOT, "fixtures", "document-ingest", "sample-markdown.md");
const OUTPUT_DIR = process.argv[3] || path.join(ROOT, "examples", "business-review");
const AUDIT_DIR = path.join(OUTPUT_DIR, "m12-15-audit");
const PPTX_PATH = path.join(AUDIT_DIR, "output.pptx");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "quality-manifest.json");
const SUMMARY_PATH = path.join(OUTPUT_DIR, "QA-SUMMARY.md");
const REPORT_PATH = path.join(OUTPUT_DIR, "rendered-qa-report.json");
const VERDICT_PATH = path.join(OUTPUT_DIR, "COMMERCIAL-VERDICT.md");

// ─── Helpers ────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;
let warnCount = 0;
const checks = [];
const warnings = [];

function record(condition, message, severity = "fail", data = {}) {
  if (condition) {
    passCount++;
    checks.push({ status: "pass", message, ...data });
    console.log(`  OK  ${message}`);
  } else if (severity === "warn") {
    warnCount++;
    warnings.push(message);
    checks.push({ status: "warn", message, ...data });
    console.log(`  WARN${message ? `: ${message}` : ""}`);
  } else {
    failCount++;
    checks.push({ status: "fail", message, ...data });
    console.log(`  FAIL${message ? `: ${message}` : ""}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("M12.15 — Rendered Visual QA & Commercial Delivery Gate");
  console.log("=".repeat(60));
  console.log("");

  // Ensure output directories
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Read input
  const inputText = fs.readFileSync(INPUT_MD, "utf8");
  console.log(`Input: ${INPUT_MD}`);
  console.log("");

  // ── Step 1: Run Pipeline ─────────────────────────────────────────
  console.log("[1/7] Running presentation pipeline...");
  const pipelineResult = await runPipeline(inputText, { style: "minimal-modern" });
  fs.writeFileSync(PPTX_PATH, pipelineResult.pptxBuffer);
  const pptxSize = fs.statSync(PPTX_PATH).size;
  record(pptxSize > 0, `PPTX generated (${pptxSize.toLocaleString()} bytes)`);
  console.log("");

  // ── Step 2: Renderer Detection ───────────────────────────────────
  console.log("[2/7] Checking renderer availability...");
  const renderer = resolveRenderer();
  if (renderer.available) {
    console.log(`  Renderer: ${renderer.cmd}`);
    record(true, "LibreOffice/OpenOffice available for PDF conversion");
  } else {
    console.log(`  Reason: ${renderer.reason}`);
    record(true, `LibreOffice unavailable — will use package-level checks only`, "warn");
  }
  console.log("");

  // ── Step 3: PPTX Package Inspection ──────────────────────────────
  console.log("[3/7] Inspecting PPTX package integrity...");
  const pkgResult = checkPptxPackage(PPTX_PATH);
  if (pkgResult.error) {
    record(false, `Package inspection failed: ${pkgResult.error}`);
  } else {
    record(pkgResult.slideCount === pipelineResult.slideSpecs.length,
      `Slide count in package matches specs: ${pkgResult.slideCount}`);
    record(pkgResult.absolutePathHits === 0,
      `No absolute path leakage in PPTX XML (${pkgResult.absolutePathHits} hits)`);
    record(pkgResult.badTargets === 0,
      `No bad relationship targets (${pkgResult.badTargets})`);
    record(pkgResult.mediaSafe,
      `Media entries are package-relative (${pkgResult.mediaCount} files)`);
  }
  console.log("");

  // ── Step 4: Layout Geometry Validation ───────────────────────────
  console.log("[4/7] Validating layout geometry...");
  const geometry = validateLayoutGeometry(pipelineResult.slideSpecs, pipelineResult.layoutPlan);
  record(geometry.zeroSize === 0, `Zero-size boxes: ${geometry.zeroSize}`);
  record(geometry.negative === 0, `Negative coordinates: ${geometry.negative}`);
  record(geometry.outOfBounds === 0, `Out-of-bounds boxes: ${geometry.outOfBounds}`);
  record(geometry.overlap === 0, `Estimated overlaps: ${geometry.overlap}`, "fail");
  record(geometry.overflowSuspected === 0, `Critical overflow suspected: ${geometry.overflowSuspected}`, "fail");
  record(geometry.highDensity === 0, `High density slides: ${geometry.highDensity}`, "warn");
  console.log("");

  // ── Step 5: PDF Conversion & Page Analysis ───────────────────────
  console.log("[5/7] Converting to PDF and analyzing rendered pages...");
  let renderedResults = null;
  let pngStats = [];
  let pdfTexts = [];
  let pageCount = 0;

  if (renderer.available) {
    const pdfResult = renderToPdf(PPTX_PATH, AUDIT_DIR, renderer);
    if (pdfResult.success) {
      pageCount = getPdfPageCount(pdfResult.pdfPath);
      record(pageCount === pipelineResult.slideSpecs.length,
        `PDF page count matches slide specs: ${pageCount}/${pipelineResult.slideSpecs.length}`);

      // Render PDF to PNGs
      const pngFiles = renderPdfToPng(pdfResult.pdfPath, AUDIT_DIR, pageCount);
      for (const pf of pngFiles) {
        const stat = analyzePngInkRatio(path.join(AUDIT_DIR, pf.file));
        if (stat) pngStats.push(stat);
      }

      // Extract text by page
      pdfTexts = getPdfTextByPage(pdfResult.pdfPath, pageCount);

      // Validate rendered pages
      renderedResults = validateRenderedPages(pngStats, pdfTexts, pipelineResult.slideSpecs);
      record(renderedResults.blankSlides === 0, `Blank rendered slides: ${renderedResults.blankSlides}`, "fail");
      record(renderedResults.sparseSlides === 0, `Sparse content slides: ${renderedResults.sparseSlides}`, "warn");
    } else {
      record(false, `PDF conversion failed: ${pdfResult.reason}`, "warn");
    }
  } else {
    record(true, "Rendered page analysis skipped (LibreOffice unavailable)", "warn");
  }
  console.log("");

  // ── Step 6: Quality Manifest (M12.14 integration) ────────────────
  console.log("[6/7] Generating quality manifest (M12.14 integration)...");
  const checkResults = runQualityChecks(pipelineResult.slideSpecs);
  const manifest = buildManifest(INPUT_MD, pipelineResult, checkResults, OUTPUT_DIR);

  // Inject M12.15 fields into manifest
  manifest.m12_15 = {
    rendererAvailable: renderer.available,
    packageCheck: pkgResult.valid !== false ? pkgResult : undefined,
    geometryCheck: geometry,
    renderedCheck: renderedResults || undefined,
    degraded: !renderer.available,
  };

  // Recompute summary with M12.15 awareness
  const m12_15_pass = passCount;
  const m12_15_fail = failCount;
  const m12_15_warn = warnCount;
  manifest.summary.m12_15PassCount = m12_15_pass;
  manifest.summary.m12_15FailCount = m12_15_fail;
  manifest.summary.m12_15WarnCount = m12_15_warn;
  manifest.summary.m12_15Checks = checks.map((c) => ({
    id: `m12_15_${c.status}_${checks.indexOf(c)}`,
    category: c.category || "m12.15",
    status: c.status,
    message: c.message,
  }));

  writeManifest(manifest, OUTPUT_DIR);
  writeSummary(manifest, OUTPUT_DIR);
  console.log(`  Manifest: ${MANIFEST_PATH}`);
  console.log(`  Summary:  ${SUMMARY_PATH}`);
  console.log("");

  // ── Step 7: Commercial Verdict ───────────────────────────────────
  console.log("[7/7] Computing commercial delivery verdict...");
  const verdictInfo = computeVerdict(manifest, renderedResults, renderer.available);

  // Write rendered QA report
  const qaReport = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    input: INPUT_MD,
    pptxPath: PPTX_PATH,
    pptxSize,
    slideCount: pipelineResult.slideSpecs.length,
    renderer: renderer,
    packageCheck: pkgResult,
    geometryCheck: geometry,
    renderedCheck: renderedResults,
    qualityScore: manifest.summary.qualityScore,
    checks,
    summary: {
      passCount: m12_15_pass,
      failCount: m12_15_fail,
      warnCount: m12_15_warn,
    },
    verdict: verdictInfo,
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(qaReport, null, 2));

  // Write human-readable verdict
  const verdictLines = [
    "# Commercial Delivery Verdict", "",
    `**Generated**: ${new Date().toLocaleString()}`,
    `**Input**: \`${INPUT_MD}\``,
    `**Deck**: ${pipelineResult.slideSpecs.length} slides`,
    `**Quality Score**: ${manifest.summary.qualityScore}/100`,
    `**Verdict**: ${verdictInfo.verdict === "PASS" ? "✅ PASS" : verdictInfo.verdict === "NEEDS_REVIEW" ? "⚠️ NEEDS REVIEW" : "❌ FAIL"}`,
    "",
    "---", "",
    "## Quality Metrics", "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Passed Checks | ${m12_15_pass} |`,
    `| Failed Checks | ${m12_15_fail} |`,
    `| Warnings | ${m12_15_warn} |`,
    `| Quality Score | ${manifest.summary.qualityScore}/100 |`,
    `| Renderer Available | ${renderer.available ? "Yes" : "No"} |`,
    `| Rendered Checks | ${renderedResults ? "Complete" : "Skipped (degraded)"} |`,
    "",
  ];

  if (verdictInfo.hardFails.length > 0) {
    verdictLines.push("---", "", "## Hard Failures", "");
    for (const hf of verdictInfo.hardFails) {
      verdictLines.push(`- ❌ ${hf}`);
    }
    verdictLines.push("");
  }

  if (verdictInfo.warnings.length > 0) {
    verdictLines.push("---", "", "## Warnings", "");
    for (const w of verdictInfo.warnings) {
      verdictLines.push(`- ⚠️ ${w}`);
    }
    verdictLines.push("");
  }

  verdictLines.push("---", "", "## Recommendation", "");
  if (verdictInfo.verdict === "PASS") {
    verdictLines.push("This deck meets all commercial delivery criteria. It can be delivered to the client.");
  } else if (verdictInfo.verdict === "NEEDS_REVIEW") {
    verdictLines.push("This deck has issues that should be reviewed by a human before delivery. Check the warnings above.");
    if (verdictInfo.degraded) {
      verdictLines.push("");
      verdictLines.push("**Note**: Full rendered QA was not possible (LibreOffice unavailable). Install LibreOffice for complete validation.");
    }
  } else {
    verdictLines.push("This deck has critical failures and must NOT be delivered. Fix the hard failures listed above and regenerate.");
  }

  verdictLines.push("", "---", "", "*Generated by M12.15 Rendered Visual QA & Commercial Delivery Gate*");

  fs.writeFileSync(VERDICT_PATH, verdictLines.join("\n"));

  console.log(`\n  Verdict: ${verdictInfo.verdict}`);
  if (verdictInfo.hardFails.length > 0) {
    console.log(`  Hard failures: ${verdictInfo.hardFails.length}`);
    for (const hf of verdictInfo.hardFails) console.log(`    - ${hf}`);
  }
  if (verdictInfo.warnings.length > 0) {
    console.log(`  Warnings: ${verdictInfo.warnings.length}`);
    for (const w of verdictInfo.warnings) console.log(`    - ${w}`);
  }
  console.log("");

  // ── Summary ──────────────────────────────────────────────────────
  console.log("=".repeat(60));
  console.log(`Results: ${m12_15_pass} passed, ${m12_15_fail} failed, ${m12_15_warn} warnings`);
  console.log(`Quality Score: ${manifest.summary.qualityScore}/100`);
  console.log(`Commercial Verdict: ${verdictInfo.verdict}`);
  console.log("");
  console.log(`Artifacts:`);
  console.log(`  Report:  ${REPORT_PATH}`);
  console.log(`  Verdict: ${VERDICT_PATH}`);
  console.log(`  Manifest: ${MANIFEST_PATH}`);
  console.log(`  Summary:  ${SUMMARY_PATH}`);
  console.log("");

  // Exit code: 0 = PASS, 1 = FAIL, 2 = NEEDS_REVIEW
  if (verdictInfo.verdict === "FAIL") {
    process.exit(1);
  } else if (verdictInfo.verdict === "NEEDS_REVIEW") {
    process.exit(2);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(`Fatal error: ${e.stack || e.message}`);
  process.exit(1);
});
