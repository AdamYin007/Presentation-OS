/**
 * @awe/audience-engine — Focused Test Suite (M12.25)
 *
 * Tests: module exports, speaker profile resolution, audience role resolution,
 * contract derivation from various speaker+audience combos, slide adjustments,
 * deck hints, graceful degradation.
 */

"use strict";

const {
  adaptDeck,
  SPEAKER_PROFILES,
  AUDIENCE_ROLES,
} = require("../../packages/presentation-audience-engine/src/index.js");
const {
  ADAPTATION_DIMENSIONS,
} = require("../../packages/presentation-audience-engine/src/schema.js");

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${msg}`);
  }
}

function section(name) {
  console.log(`\n${name}`);
}

// ── Module Exports ──────────────────────────────────────────
section("Module Exports");
assert(typeof adaptDeck === "function", "adaptDeck is a function");
assert(SPEAKER_PROFILES && typeof SPEAKER_PROFILES === "object", "SPEAKER_PROFILES exists");
assert(AUDIENCE_ROLES && typeof AUDIENCE_ROLES === "object", "AUDIENCE_ROLES exists");
assert(
  ADAPTATION_DIMENSIONS && typeof ADAPTATION_DIMENSIONS === "object",
  "ADAPTATION_DIMENSIONS exists",
);

// ── Speaker Profile Resolution ──────────────────────────────
section("Speaker Profile Resolution");
assert(SPEAKER_PROFILES.executive.label === "Executive / C-Level", "executive profile label");
assert(
  SPEAKER_PROFILES.specialist.domainFamiliarity === "deep",
  "specialist has deep domain familiarity",
);
assert(
  SPEAKER_PROFILES.student.communicationStyle === "pedagogical",
  "student has pedagogical style",
);
assert(
  SPEAKER_PROFILES.general_public.detailThreshold === 0.2,
  "general_public has low detail threshold",
);
assert(Object.keys(SPEAKER_PROFILES).length >= 5, "at least 5 speaker profiles defined");

// ── Audience Role Resolution ────────────────────────────────
section("Audience Role Resolution");
assert(AUDIENCE_ROLES.board.decisionPower === "high", "board has high decision power");
assert(
  AUDIENCE_ROLES.engineers.expertiseLevel === "deep_technical",
  "engineers have deep technical expertise",
);
assert(AUDIENCE_ROLES.students.terminologyDepth === "basic", "students get basic terminology");
assert(
  AUDIENCE_ROLES.investors.riskSensitivity === "very_high",
  "investors are very risk sensitive",
);
assert(Object.keys(AUDIENCE_ROLES).length >= 8, "at least 8 audience roles defined");

// ── Contract Derivation: Executive → Board ──────────────────
section("Contract: Executive Speaker → Board Audience");
const result1 = adaptDeck([], null, { speaker: "executive", audience: "board" });
assert(result1.contract.titleDepth === "executive", "exec→board: title depth is executive");
assert(result1.contract.bodyDetailLevel === "minimal", "exec→board: body detail is minimal");
assert(result1.contract.terminology === "executive", "exec→board: terminology is executive");
assert(result1.contract.speakerNotesTone === "direct", "exec→board: speaker notes tone is direct");
assert(result1.contract.metricDepth === "summary", "exec→board: metric depth is summary");
assert(result1.warnings.length === 0, "no warnings for valid profiles");

// ── Contract Derivation: Specialist → Engineers ─────────────
section("Contract: Specialist Speaker → Engineers Audience");
const result2 = adaptDeck([], null, { speaker: "specialist", audience: "engineers" });
assert(result2.contract.titleDepth === "technical", "spec→eng: title depth is technical");
assert(result2.contract.bodyDetailLevel === "detailed", "spec→eng: body detail is detailed");
assert(result2.contract.terminology === "technical", "spec→eng: terminology is technical");
assert(
  result2.contract.speakerNotesTone === "comprehensive",
  "spec→eng: speaker notes tone is comprehensive",
);
assert(result2.contract.emphasis === "evidence_based", "spec→eng: emphasis is evidence_based");

// ── Contract Derivation: Student → Students ─────────────────
section("Contract: Student Speaker → Students Audience");
const result3 = adaptDeck([], null, { speaker: "student", audience: "students" });
assert(result3.contract.titleDepth === "basic", "stu→stu: title depth is basic");
assert(result3.contract.terminology === "basic", "stu→stu: terminology is basic");
assert(
  result3.contract.speakerNotesTone === "explanatory",
  "stu→stu: speaker notes tone is explanatory",
);
assert(
  result3.contract.narrativeAngle === "story_first",
  "stu→stu: narrative angle is story_first",
);

// ── Contract Derivation: General Public → Investors ─────────
section("Contract: General Public Speaker → Investors Audience");
const result4 = adaptDeck([], null, { speaker: "general_public", audience: "investors" });
assert(
  result4.contract.titleDepth === "professional",
  "gp→inv: title depth is professional (speaker authority low)",
);
assert(result4.contract.terminology === "business", "gp→inv: terminology is business");
assert(result4.contract.metricDepth === "summary", "gp→inv: metric depth is summary");

// ── Slide Adjustments ───────────────────────────────────────
section("Slide Adjustments");
const testSpecs = [
  {
    id: "slide-001",
    index: 0,
    role: "title",
    title: "My Presentation",
    section: "",
    body: [],
    speakerNotes: "",
  },
  {
    id: "slide-002",
    index: 1,
    role: "section-divider",
    title: "Background",
    section: "Background",
    body: [],
    speakerNotes: "",
  },
  {
    id: "slide-003",
    index: 2,
    role: "content",
    title: "Architecture Overview",
    section: "Methodology",
    body: ["Point 1", "Point 2", "Point 3"],
    speakerNotes: "Speak slowly",
  },
  {
    id: "slide-004",
    index: 3,
    role: "closing",
    title: "Thank You",
    section: "Closing",
    body: [],
    speakerNotes: "",
  },
];

const adjResult = adaptDeck(testSpecs, null, { speaker: "executive", audience: "board" });
assert(adjResult.slideAdjustments.length === 4, "4 slide adjustments for 4 slides");
assert(adjResult.slideAdjustments[0].role === "title", "first slide is title role");
assert(adjResult.slideAdjustments[2].role === "content", "third slide is content role");
assert(adjResult.slideAdjustments[3].role === "closing", "fourth slide is closing role");

// ── Deck Hints ──────────────────────────────────────────────
section("Deck Hints");
assert(adjResult.deckHints.totalSlides === 4, "deck hints total slides = 4");
assert(adjResult.deckHints.contentSlides === 1, "deck hints content slides = 1");
assert(adjResult.deckHints.contentRatio === "0.25", "deck hints content ratio = 0.25");
assert(Array.isArray(adjResult.deckHints.sectionEmphasisOrder), "section emphasis order is array");

// ── Empty Input Graceful ────────────────────────────────────
section("Graceful Degradation");
const emptyResult = adaptDeck([], null, {});
assert(emptyResult.slideAdjustments.length === 0, "empty input produces empty adjustments");
assert(
  emptyResult.contract.titleDepth === "professional",
  "empty input defaults to professional title depth",
);
assert(
  emptyResult.contract.terminology === "professional",
  "empty input defaults to professional terminology",
);

// ── Unknown Profiles Warn ───────────────────────────────────
section("Unknown Profile Warnings");
const warnResult = adaptDeck([], null, {
  speaker: "unknown_speaker",
  audience: "unknown_audience",
});
assert(warnResult.warnings.length > 0, "warnings generated for unknown profiles");

// ── Custom Rules Override ───────────────────────────────────
section("Custom Rules Override");
const customResult = adaptDeck([], null, {
  speaker: "executive",
  audience: "board",
  customRules: { terminology: "technical" },
});
assert(
  customResult.contract.terminology === "technical",
  "custom rule overrides terminology to technical",
);

// ── All Adaptation Dimensions Defined ───────────────────────
section("Adaptation Dimensions");
assert(ADAPTATION_DIMENSIONS.TITLE_DEPTH === "title_depth", "TITLE_DEPTH dimension defined");
assert(ADAPTATION_DIMENSIONS.BODY_DETAIL === "body_detail", "BODY_DETAIL dimension defined");
assert(ADAPTATION_DIMENSIONS.TERMINOLOGY === "terminology", "TERMINOLOGY dimension defined");
assert(
  ADAPTATION_DIMENSIONS.VISUAL_PRIORITY === "visual_priority",
  "VISUAL_PRIORITY dimension defined",
);
assert(ADAPTATION_DIMENSIONS.EMPHASIS === "emphasis", "EMPHASIS dimension defined");
assert(
  ADAPTATION_DIMENSIONS.SPEAKER_NOTES_TONE === "speaker_notes_tone",
  "SPEAKER_NOTES_TONE dimension defined",
);
assert(ADAPTATION_DIMENSIONS.METRIC_DEPTH === "metric_depth", "METRIC_DEPTH dimension defined");
assert(
  ADAPTATION_DIMENSIONS.NARRATIVE_ANGLE === "narrative_angle",
  "NARRATIVE_ANGLE dimension defined",
);

// ── Full Pipeline Scenario ──────────────────────────────────
section("Full Pipeline Scenario");
const fullResult = adaptDeck(testSpecs, null, { speaker: "manager", audience: "executives" });
assert(fullResult.contract.titleDepth === "professional", "mgr→exec: professional title depth");
assert(
  fullResult.contract.bodyDetailLevel === "minimal",
  "mgr→exec: minimal body detail (executives have short time budget)",
);
assert(fullResult.contract.terminology === "professional", "mgr→exec: professional terminology");
assert(
  fullResult.contract.speakerNotesTone === "organized",
  "mgr→exec: organized speaker notes tone",
);
assert(
  fullResult.contract.metricDepth === "summary",
  "mgr→exec: summary metrics (short time budget)",
);
assert(fullResult.assumptions.length > 0, "assumptions recorded for valid profiles");

// ── Summary ─────────────────────────────────────────────────
console.log("\n==================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log("All audience engine tests passed ✓");
} else {
  console.log(`${failed} test(s) failed ✗`);
  process.exitCode = 1;
}
