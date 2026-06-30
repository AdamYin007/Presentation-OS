/**
 * Executive Summary Layout Adapter — renders takeaway badge cards.
 *
 * Fully plan-driven. Reads card content from zone.content (provided by
 * Content Engine → Layout Engine). Zero business logic.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel (card, makeTitle, makeFooter, C)
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object (for audience/footer)
 * @param {object} params.layoutPlan - compiled layout plan from planner
 * @returns {boolean} true on success
 */

function executiveAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;

  // Get a fresh slide via the same helper as legacy renderers
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  bg(s);

  // ── Read layout plan ────────────────────────────────────────
  const { zones, constraints } = plan;
  const {
    cardWidthIn,
    cardHeightIn,
    maxCards,
    cardGapIn,
    CANVAS_WIDTH_IN,
  } = constraints;

  const CARD_W = cardWidthIn || 3.6;
  const CARD_H = cardHeightIn || 2.3;
  const CARD_COUNT = maxCards || zones.length || 3;
  const GAP = cardGapIn || 0.5;
  const TOTAL_W = CARD_COUNT * CARD_W + (CARD_COUNT - 1) * GAP;
  const START_X = ((CANVAS_WIDTH_IN || 12.8) - TOTAL_W) / 2;
  const START_Y = 2.05;

  // ── Card content from plan zones (pure plan-driven) ─────────
  const cards = [];
  for (let i = 0; i < CARD_COUNT; i++) {
    const zone = zones[i];
    if (zone && zone.content) {
      const c = zone.content;
      // Resolve color name to hex via comp.C, or use raw hex value
      const resolvedColor = comp.C[c.color] || c.color || comp.C.blue;
      cards.push({
        title: c.title,
        desc: c.body || c.desc,
        color: resolvedColor,
        badge: c.badge,
      });
    }
  }

  // If slide has hero data, use hero statement as title override
  const slideTitle = slide.hero?.statement || slide.title;

  // Title area
  comp.makeTitle(s, slideTitle, slide.message);

  // ── Render badge cards ──────────────────────────────────────
  cards.forEach((card, i) => {
    const x = START_X + i * (CARD_W + GAP);
    comp.card(s, x, START_Y, CARD_W, CARD_H, card.title, card.desc, card.color, pptx,
      { variant: "badge", badgeText: card.badge || String(i + 1).padStart(2, "0") });
  });

  // ── Footer ──────────────────────────────────────────────────
  comp.makeFooter(s, pptx, story, slide.no);

  return true;
}

module.exports = executiveAdapter;
