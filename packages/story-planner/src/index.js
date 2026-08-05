/**
 * @awe/story-planner — Public API (M12.3)
 *
 * Thin, domain-agnostic Story Planner that selects narrative patterns and
 * generates DeckPlan from PresentationIntent + optional SourceDocumentModel.
 */

const { planDeck, generateOutlinePreview } = require("./planner.js");

module.exports = {
  planDeck,
  generateOutlinePreview,
};
