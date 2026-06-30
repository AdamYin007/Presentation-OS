/**
 * ROI — value bridge / pillar cards.
 */

const { buildLayoutPlan, zone, ZONE_POSITIONS } = require("../schema");

function planRoi(slide, hero, _content) {
  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: "grid",
    density: "moderate",
    zones: [
      zone(ZONE_POSITIONS.LEFT_PANEL, 0, "2.6x2.0", "效率提升"),
      zone(ZONE_POSITIONS.LEFT_PANEL, 1, "2.6x2.0", "质量改善"),
      zone(ZONE_POSITIONS.RIGHT_PANEL, 2, "2.6x2.0", "协同扩展"),
      zone(ZONE_POSITIONS.RIGHT_PANEL, 3, "2.6x2.0", "科研赋能"),
      zone(ZONE_POSITIONS.BOTTOM_BAR, 4, "11.4x0.6", "总结栏"),
    ],
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "pillar-cards",
      tertiary: "summary-bar",
    },
    constraints: {
      maxCards: 4,
      cardWidthIn: 2.6,
      cardHeightIn: 2.0,
      hasSummaryBar: true,
      grid: "2x2",
    },
  });
}

module.exports = { planSlide: planRoi };
