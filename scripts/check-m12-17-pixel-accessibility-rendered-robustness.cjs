#!/usr/bin/env node
/**
 * M12.17 — Pixel-Level Accessibility and Rendered Visual Robustness Gate
 *
 * Thin wrapper around packages/pixel-accessibility-gate/src/index.js.
 * The core logic has been extracted into the reusable package.
 * This script remains for backward compatibility with existing CI/check scripts.
 *
 * Usage:
 *   node scripts/check-m12-17-pixel-accessibility-rendered-robustness.cjs [input.md] [output-dir]
 */

"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");
const renderedVisualQa = require("../packages/presentation-pipeline/src/rendered-visual-qa.js");
const computeM12_15Verdict = renderedVisualQa.computeVerdict;
const {
  runVisualDesignGate,
  generateHumanSummary: generateM12_16Summary,
} = require("../packages/visual-design-gate/src/index.js");
const {
  detectEnvironment,
  checkPixelContrast,
  checkColorBlindness,
  checkFontFallback,
  mergeCommercialReadiness,
} = require("../packages/pixel-accessibility-gate/src/index.js");

// ─── Configuration ──────────────────────────────────────────────────

const ROOT = path.join(__dirname, "..");
const INPUT_MD = process.argv[2] || path.join(ROOT, "fixtures", "document-ingest", "sample-markdown.md");
const OUTPUT_DIR = process.argv[3] || path.join(ROOT, "examples", "business-review", "m12-17-audit");
const AUDIT_DIR = OUTPUT_DIR;
const PPTX_PATH = path.join(AUDIT_DIR, "output.pptx");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "quality-manifest.json");
const REPORT_PATH = path.join(OUTPUT_DIR, "pixel-accessibility-report.json");
const SUMMARY_PATH = path.join(OUTPUT_DIR, "PIXEL-ACCESSIBILITY-SUMMARY.md");
const COMMERCIAL_VERDICT_PATH = path.join(OUTPUT_DIR, "COMMERCIAL-VERDICT.md");

// Reuse helpers from rendered-visual-qa
const { resolveRenderer, renderToPdf, getPdfPageCount, renderPdfToPng, validateLayoutGeometry, validateRenderedPages } = renderedVisualQa;

// ─── Helpers ────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;
let warnCount = 0;
const checks = [];
const warnings = [];
const allRemediations = [];

function record(condition, message, severity = "fail", data = {}) {
  if (condition) { passCount++; checks.push({ status: "pass", message, ...data }); console.log(`  OK  ${message}`); }
  else if (severity === "warn") { warnCount++; warnings.push(message); checks.push({ status: "warn", message, ...data }); console.log(`  WARN${message ? `: ${message}` : ""}`); }
  else { failCount++; checks.push({ status: "fail", message, ...data }); console.log(`  FAIL${message ? `: ${message}` : ""}`); }
}

function remediation(category, severity, suggestion) { allRemediations.push({ category, severity, suggestion }); }

function commandExists(cmd) { try { cp.execSync(`which ${cmd}`, { stdio: "ignore" }); return true; } catch { return false; } }

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("M12.17 — Pixel-Level Accessibility & Rendered Visual Robustness Gate");
  console.log("=".repeat(65));
  console.log("");

  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const inputText = fs.readFileSync(INPUT_MD, "utf8");
  console.log(`Input: ${INPUT_MD}`);
  console.log("");

  const environment = detectEnvironment();
  console.log("Environment:");
  console.log(`  LibreOffice: ${environment.hasLibreOffice ? "YES" : "NO"}`);
  console.log(`  ImageMagick: ${environment.hasImagemagick ? "YES" : "NO"}`);
  console.log(`  Poppler: ${environment.hasPoppler ? "YES" : "NO"}`);
  console.log(`  Python3: ${environment.hasPython ? "YES" : "NO"}`);
  console.log("");

  // Step 1: Pipeline
  console.log("[1/8] Running presentation pipeline...");
  const pipelineResult = await runPipeline(inputText, { style: "minimal-modern", emitManifest: true, outputDir: AUDIT_DIR, inputPath: INPUT_MD });
  const slideSpecs = pipelineResult.slideSpecs;
  const layoutPlan = pipelineResult.layoutPlan;
  const manifest = pipelineResult.manifest;
  const pptxBuffer = pipelineResult.pptxBuffer;
  fs.writeFileSync(PPTX_PATH, pptxBuffer);
  const pptxSize = fs.statSync(PPTX_PATH).size;
  record(pptxSize > 0, `PPTX generated (${pptxSize.toLocaleString()} bytes)`);
  console.log("");

  // Step 2: M12.15
  console.log("[2/8] M12.15 — Rendered Visual QA...");
  const renderer = resolveRenderer();
  let m12_15_verdict = "NEEDS_REVIEW";
  let pdfTextPages = [];
  let pngFiles = [];

  if (renderer.available) {
    const pdfResult = renderToPdf(PPTX_PATH, AUDIT_DIR, renderer);
    if (pdfResult.success) {
      const pageCount = getPdfPageCount(pdfResult.pdfPath);
      console.log(`  PDF: ${pageCount} page(s)`);
      if (commandExists("pdftotext")) {
        pdfTextPages = [];
        for (let i = 1; i <= pageCount; i++) {
          try {
            const text = cp.execFileSync("pdftotext", ["-f", String(i), "-l", String(i), "-layout", pdfResult.pdfPath, "-"], { encoding: "utf8", timeout: 30000 });
            pdfTextPages.push({ page: i, charCount: text.replace(/\s+/g, "").length, rawLength: text.length });
          } catch { pdfTextPages.push({ page: i, charCount: 0, rawLength: 0 }); }
        }
      }
      pngFiles = renderPdfToPng(pdfResult.pdfPath, AUDIT_DIR, pageCount);
      if (!pngFiles.length && environment.hasImagemagick) {
        try {
          const baseName = path.basename(pdfResult.pdfPath, ".pdf");
          const outGlob = path.join(AUDIT_DIR, `${baseName}-page-%d.png`);
          cp.execFileSync("magick", [pdfResult.pdfPath, "-density", "200", "-quality", "95", outGlob], { timeout: 120000 });
          for (let i = 1; i <= pageCount; i++) {
            const expected = path.join(AUDIT_DIR, `${baseName}-page-${i}.png`);
            if (fs.existsSync(expected)) pngFiles.push({ num: i, file: expected });
          }
          console.log(`  PNGs (ImageMagick): ${pngFiles.length} page(s)`);
        } catch (e) { console.log(`  ImageMagick PDF→PNG failed: ${e.message}`); }
      } else { console.log(`  PNGs: ${pngFiles.length} page(s)`); }
    } else { console.log(`  PDF conversion failed: ${pdfResult.reason}`); }
  } else { console.log("  LibreOffice unavailable — package-level checks only"); }

  const geometry = validateLayoutGeometry(slideSpecs, layoutPlan);
  const renderedResults = validateRenderedPages(pngFiles.map(() => null), pdfTextPages, slideSpecs);
  m12_15_verdict = computeM12_15Verdict(manifest, { ...geometry, ...renderedResults }, renderer.available).verdict;
  record(true, `M12.15 commercial verdict: ${m12_15_verdict}`);
  console.log("");

  // Step 3: M12.16
  console.log("[3/8] M12.16 — Visual Design Standards Gate...");
  const m12_16_gate = await runVisualDesignGate(slideSpecs, layoutPlan, { m12_15_verdict });
  record(true, `M12.16 visual design verdict: ${m12_16_gate.overallVerdict}`);
  console.log("");

  // Step 4-6: M12.17 (from package)
  console.log("[4/8] M12.17 — Pixel-Based Contrast Estimation...");
  const pixelContrast = checkPixelContrast(pngFiles, slideSpecs, layoutPlan);
  record(pixelContrast.verdict !== "FAIL", `Pixel contrast: ${pixelContrast.verdict} (${pixelContrast.passCount} pass, ${pixelContrast.failCount} fail, ${pixelContrast.warnCount} warn)`);
  if (pixelContrast.degraded) { console.log("  Degraded: ImageMagick unavailable, using color proxy"); remediation("pixel_contrast", "warn", "ImageMagick not available"); }
  console.log("");

  console.log("[5/8] M12.17 — Color-Blindness Simulation...");
  const colorblind = checkColorBlindness(layoutPlan);
  record(colorblind.verdict !== "FAIL", `Color-blindness: ${colorblind.verdict} (${colorblind.passCount} pass, ${colorblind.failCount} fail, ${colorblind.warnCount} warn)`);
  console.log("");

  console.log("[6/8] M12.17 — Font Fallback & Readability...");
  const font = checkFontFallback(slideSpecs, layoutPlan, pdfTextPages, environment);
  record(font.verdict !== "FAIL", `Font readability: ${font.verdict} (${font.passCount} pass, ${font.failCount} fail, ${font.warnCount} warn)`);
  if (font.degraded) console.log("  Degraded: PDF text extraction unavailable");
  console.log("");

  // Step 7: Merge
  console.log("[7/8] Merging commercial readiness report...");
  const commercialReport = mergeCommercialReadiness(m12_15_verdict, m12_16_gate, pixelContrast, colorblind, font, environment);
  if (commercialReport.overallVerdict === "PASS" && (pixelContrast.verdict === "FAIL" || colorblind.verdict === "FAIL" || font.verdict === "FAIL")) {
    commercialReport.overallVerdict = "FAIL";
  }
  console.log(`  Overall: ${commercialReport.overallVerdict}`);
  console.log(`  Checks: ${commercialReport.totalChecks.pass} pass, ${commercialReport.totalChecks.fail} fail, ${commercialReport.totalChecks.warn} warn`);
  console.log("");

  // Step 8: Write reports
  console.log("[8/8] Writing reports...");
  fs.writeFileSync(REPORT_PATH, JSON.stringify(commercialReport, null, 2));
  console.log(`  Written: ${REPORT_PATH}`);

  // PIXEL-ACCESSIBILITY-SUMMARY.md
  const summaryLines = [];
  summaryLines.push("# Pixel-Level Accessibility & Rendered Visual Robustness — M12.17");
  summaryLines.push("");
  summaryLines.push(`**Generated**: ${new Date().toLocaleString()}`);
  summaryLines.push(`**Overall Verdict**: ${commercialReport.overallVerdict}`);
  summaryLines.push(`**Total Checks**: ${commercialReport.totalChecks.pass + commercialReport.totalChecks.fail + commercialReport.totalChecks.warn} (${commercialReport.totalChecks.pass} pass, ${commercialReport.totalChecks.fail} fail, ${commercialReport.totalChecks.warn} warn)`);
  summaryLines.push("");
  summaryLines.push("## Environment");
  summaryLines.push("");
  summaryLines.push("| Component | Available |");
  summaryLines.push("|-----------|-----------|");
  summaryLines.push(`| LibreOffice | ${environment.hasLibreOffice ? "Yes" : "No"} |`);
  summaryLines.push(`| ImageMagick | ${environment.hasImagemagick ? "Yes" : "No"} |`);
  summaryLines.push(`| Poppler | ${environment.hasPoppler ? "Yes" : "No"} |`);
  summaryLines.push(`| Python3 | ${environment.hasPython ? "Yes" : "No"} |`);
  summaryLines.push("");
  summaryLines.push("## Gate Results");
  summaryLines.push("");
  summaryLines.push("| Gate | Verdict |");
  summaryLines.push("|------|---------|");
  summaryLines.push(`| M12.15 Rendered Visual QA | ${commercialReport.gateResults.m12_15_rendered_qa} |`);
  summaryLines.push(`| M12.16 Visual Design Standards | ${commercialReport.gateResults.m12_16_visual_design} |`);
  summaryLines.push(`| M12.17 Pixel Contrast | ${commercialReport.gateResults.m12_17_pixel_contrast} |`);
  summaryLines.push(`| M12.17 Color-Blindness | ${commercialReport.gateResults.m12_17_color_blindness} |`);
  summaryLines.push(`| M12.17 Font Readability | ${commercialReport.gateResults.m12_17_font_readability} |`);
  summaryLines.push(`| **Overall Commercial Readiness** | **${commercialReport.overallVerdict}** |`);
  summaryLines.push("");

  if (pixelContrast.findings?.length > 0) {
    summaryLines.push("### Pixel Contrast");
    summaryLines.push("");
    summaryLines.push(`**Verdict**: ${pixelContrast.verdict}${pixelContrast.degraded ? " (degraded)" : ""}`);
    summaryLines.push("");
    summaryLines.push("| Page | Role | Method | Ratio | Severity |");
    summaryLines.push("|------|------|--------|-------|----------|");
    for (const f of pixelContrast.findings) {
      const icon = f.severity === "pass" ? "PASS" : f.severity === "warn" ? "WARN" : "FAIL";
      summaryLines.push(`| ${f.page} | ${f.role} | ${f.method} | ${f.ratio ? f.ratio + ":1" : "N/A"} | ${icon} |`);
    }
    summaryLines.push("");
  }

  if (colorblind.findings?.length > 0) {
    summaryLines.push("### Color-Blindness");
    summaryLines.push("");
    summaryLines.push(`**Verdict**: ${colorblind.verdict}`);
    summaryLines.push("");
    for (const f of colorblind.findings.filter(x => x.severity !== "pass")) {
      summaryLines.push(`- Slide ${f.page}: ${f.pair} — sim dist ${f.simDist} (${f.simType}) ${f.suggestion || ""}`);
    }
    summaryLines.push("");
  }

  if (font.findings?.length > 0) {
    summaryLines.push("### Font Readability");
    summaryLines.push("");
    summaryLines.push(`**Verdict**: ${font.verdict}`);
    summaryLines.push("");
    for (const f of font.findings) {
      if (f.suggestion) summaryLines.push(`- [${f.category}] ${f.suggestion}`);
    }
    summaryLines.push("");
  }

  if (commercialReport.remediations.length > 0) {
    summaryLines.push("## Remediation Actions");
    summaryLines.push("");
    for (const r of commercialReport.remediations) {
      summaryLines.push(`- **[${r.priority.toUpperCase()}]** ${r.category}: ${r.suggestion}`);
    }
    summaryLines.push("");
  }

  summaryLines.push("---");
  summaryLines.push("");
  summaryLines.push("## M12.16 Visual Design Summary");
  summaryLines.push("");
  summaryLines.push(generateM12_16Summary(m12_16_gate));

  fs.writeFileSync(SUMMARY_PATH, summaryLines.join("\n"));
  console.log(`  Written: ${SUMMARY_PATH}`);

  // COMMERCIAL-VERDICT.md
  const verdictLines = [];
  verdictLines.push("# Commercial Delivery Verdict — M12.17");
  verdictLines.push("");
  verdictLines.push(`**Generated**: ${new Date().toLocaleString()}`);
  verdictLines.push(`**Overall Verdict**: ${commercialReport.overallVerdict}`);
  verdictLines.push("");
  verdictLines.push("### Gate Summary");
  verdictLines.push("");
  for (const [gate, v] of Object.entries(commercialReport.gateResults)) {
    verdictLines.push(`- ${gate}: ${v}`);
  }
  verdictLines.push("");
  verdictLines.push(`### Quality Score: ${m12_16_gate.summary.qualityScore}/100`);
  verdictLines.push("");
  verdictLines.push(`### Checks: ${commercialReport.totalChecks.pass} pass, ${commercialReport.totalChecks.fail} fail, ${commercialReport.totalChecks.warn} warn`);
  verdictLines.push("");
  if (commercialReport.remediations.length > 0) {
    verdictLines.push("### Top Remediations");
    verdictLines.push("");
    for (const r of commercialReport.remediations.slice(0, 10)) {
      verdictLines.push(`- [${r.priority.toUpperCase()}] ${r.category}: ${r.suggestion}`);
    }
    verdictLines.push("");
  }
  fs.writeFileSync(COMMERCIAL_VERDICT_PATH, verdictLines.join("\n"));
  console.log(`  Written: ${COMMERCIAL_VERDICT_PATH}`);

  console.log("");
  console.log("=".repeat(65));
  console.log(`FINAL VERDICT: ${commercialReport.overallVerdict}`);
  console.log("=".repeat(65));

  // Cleanup
  try {
    for (const f of fs.readdirSync(AUDIT_DIR)) {
      if (f.startsWith(".m12_17_tmp_")) fs.unlinkSync(path.join(AUDIT_DIR, f));
    }
  } catch {}

  if (commercialReport.overallVerdict === "FAIL") process.exit(1);
  process.exit(0);
}

main().catch((err) => { console.error("M12.17 checker error:", err.message); process.exit(2); });
