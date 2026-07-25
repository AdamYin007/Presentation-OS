/**
 * Revision engine for M12.9 — Natural-Language Revision.
 *
 * Revisions target protocol layers before binary PPTX edits:
 *   PresentationIntent → DeckPlan → SlideSpec → PPTX rerender
 *
 * Preserves unchanged slides as much as possible.
 */

const { VALID_OPERATIONS, DEFAULT_REVISION_RESULT } = require("./schema.js");

/**
 * Parse a natural-language instruction into structured revision operations.
 * Maps user intent to concrete DeckPlan/SlideSpec mutations.
 */
function parseRevisionInstruction(instruction, currentDeckPlan, currentSlideSpecs) {
  const ops = [];
  const lower = (instruction || "").toLowerCase();

  // === LAYOUT/ROLE CHANGES ===
  if (lower.includes("timeline") || lower.includes("convert to timeline")) {
    const idx = findSlideIndex(lower, currentSlideSpecs);
    if (idx >= 0) {
      ops.push({ operation: "replace-slide-layout", targetSlide: idx, newLayout: "timeline" });
    }
  }
  if (lower.includes("process") && !lower.includes("horizontal")) {
    const idx = findSlideIndex(lower, currentSlideSpecs);
    if (idx >= 0) {
      ops.push({
        operation: "replace-slide-layout",
        targetSlide: idx,
        newLayout: "horizontal-process",
      });
    }
  }
  if (lower.includes("three-card")) {
    const idx = findSlideIndex(lower, currentSlideSpecs);
    if (idx >= 0) {
      ops.push({ operation: "replace-slide-layout", targetSlide: idx, newLayout: "three-card" });
    }
  }
  if (lower.includes("comparison")) {
    const idx = findSlideIndex(lower, currentSlideSpecs);
    if (idx >= 0) {
      ops.push({ operation: "replace-slide-layout", targetSlide: idx, newLayout: "comparison" });
    }
  }
  if (lower.includes("kpi") || lower.includes("metric")) {
    const idx = findSlideIndex(lower, currentSlideSpecs);
    if (idx >= 0) {
      ops.push({
        operation: "replace-slide-layout",
        targetSlide: idx,
        newLayout: "executive-summary",
      });
    }
  }

  // === TITLE MODIFICATIONS ===
  if (
    (instruction || "").toLowerCase().startsWith("rename ") ||
    (instruction || "").toLowerCase().startsWith("title is ")
  ) {
    const lower = (instruction || "").toLowerCase();
    let newText = null;
    // Try alternate pattern first: "rename slide X to Y"
    const altMatch = lower.match(/rename\s+slide\s*\d+\s+to\s+(.+)$/);
    if (altMatch) {
      // Extract from original to preserve case
      const origAltMatch = (instruction || "").match(/rename\s+slide\s*\d+\s+to\s+(.+)$/);
      newText = origAltMatch ? origAltMatch[1].trim() : altMatch[1].trim();
    } else {
      const match = lower.match(/(?:rename\s+slide\s*(?:\d+)?)|(?:title\s+is)\s*[:"]?(.+)$/);
      if (match && match[1]) {
        newText = match[1].trim();
      }
    }
    if (newText !== null) {
      const slideIdx = extractSlideNumber(lower);
      ops.push({ operation: "modify-title", targetSlide: slideIdx, newText });
    }
  }

  // === BODY CONTENT MODIFICATIONS ===
  if (
    lower.includes("add bullet") ||
    lower.includes("add point") ||
    lower.includes("add section")
  ) {
    const slideIdx = extractSlideNumber(lower);
    ops.push({ operation: "modify-body", targetSlide: slideIdx, action: "add" });
  }
  if (
    lower.includes("remove bullet") ||
    lower.includes("remove point") ||
    lower.includes("delete point")
  ) {
    const slideIdx = extractSlideNumber(lower);
    ops.push({ operation: "modify-body", targetSlide: slideIdx, action: "remove" });
  }
  if (
    lower.includes("rewrite body") ||
    lower.includes("change content") ||
    lower.includes("update body")
  ) {
    const slideIdx = extractSlideNumber(lower);
    ops.push({ operation: "modify-body", targetSlide: slideIdx, action: "rewrite" });
  }

  // === SLIDE DELETION ===
  if (
    lower.includes("delete slide") ||
    lower.includes("remove slide") ||
    lower.includes("drop slide")
  ) {
    const slideIdx = extractSlideNumber(lower);
    ops.push({ operation: "delete-slide", targetSlide: slideIdx });
  }

  // === SLIDE ADDITION ===
  if (lower.includes("add slide") || lower.includes("insert slide")) {
    const afterIdx = extractSlideNumber(lower);
    ops.push({ operation: "add-slide", afterSlide: afterIdx, role: "content" });
  }

  // === REORDERING ===
  if (lower.includes("move slide") || lower.includes("reorder")) {
    const moveMatch = lower.match(
      /move\s+(?:slide\s*)?(\d+)\s+(?:to\s+)?(?:after|before)\s+(?:slide\s*)?(\d+)/,
    );
    if (moveMatch) {
      // Convert 1-based slide numbers to 0-based indices
      ops.push({
        operation: "reorder-slides",
        fromIndex: parseInt(moveMatch[1]) - 1,
        toIndex: parseInt(moveMatch[2]) - 1,
      });
    }
  }

  // === THEME CHANGE ===
  if (lower.includes("change theme") || lower.includes("use theme")) {
    const themeMatch = lower.match(/(?:theme|style)\s*[:"]?(.+)$/);
    if (themeMatch) {
      ops.push({ operation: "change-theme", newTheme: themeMatch[1].trim() });
    }
  }

  // === COMPRESS/EXPAND COUNT ===
  if (lower.includes("compress") || lower.includes("reduce") || lower.includes("shorten")) {
    const countMatch = lower.match(/(\d+)\s*(?:slide|page)/);
    const targetCount = countMatch
      ? parseInt(countMatch[1])
      : Math.floor(currentSlideSpecs.length * 0.8);
    ops.push({ operation: "compress-count", targetCount });
  }
  if (lower.includes("expand") || lower.includes("longer")) {
    const countMatch = lower.match(/(\d+)\s*(?:slide|page)/);
    const targetCount = countMatch
      ? parseInt(countMatch[1])
      : Math.ceil(currentSlideSpecs.length * 1.25);
    ops.push({ operation: "expand-count", targetCount });
  }

  // === NOTES ===
  if (lower.includes("add note") || lower.includes("add speaker note")) {
    const slideIdx = extractSlideNumber(lower);
    ops.push({ operation: "add-notes", targetSlide: slideIdx });
  }

  // === AUDIENCE/DURATION ===
  if (lower.includes("change audience") || (lower.includes("for ") && lower.includes("audience"))) {
    const audienceMatch = lower.match(/change\s+audience\s+(?:to\s+)?(.+)$/);
    if (audienceMatch) {
      ops.push({ operation: "change-audience", newAudience: audienceMatch[1].trim() });
    }
  }

  return ops;
}

/**
 * Find slide index by matching keywords against slide titles/bodies.
 * Returns -1 if not found.
 */
function findSlideIndex(instruction, slideSpecs) {
  const lower = instruction.toLowerCase();
  // Try to find a number first
  const numMatch = lower.match(/slide\s*(\d+)/);
  if (numMatch) {
    const idx = parseInt(numMatch[1]) - 1;
    if (idx >= 0 && idx < slideSpecs.length) return idx;
  }
  // Try keyword matching against slide titles and roles
  for (let i = 0; i < slideSpecs.length; i++) {
    const slide = slideSpecs[i];
    const searchable = `${slide.title} ${slide.role} ${slide.keyMessage}`.toLowerCase();
    // Check if any significant word in instruction matches this slide
    const words = lower.split(/\s+/).filter((w) => w.length > 2);
    for (const word of words) {
      if (searchable.includes(word)) return i;
    }
  }
  return -1;
}

/**
 * Extract a slide number from instruction text. Falls back to last matched index.
 */
function extractSlideNumber(text) {
  const match = (text || "").match(/slide\s*(\d+)/);
  return match ? parseInt(match[1]) - 1 : -1;
}

/**
 * Apply parsed revision operations to DeckPlan + SlideSpec.
 * Returns updated objects or null on failure.
 */
function applyRevisions(deckPlan, slideSpecs, ops) {
  const warnings = [];
  let success = true;

  for (const op of ops) {
    switch (op.operation) {
      case "replace-slide-layout": {
        const slideIdx = typeof op.targetSlide === "number" ? op.targetSlide : 0;
        if (slideIdx < 0 || slideIdx >= slideSpecs.length) {
          warnings.push(`replace-slide-layout: slide ${slideIdx} out of range`);
          continue;
        }
        slideSpecs[slideIdx].layout = op.newLayout;
        // Update visualType if layout suggests one
        if (["timeline", "roadmap"].includes(op.newLayout)) {
          slideSpecs[slideIdx].visualType = "timeline";
        } else if (op.newLayout === "horizontal-process") {
          slideSpecs[slideIdx].visualType = "process";
        } else if (op.newLayout === "comparison") {
          slideSpecs[slideIdx].visualType = "comparison";
        } else if (op.newLayout === "executive-summary") {
          slideSpecs[slideIdx].visualType = "metric-cards";
        }
        break;
      }

      case "modify-title": {
        const slideIdx = typeof op.targetSlide === "number" ? op.targetSlide : 0;
        if (slideIdx < 0 || slideIdx >= slideSpecs.length) {
          warnings.push(`modify-title: slide ${slideIdx} out of range`);
          continue;
        }
        slideSpecs[slideIdx].title = op.newText || deckPlan.slides[slideIdx]?.keyMessage || "";
        if (deckPlan.slides[slideIdx]) {
          deckPlan.slides[slideIdx].keyMessage = slideSpecs[slideIdx].title;
        }
        break;
      }

      case "modify-body": {
        const slideIdx = typeof op.targetSlide === "number" ? op.targetSlide : 0;
        if (slideIdx < 0 || slideIdx >= slideSpecs.length) {
          warnings.push(`modify-body: slide ${slideIdx} out of range`);
          continue;
        }
        const slide = slideSpecs[slideIdx];
        if (op.action === "add") {
          slide.body.push("[To be added by user]");
        } else if (op.action === "remove" && slide.body.length > 0) {
          slide.body.pop();
        } else if (op.action === "rewrite") {
          // Keep existing bullets but flag for regeneration
          warnings.push(`modify-body rewrite: slide ${slideIdx} body flagged for regeneration`);
        }
        break;
      }

      case "delete-slide": {
        const slideIdx = typeof op.targetSlide === "number" ? op.targetSlide : 0;
        if (slideIdx < 0 || slideIdx >= slideSpecs.length) {
          warnings.push(`delete-slide: slide ${slideIdx} out of range`);
          continue;
        }
        // Remove from both arrays
        slideSpecs.splice(slideIdx, 1);
        if (deckPlan.slides[slideIdx]) {
          deckPlan.slides.splice(slideIdx, 1);
        }
        // Re-index all remaining slides
        reindexSlides(deckPlan, slideSpecs);
        break;
      }

      case "add-slide": {
        const afterIdx = typeof op.afterSlide === "number" ? op.afterSlide : 0;
        const newSlideIdx = Math.min(afterIdx + 1, slideSpecs.length);
        const newSlide = {
          id: `slide-${String(newSlideIdx + 1).padStart(3, "0")}`,
          index: newSlideIdx + 1,
          section: deckPlan.sections[0]?.title || "General",
          role: op.role || "content",
          title: "[New Slide]",
          subtitle: "",
          keyMessage: "",
          body: [],
          visualType: "none",
          visualSpec: {},
          layout: "title-and-bullets",
          speakerNotes: "",
          sourceRefs: [],
          designHints: {},
        };
        slideSpecs.splice(newSlideIdx, 0, newSlide);
        // Add to deckPlan slides too
        const newPlanSlide = {
          slideId: newSlide.id,
          role: newSlide.role,
          objective: newSlide.keyMessage,
          keyMessage: newSlide.keyMessage,
          candidateVisual: newSlide.visualType,
          sourceRefs: [],
        };
        if (deckPlan.slides.length > 0) {
          deckPlan.slides.splice(newSlideIdx, 0, newPlanSlide);
        } else {
          deckPlan.slides.push(newPlanSlide);
        }
        reindexSlides(deckPlan, slideSpecs);
        break;
      }

      case "reorder-slides": {
        const fromIdx = op.fromIndex;
        let toIdx = op.toIndex;
        if (
          fromIdx < 0 ||
          fromIdx >= slideSpecs.length ||
          toIdx < 0 ||
          toIdx >= slideSpecs.length
        ) {
          warnings.push(`reorder: indices out of range (${fromIdx}, ${toIdx})`);
          continue;
        }
        // Adjust toIdx if it's after fromIdx (removal shifts indices)
        if (toIdx > fromIdx) toIdx -= 1;
        const [moved] = slideSpecs.splice(fromIdx, 1);
        slideSpecs.splice(toIdx, 0, moved);
        // Also reorder deckPlan slides
        if (deckPlan.slides[fromIdx]) {
          const [planMoved] = deckPlan.slides.splice(fromIdx, 1);
          deckPlan.slides.splice(toIdx, 0, planMoved);
        }
        // Update indices only (don't reassign IDs — preserves identity across reorder)
        for (let i = 0; i < slideSpecs.length; i++) {
          slideSpecs[i].index = i + 1;
        }
        if (deckPlan && deckPlan.slides) {
          for (let i = 0; i < deckPlan.slides.length; i++) {
            deckPlan.slides[i].slideId = `slide-${String(i + 1).padStart(3, "0")}`;
          }
        }
        break;
      }

      case "change-theme": {
        deckPlan._revisionTheme = op.newTheme;
        warnings.push(`change-theme: theme "${op.newTheme}" recorded in DeckPlan metadata`);
        break;
      }

      case "compress-count": {
        const target = Math.max(3, Math.min(op.targetCount, slideSpecs.length));
        while (slideSpecs.length > target) {
          slideSpecs.pop();
          if (deckPlan.slides.length > 0) deckPlan.slides.pop();
        }
        reindexSlides(deckPlan, slideSpecs);
        break;
      }

      case "expand-count": {
        const target = Math.max(slideSpecs.length, op.targetCount);
        while (slideSpecs.length < target) {
          const newIdx = slideSpecs.length;
          slideSpecs.push({
            id: `slide-${String(newIdx + 1).padStart(3, "0")}`,
            index: newIdx + 1,
            section: deckPlan.sections[0]?.title || "General",
            role: "content",
            title: "[Expanded Slide]",
            subtitle: "",
            keyMessage: "",
            body: [],
            visualType: "none",
            visualSpec: {},
            layout: "title-and-bullets",
            speakerNotes: "",
            sourceRefs: [],
            designHints: {},
          });
          if (deckPlan.slides.length > 0) {
            deckPlan.slides.push({
              slideId: `slide-${String(newIdx + 1).padStart(3, "0")}`,
              role: "content",
              objective: "",
              keyMessage: "",
              candidateVisual: "none",
              sourceRefs: [],
            });
          }
        }
        reindexSlides(deckPlan, slideSpecs);
        break;
      }

      case "add-notes": {
        const slideIdx = typeof op.targetSlide === "number" ? op.targetSlide : 0;
        if (slideIdx < 0 || slideIdx >= slideSpecs.length) {
          warnings.push(`add-notes: slide ${slideIdx} out of range`);
          continue;
        }
        if (
          !slideSpecs[slideIdx].speakerNotes ||
          slideSpecs[slideIdx].speakerNotes.trim().length < 10
        ) {
          slideSpecs[slideIdx].speakerNotes = `[Speaker notes for: ${slideSpecs[slideIdx].title}]`;
        }
        break;
      }

      case "change-audience": {
        deckPlan.audience = op.newAudience;
        break;
      }

      default:
        warnings.push(`Unknown operation: ${op.operation}`);
    }
  }

  return { warnings, success };
}

/**
 * Re-index slide IDs and indices after structural changes.
 */
function reindexSlides(deckPlan, slideSpecs) {
  for (let i = 0; i < slideSpecs.length; i++) {
    slideSpecs[i].id = `slide-${String(i + 1).padStart(3, "0")}`;
    slideSpecs[i].index = i + 1;
  }
  if (deckPlan && deckPlan.slides) {
    for (let i = 0; i < deckPlan.slides.length; i++) {
      deckPlan.slides[i].slideId = `slide-${String(i + 1).padStart(3, "0")}`;
    }
  }
}

/**
 * Main entry point: revise a deck using natural language.
 *
 * @param {string} instruction - Natural language revision instruction
 * @param {object} deckPlan - Current DeckPlan object
 * @param {Array} slideSpecs - Current SlideSpec[] array
 * @returns {object} Revision result with updated DeckPlan and SlideSpecs
 */
function reviseDeck(instruction, deckPlan, slideSpecs) {
  const result = { ...DEFAULT_REVISION_RESULT };
  result.slideCountBefore = slideSpecs.length;

  // Step 1: Parse instruction
  const ops = parseRevisionInstruction(instruction, deckPlan, slideSpecs);
  if (ops.length === 0) {
    result.warnings.push("No recognized revision operations in instruction");
    result.success = false;
    return result;
  }
  result.appliedOperations = ops.map((o) => o.operation);

  // Step 2: Apply operations
  const { warnings, success } = applyRevisions(deckPlan, slideSpecs, ops);
  result.warnings = [...warnings];
  result.success = success;
  result.deckPlan = deckPlan;
  result.slideSpecs = slideSpecs;
  result.slideCountAfter = slideSpecs.length;

  return result;
}

module.exports = {
  reviseDeck,
  parseRevisionInstruction,
  applyRevisions,
};
