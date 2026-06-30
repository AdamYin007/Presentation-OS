/**
 * Executive Summary — 3 takeaway badge cards (layout only).
 *
 * Layout Engine does NOT own business content. Content comes from Content Engine.
 */

const { buildLayoutPlan, ZONE_POSITIONS } = require("../schema");

function planExecutive(slide, hero, content) {
  const zones = content.cards.map((c, i) => ({
    position: [
      ZONE_POSITIONS.LEFT_PANEL,
      ZONE_POSITIONS.CENTER,
      ZONE_POSITIONS.RIGHT_PANEL,
    ][i],
    priority: i,
    span: "3.6x2.3",
    label: "takeaway-" + (i + 1),
    content: c,
  }));

  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: "linear",
    density: "moderate",
    zones,
    visualHierarchy: {
      primary: hero.statement || content.headline || slide.title,
      secondary: content.support || slide.message,
      tertiary: "three-takeaways",
    },
    constraints: {
      maxCards: content.cards.length,
      cardWidthIn: 3.6,
      cardHeightIn: 2.3,
      cardVariants: ["badge"],
      cardGapIn: 0.5,
      hasEmphasisBar: false,
    },
  });
}

module.exports = { planSlide: planExecutive };
