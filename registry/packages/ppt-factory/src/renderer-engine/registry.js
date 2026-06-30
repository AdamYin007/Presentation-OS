/**
 * Legacy Renderer Registry — maps slide types to legacy renderer functions.
 *
 * This registry centralizes all legacy renderers. When a slide type
 * is not handled by the layout adapter, it falls back to the corresponding
 * legacy renderer here.
 *
 * The legacy renderers are imported from run.js and registered here.
 */

// Legacy renderers will be registered by run.js
const legacyRenderers = {};

/**
 * Register a legacy renderer for a slide type.
 *
 * @param {string} type - slide type
 * @param {Function} fn - renderer function(slide) => void
 */
function registerLegacyRenderer(type, fn) {
  legacyRenderers[type] = fn;
}

/**
 * Get the legacy renderer for a slide type.
 *
 * @param {string} type - slide type
 * @returns {Function|null}
 */
function getLegacyRenderer(type) {
  return legacyRenderers[type] || null;
}

/**
 * Dispatch to legacy renderer or fallback.
 *
 * @param {object} slide - story slide object
 * @returns {boolean} true if rendered
 */
function dispatchLegacy(slide) {
  const renderer = legacyRenderers[slide.type];
  if (renderer) {
    renderer(slide);
    return true;
  }
  // Fallback to generic
  if (legacyRenderers["generic"]) {
    legacyRenderers["generic"](slide);
    return true;
  }
  return false;
}

module.exports = {
  registerLegacyRenderer,
  getLegacyRenderer,
  dispatchLegacy,
};
