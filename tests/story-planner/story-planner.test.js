// Tests for Story Planner (M12.3)
// Run: node tests/story-planner/story-planner.test.js

const { planDeck } = require("../../packages/story-planner/src/index.js");
const {
  validateDeckPlan,
  DEFAULT_DECK_PLAN,
} = require("../../packages/story-planner/src/schema.js");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}: ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

console.log("\nStory Planner Tests (M12.3)");
console.log("============================\n");

// ── Education prompt narrative ──

console.log("Education narrative:");

test("education prompt selects teaching narrative pattern", () => {
  const intent = {
    topic: "人工智能入门",
    audience: "高中生",
    purpose: "teach",
    language: "zh-CN",
    targetSlideCount: 12,
    durationMinutes: 15,
    tone: "casual",
    style: "education-friendly",
    contentDensity: "medium",
    visualPreference: "visual-heavy",
    speakerNotes: true,
    mustInclude: [],
    mustEmphasize: [],
    mustAvoid: [],
    domain: "education",
    assumptions: [],
  };

  const deckPlan = planDeck(intent);

  assert(
    deckPlan.narrativePattern === "concept-example-practice-summary",
    `Expected concept-example-practice-summary, got ${deckPlan.narrativePattern}`,
  );
  assert(deckPlan.sections.length > 0, "Should have sections");
  assert(deckPlan.slides.length > 0, "Should have slides");
});

test("education deck has appropriate roles", () => {
  const intent = {
    topic: "Introduction to AI",
    audience: "high school students",
    purpose: "teach",
    language: "en-US",
    targetSlideCount: 10,
    durationMinutes: 15,
    tone: "casual",
    style: "education-friendly",
    contentDensity: "medium",
    visualPreference: "visual-heavy",
    speakerNotes: true,
    mustInclude: [],
    mustEmphasize: [],
    mustAvoid: [],
    domain: "education",
    assumptions: [],
  };

  const deckPlan = planDeck(intent);
  const roles = deckPlan.slides.map((s) => s.role);

  assert(
    roles.includes("case-study") || roles.includes("content"),
    "Should have content or case-study slides for education",
  );
});

// ── Business review narrative ──

console.log("\nBusiness review narrative:");

test("business review selects executive summary pattern", () => {
  const intent = {
    topic: "年度经营分析",
    audience: "管理层",
    purpose: "review",
    language: "zh-CN",
    targetSlideCount: 15,
    durationMinutes: 20,
    tone: "executive",
    style: "minimal-modern",
    contentDensity: "sparse",
    visualPreference: "visual-heavy",
    speakerNotes: true,
    mustInclude: ["收入增长", "风险"],
    mustEmphasize: [],
    mustAvoid: [],
    domain: "general",
    assumptions: [],
  };

  const deckPlan = planDeck(intent);

  // exec-summary-evidence-recommendation is preferred for review + management audience
  assert(
    deckPlan.narrativePattern === "exec-summary-evidence-recommendation",
    `Expected exec-summary-evidence-recommendation, got ${deckPlan.narrativePattern}`,
  );
});

test("business deck respects mustInclude warnings", () => {
  const intent = {
    topic: "Quarterly Review",
    audience: "executives",
    purpose: "review",
    language: "en-US",
    targetSlideCount: 10,
    durationMinutes: 15,
    tone: "formal",
    style: "business-consulting",
    contentDensity: "medium",
    visualPreference: "balanced",
    speakerNotes: true,
    mustInclude: ["Q3 revenue", "market expansion"],
    mustEmphasize: [],
    mustAvoid: [],
    domain: "general",
    assumptions: [],
  };

  const deckPlan = planDeck(intent);

  // Since we have no source document, mustInclude items may generate warnings
  assert(Array.isArray(deckPlan.warnings), "Warnings should be an array");
});

// ── Research briefing narrative ──

console.log("\nResearch briefing narrative:");

test("research briefing selects academic pattern", () => {
  const intent = {
    topic: "Battery Recycling Research",
    audience: "university researchers",
    purpose: "inform",
    language: "en-US",
    targetSlideCount: 14,
    durationMinutes: 20,
    tone: "academic",
    style: "academic-clean",
    contentDensity: "dense",
    visualPreference: "balanced",
    speakerNotes: true,
    mustInclude: [],
    mustEmphasize: ["methods", "results"],
    mustAvoid: ["market hype"],
    domain: "research",
    assumptions: [],
  };

  const deckPlan = planDeck(intent);

  assert(
    deckPlan.narrativePattern === "background-method-results-discussion",
    `Expected academic pattern, got ${deckPlan.narrativePattern}`,
  );
  assert(deckPlan.audience === "university researchers", "Audience preserved");
  assert(deckPlan.purpose === "inform", "Purpose preserved");
});

// ── Sparse source-driven planning ──

console.log("\nSparse source-driven planning:");

test("sparse source produces minimal but valid deck plan", () => {
  const intent = {
    topic: "Brief Update",
    audience: "team",
    purpose: "inform",
    language: "en-US",
    targetSlideCount: 5,
    durationMinutes: 10,
    tone: "professional",
    style: "minimal-modern",
    contentDensity: "medium",
    visualPreference: "balanced",
    speakerNotes: false,
    mustInclude: [],
    mustEmphasize: [],
    mustAvoid: [],
    domain: "general",
    assumptions: [],
  };

  const sourceDocument = {
    title: "Weekly Status",
    paragraphs: [
      {
        sourceId: "p1",
        sourceType: "paragraph",
        originalText: "Project on track.",
        sectionPath: ["Progress"],
      },
    ],
    sections: [{ originalText: "Progress" }],
    metadata: {},
  };

  const deckPlan = planDeck(intent, sourceDocument);

  assert(deckPlan.deckTitle === "Weekly Status", "Source title should override");
  assert(deckPlan.sections.length > 0, "Should have sections");
  assert(deckPlan.slides.length >= 1, "Should have at least one slide");
});

// ── Explicit slide count allocation ──

console.log("\nExplicit slide count allocation:");

test("slide count is respected within tolerance", () => {
  const intent = {
    topic: "Test Deck",
    audience: "general",
    purpose: "inform",
    language: "en-US",
    targetSlideCount: 8,
    durationMinutes: 10,
    tone: "professional",
    style: "minimal-modern",
    contentDensity: "medium",
    visualPreference: "balanced",
    speakerNotes: true,
    mustInclude: [],
    mustEmphasize: [],
    mustAvoid: [],
    domain: "general",
    assumptions: [],
  };

  const deckPlan = planDeck(intent);

  // Count content slides (excluding section dividers)
  const contentSlides = deckPlan.slides.filter((s) => s.role !== "section-divider");
  // Allow some flexibility due to closing slide and section dividers
  assert(
    contentSlides.length >= 6 && contentSlides.length <= 12,
    `Expected ~8 content slides, got ${contentSlides.length}`,
  );
});

test("large slide count generates warning", () => {
  const intent = {
    topic: "Massive Deck",
    audience: "everyone",
    purpose: "inform",
    language: "en-US",
    targetSlideCount: 30,
    durationMinutes: 45,
    tone: "professional",
    style: "minimal-modern",
    contentDensity: "medium",
    visualPreference: "balanced",
    speakerNotes: true,
    mustInclude: [],
    mustEmphasize: [],
    mustAvoid: [],
    domain: "general",
    assumptions: [],
  };

  const deckPlan = planDeck(intent);
  assert(
    deckPlan.warnings.some((w) => w.toLowerCase().includes("exceeds")),
    "Should warn about excessive slide count",
  );
});

// ── Assumptions and warnings ──

console.log("\nAssumptions and warnings:");

test("assumptions are recorded when inferring from source", () => {
  const intent = {
    topic: "",
    audience: "",
    purpose: "inform",
    language: "zh-CN",
    targetSlideCount: 10,
    durationMinutes: 15,
    tone: "professional",
    style: "minimal-modern",
    contentDensity: "medium",
    visualPreference: "balanced",
    speakerNotes: true,
    mustInclude: [],
    mustEmphasize: [],
    mustAvoid: [],
    domain: "general",
    assumptions: [],
  };

  const sourceDocument = {
    title: "Annual Report 2025",
    paragraphs: [],
    sections: [],
    metadata: {},
  };

  const deckPlan = planDeck(intent, sourceDocument);

  assert(deckPlan.assumptions.length > 0, "Should record assumptions when inferring title");
  assert(
    deckPlan.assumptions.some((a) => a.toLowerCase().includes("source")),
    "Assumption should mention source document",
  );
});

test("warnings generated for unmet mustInclude", () => {
  const intent = {
    topic: "Test",
    audience: "team",
    purpose: "inform",
    language: "en-US",
    targetSlideCount: 5,
    durationMinutes: 10,
    tone: "professional",
    style: "minimal-modern",
    contentDensity: "medium",
    visualPreference: "balanced",
    speakerNotes: true,
    mustInclude: ["very specific unique topic xyz"],
    mustEmphasize: [],
    mustAvoid: [],
    domain: "general",
    assumptions: [],
  };

  const deckPlan = planDeck(intent);
  assert(
    deckPlan.warnings.some((w) => w.toLowerCase().includes("very specific unique topic xyz")),
    "Should warn about unaddressed mustInclude item",
  );
});

// ── SourceRefs preservation ──

console.log("\nSourceRefs preservation:");

test("sourceRefs populated when source document has matching paragraphs", () => {
  const intent = {
    topic: "Financial Analysis",
    audience: "management",
    purpose: "inform",
    language: "en-US",
    targetSlideCount: 8,
    durationMinutes: 15,
    tone: "professional",
    style: "minimal-modern",
    contentDensity: "medium",
    visualPreference: "balanced",
    speakerNotes: true,
    mustInclude: [],
    mustEmphasize: [],
    mustAvoid: [],
    domain: "general",
    assumptions: [],
  };

  const sourceDocument = {
    title: "Q3 Financial Report",
    paragraphs: [
      {
        sourceId: "p1",
        sourceType: "paragraph",
        originalText: "Revenue up 15%.",
        sectionPath: ["Revenue"],
      },
      {
        sourceId: "p2",
        sourceType: "paragraph",
        originalText: "Costs down 5%.",
        sectionPath: ["Costs"],
      },
      {
        sourceId: "p3",
        sourceType: "paragraph",
        originalText: "Profit margin improved.",
        sectionPath: ["Profit"],
      },
    ],
    sections: [{ originalText: "Revenue" }, { originalText: "Costs" }, { originalText: "Profit" }],
    metadata: {},
  };

  const deckPlan = planDeck(intent, sourceDocument);

  // At least some slides should have sourceRefs
  const slidesWithRefs = deckPlan.slides.filter((s) => s.sourceRefs.length > 0);
  assert(
    slidesWithRefs.length > 0,
    `Expected some slides with sourceRefs, got ${slidesWithRefs.length} out of ${deckPlan.slides.length}`,
  );
});

test("sourceRefs are deduplicated by sourceId", () => {
  const intent = {
    topic: "Test",
    audience: "team",
    purpose: "inform",
    language: "en-US",
    targetSlideCount: 5,
    durationMinutes: 10,
    tone: "professional",
    style: "minimal-modern",
    contentDensity: "medium",
    visualPreference: "balanced",
    speakerNotes: true,
    mustInclude: [],
    mustEmphasize: [],
    mustAvoid: [],
    domain: "general",
    assumptions: [],
  };

  const sourceDocument = {
    title: "Test Doc",
    paragraphs: [
      {
        sourceId: "p1",
        sourceType: "paragraph",
        originalText: "Content A.",
        sectionPath: ["Section A"],
      },
      {
        sourceId: "p2",
        sourceType: "paragraph",
        originalText: "Content B.",
        sectionPath: ["Section A"],
      },
    ],
    sections: [{ originalText: "Section A" }],
    metadata: {},
  };

  const deckPlan = planDeck(intent, sourceDocument);

  for (const slide of deckPlan.slides) {
    const ids = slide.sourceRefs.map((r) => r.sourceId);
    const uniqueIds = new Set(ids);
    assert(
      ids.length === uniqueIds.size,
      `Duplicate sourceIds in slide ${slide.slideId}: ${ids.join(", ")}`,
    );
  }
});

// ── No SlideSpec / PPTX rendering ──

console.log("\nScope boundaries:");

test("DeckPlan does not contain SlideSpec fields", () => {
  const intent = {
    topic: "Test",
    audience: "team",
    purpose: "inform",
    language: "en-US",
    targetSlideCount: 5,
    durationMinutes: 10,
    tone: "professional",
    style: "minimal-modern",
    contentDensity: "medium",
    visualPreference: "balanced",
    speakerNotes: true,
    mustInclude: [],
    mustEmphasize: [],
    mustAvoid: [],
    domain: "general",
    assumptions: [],
  };

  const deckPlan = planDeck(intent);

  // DeckPlan slides should NOT have SlideSpec fields like body, layout, speakerNotes text, designHints
  for (const slide of deckPlan.slides) {
    assert(!("body" in slide), "DeckPlan slide should not have SlideSpec body field");
    assert(!("layout" in slide), "DeckPlan slide should not have SlideSpec layout field");
    assert(!("designHints" in slide), "DeckPlan slide should not have SlideSpec designHints field");
    assert(!("qaHints" in slide), "DeckPlan slide should not have SlideSpec qaHints field");
  }
});

test("DeckPlan does not contain PPTX rendering data", () => {
  const intent = {
    topic: "Test",
    audience: "team",
    purpose: "inform",
    language: "en-US",
    targetSlideCount: 5,
    durationMinutes: 10,
    tone: "professional",
    style: "minimal-modern",
    contentDensity: "medium",
    visualPreference: "balanced",
    speakerNotes: true,
    mustInclude: [],
    mustEmphasize: [],
    mustAvoid: [],
    domain: "general",
    assumptions: [],
  };

  const deckPlan = planDeck(intent);

  // No pptx-specific fields
  assert(!("pptxBuffer" in deckPlan), "Should not contain PPTX binary data");
  assert(!("renderInstructions" in deckPlan), "Should not contain render instructions");
});

// ── Schema validation ──

console.log("\nSchema validation:");

test("validateDeckPlan rejects invalid plans", () => {
  const result = validateDeckPlan({});
  assert(!result.ok, "Empty object should be invalid");
  assert(result.errors.length > 0, "Should have errors");
});

test("validateDeckPlan accepts valid plans", () => {
  const validPlan = {
    deckTitle: "Test",
    subtitle: "",
    audience: "team",
    purpose: "inform",
    language: "en-US",
    narrativePattern: "context-analysis-conclusion",
    sections: [
      {
        id: "context",
        title: "Context",
        purpose: "Background",
        keyMessage: "Intro",
        slideAllocation: 1,
        sourceRefs: [],
      },
    ],
    slides: [
      {
        slideId: "slide-001",
        role: "content",
        objective: "Intro",
        keyMessage: "Hello",
        candidateVisual: "none",
        sourceRefs: [],
      },
    ],
    assumptions: [],
    warnings: [],
  };

  const result = validateDeckPlan(validPlan);
  assert(result.ok, `Valid plan rejected: ${result.errors.join(", ")}`);
});

// ── Domain coverage ──

console.log("\nDomain coverage:");

test("technical domain gets appropriate pattern", () => {
  const intent = {
    topic: "Architecture Overview",
    audience: "engineering leads",
    purpose: "summarize",
    language: "en-US",
    targetSlideCount: 10,
    durationMinutes: 15,
    tone: "technical",
    style: "technology-dark",
    contentDensity: "medium",
    visualPreference: "balanced",
    speakerNotes: true,
    mustInclude: [],
    mustEmphasize: [],
    mustAvoid: [],
    domain: "technical",
    assumptions: [],
  };

  const deckPlan = planDeck(intent);
  assert(deckPlan.sections.length > 0, "Technical deck should have sections");
  assert(deckPlan.slides.length > 0, "Technical deck should have slides");
});

test("professional domain works with default patterns", () => {
  const intent = {
    topic: "Project Proposal",
    audience: "client",
    purpose: "propose",
    language: "en-US",
    targetSlideCount: 12,
    durationMinutes: 20,
    tone: "professional",
    style: "business-consulting",
    contentDensity: "medium",
    visualPreference: "balanced",
    speakerNotes: true,
    mustInclude: [],
    mustEmphasize: [],
    mustAvoid: [],
    domain: "general",
    assumptions: [],
  };

  const deckPlan = planDeck(intent);
  assert(deckPlan.narrativePattern !== "", "Should select a pattern");
  assert(deckPlan.sections.length > 0, "Should have sections");
});

// ── Summary ──

console.log("\n============================");
console.log(`Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
