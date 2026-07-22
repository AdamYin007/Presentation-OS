/**
 * Tests for M12.9 Natural-Language Revision engine.
 */

const {
  reviseDeck,
  parseRevisionInstruction,
} = require("../../packages/presentation-revision/src/index.js");
const {
  VALID_OPERATIONS,
  DEFAULT_REVISION_RESULT,
} = require("../../packages/presentation-revision/src/schema.js");

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function makeTestDeck() {
  return {
    deckTitle: "Test Deck",
    audience: "management",
    purpose: "review",
    narrativePattern: "background-method-results",
    sections: [
      {
        id: "sec-1",
        title: "Background",
        purpose: "context",
        keyMessage: "Overview",
        slideAllocation: 3,
        sourceRefs: [],
      },
    ],
    slides: [
      {
        slideId: "slide-001",
        role: "title",
        objective: "",
        keyMessage: "",
        candidateVisual: "none",
        sourceRefs: [],
      },
      {
        slideId: "slide-002",
        role: "executive-summary",
        objective: "overview",
        keyMessage: "Key findings",
        candidateVisual: "metric-cards",
        sourceRefs: [],
      },
      {
        slideId: "slide-003",
        role: "section-divider",
        objective: "",
        keyMessage: "Background",
        candidateVisual: "none",
        sourceRefs: [],
      },
      {
        slideId: "slide-004",
        role: "content",
        objective: "data",
        keyMessage: "Data shows growth",
        candidateVisual: "bar-chart",
        sourceRefs: [],
      },
      {
        slideId: "slide-005",
        role: "content",
        objective: "analysis",
        keyMessage: "Analysis of trends",
        candidateVisual: "line-chart",
        sourceRefs: [],
      },
      {
        slideId: "slide-006",
        role: "section-divider",
        objective: "",
        keyMessage: "Results",
        candidateVisual: "none",
        sourceRefs: [],
      },
      {
        slideId: "slide-007",
        role: "comparison",
        objective: "compare options",
        keyMessage: "Option A vs B",
        candidateVisual: "comparison",
        sourceRefs: [],
      },
      {
        slideId: "slide-008",
        role: "recommendation",
        objective: "next steps",
        keyMessage: "Recommend action",
        candidateVisual: "process",
        sourceRefs: [],
      },
      {
        slideId: "slide-009",
        role: "closing",
        objective: "",
        keyMessage: "Thank you",
        candidateVisual: "none",
        sourceRefs: [],
      },
    ],
  };
}

function makeTestSlideSpecs(count = 9) {
  const specs = [];
  const layouts = [
    "title-slide",
    "executive-summary",
    "section-divider",
    "three-card",
    "horizontal-process",
    "section-divider",
    "comparison",
    "recommendation",
    "closing",
  ];
  const titles = [
    "Title",
    "Key Findings",
    "Background",
    "Growth Data",
    "Trend Analysis",
    "Results",
    "Options Comparison",
    "Recommendation",
    "Closing",
  ];
  for (let i = 0; i < count; i++) {
    specs.push({
      id: `slide-${String(i + 1).padStart(3, "0")}`,
      index: i + 1,
      section: "General",
      role: i === 0 ? "title" : i === count - 1 ? "closing" : "content",
      title: titles[i] || `[Slide ${i + 1}]`,
      subtitle: "",
      keyMessage: `Key message ${i + 1}`,
      body: [`Bullet ${i + 1}.1`, `Bullet ${i + 1}.2`],
      visualType: i === 3 ? "bar-chart" : i === 6 ? "comparison" : "none",
      visualSpec: {},
      layout: layouts[i] || "title-and-bullets",
      speakerNotes: i >= 1 && i <= 7 ? `Notes for ${titles[i]}` : "",
      sourceRefs: [],
      designHints: {},
    });
  }
  return specs;
}

// === Test Schema ===
console.log("Testing schema exports...");
assert(typeof VALID_OPERATIONS === "object", "VALID_OPERATIONS is an array");
assert(VALID_OPERATIONS.length > 0, "VALID_OPERATIONS has entries");
assert(typeof DEFAULT_REVISION_RESULT === "object", "DEFAULT_REVISION_RESULT is an object");
assert(DEFAULT_REVISION_RESULT.slideCountBefore === 0, "Default result has slideCountBefore=0");

// === Test parseRevisionInstruction ===
console.log("\nTesting instruction parsing...");

let deck = makeTestDeck();
let specs = makeTestSlideSpecs(9);

let ops = parseRevisionInstruction("convert slide 4 to timeline", deck, specs);
assert(ops.length === 1, "parse 'convert to timeline' → 1 op");
assert(ops[0].operation === "replace-slide-layout", "op type is replace-slide-layout");
assert(ops[0].newLayout === "timeline", "newLayout is timeline");

ops = parseRevisionInstruction("change theme to business consulting", deck, specs);
assert(ops.length === 1, "parse 'change theme' → 1 op");
assert(ops[0].operation === "change-theme", "op type is change-theme");

ops = parseRevisionInstruction("delete slide 3", deck, specs);
assert(ops.length === 1, "parse 'delete slide' → 1 op");
assert(ops[0].operation === "delete-slide", "op type is delete-slide");

ops = parseRevisionInstruction("add slide after slide 5", deck, specs);
assert(ops.length === 1, "parse 'add slide' → 1 op");
assert(ops[0].operation === "add-slide", "op type is add-slide");

ops = parseRevisionInstruction("compress to 7 slides", deck, specs);
assert(ops.length === 1, "parse 'compress' → 1 op");
assert(ops[0].operation === "compress-count", "op type is compress-count");

ops = parseRevisionInstruction("expand to 12 slides", deck, specs);
assert(ops.length === 1, "parse 'expand' → 1 op");
assert(ops[0].operation === "expand-count", "op type is expand-count");

ops = parseRevisionInstruction("rename slide 2 to Strategic Overview", deck, specs);
assert(ops.length === 1, "parse 'rename' → 1 op");
assert(ops[0].operation === "modify-title", "op type is modify-title");
assert(ops[0].newText === "Strategic Overview", "newText captured correctly");

ops = parseRevisionInstruction("move slide 4 to before slide 6", deck, specs);
assert(ops.length === 1, "parse 'reorder' → 1 op");
assert(ops[0].operation === "reorder-slides", "op type is reorder-slides");

ops = parseRevisionInstruction("add speaker note to slide 4", deck, specs);
assert(ops.length === 1, "parse 'add note' → 1 op");
assert(ops[0].operation === "add-notes", "op type is add-notes");

ops = parseRevisionInstruction("change audience to investors", deck, specs);
assert(ops.length === 1, "parse 'change audience' → 1 op");
assert(ops[0].operation === "change-audience", "op type is change-audience");

ops = parseRevisionInstruction("add bullet to slide 4", deck, specs);
assert(ops.length === 1, "parse 'add bullet' → 1 op");
assert(ops[0].operation === "modify-body", "op type is modify-body");
assert(ops[0].action === "add", "body action is add");

ops = parseRevisionInstruction("remove bullet from slide 5", deck, specs);
assert(ops.length === 1, "parse 'remove bullet' → 1 op");
assert(ops[0].operation === "modify-body", "op type is modify-body");
assert(ops[0].action === "remove", "body action is remove");

// === Test reviseDeck ===
console.log("\nTesting full revision pipeline...");

// Layout change
deck = makeTestDeck();
specs = makeTestSlideSpecs(9);
let result = reviseDeck("convert slide 4 to timeline", deck, specs);
assert(result.success === true, "reviseDeck succeeds");
assert(result.appliedOperations.includes("replace-slide-layout"), "applied replace-slide-layout");
assert(specs[3].layout === "timeline", "slide 4 layout changed to timeline");
assert(specs[3].visualType === "timeline", "slide 4 visualType updated to timeline");
assert(result.slideCountBefore === 9, "slideCountBefore is 9");
assert(result.slideCountAfter === 9, "slideCountAfter is 9 (no structural change)");

// Delete slide
deck = makeTestDeck();
specs = makeTestSlideSpecs(9);
result = reviseDeck("delete slide 3", deck, specs);
assert(result.success === true, "delete-slide succeeds");
assert(result.slideCountAfter === 8, "slideCountAfter is 8 after delete");
assert(specs.length === 8, "specs length is 8");
assert(specs[2].id === "slide-003", "reindexing correct after delete");

// Add slide
deck = makeTestDeck();
specs = makeTestSlideSpecs(9);
result = reviseDeck("add slide after slide 5", deck, specs);
assert(result.success === true, "add-slide succeeds");
assert(result.slideCountAfter === 10, "slideCountAfter is 10 after add");
assert(specs.length === 10, "specs length is 10");

// Compress
deck = makeTestDeck();
specs = makeTestSlideSpecs(9);
result = reviseDeck("compress to 6 slides", deck, specs);
assert(result.success === true, "compress succeeds");
assert(result.slideCountAfter === 6, "slideCountAfter is 6 after compress");

// Expand
deck = makeTestDeck();
specs = makeTestSlideSpecs(6);
result = reviseDeck("expand to 8 slides", deck, specs);
assert(result.success === true, "expand succeeds");
assert(result.slideCountAfter === 8, "slideCountAfter is 8 after expand");

// Rename
deck = makeTestDeck();
specs = makeTestSlideSpecs(9);
result = reviseDeck("rename slide 2 to Strategic Overview", deck, specs);
assert(result.success === true, "rename succeeds");
assert(specs[1].title === "Strategic Overview", "slide 2 title updated");

// Reorder
deck = makeTestDeck();
specs = makeTestSlideSpecs(9);
result = reviseDeck("move slide 4 to before slide 6", deck, specs);
assert(result.success === true, "reorder succeeds");
assert(specs[4].id === "slide-004", "slide 4 moved to position 5");

// Add notes
deck = makeTestDeck();
specs = makeTestSlideSpecs(9);
result = reviseDeck("add speaker note to slide 1", deck, specs);
assert(result.success === true, "add-notes succeeds");
assert(specs[0].speakerNotes.includes("Speaker notes"), "notes added to slide 1");

// Change audience
deck = makeTestDeck();
specs = makeTestSlideSpecs(9);
result = reviseDeck("change audience to investors", deck, specs);
assert(result.success === true, "change-audience succeeds");
assert(deck.audience === "investors", "audience updated in deckPlan");

// Unrecognized instruction
deck = makeTestDeck();
specs = makeTestSlideSpecs(9);
result = reviseDeck("make it sparkle more", deck, specs);
assert(result.success === false, "unrecognized instruction fails gracefully");
assert(result.warnings.length > 0, "warning about unrecognized ops");

// === Summary ===
console.log("\n=========================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
console.log("All revision tests passed!");
