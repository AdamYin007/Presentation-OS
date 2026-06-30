/**
 * Content Engine — compiles semantic content for each slide type.
 *
 * Pure function. Depends on nothing: no hero, no layout, no theme, no pptxgenjs.
 *
 * Usage:
 *   const content = compileContent(slide);
 *   // content = { slide_no, type, cards[], headline, support }
 *
 * Each card = { badge, title, body, color }
 *
 * Content Engine is consumed by Layout Engine (which attaches cards to zones).
 */

const { compileExecutiveContent } = require("./planners/executive");
const { compileGenericContent } = require("./planners/generic");

/**
 * Compile content for a single slide.
 *
 * @param {object} slide - story slide object { no, type, title, message }
 * @returns {object} validated slide content
 */
function compileContent(slide) {
  const planners = {
    "executive-summary": compileExecutiveContent,
  };

  const planner = planners[slide.type];
  if (planner) {
    return planner(slide);
  }

  return compileGenericContent(slide);
}

module.exports = { compileContent };
