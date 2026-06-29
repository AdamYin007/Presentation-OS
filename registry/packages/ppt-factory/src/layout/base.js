// Base layout helpers — slide creation and background
// Extracted from bin/run.js to enable independent testing and reuse

const comp = require("../../../../../components");

/**
 * Create a new slide and attach the pptx instance for component access.
 * @param {pptxgen} pptx
 * @returns {pptxgen.JsLibSlide}
 */
function getSlide(pptx) {
  const s = pptx.addSlide();
  s._pptx = pptx;
  return s;
}

/**
 * Set slide background color (defaults to white).
 * @param {pptxgen.JsLibSlide} slide
 * @param {string} [color] — hex color, falls back to white
 */
function bg(slide, color) {
  slide.background = { color: color || comp.C.white };
}

module.exports = { getSlide, bg };
