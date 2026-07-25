#!/usr/bin/env node
/**
 * M12.14 — Quality Regression Baseline Checker
 *
 * Compares current quality-manifest.json against a baseline manifest
 * and reports deltas. Fails on significant regressions.
 *
 * Usage:
 *   npm run check:m12-14-regression
 *   node scripts/check-m12-14-regression.cjs [manifest-path] [baseline-path]
 *
 * Defaults:
 *   manifest    = examples/business-review/quality-manifest.json
 *   baseline    = fixtures/regression/baseline-manifest.json
 *
 * Rules:
 *   - qualityScore drop > threshold → FAIL
 *   - failCount increase → FAIL
 *   - warnCount increase → WARN only (unless score also drops > threshold)
 *   - deck.slideCount change → INFO
 *   - checks status changes → DETAIL
 *   - No baseline → WARN, do NOT fail
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ─── Configuration ──────────────────────────────────────────────────────

const ROOT = path.join(__dirname, "..");
const DEFAULT_MANIFEST = process.argv[2] || path.join(ROOT, "examples", "business-review", "quality-manifest.json");
const DEFAULT_BASELINE = process.argv[3] || path.join(ROOT, "fixtures", "regression", "baseline-manifest.json");

const SCORE_DROP_THRESHOLD = 5; // points

// ─── Helpers ────────────────────────────────────────────────────────────

let issues = []; // { level: "fail"|"warn"|"info", field, delta, message }

function addIssue(level, field, delta, message) {
  issues.push({ level, field, delta, message });
  const icon = level === "fail" ? "✗" : level === "warn" ? "⚠" : "·";
  console.log(`  ${icon} [${level.toUpperCase()}] ${field}: ${delta} — ${message}`);
}

// ─── Comparison Logic ──────────────────────────────────────────────────

function compareManifests(current, baseline) {
  console.log("\nComparing manifests...\n");

  // 1. qualityScore
  if (current.summary.qualityScore !== undefined && baseline.summary.qualityScore !== undefined) {
    const delta = current.summary.qualityScore - baseline.summary.qualityScore;
    if (delta < 0) {
      if (Math.abs(delta) > SCORE_DROP_THRESHOLD) {
        addIssue("fail", "qualityScore", `${baseline.summary.qualityScore} → ${current.summary.qualityScore}`,
          `Score dropped more than ${SCORE_DROP_THRESHOLD} points`);
      } else {
        addIssue("warn", "qualityScore", `${baseline.summary.qualityScore} → ${current.summary.qualityScore}`,
          `Score dropped ≤ ${SCORE_DROP_THRESHOLD} points`);
      }
    } else if (delta > 0) {
      addIssue("info", "qualityScore", `${baseline.summary.qualityScore} → ${current.summary.qualityScore}`,
        "Score improved");
    }
  }

  // 2. failCount
  if (current.summary.failCount !== undefined && baseline.summary.failCount !== undefined) {
    const delta = current.summary.failCount - baseline.summary.failCount;
    if (delta > 0) {
      addIssue("fail", "failCount", `${baseline.summary.failCount} → ${current.summary.failCount}`,
        "Failed checks increased");
    } else if (delta < 0) {
      addIssue("info", "failCount", `${baseline.summary.failCount} → ${current.summary.failCount}`,
        "Failed checks decreased");
    }
  }

  // 3. warnCount
  if (current.summary.warnCount !== undefined && baseline.summary.warnCount !== undefined) {
    const delta = current.summary.warnCount - baseline.summary.warnCount;
    if (delta > 0) {
      addIssue("warn", "warnCount", `${baseline.summary.warnCount} → ${current.summary.warnCount}`,
        "Warnings increased");
    } else if (delta < 0) {
      addIssue("info", "warnCount", `${baseline.summary.warnCount} → ${current.summary.warnCount}`,
        "Warnings decreased");
    }
  }

  // 4. deck.slideCount
  if (current.deck.slideCount !== undefined && baseline.deck.slideCount !== undefined) {
    const delta = current.deck.slideCount - baseline.deck.slideCount;
    if (delta !== 0) {
      addIssue("info", "slideCount", `${baseline.deck.slideCount} → ${current.deck.slideCount}`,
        "Deck size changed");
    }
  }

  // 5. Overall status
  if (current.summary.overallStatus !== baseline.summary.overallStatus) {
    addIssue("fail", "overallStatus", `${baseline.summary.overallStatus} → ${current.summary.overallStatus}`,
      "Overall status changed");
  }

  // 6. Check-level detail: find checks that changed status
  const baselineChecks = new Map();
  (baseline.checks || []).forEach(c => baselineChecks.set(c.id || c.message, c));

  for (const curr of current.checks || []) {
    const key = curr.id || curr.message;
    const base = baselineChecks.get(key);
    if (base && base.status !== curr.status) {
      addIssue(curr.status === "fail" ? "fail" : "warn",
        `check[${key}]`,
        `${base.status} → ${curr.status}`,
        curr.message || "");
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log("M12.14 Quality Regression Baseline Checker");
  console.log("===========================================\n");

  // Load current manifest
  if (!fs.existsSync(DEFAULT_MANIFEST)) {
    console.error(`Error: Current manifest not found: ${DEFAULT_MANIFEST}`);
    console.error("Run 'npm run check:m12-14-quality-traceability' first to generate one.");
    process.exit(1);
  }

  const current = JSON.parse(fs.readFileSync(DEFAULT_MANIFEST, "utf8"));
  console.log(`Loaded current manifest: ${DEFAULT_MANIFEST}`);

  // Load baseline
  if (!fs.existsSync(DEFAULT_BASELINE)) {
    console.log(`\nNo baseline found at: ${DEFAULT_BASELINE}`);
    console.log("  ⚠ No baseline available — cannot detect regressions.");
    console.log("  Run 'npm run check:m12-14-quality-traceability' and save the manifest as baseline.");
    console.log("\nRegression check SKIPPED (no baseline)\n");
    return;
  }

  const baseline = JSON.parse(fs.readFileSync(DEFAULT_BASELINE, "utf8"));
  console.log(`Loaded baseline manifest: ${DEFAULT_BASELINE}`);

  // Compare
  compareManifests(current, baseline);

  // Summary
  const failCount = issues.filter(i => i.level === "fail").length;
  const warnCount = issues.filter(i => i.level === "warn").length;
  const infoCount = issues.filter(i => i.level === "info").length;

  console.log("\n===========================================");
  console.log(`Issues: ${failCount} failures, ${warnCount} warnings, ${infoCount} info`);

  if (failCount > 0) {
    console.log("\nRegression FAILED — quality has degraded.\n");
    process.exit(1);
  } else {
    console.log("\nRegression check PASSED.\n");
    process.exit(0);
  }
}

main().catch(e => {
  console.error(`Fatal error: ${e.message}`);
  process.exit(1);
});
