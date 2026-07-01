/**
 * Layout Adapters Registry — barrel export and dispatcher.
 *
 * Phase 1: workflow adapter only.
 * Each adapter receives { slide, comp, pptx, story, layoutPlan }
 * and returns void (mutates slide directly).
 *
 * Pattern:
 *   1. Import all adapters
 *   2. Register in ADAPTERS object
 *   3. dispatchAdapter() does lookup → execute → fallback
 */

const coverAdapter = require("./cover");
const executiveAdapter = require("./executive");
const workflowAdapter = require("./workflow");
const genericAdapter = require("./generic");
const recommendationAdapter = require("./recommendation");
const whyNowAdapter = require("./why-now");
const problemAdapter = require("./problem");
const governanceAdapter = require("./governance");
const researchAdapter = require("./research");
const collaborationAdapter = require("./collaboration");

/**
 * Adapter registry — slide type → adapter function.
 * Add new adapters here; dispatchAdapter handles the rest.
 */
const ADAPTERS = {
  cover: coverAdapter,
  "executive-summary": executiveAdapter,
  workflow: workflowAdapter,
  generic: genericAdapter,
  recommendation: recommendationAdapter,
  "why-now": whyNowAdapter,
  problem: problemAdapter,
  governance: governanceAdapter,
  research: researchAdapter,
  collaboration: collaborationAdapter,
};

/**
 * Dispatch a slide to the appropriate adapter.
 * Returns true if an adapter handled the slide, false for legacy fallback.
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
  const adapter = ADAPTERS[slide.type];
  if (adapter) {
    return adapter({ slide, comp, pptx, story, layoutPlan });
  }
  return false;
}

module.exports = { dispatchAdapter };
