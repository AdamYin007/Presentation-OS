/**
 * SlideSpec schema definition and validation for M12.4.
 *
 * SlideSpec is the page-level core protocol — the only format that carries
 * enough information for theme/layout selection and PPTX rendering.
 */

const SLIDESPEC_SCHEMA_VERSION = "1.0.0";

const DEFAULT_SLIDESPEC = {
  id: "",
  index: 0,
  section: "",
  role: "content",
  title: "",
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

const REQUIRED_FIELDS = [
  "id",
  "index",
  "section",
  "role",
  "title",
  "keyMessage",
  "body",
  "visualType",
  "layout",
  "speakerNotes",
  "sourceRefs",
];

const VALID_ROLES = [
  "title",
  "agenda",
  "section-divider",
  "executive-summary",
  "content",
  "comparison",
  "process",
  "timeline",
  "roadmap",
  "data-chart",
  "table",
  "matrix",
  "architecture",
  "case-study",
  "recommendation",
  "quote",
  "q-and-a",
  "closing",
];

const VALID_VISUAL_TYPES = [
  "none",
  "image",
  "icon",
  "table",
  "bar-chart",
  "line-chart",
  "area-chart",
  "pie-chart",
  "scatter-chart",
  "timeline",
  "process",
  "roadmap",
  "matrix",
  "funnel",
  "pyramid",
  "architecture",
  "comparison",
  "metric-cards",
];

const VALID_LAYOUTS = [
  "title-slide",
  "agenda",
  "section-divider",
  "executive-summary",
  "title-and-bullets",
  "two-column",
  "three-card",
  "image-and-text",
  "comparison",
  "horizontal-process",
  "vertical-process",
  "timeline",
  "roadmap",
  "kpi-cards",
  "chart-and-insight",
  "full-width-chart",
  "table",
  "matrix",
  "architecture",
  "case-study",
  "recommendation",
  "quote",
  "q-and-a",
  "closing",
];

function createDefaultSlideSpec(overrides = {}) {
  return {
    ...DEFAULT_SLIDESPEC,
    body: [...DEFAULT_SLIDESPEC.body],
    sourceRefs: [...DEFAULT_SLIDESPEC.sourceRefs],
    visualSpec: { ...DEFAULT_SLIDESPEC.visualSpec },
    designHints: { ...DEFAULT_SLIDESPEC.designHints },
    ...overrides,
  };
}

function validateSlideSpec(spec) {
  const errors = [];

  if (typeof spec !== "object" || spec === null) {
    return { ok: false, errors: ["SlideSpec must be an object"] };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in spec)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Type checks
  if ("index" in spec && (!Number.isInteger(spec.index) || spec.index < 1)) {
    errors.push("Field 'index' must be a positive integer");
  }

  if ("role" in spec && !VALID_ROLES.includes(spec.role)) {
    errors.push(`Invalid role: "${spec.role}". Valid roles: ${VALID_ROLES.join(", ")}`);
  }

  if ("visualType" in spec && !VALID_VISUAL_TYPES.includes(spec.visualType)) {
    errors.push(`Invalid visualType: "${spec.visualType}"`);
  }

  if ("layout" in spec && !VALID_LAYOUTS.includes(spec.layout)) {
    errors.push(`Invalid layout: "${spec.layout}"`);
  }

  if ("body" in spec && !Array.isArray(spec.body)) {
    errors.push("'body' must be an array");
  } else if (Array.isArray(spec.body)) {
    for (let i = 0; i < spec.body.length; i++) {
      const item = spec.body[i];
      if (typeof item !== "string") {
        errors.push(`body[${i}] must be a string`);
      }
    }
  }

  if ("sourceRefs" in spec && !Array.isArray(spec.sourceRefs)) {
    errors.push("'sourceRefs' must be an array");
  }

  if ("visualSpec" in spec && typeof spec.visualSpec !== "object") {
    errors.push("'visualSpec' must be an object");
  }

  if ("designHints" in spec && typeof spec.designHints !== "object") {
    errors.push("'designHints' must be an object");
  }

  return { ok: errors.length === 0, errors };
}

module.exports = {
  SLIDESPEC_SCHEMA_VERSION,
  DEFAULT_SLIDESPEC,
  REQUIRED_FIELDS,
  VALID_ROLES,
  VALID_VISUAL_TYPES,
  VALID_LAYOUTS,
  createDefaultSlideSpec,
  validateSlideSpec,
};
