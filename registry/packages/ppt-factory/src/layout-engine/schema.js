/**
 * Layout Engine Schema — type definitions for the layout plan.
 *
 * Pure data structures. No rendering, no I/O, no pptxgenjs dependency.
 */

const LAYOUT_CONSTRAINTS = {
  CANVAS_WIDTH_IN: 12.8,
  CANVAS_HEIGHT_IN: 7.5,
  SAFE_MARGIN_X_IN: 0.5,
  SAFE_MARGIN_Y_IN: 0.5,
  MIN_CARD_WIDTH_IN: 1.2,
  MIN_CARD_HEIGHT_IN: 0.6,
  MAX_TEXT_LINE_LENGTH: 60,
  MIN_FONT_SIZE_PX: 8,
};

const DENSITY_LEVELS = {
  SPARSE: "sparse",
  MODERATE: "moderate",
  DENSE: "dense",
};

const FLOW_TYPES = {
  LINEAR: "linear",
  GRID: "grid",
  PIPELINE: "pipeline",
  RADIAL: "radial",
  MATRIX: "matrix",
  TIMELINE: "timeline",
  CENTERED: "centered",
  QUADRANT: "quadrant",
  GENERIC: "generic",
};

const ZONE_POSITIONS = {
  TOP_BAR: "top-bar",
  LEFT_PANEL: "left-panel",
  RIGHT_PANEL: "right-panel",
  CENTER: "center",
  BOTTOM_BAR: "bottom-bar",
  QUADRANT_TL: "quadrant-tl",
  QUADRANT_TR: "quadrant-tr",
  QUADRANT_BL: "quadrant-bl",
  QUADRANT_BR: "quadrant-br",
  PIPELINE_LEFT: "pipeline-start",
  PIPELINE_RIGHT: "pipeline-end",
  SATELLITE: "satellite",
  HUB_CENTER: "hub-center",
};

/**
 * Build a canonical layout plan object.
 *
 * @param {object} params
 * @param {number} params.slideNo
 * @param {string} params.slideType
 * @param {string|null} params.patternId - from hero sequence, e.g. "H-001"
 * @param {string} params.flow - one of FLOW_TYPES
 * @param {string} params.density - one of DENSITY_LEVELS
 * @param {object[]} params.zones - zone descriptors
 * @param {object} params.visualHierarchy - title/body/accent ordering
 * @param {object} params.constraints - effective constraints for this slide
 * @returns {object} Validated Layout Plan
 */
function buildLayoutPlan({
  slideNo,
  slideType,
  patternId,
  flow,
  density,
  zones,
  visualHierarchy,
  constraints,
}) {
  // Validate flow
  const validFlows = Object.values(FLOW_TYPES);
  if (!validFlows.includes(flow)) {
    throw new Error(`Invalid flow type "${flow}". Must be one of: ${validFlows.join(", ")}`);
  }

  // Validate density
  const validDensities = Object.values(DENSITY_LEVELS);
  if (!validDensities.includes(density)) {
    throw new Error(`Invalid density "${density}". Must be one of: ${validDensities.join(", ")}`);
  }

  // Validate zones
  if (!Array.isArray(zones) || zones.length === 0) {
    throw new Error("Zones must be a non-empty array");
  }

  for (const z of zones) {
    if (!z.position || typeof z.priority !== "number") {
      throw new Error(`Zone missing required fields: ${JSON.stringify(z)}`);
    }
  }

  return {
    slide_no: slideNo,
    slide_type: slideType,
    pattern_id: patternId || null,
    flow,
    density,
    zones,
    visual_hierarchy: visualHierarchy,
    constraints: {
      ...LAYOUT_CONSTRAINTS,
      ...constraints,
    },
  };
}

module.exports = {
  LAYOUT_CONSTRAINTS,
  DENSITY_LEVELS,
  FLOW_TYPES,
  ZONE_POSITIONS,
  buildLayoutPlan,
};
