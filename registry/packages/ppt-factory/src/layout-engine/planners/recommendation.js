/**
 * Recommendation — action cards with emphasis bar.
 */

const { buildLayoutPlan, zone, ZONE_POSITIONS } = require("../schema");

function planRecommendation(slide, hero, _content) {
  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: "linear",
    density: "moderate",
    zones: [
      zone(ZONE_POSITIONS.LEFT_PANEL, 0, "3.6x3.2", "定位升级"),
      zone(ZONE_POSITIONS.CENTER, 1, "3.6x3.2", "分步实施"),
      zone(ZONE_POSITIONS.RIGHT_PANEL, 2, "3.6x3.2", "持续运营"),
      zone(ZONE_POSITIONS.BOTTOM_BAR, 3, "11.8x0.6", "强调栏"),
    ],
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "action-cards",
      tertiary: "emphasis-bar",
    },
    constraints: {
      maxCards: 3,
      cardWidthIn: 3.6,
      cardHeightIn: 3.2,
      hasEmphasisBar: true,
      cardVariants: ["badge"],
    },
  });
}

module.exports = { planSlide: planRecommendation };
