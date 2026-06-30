/**
 * Research — data flywheel / radial layout.
 */

const { buildLayoutPlan, zone, ZONE_POSITIONS } = require("../schema");

function planResearch(slide, hero, _content) {
  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: "radial",
    density: "moderate",
    zones: [
      zone(ZONE_POSITIONS.HUB_CENTER, 0, "2.8x2.0", "数据资产中心"),
      zone(ZONE_POSITIONS.SATELLITE, 1, "2.2x0.7", "数字切片"),
      zone(ZONE_POSITIONS.SATELLITE, 2, "2.2x0.7", "诊断标签"),
      zone(ZONE_POSITIONS.SATELLITE, 3, "2.2x0.7", "病例数据"),
      zone(ZONE_POSITIONS.SATELLITE, 4, "2.2x0.7", "标注集"),
    ],
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "center-hub",
      tertiary: "orbiting-cards",
    },
    constraints: {
      maxCards: 5,
      hubSize: { w: 2.8, h: 2.0 },
      satelliteCount: 4,
      hasConnectors: true,
    },
  });
}

module.exports = { planSlide: planResearch };
