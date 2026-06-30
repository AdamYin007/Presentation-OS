/**
 * Layout Adapters Index — barrel export for all layout adapters.
 *
 * Phase 1: workflow adapter only.
 * Each adapter receives { slide, comp, pptx, story, layoutPlan }
 * and returns void (mutates slide directly).
 */

const coverAdapter = require("./cover");
const executiveAdapter = require("./executive");
const workflowAdapter = require("./workflow");

/**
 * Dispatcher — routes a slide to the appropriate adapter.
 * Returns true if an adapter handled the slide, false if caller should use legacy renderer.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object
 * @param {object} params.layoutPlan - pre-compiled layout plan
 * @returns {boolean} true if adapted, false for legacy fallback
 */
function dispatchAdapter({ slide, comp, pptx, story, layoutPlan }) {
  switch (slide.type) {
    case "cover":
      return coverAdapter({ slide, comp, pptx, story, layoutPlan });
    case "executive-summary":
      return executiveAdapter({ slide, comp, pptx, story, layoutPlan });
    case "workflow":
      return workflowAdapter({ slide, comp, pptx, story, layoutPlan });
    // Future: case "governance": case "research": ...
    default:
      return false;
  }
}

module.exports = { dispatchAdapter };
