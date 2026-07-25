/**
 * DeckPlan schema definition and validation for M12.3 Story Planner.
 *
 * DeckPlan is the deck-level planning contract that bridges PresentationIntent
 * and SlideSpec generation.
 */

const DECK_PLAN_SCHEMA_VERSION = "1.0.0";

const DEFAULT_DECK_PLAN = {
  schemaVersion: DECK_PLAN_SCHEMA_VERSION,
  deckTitle: "",
  subtitle: "",
  audience: "",
  purpose: "",
  language: "",
  narrativePattern: "",
  sections: [],
  slides: [],
  assumptions: [],
  warnings: [],
};

const REQUIRED_SECTION_FIELDS = [
  "id",
  "title",
  "purpose",
  "keyMessage",
  "slideAllocation",
  "sourceRefs",
];
const REQUIRED_SLIDE_FIELDS = [
  "slideId",
  "role",
  "objective",
  "keyMessage",
  "candidateVisual",
  "sourceRefs",
];

/**
 * Create a minimal DeckPlan skeleton with defaults.
 */
function createDefaultDeckPlan(overrides = {}) {
  return {
    ...DEFAULT_DECK_PLAN,
    sections: [...DEFAULT_DECK_PLAN.sections],
    slides: [...DEFAULT_DECK_PLAN.slides],
    assumptions: [...DEFAULT_DECK_PLAN.assumptions],
    warnings: [...DEFAULT_DECK_PLAN.warnings],
    ...overrides,
  };
}

/**
 * Validate a DeckPlan object against the schema.
 * Returns { ok: boolean, errors: string[] }.
 */
function validateDeckPlan(plan) {
  const errors = [];

  if (typeof plan !== "object" || plan === null) {
    return { ok: false, errors: ["DeckPlan must be an object"] };
  }

  // Top-level required fields
  const requiredTopFields = [
    "deckTitle",
    "audience",
    "purpose",
    "narrativePattern",
    "sections",
    "slides",
  ];
  for (const field of requiredTopFields) {
    if (!(field in plan)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Sections validation
  if (!Array.isArray(plan.sections)) {
    errors.push("sections must be an array");
  } else {
    for (let i = 0; i < plan.sections.length; i++) {
      const section = plan.sections[i];
      for (const f of REQUIRED_SECTION_FIELDS) {
        if (!(f in section)) {
          errors.push(`Section[${i}] missing required field: ${f}`);
        }
      }
      if (section.slideAllocation && typeof section.slideAllocation !== "number") {
        errors.push(`Section[${i}].slideAllocation must be a number`);
      }
      if (!Array.isArray(section.sourceRefs)) {
        errors.push(`Section[${i}].sourceRefs must be an array`);
      }
    }
  }

  // Slides validation
  if (!Array.isArray(plan.slides)) {
    errors.push("slides must be an array");
  } else {
    for (let i = 0; i < plan.slides.length; i++) {
      const slide = plan.slides[i];
      for (const f of REQUIRED_SLIDE_FIELDS) {
        if (!(f in slide)) {
          errors.push(`Slide[${i}] missing required field: ${f}`);
        }
      }
      if (!Array.isArray(slide.sourceRefs)) {
        errors.push(`Slide[${i}].sourceRefs must be an array`);
      }
    }
  }

  // Assumptions and warnings must be arrays if present
  for (const field of ["assumptions", "warnings"]) {
    if (field in plan && !Array.isArray(plan[field])) {
      errors.push(`${field} must be an array`);
    }
  }

  return { ok: errors.length === 0, errors };
}

module.exports = {
  DECK_PLAN_SCHEMA_VERSION,
  DEFAULT_DECK_PLAN,
  REQUIRED_SECTION_FIELDS,
  REQUIRED_SLIDE_FIELDS,
  createDefaultDeckPlan,
  validateDeckPlan,
};
