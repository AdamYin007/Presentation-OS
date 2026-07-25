#!/usr/bin/env node
/**
 * M12.19 — Logo Safe Area Enforcement Checker
 *
 * Validates that all logo bounding boxes declared in SlideSpec sit within
 * the configured safe-area margins.
 *
 * Usage:
 *   node scripts/check-m12-19-logo-safe-area-enforcement.cjs [input.md] [output-dir]
 *   npm run check:m12-19-logo-safe-area-enforcement
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { runPipeline } = require("../packages/presentation-pipeline/src/index.js");
const { checkLogoSafeArea } = require("../packages/logo-safe-area-gate/src/index.js");

// ─── Configuration ─────────────────────────────────────────────────────

const ROOT = path.join(__dirname, "..");
const INPUT_MD = process.argv[2] || path.join(ROOT, "fixtures", "document-ingest", "sample-markdown.md");
const OUTPUT_DIR = process.argv[3] || path.join(ROOT, "examples", "business-review", "m12-19-audit");
const AUDIT_DIR = OUTPUT_DIR;
const REPORT_PATH = path.join(OUTPUT_DIR, "logo-safe-area-report.json");
const SUMMARY_PATH = path.join(OUTPUT_DIR, "LOGO-SAFE-AREA-SUMMARY.md");

// ─── Helpers ───────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;
let warnCount = 0;
const checks = [];
const warnings = [];
const allRemediations = [];

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

function remediation(category, severity, suggestion) {
  allRemediations.push({ category, severity, suggestion });
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log("M12.19 — Logo Safe Area Enforcement");
  console.log("=".repeat(65));
  console.log("");

  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const inputText = fs.readFileSync(INPUT_MD, "utf8");
  console.log(`Input: ${INPUT_MD}`);
  console.log("");

  // Run pipeline to get SlideSpecs + LayoutPlan
  console.log("[1/3] Running presentation pipeline...");
  const pipelineResult = await runPipeline(inputText, {
    style: "minimal-modern",
    emitManifest: true,
    outputDir: AUDIT_DIR,
    inputPath: INPUT_MD,
  });
  const slideSpecs = pipelineResult.slideSpecs;
  const layoutPlan = pipelineResult.layoutPlan;
  console.log(`  Generated ${slideSpecs.length} slide specs`);
  console.log("");

  // Run logo safe-area check
  console.log("[2/3] Checking logo safe-area enforcement...");
  const brandConfig = {}; // extend with custom margins if needed
  const logoResult = checkLogoSafeArea(slideSpecs, layoutPlan, brandConfig);

  record(logoResult.passCount > 0 || logoResult.totalLogosChecked === 0,
         `Logo safe-area verdict: ${logoResult.verdict}`);
  console.log(`  Total logos checked: ${logoResult.totalLogosChecked}`);
  console.log(`  Passed: ${logoResult.passCount}, Failed: ${logoResult.failCount}, Warnings: ${logoResult.warnCount}`);

  if (logoResult.margins) {
    console.log(`  Safe area margins: top=${logoResult.margins.top}px, bottom=${logoResult.margins.bottom}px, left=${logoResult.margins.left}px, right=${logoResult.margins.right}px`);
  }
  if (logoResult.slideDimensions) {
    console.log(`  Slide dimensions: ${logoResult.slideDimensions.width}×${logoResult.slideDimensions.height} px`);
  }
  console.log("");

  // Log individual results
  for (const r of logoResult.results) {
    if (r.status === "fail") {
      console.log(`  [SLIDE ${r.slide}] FAIL: ${r.message}`);
    } else if (r.status === "warn") {
      console.log(`  [SLIDE ${r.slide}] WARN: ${r.message}`);
    }
  }

  if (logoResult.issues.length > 0) {
    console.log("");
    console.log("Issues:");
    for (const issue of logoResult.issues) {
      if (issue.severity === "fail") {
        console.log(`  [FAIL] Slide ${issue.slide}: ${issue.suggestion}`);
        remediation(issue.category, "fail", issue.suggestion);
      } else if (issue.severity === "warn") {
        console.log(`  [WARN] Slide ${issue.slide}: ${issue.suggestion}`);
        remediation(issue.category, "warn", issue.suggestion);
      } else {
        console.log(`  [INFO] ${issue.suggestion}`);
      }
    }
  }
  console.log("");

  // Write machine-readable report
  console.log("[3/3] Writing reports...");
  const report = {
    gate: "m12_19_logo_safe_area",
    verdict: logoResult.verdict,
    passCount: logoResult.passCount,
    failCount: logoResult.failCount,
    warnCount: logoResult.warnCount,
    totalLogosChecked: logoResult.totalLogosChecked,
    margins: logoResult.margins,
    slideDimensions: logoResult.slideDimensions,
    results: logoResult.results,
    issues: logoResult.issues,
    remediations: allRemediations,
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`  Written: ${REPORT_PATH}`);

  // Write human-readable summary
  const summaryLines = [];
  summaryLines.push("# Logo Safe Area Enforcement — M12.19");
  summaryLines.push("");
  summaryLines.push(`**Generated**: ${new Date().toLocaleString()}`);
  summaryLines.push(`**Overall Verdict**: ${logoResult.verdict}`);
  summaryLines.push(`**Total Logos Checked**: ${logoResult.totalLogosChecked}`);
  summaryLines.push(`**Checks**: ${logoResult.passCount} pass, ${logoResult.failCount} fail, ${logoResult.warnCount} warn`);
  summaryLines.push("");

  if (logoResult.margins) {
    summaryLines.push("## Safe Area Configuration");
    summaryLines.push("");
    summaryLines.push("| Margin | Value |");
    summaryLines.push("|--------|-------|");
    summaryLines.push(`| Top    | ${logoResult.margins.top}px |`);
    summaryLines.push(`| Bottom | ${logoResult.margins.bottom}px |`);
    summaryLines.push(`| Left   | ${logoResult.margins.left}px |`);
    summaryLines.push(`| Right  | ${logoResult.margins.right}px |`);
    summaryLines.push("");
  }

  if (logoResult.slideDimensions) {
    summaryLines.push("## Slide Dimensions");
    summaryLines.push("");
    summaryLines.push(`Width: ${logoResult.slideDimensions.width}px, Height: ${logoResult.slideDimensions.height}px`);
    summaryLines.push("");
  }

  if (logoResult.results.length > 0) {
    summaryLines.push("## Per-Slide Results");
    summaryLines.push("");
    summaryLines.push("| Slide | Status | Message |");
    summaryLines.push("|-------|--------|---------|");
    for (const r of logoResult.results) {
      summaryLines.push(`| ${r.slide} | ${r.status.toUpperCase()} | ${r.message} |`);
    }
    summaryLines.push("");
  }

  if (logoResult.issues.length > 0) {
    summaryLines.push("## Issues");
    summaryLines.push("");
    for (const issue of logoResult.issues) {
      const icon = issue.severity === "fail" ? "FAIL" : issue.severity === "warn" ? "WARN" : "INFO";
      summaryLines.push(`- [${icon}] Slide ${issue.slide}: ${issue.suggestion}`);
    }
    summaryLines.push("");
  }

  if (allRemediations.length > 0) {
    summaryLines.push("## Remediations");
    summaryLines.push("");
    for (const r of allRemediations) {
      summaryLines.push(`- **[${r.severity.toUpperCase()}]** ${r.category}: ${r.suggestion}`);
    }
    summaryLines.push("");
  }

  summaryLines.push("---");
  summaryLines.push("");
  summaryLines.push(`**Verdict**: ${logoResult.verdict}`);

  fs.writeFileSync(SUMMARY_PATH, summaryLines.join("\n"));
  console.log(`  Written: ${SUMMARY_PATH}`);

  console.log("");
  console.log("=".repeat(65));
  console.log(`FINAL VERDICT: ${logoResult.verdict}`);
  console.log("=".repeat(65));

  if (logoResult.verdict === "FAIL") process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error("M12.19 checker error:", err.message);
  process.exit(2);
});
