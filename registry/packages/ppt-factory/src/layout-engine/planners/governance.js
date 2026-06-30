/**
 * Governance — quadrant cycle layout.
 */

const { buildLayoutPlan, zone, ZONE_POSITIONS } = require("../schema");

function planGovernance(slide, hero, _content) {
  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: "quadrant",
    density: "moderate",
    zones: [
      zone(ZONE_POSITIONS.QUADRANT_TL, 0, "5.7x1.9", "标准制定"),
      zone(ZONE_POSITIONS.QUADRANT_TR, 1, "5.7x1.9", "过程监控"),
      zone(ZONE_POSITIONS.QUADRANT_BR, 2, "5.7x1.9", "异常处置"),
      zone(ZONE_POSITIONS.QUADRANT_BL, 3, "5.7x1.9", "持续改进"),
    ],
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "quadrant-cycle",
      tertiary: "cycle-arrows",
    },
    constraints: {
      maxCards: 4,
      cardWidthIn: 5.7,
      cardHeightIn: 1.9,
      hasCycleArrows: true,
      grid: "2x2",
    },
  });
}

module.exports = { planSlide: planGovernance };
