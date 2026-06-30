/**
 * Renderer Engine — dispatches slides to renderers.
 *
 * Responsibilities:
 * 1. Receive slide
 * 2. Determine if layout-engine is enabled
 * 3. Try layout adapter first
 * 4. Fallback to legacy renderer
 * 5. Return whether rendering succeeded
 *
 * This module owns ONLY dispatch logic. It does NOT contain
 * any rendering code. Rendering is provided via callbacks.
 */

const { dispatchAdapter } = require("../layout-adapters");

/**
 * Create a renderer dispatcher.
 *
 * @param {object} options
 * @param {boolean} options.useLayoutEngine - whether to use layout engine
 * @param {Array} options.layoutPlans - pre-compiled layout plans
 * @param {Function} options.legacyRenderer - function(slide) => void
 * @returns {Function} renderSlide function
 */
function createRendererEngine({ useLayoutEngine, layoutPlans, legacyRenderer }) {
  /**
   * Render a single slide.
   *
   * @param {object} slide - story slide object
   * @param {object} comp - components barrel
   * @param {object} pptx - pptxgen instance
   * @param {object} story - full story object
   * @returns {boolean} true if rendered successfully
   */
  function renderSlide(slide, comp, pptx, story) {
    // Step 1: Try layout adapter if enabled
    if (useLayoutEngine) {
      const lp = layoutPlans.find(p => p.slide.no === slide.no);
      if (lp && dispatchAdapter({ slide, comp, pptx, story, layoutPlan: lp.plan })) {
        return true;
      }
    }

    // Step 2: Fallback to legacy renderer
    if (typeof legacyRenderer === "function") {
      legacyRenderer(slide, comp, pptx, story);
      return true;
    }

    return false;
  }

  return renderSlide;
}

module.exports = { createRendererEngine };
