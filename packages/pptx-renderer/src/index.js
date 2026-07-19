/**
 * @awe/pptx-renderer — Public API (M12.6 / M12.21)
 */
const { renderPptx, generateBuffer } = require("./renderer.js");
const { RENDER_OPTIONS_DEFAULTS, validateRenderOptions } = require("./schema.js");

module.exports = {
  renderPptx,
  generateBuffer,
  RENDER_OPTIONS_DEFAULTS,
  validateRenderOptions,
};
