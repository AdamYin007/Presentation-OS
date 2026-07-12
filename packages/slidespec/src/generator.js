/**
 * SlideSpec Generator — M12.4
 *
 * Converts a DeckPlan into an array of SlideSpec objects.
 * Deterministic mapping from slide planning entries to page-level contracts.
 * No PPTX rendering, no theme/layout engine — just the contract.
 */

"use strict";

const {
  createDefaultSlideSpec,
  validateSlideSpec,
  VALID_LAYOUTS,
} = require("./schema.js");

/**
 * Map DeckPlan slide roles to SlideSpec layout families.
 * Uses a small set of MVP layouts: title-slide, section-divider,
 * title-and-bullets, two-column, table, comparison, process, roadmap,
 * data-chart, closing, agenda, executive-summary.
 */
const ROLE_TO_LAYOUT = {
  "title": "title-slide",
  "agenda": "agenda",
  "section-divider": "section-divider",
  "executive-summary": "executive-summary",
  "content": "title-and-bullets",
  "comparison": "comparison",
  "process": "horizontal-process",
  "timeline": "timeline",
  "roadmap": "roadmap",
  "data-chart": "chart-and-insight",
  "table": "table",
  "matrix": "matrix",
  "architecture": "title-and-bullets",
  "case-study": "two-column",
  "recommendation": "title-and-bullets",
  "quote": "title-and-bullets",
  "q-and-a": "title-and-bullets",
  "closing": "closing",
};

/**
 * Generate SlideSpec[] from a DeckPlan.
 * Each DeckPlan slide entry becomes one SlideSpec with body content,
 * speaker notes, sourceRefs, and layout selection.
 */
function generateSlideSpecs(deckPlan) {
  const specs = [];

  for (const slidePlan of deckPlan.slides) {
    const spec = mapDeckPlanToSlideSpec(slidePlan, deckPlan);
    specs.push(spec);
  }

  // Validate all generated specs
  for (const spec of specs) {
    const validation = validateSlideSpec(spec);
    if (!validation.ok) {
      // Don't throw — record as a warning in the first spec
      if (specs.length > 0) {
        specs[0].designHints = specs[0].designHints || {};
        specs[0].designHints._validationWarnings = specs[0].designHints._validationWarnings || [];
        specs[0].designHints._validationWarnings.push(`Slide ${spec.id}: ${validation.errors.join("; ")}`);
      }
    }
  }

  return specs;
}

/**
 * Map a single DeckPlan slide entry to a SlideSpec object.
 */
function mapDeckPlanToSlideSpec(slidePlan, deckPlan) {
  const role = slidePlan.role || "content";
  const sectionTitle = slidePlan.section || "";
  const layout = ROLE_TO_LAYOUT[role] || "title-and-bullets";

  // Generate title based on role
  let title = generateTitle(role, slidePlan, sectionTitle, deckPlan);

  // Generate body content from keyMessage and source data
  const body = generateBody(role, slidePlan, deckPlan);

  // Generate speaker notes
  const speakerNotes = generateSpeakerNotes(role, slidePlan, deckPlan, sectionTitle);

  // Map candidateVisual to visualType
  const visualType = mapVisualType(slidePlan.candidateVisual, role);

  // Build sourceRefs from DeckPlan slide
  const sourceRefs = (slidePlan.sourceRefs || []).map((ref) => ({
    sourceId: ref.sourceId || "",
    sourceType: ref.sourceType || "paragraph",
    fileReference: ref.fileReference || "",
  }));

  // Design hints for downstream renderer
  const designHints = {
    density: inferDensity(role, body),
    emphasis: inferEmphasis(role, slidePlan.keyMessage),
    sectionColorHint: sectionTitle,
  };

  return createDefaultSlideSpec({
    id: slidePlan.slideId,
    index: slidePlan.index,
    section: sectionTitle,
    role,
    title,
    subtitle: "",
    keyMessage: slidePlan.keyMessage || "",
    body,
    visualType,
    visualSpec: generateVisualSpec(visualType, role, slidePlan),
    layout,
    speakerNotes,
    sourceRefs,
    designHints,
  });
}

/**
 * Generate a slide title from the DeckPlan entry.
 */
function generateTitle(role, slidePlan, sectionTitle, deckPlan) {
  if (role === "title") {
    return deckPlan.deckTitle || "Untitled";
  }

  if (role === "section-divider") {
    return sectionTitle;
  }

  if (role === "closing") {
    return "Thank You";
  }

  if (role === "agenda") {
    return "Agenda";
  }

  // For content slides, use keyMessage as title when it's concise
  const km = (slidePlan.keyMessage || "").trim();
  if (km && km.length < 60) {
    return km;
  }

  // Fallback: section + part number
  const partNum = getPartNumber(slidePlan);
  return `${sectionTitle}${partNum ? ` — Part ${partNum}` : ""}`;
}

function getPartNumber(slidePlan) {
  const idx = slidePlan.index || 1;
  // Simple heuristic: if index is a multiple of section allocation, it's a new part
  // For MVP, just return the slide index as a simple identifier
  return idx;
}

/**
 * Generate body content items for a slide.
 * Uses keyMessage and source data to produce 1-5 bullet points.
 */
function generateBody(role, slidePlan, deckPlan) {
  // Section dividers and special roles have empty body
  if (role === "section-divider" || role === "title" || role === "closing") {
    return [];
  }

  const body = [];
  const keyMsg = slidePlan.keyMessage || "";

  // Try to get source paragraph text from deckPlan sections
  if (deckPlan.sections && slidePlan.sourceRefs && slidePlan.sourceRefs.length > 0) {
    const section = deckPlan.sections.find((s) => s.title === slidePlan.section);
    if (section && section.sourceParagraphs && section.sourceParagraphs.length > 0) {
      // Distribute paragraphs across slides in this section by position
      const sectionSlides = deckPlan.slides.filter(
        (s) => s.section === slidePlan.section && s.role !== "section-divider"
      );
      const slideLocalIdx = sectionSlides.findIndex((s) => s.index === slidePlan.index);
      const totalSourcePara = section.sourceParagraphs.length;
      
      if (totalSourcePara > 0) {
        // Round-robin: each slide gets paragraphs at its local index offset
        for (let i = slideLocalIdx; i < totalSourcePara; i += sectionSlides.length) {
          const para = section.sourceParagraphs[i];
          if (para && para.originalText) {
            const bullet = para.originalText.trim();
            body.push(bullet.length > 120 ? bullet.slice(0, 117) + "..." : bullet);
          }
        }
      }
    }
  }

  // Fallback: if no source paragraphs found, use keyMessage
  // But never push a body item identical to the title
  if (body.length === 0 && keyMsg) {
    const trimmedTitle = (slidePlan.title || "").trim();
    if (keyMsg.trim() !== trimmedTitle) {
      body.push(keyMsg);
    } else {
      // Title and keyMessage are the same — generate a generic insight instead
      body.push("Key insight from analysis");
    }
  }

  // Last resort fallback
  if (body.length === 0) {
    body.push("Key insight from analysis");
  }

  return body;
}

function generateBodyPoint(index, role, deckPlan) {
  const templates = {
    "data-chart": ["Data point analysis", "Trend observation", "Statistical finding"],
    "comparison": ["Alternative A perspective", "Alternative B perspective", "Trade-off analysis"],
    "process": ["Step one: preparation", "Step two: execution", "Step three: validation"],
    "roadmap": ["Phase 1: Foundation", "Phase 2: Expansion", "Phase 3: Optimization"],
    "executive-summary": ["Bottom line summary", "Key recommendation", "Expected impact"],
    "content": ["Supporting detail", "Evidence point", "Contextual note"],
  };

  const pool = templates[role] || templates["content"];
  return pool[index % pool.length];
}

/**
 * Generate speaker notes for a slide.
 */
function generateSpeakerNotes(role, slidePlan, deckPlan, sectionTitle) {
  if (role === "section-divider" || role === "title" || role === "closing") {
    return "";
  }

  const notes = [];

  // Page purpose
  notes.push(`Purpose: ${slidePlan.objective || slidePlan.keyMessage}`);

  // Key argument
  if (slidePlan.keyMessage) {
    notes.push(`Key argument: ${slidePlan.keyMessage}`);
  }

  // Transition
  const nextSlide = findNextSlide(slidePlan, deckPlan);
  if (nextSlide) {
    notes.push(`Transition: Next slide covers ${nextSlide.keyMessage}`);
  }

  // Suggested duration
  const totalSlides = deckPlan.slides.length;
  const durationPerSlide = totalSlides > 0 ? Math.floor(60 / totalSlides) : 5;
  notes.push(`Suggested duration: ~${durationPerSlide}s`);

  return notes.join("\n");
}

function findNextSlide(currentSlide, deckPlan) {
  const idx = currentSlide.index || 0;
  const next = deckPlan.slides.find((s) => s.index === idx + 1);
  return next || null;
}

/**
 * Map candidateVisual to standard visualType.
 */
function mapVisualType(candidate, role) {
  if (!candidate || candidate === "none") {
    // Determine visual type from role
    const roleVisualMap = {
      "data-chart": "bar-chart",
      "comparison": "comparison",
      "process": "process",
      "roadmap": "timeline",
      "case-study": "image",
      "table": "table",
      "matrix": "matrix",
    };
    return roleVisualMap[role] || "none";
  }
  return candidate;
}

/**
 * Generate visualSpec based on visualType and role.
 */
function generateVisualSpec(visualType, role, slidePlan) {
  if (visualType === "none") return {};

  const spec = {};

  if (["bar-chart", "line-chart", "area-chart", "pie-chart", "scatter-chart"].includes(visualType)) {
    spec.type = visualType;
    spec.hasDataLabel = true;
    spec.hasLegend = true;
  }

  if (visualType === "table") {
    spec.columns = 2;
    spec.rows = Math.max(3, (slidePlan.sourceRefs || []).length + 1);
  }

  if (visualType === "process" || visualType === "timeline" || visualType === "roadmap") {
    spec.steps = [1, 2, 3];
    spec.direction = "horizontal";
  }

  if (visualType === "comparison") {
    spec.columns = 2;
    spec.hasHeader = true;
  }

  return spec;
}

/**
 * Infer content density from body items.
 */
function inferDensity(role, body) {
  if (role === "section-divider" || role === "title") return "sparse";
  if (body.length <= 1) return "sparse";
  if (body.length <= 3) return "medium";
  return "dense";
}

/**
 * Infer emphasis level from key message.
 */
function inferEmphasis(role, keyMessage) {
  if (role === "executive-summary" || role === "recommendation") return "high";
  if (role === "data-chart" || role === "table") return "medium";
  return "low";
}

module.exports = {
  generateSlideSpecs,
  ROLE_TO_LAYOUT,
};
