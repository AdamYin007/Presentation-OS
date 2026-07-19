#!/usr/bin/env node
/**
 * M12.16 — Visual Design Gate Unit Tests (CommonJS)
 */

"use strict";

const {
  parseHexColor,
  srgbToLinear,
  relativeLuminance,
  contrastRatio,
  checkColorContrast,
  checkTypographyConsistency,
  checkBrandGuidelines,
  runVisualDesignGate,
} = require("../packages/visual-design-gate/src/index.js");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  totalTests++;
  if (actual === expected) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ ${message}: expected ${expected}, got ${actual}`);
  }
}

// ─── Test Helpers ──────────────────────────────────────────────────────

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return a === b;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function makeSlideSpec(index, role, title, body, designHints) {
  return {
    id: `slide-${index}`,
    index,
    section: "Test Section",
    role: role || "content",
    title: title || `Slide ${index}`,
    keyMessage: "",
    body: body || [`Bullet ${index}`],
    visualType: "none",
    visualSpec: {},
    layout: "title-and-bullets",
    speakerNotes: "",
    sourceRefs: [],
    designHints: designHints || {},
  };
}

function makeLayoutPlan(themeName, layouts) {
  const themeTokens = {
    "minimal-modern": {
      name: "Minimal Modern",
      colors: {
        primary: "#1A1A1A", secondary: "#6B7280", accent: "#3B82F6",
        background: "#FFFFFF", surface: "#F9FAFB", border: "#E5E7EB",
        text: "#111827", muted: "#9CA3AF",
      },
      fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", mono: "JetBrains Mono, monospace" },
    },
    "business-consulting": {
      name: "Business Consulting",
      colors: {
        primary: "#1E3A5F", secondary: "#4A5568", accent: "#D4A843",
        background: "#FFFFFF", surface: "#F7F7F5", border: "#D4C5A9",
        text: "#1A202C", muted: "#718096",
      },
      fonts: { heading: "Georgia, serif", body: "Helvetica Neue, sans-serif", mono: "Courier New, monospace" },
    },
  };
  const tokens = themeTokens[themeName] || themeTokens["minimal-modern"];

  return {
    schemaVersion: "1.0.0",
    theme: themeName || "minimal-modern",
    themeTokens: tokens,
    totalSlides: layouts.length,
    layoutFamiliesUsed: [...new Set(layouts.map((l) => l.layoutFamily))],
    layouts,
  };
}

// ─── Main test runner (async wrapper for top-level await) ──────────────

async function runTests() {
console.log("M12.16 — Visual Design Standards Gate — Unit Tests");
console.log("=".repeat(60));
console.log("");

// ═══════════════════════════════════════════════════════════
// 1. Color Contrast Utilities
// ═══════════════════════════════════════════════════════════
console.log("[1] Color Contrast Utilities");
console.log("");

assert(arraysEqual(parseHexColor("#FF0000"), [1, 0, 0]), "Parse #FF0000 → [1, 0, 0]");
assert(arraysEqual(parseHexColor("#000000"), [0, 0, 0]), "Parse #000000 → [0, 0, 0]");
assert(arraysEqual(parseHexColor("#FFFFFF"), [1, 1, 1]), "Parse #FFFFFF → [1, 1, 1]");
const gray80 = parseHexColor("#808080");
assert(gray80 && Math.abs(gray80[0] - 0.502) < 0.001, "Parse #808080 → [~0.5, ~0.5, ~0.5]");
assertEqual(parseHexColor(null), null, "Parse null → null");
assertEqual(parseHexColor("invalid"), null, "Parse 'invalid' → null");

// Black on white should be max contrast (~21:1)
const blackWhite = contrastRatio([0, 0, 0], [1, 1, 1]);
assert(blackWhite >= 20.9 && blackWhite <= 21.1, `Black/white contrast ≈ 21:1 (got ${blackWhite.toFixed(2)})`);

// White on white should be 1:1
const whiteWhite = contrastRatio([1, 1, 1], [1, 1, 1]);
assertEqual(whiteWhite, 1, "White/white contrast = 1:1");

// Known WCAG test case: #767676 on #FFFFFF should be ~4.54:1
const grayWhite = contrastRatio(parseHexColor("#767676"), parseHexColor("#FFFFFF"));
assert(grayWhite >= 4.4 && grayWhite <= 4.6, `Gray/white contrast ≈ 4.5:1 (got ${grayWhite.toFixed(2)})`);

console.log("");

// ═══════════════════════════════════════════════════════════
// 2. Color Contrast Check — PASS Scenario
// ═══════════════════════════════════════════════════════════
console.log("[2] Color Contrast — PASS Scenario");
console.log("");

const passSpecs = [makeSlideSpec(1, "title-slide", "Title"), makeSlideSpec(2, "content", "Content")];
const passLayouts = [
  { index: 1, role: "title-slide", colors: { text: "#111827", background: "#FFFFFF", secondaryText: "#6B7280", muted: "#9CA3AF", accent: "#3B82F6", primary: "#1A1A1A", surface: "#F9FAFB", border: "#E5E7EB" }, fontSize: { heading: 44, body: 20 } },
  { index: 2, role: "content", colors: { text: "#111827", background: "#FFFFFF", secondaryText: "#6B7280", muted: "#9CA3AF", accent: "#3B82F6", primary: "#1A1A1A", surface: "#F9FAFB", border: "#E5E7EB" }, fontSize: { heading: 22, body: 14 } },
];
const passPlan = makeLayoutPlan("minimal-modern", passLayouts);

const passResult = checkColorContrast(passSpecs, passPlan);
assertEqual(passResult.verdict, "PASS", `PASS scenario verdict is PASS (got ${passResult.verdict})`);
assertEqual(passResult.failCount, 0, `PASS scenario has 0 failures (got ${passResult.failCount})`);

console.log("");

// ═══════════════════════════════════════════════════════════
// 3. Color Contrast Check — FAIL Scenario (AA violation)
// ═══════════════════════════════════════════════════════════
console.log("[3] Color Contrast — FAIL Scenario (AA Violation)");
console.log("");

// Light gray (#CCCCCC) on white (#FFFFFF) has very low contrast (~1.25:1)
const failLayouts = [
  { index: 1, role: "content", colors: { text: "#CCCCCC", background: "#FFFFFF", secondaryText: "#DDDDDD", muted: "#EEEEEE", accent: "#3B82F6", primary: "#1A1A1A", surface: "#F9FAFB", border: "#E5E7EB" }, fontSize: { heading: 22, body: 14 } },
];
const failPlan = makeLayoutPlan("minimal-modern", failLayouts);

const failResult = checkColorContrast(passSpecs, failPlan);
assertEqual(failResult.verdict, "FAIL", `FAIL scenario verdict is FAIL (got ${failResult.verdict})`);
assert(failResult.failCount > 0, `FAIL scenario has failures (got ${failResult.failCount})`);
assert(failResult.violations.length > 0, "FAIL scenario has violations array populated");
assert(failResult.violations.some((v) => v.severity === "fail"), "At least one violation has severity='fail'");

console.log("");

// ═══════════════════════════════════════════════════════════
// 4. Color Contrast Check — NEEDS_REVIEW Scenario (AAA miss)
// ═══════════════════════════════════════════════════════════
console.log("[4] Color Contrast — NEEDS_REVIEW Scenario (AAA Miss)");
console.log("");

// #6C6C6C on #FFFFFF has ~5.25:1 — passes AA (4.5) but not AAA (7.0)
const reviewLayouts = [
  { index: 1, role: "content", colors: { text: "#6C6C6C", background: "#FFFFFF", secondaryText: "#6B7280", muted: "#9CA3AF", accent: "#3B82F6", primary: "#1A1A1A", surface: "#F9FAFB", border: "#E5E7EB" }, fontSize: { heading: 22, body: 14 } },
];
const reviewPlan = makeLayoutPlan("minimal-modern", reviewLayouts);

const reviewResult = checkColorContrast(passSpecs, reviewPlan);
assertEqual(reviewResult.verdict, "NEEDS_REVIEW", `NEEDS_REVIEW scenario verdict is NEEDS_REVIEW (got ${reviewResult.verdict})`);
assertEqual(reviewResult.failCount, 0, `NEEDS_REVIEW scenario has 0 failures (got ${reviewResult.failCount})`);
assert(reviewResult.warnCount > 0, "NEEDS_REVIEW scenario has warnings");

console.log("");

// ═══════════════════════════════════════════════════════════
// 5. Typography Consistency — PASS
// ═══════════════════════════════════════════════════════════
console.log("[5] Typography Consistency — PASS");
console.log("");

const consistentLayouts = [
  { index: 1, role: "title-slide", layoutFamily: "title-slide", fontSize: { heading: 44, body: 20 } },
  { index: 2, role: "content", layoutFamily: "title-and-bullets", fontSize: { heading: 22, body: 14 } },
  { index: 3, role: "content", layoutFamily: "title-and-bullets", fontSize: { heading: 22, body: 14 } },
];
const consistentPlan = makeLayoutPlan("minimal-modern", consistentLayouts);

const typPass = checkTypographyConsistency(passSpecs.slice(0, 3), consistentPlan);
assertEqual(typPass.verdict, "PASS", `Consistent typography verdict is PASS (got ${typPass.verdict})`);
assertEqual(typPass.failCount, 0, `Consistent typography has 0 failures (got ${typPass.failCount})`);

console.log("");

// ═══════════════════════════════════════════════════════════
// 6. Typography Consistency — FAIL (excessive size variance)
// ═══════════════════════════════════════════════════════════
console.log("[6] Typography Consistency — FAIL (Excessive Variance)");
console.log("");

const variableLayouts = [
  { index: 1, role: "title-slide", layoutFamily: "title-slide", fontSize: { heading: 44, body: 20 } },
  { index: 2, role: "content", layoutFamily: "title-and-bullets", fontSize: { heading: 22, body: 14 } },
  { index: 3, role: "content", layoutFamily: "title-and-bullets", fontSize: { heading: 10, body: 28 } }, // swapped!
];
const variablePlan = makeLayoutPlan("minimal-modern", variableLayouts);

const typFail = checkTypographyConsistency(passSpecs.slice(0, 3), variablePlan);
assertEqual(typFail.verdict, "FAIL", `Variable typography verdict is FAIL (got ${typFail.verdict})`);
assert(typFail.failCount > 0, "Variable typography has failures");

console.log("");

// ═══════════════════════════════════════════════════════════
// 7. Typography Consistency — NEEDS_REVIEW (moderate variance)
// ═══════════════════════════════════════════════════════════
console.log("[7] Typography Consistency — NEEDS_REVIEW (Moderate Variance)");
console.log("");

const moderateLayouts = [
  { index: 1, role: "title-slide", layoutFamily: "title-slide", fontSize: { heading: 44, body: 20 } },
  { index: 2, role: "content", layoutFamily: "title-and-bullets", fontSize: { heading: 22, body: 14 } },
  { index: 3, role: "content", layoutFamily: "title-and-bullets", fontSize: { heading: 28, body: 16 } }, // +27% variance
];
const moderatePlan = makeLayoutPlan("minimal-modern", moderateLayouts);

const typReview = checkTypographyConsistency(passSpecs.slice(0, 3), moderatePlan);
assertEqual(typReview.verdict, "NEEDS_REVIEW", `Moderate variance verdict is NEEDS_REVIEW (got ${typReview.verdict})`);
assertEqual(typReview.failCount, 0, `Moderate variance has 0 failures (got ${typReview.failCount})`);
assert(typReview.warnCount > 0, "Moderate variance has warnings");

console.log("");

// ═══════════════════════════════════════════════════════════
// 8. Brand Guidelines — PASS
// ═══════════════════════════════════════════════════════════
console.log("[8] Brand Guidelines — PASS");
console.log("");

const brandSpecs = [
  makeSlideSpec(1, "title-slide", "Title"),
  makeSlideSpec(2, "content", "Content 1"),
  makeSlideSpec(3, "section-divider", "Section"),
  makeSlideSpec(4, "content", "Content 2"),
  makeSlideSpec(5, "closing", "Closing"),
];
const brandPlan = makeLayoutPlan("minimal-modern", [
  { index: 1, role: "title-slide", layoutFamily: "title-slide", fontSize: { heading: 44, body: 20 }, colors: { text: "#111827", background: "#FFFFFF", secondaryText: "#6B7280", muted: "#9CA3AF", accent: "#3B82F6", primary: "#1A1A1A", surface: "#F9FAFB", border: "#E5E7EB" } },
  { index: 2, role: "content", layoutFamily: "title-and-bullets", fontSize: { heading: 22, body: 14 }, colors: { text: "#111827", background: "#FFFFFF", secondaryText: "#6B7280", muted: "#9CA3AF", accent: "#3B82F6", primary: "#1A1A1A", surface: "#F9FAFB", border: "#E5E7EB" } },
  { index: 3, role: "section-divider", layoutFamily: "section-divider", fontSize: { heading: 36, body: 16 }, colors: { text: "#111827", background: "#FFFFFF", secondaryText: "#6B7280", muted: "#9CA3AF", accent: "#3B82F6", primary: "#1A1A1A", surface: "#F9FAFB", border: "#E5E7EB" } },
  { index: 4, role: "content", layoutFamily: "title-and-bullets", fontSize: { heading: 22, body: 14 }, colors: { text: "#111827", background: "#FFFFFF", secondaryText: "#6B7280", muted: "#9CA3AF", accent: "#3B82F6", primary: "#1A1A1A", surface: "#F9FAFB", border: "#E5E7EB" } },
  { index: 5, role: "closing", layoutFamily: "closing", fontSize: { heading: 36, body: 16 }, colors: { text: "#111827", background: "#FFFFFF", secondaryText: "#6B7280", muted: "#9CA3AF", accent: "#3B82F6", primary: "#1A1A1A", surface: "#F9FAFB", border: "#E5E7EB" } },
]);

const brandPass = checkBrandGuidelines(brandSpecs, brandPlan);
assertEqual(brandPass.verdict, "PASS", `Brand PASS scenario verdict is PASS (got ${brandPass.verdict})`);
assertEqual(brandPass.failCount, 0, `Brand PASS has 0 failures (got ${brandPass.failCount})`);

console.log("");

// ═══════════════════════════════════════════════════════════
// 9. Brand Guidelines — FAIL (missing required slides)
// ═══════════════════════════════════════════════════════════
console.log("[9] Brand Guidelines — FAIL (Missing Required Slides)");
console.log("");

const missingSlides = [
  makeSlideSpec(1, "content", "No Title Slide"),
  makeSlideSpec(2, "content", "Content"),
  makeSlideSpec(3, "content", "No Closing"),
];
const brandFail = checkBrandGuidelines(missingSlides, brandPlan, { requiredTitleSlide: true });
assertEqual(brandFail.verdict, "FAIL", `Missing slides verdict is FAIL (got ${brandFail.verdict})`);
assert(brandFail.failCount > 0, "Missing slides has failures");
assert(brandFail.issues.some((i) => i.category === "missing_title_slide"), "Detects missing title slide");
assert(brandFail.issues.some((i) => i.category === "missing_closing_slide"), "Detects missing closing slide");

console.log("");

// ═══════════════════════════════════════════════════════════
// 10. Full Gate — Integrated PASS
// ═══════════════════════════════════════════════════════════
console.log("[10] Full Gate — Integrated PASS");
console.log("");

const fullPassResult = await runVisualDesignGate(brandSpecs, brandPlan);
assertEqual(fullPassResult.overallVerdict, "PASS", `Full gate PASS verdict is PASS (got ${fullPassResult.overallVerdict})`);
assertEqual(fullPassResult.summary.qualityScore, 100, `Full gate quality score is 100 (got ${fullPassResult.summary.qualityScore})`);
assertEqual(fullPassResult.remediationSuggestions.length, 0, "No remediation suggestions for PASS");

console.log("");

// ═══════════════════════════════════════════════════════════
// 11. Full Gate — Integrated FAIL
// ═══════════════════════════════════════════════════════════
console.log("[11] Full Gate — Integrated FAIL");
console.log("");

const failSpecs = [
  makeSlideSpec(1, "content", "Bad Contrast"),
  makeSlideSpec(2, "content", "More Bad"),
];
const badContrastLayouts = [
  { index: 1, role: "content", layoutFamily: "title-and-bullets", fontSize: { heading: 22, body: 14 }, colors: { text: "#CCCCCC", background: "#FFFFFF", secondaryText: "#DDDDDD", muted: "#EEEEEE", accent: "#3B82F6", primary: "#1A1A1A", surface: "#F9FAFB", border: "#E5E7EB" } },
  { index: 2, role: "content", layoutFamily: "title-and-bullets", fontSize: { heading: 22, body: 14 }, colors: { text: "#CCCCCC", background: "#FFFFFF", secondaryText: "#DDDDDD", muted: "#EEEEEE", accent: "#3B82F6", primary: "#1A1A1A", surface: "#F9FAFB", border: "#E5E7EB" } },
];
const badPlan = makeLayoutPlan("minimal-modern", badContrastLayouts);

const fullFailResult = await runVisualDesignGate(failSpecs, badPlan);
assertEqual(fullFailResult.overallVerdict, "FAIL", `Full gate FAIL verdict is FAIL (got ${fullFailResult.overallVerdict})`);
assert(fullFailResult.summary.qualityScore < 70, `Quality score below 70 for FAIL (got ${fullFailResult.summary.qualityScore})`);
assert(fullFailResult.remediationSuggestions.length > 0, "Has remediation suggestions for FAIL");

console.log("");

// ═══════════════════════════════════════════════════════════
// 12. M12.15 Integration — Prior FAIL blocks PASS
// ═══════════════════════════════════════════════════════════
console.log("[12] M12.15 Integration — Prior FAIL blocks PASS");
console.log("");

// A clean deck that would PASS normally, but M12.15 says FAIL
const m12_15_blockResult = await runVisualDesignGate(brandSpecs, brandPlan, { m12_15_verdict: "FAIL" });
assertEqual(m12_15_blockResult.overallVerdict, "NEEDS_REVIEW", `M12.15 FAIL blocks PASS → NEEDS_REVIEW (got ${m12_15_blockResult.overallVerdict})`);
assert(m12_15_blockResult.m12_15_integration.overridden === true, "M12.15 integration flagged as overridden");

console.log("");

// ═══════════════════════════════════════════════════════════
// 13. No Layout Plan — Graceful Degradation
// ═══════════════════════════════════════════════════════════
console.log("[13] Graceful Degradation — No Layout Plan");
console.log("");

const noLayoutResult = await runVisualDesignGate(brandSpecs, null);
assertEqual(noLayoutResult.overallVerdict, "PASS", `No layout plan degrades gracefully to PASS (got ${noLayoutResult.overallVerdict})`);
assertEqual(noLayoutResult.summary.failCount, 0, `No layout plan has 0 failures (got ${noLayoutResult.summary.failCount})`);

console.log("");

// ═══════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════
console.log("=".repeat(60));
console.log(`Tests: ${totalTests} total, ${passedTests} passed, ${failedTests} failed`);
if (failedTests > 0) {
  console.log("RESULT: Some tests FAILED");
  process.exit(1);
} else {
  console.log("RESULT: All tests PASSED");
  process.exit(0);
}
}

// Run the async test suite
runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(2);
});
