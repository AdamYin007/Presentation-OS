/**
 * Differentiation — comparison matrix.
 */

const { buildLayoutPlan, zone, ZONE_POSITIONS } = require("../schema");

function planDifferentiation(slide, hero, _content) {
  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: "matrix",
    density: "dense",
    zones: [
      zone(ZONE_POSITIONS.TOP_BAR, 0, "全宽", "表头"),
      zone(ZONE_POSITIONS.LEFT_PANEL, 1, "3.5x0.75", "评估维度列"),
      zone(ZONE_POSITIONS.CENTER, 2, "3.5x0.75", "传统病理列"),
      zone(ZONE_POSITIONS.RIGHT_PANEL, 3, "3.5x0.75", "数字病理列"),
    ],
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "comparison-table",
      tertiary: "alternating-rows",
    },
    constraints: {
      maxCards: 0,
      tableColumns: 3,
      tableRows: 5,
      hasAlternatingBg: true,
      headerColors: ["navy", "gray", "blue"],
    },
  });
}

module.exports = { planSlide: planDifferentiation };
