/**
 * Layout Engine Schema — constants and builders for layout planning.
 *
 * Pure data structures. No I/O, no dependencies.
 */

const FLOW_TYPES = {
  CENTERED: "centered",
  LINEAR: "linear",
  PIPELINE: "pipeline",
  QUADRANT: "quadrant",
  RADIAL: "radial",
  GRID: "grid",
  MATRIX: "matrix",
};

const DENSITY_LEVELS = {
  SPARSE: "sparse",
  MODERATE: "moderate",
  DENSE: "dense",
};

const ZONE_POSITIONS = {
  LEFT_PANEL: "left-panel",
  RIGHT_PANEL: "right-panel",
  CENTER: "center",
  TOP_BAR: "top-bar",
  BOTTOM_BAR: "bottom-bar",
  PIPELINE_LEFT: "pipeline-left",
  QUADRANT_TL: "quadrant-tl",
  QUADRANT_TR: "quadrant-tr",
  QUADRANT_BR: "quadrant-br",
  QUADRANT_BL: "quadrant-bl",
  HUB_CENTER: "hub-center",
  SATELLITE: "satellite",
};

/**
 * Build a simple zone descriptor.
 * @param {string} position
 * @param {number} priority
 * @param {string} span
 * @param {string} [label]
 * @returns {object}
 */
function zone(position, priority, span, label) {
  return { position, priority, span, label: label || position };
}

/**
 * Build a validated Layout Plan.
 * @param {object} params
 * @returns {object}
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
  if (!slideNo || !slideType || !flow || !density || !zones) {
    throw new Error(
      "buildLayoutPlan: slideNo, slideType, flow, density, zones are required"
    );
  }

  return {
    slide_no: slideNo,
    slide_type: slideType,
    pattern_id: patternId,
    flow,
    density,
    zones,
    visual_hierarchy: visualHierarchy,
    constraints,
  };
}

module.exports = {
  FLOW_TYPES,
  DENSITY_LEVELS,
  ZONE_POSITIONS,
  zone,
  buildLayoutPlan,
};
