/**
 * @awe/slidespec — Public API (M12.4)
 *
 * Converts DeckPlan into SlideSpec[].
 */

const { generateSlideSpecs } = require("./generator.js");
const { validateSlideSpec, createDefaultSlideSpec } = require("./schema.js");

module.exports = {
  generateSlideSpecs,
  validateSlideSpec,
  createDefaultSlideSpec,
};
