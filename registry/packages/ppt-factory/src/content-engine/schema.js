/**
 * Content Engine Schema — slide content data model.
 *
 * Pure data structures. No rendering, no I/O, no dependencies.
 * Content Engine outputs semantic content; Layout Engine consumes it for spatial planning.
 */

/**
 * Build a content card.
 *
 * @param {object} params
 * @param {string} params.badge — badge label, e.g. "01"
 * @param {string} params.title — card heading
 * @param {string} params.body — card description
 * @param {string} params.color — color key (matches comp.C keys) or hex value
 * @returns {object} Content card
 */
function contentCard({ badge, title, body, color }) {
  return { badge, title, body, color };
}

/**
 * Build a slide content object.
 *
 * @param {object} params
 * @param {number} params.slideNo
 * @param {string} params.type
 * @param {object[]} params.cards — content cards
 * @param {string} [params.headline] — optional hero-level headline
 * @param {string} [params.support] — optional supporting text
 * @returns {object} Validated slide content
 */
function buildSlideContent({ slideNo, type, cards, headline, support }) {
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error(`Slide content for ${type} must have at least one card`);
  }

  for (const card of cards) {
    if (!card.title || !card.body || !card.color || !card.badge) {
      throw new Error(`Card missing required fields: ${JSON.stringify(card)}`);
    }
  }

  return {
    slide_no: slideNo,
    type,
    cards,
    headline: headline || null,
    support: support || null,
  };
}

module.exports = {
  contentCard,
  buildSlideContent,
};
