/**
 * @awe/presentation-revision — Natural-Language Revision for Presentation OS (M12.9)
 */

const { reviseDeck, parseRevisionInstruction, applyRevisions } = require("./reviser.js");
const { REVISION_SCHEMA_VERSION, VALID_OPERATIONS, DEFAULT_REVISION_RESULT } = require("./schema.js");

module.exports = {
  reviseDeck,
  parseRevisionInstruction,
  applyRevisions,
  REVISION_SCHEMA_VERSION,
  VALID_OPERATIONS,
  DEFAULT_REVISION_RESULT,
};
