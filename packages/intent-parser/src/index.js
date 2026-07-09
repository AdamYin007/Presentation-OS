/**
 * @awe/intent-parser — Public API
 */

const { parsePresentationIntent } = require("./parser.js");
const {
  DEFAULT_INTENT,
  createDefaultPresentationIntent,
  validatePresentationIntent,
} = require("./schema.js");

module.exports = {
  parsePresentationIntent,
  createDefaultPresentationIntent,
  validatePresentationIntent,
  DEFAULT_INTENT,
};
