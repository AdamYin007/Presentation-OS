/**
 * Renderer Dispatcher — safe dispatch with logging and error handling.
 */

/**
 * Dispatch a slide to the appropriate renderer.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object
 * @param {object} params.adapter - dispatchAdapter function
 * @param {object} params.layoutPlan - pre-compiled layout plan (or null)
 * @param {Function} params.legacyRenderer - legacy renderer function
 * @returns {boolean} true if rendered successfully
 */
function dispatch({ slide, comp, pptx, story, adapter, layoutPlan, legacyRenderer }) {
  try {
    // Step 1: Try adapter
    if (adapter && layoutPlan) {
      const result = adapter({ slide, comp, pptx, story, layoutPlan });
      if (result) {
        return true;
      }
    }

    // Step 2: Fallback to legacy
    if (legacyRenderer) {
      legacyRenderer(slide, comp, pptx, story);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Failed to render slide ${slide.no} (${slide.type}):`, error.message);
    return false;
  }
}

module.exports = { dispatch };
