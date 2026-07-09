/**
 * PPTX Renderer Schema — M12.6
 *
 * Defines render options and output contract.
 */

const VALID_ROLES = [
  "title", "agenda", "section-divider", "executive-summary", "content",
  "comparison", "process", "timeline", "roadmap", "data-chart", "table",
  "matrix", "architecture", "case-study", "recommendation", "quote",
  "q-and-a", "closing",
];

const RENDER_OPTIONS_DEFAULTS = {
  fileName: "presentation",
  author: "AWE Presentation OS",
  company: "",
  subject: "",
  slideSize: { width: 13.33, height: 7.5 }, // 16:9 widescreen
  themeColor: "#3B82F6",
};

function validateRenderOptions(options) {
  const errors = [];
  if (options && typeof options === "object") {
    if (options.slideSize) {
      if (typeof options.slideSize.width !== "number" || typeof options.slideSize.height !== "number") {
        errors.push("slideSize must have numeric width and height");
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

module.exports = {
  VALID_ROLES,
  RENDER_OPTIONS_DEFAULTS,
  validateRenderOptions,
};
