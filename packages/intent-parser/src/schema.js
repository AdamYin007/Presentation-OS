/**
 * PresentationIntent schema helpers.
 *
 * The contract mirrors M12.0 Section 5 and provides a deterministic handoff
 * from user prompts and SourceDocumentModel inputs to downstream story planning.
 */

const DEFAULT_INTENT = {
  topic: "",
  audience: "",
  purpose: "inform",
  language: "zh-CN",
  targetSlideCount: 12,
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

const REQUIRED_FIELDS = Object.keys(DEFAULT_INTENT);

function createDefaultPresentationIntent(overrides = {}) {
  return {
    ...DEFAULT_INTENT,
    mustInclude: [...DEFAULT_INTENT.mustInclude],
    mustEmphasize: [...DEFAULT_INTENT.mustEmphasize],
    mustAvoid: [...DEFAULT_INTENT.mustAvoid],
    assumptions: [...DEFAULT_INTENT.assumptions],
    ...overrides,
  };
}

function validatePresentationIntent(intent) {
  const errors = [];

  if (typeof intent !== "object" || intent === null) {
    return { ok: false, errors: ["PresentationIntent must be an object"] };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in intent)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  const stringFields = ["topic", "audience", "purpose", "language", "tone", "style", "contentDensity", "visualPreference", "domain"];
  for (const field of stringFields) {
    if (field in intent && typeof intent[field] !== "string") {
      errors.push(`Field "${field}" must be a string`);
    }
  }

  for (const field of ["targetSlideCount", "durationMinutes"]) {
    if (field in intent && (!Number.isInteger(intent[field]) || intent[field] <= 0)) {
      errors.push(`Field "${field}" must be a positive integer`);
    }
  }

  if ("speakerNotes" in intent && typeof intent.speakerNotes !== "boolean") {
    errors.push('Field "speakerNotes" must be a boolean');
  }

  for (const field of ["mustInclude", "mustEmphasize", "mustAvoid", "assumptions"]) {
    if (field in intent && !Array.isArray(intent[field])) {
      errors.push(`Field "${field}" must be an array`);
    }
  }

  return { ok: errors.length === 0, errors };
}

module.exports = {
  DEFAULT_INTENT,
  REQUIRED_FIELDS,
  createDefaultPresentationIntent,
  validatePresentationIntent,
};
