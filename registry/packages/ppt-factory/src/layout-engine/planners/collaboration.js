/**
 * Collaboration — regional network / hub + satellites.
 */

const { buildLayoutPlan, zone, ZONE_POSITIONS } = require("../schema");

function planCollaboration(slide, hero, _content) {
  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: "radial",
    density: "moderate",
    zones: [
      zone(ZONE_POSITIONS.CENTER, 0, "2.4x1.2", "区域病理中心"),
      zone(ZONE_POSITIONS.SATELLITE, 1, "2.2x0.7", "三甲医院"),
      zone(ZONE_POSITIONS.SATELLITE, 2, "2.2x0.7", "社区医院"),
      zone(ZONE_POSITIONS.SATELLITE, 3, "2.2x0.7", "县级医院"),
      zone(ZONE_POSITIONS.SATELLITE, 4, "2.2x0.7", "乡镇卫生院"),
    ],
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "central-hub",
      tertiary: "satellite-nodes",
    },
    constraints: {
      maxCards: 5,
      hubSize: { w: 2.4, h: 1.2 },
      satelliteCount: 4,
      hasConnectors: true,
    },
  });
}

module.exports = { planSlide: planCollaboration };
