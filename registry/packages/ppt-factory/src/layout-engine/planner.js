/**
 * Layout Planner — dispatches to per-type planner modules.
 *
 * This file owns ONLY:
 *   1. Hero info extraction
 *   2. Planner registry (import + lookup)
 *   3. compileLayoutPlan() dispatcher
 *
 * It does NOT contain any slide-type implementation.
 * Each slide type lives in planners/{type}.js.
 */

const { compileContent } = require("../content-engine");
const { extractHeroInfo } = require("./hero");

// ── Planner registry ──────────────────────────────────────────
const planners = {
  cover: require("./planners/cover"),
  "executive-summary": require("./planners/executive"),
  workflow: require("./planners/workflow"),
  governance: require("./planners/governance"),
  research: require("./planners/research"),
  collaboration: require("./planners/collaboration"),
  roi: require("./planners/roi"),
  differentiation: require("./planners/differentiation"),
  recommendation: require("./planners/recommendation"),
  "why-now": require("./planners/why-now"),
  problem: require("./planners/problem"),
  roi: require("./planners/roi"),
  differentiation: require("./planners/differentiation"),
  transformation: require("./planners/transformation"),
  solution: require("./planners/solution"),
  architecture: require("./planners/architecture"),
  roadmap: require("./planners/roadmap"),
};

// ── Main dispatcher ──────────────────────────────────────────

/**
 * Compile a Layout Plan for a single slide.
 *
 * @param {object} slide - story slide object { no, type, title, message, hero? }
 * @param {object} [options] - future extensibility
 * @returns {object} validated Layout Plan
 */
function compileLayoutPlan(slide, options = {}) {
  const hero = extractHeroInfo(slide);
  const content = compileContent(slide);

  const plannerModule = planners[slide.type];
  if (plannerModule && plannerModule.planSlide) {
    return plannerModule.planSlide(slide, hero, content);
  }

  // Fallback to generic
  return require("./planners/generic").planSlide(slide, hero, content);
}

module.exports = { compileLayoutPlan };
