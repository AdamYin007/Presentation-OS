/**
 * Governance — quadrant cycle layout.
 *
 * Content is hardcoded to match the legacy renderer exactly.
 * The Content Engine does not have a dedicated governance planner,
 * so we cannot rely on compileContent() output.
 */

const { buildLayoutPlan, ZONE_POSITIONS } = require("../schema");

function planGovernance(slide, hero, content) {
  const cards = [
    { title: "标准制定", desc: "CAP/ISO 15189 合规基线", color: "blue" },
    { title: "过程监控", desc: "全流程质控指标实时采集", color: "cyan" },
    { title: "异常处置", desc: "偏差检测、告警与闭环整改", color: "orange" },
    { title: "持续改进", desc: "PDCA 循环驱动质量螺旋上升", color: "green" },
  ];

  const positions = [
    ZONE_POSITIONS.QUADRANT_TL,
    ZONE_POSITIONS.QUADRANT_TR,
    ZONE_POSITIONS.QUADRANT_BR,
    ZONE_POSITIONS.QUADRANT_BL,
  ];

  const zones = cards.map((c, i) => ({
    position: positions[i],
    priority: i,
    span: "5.7x1.9",
    label: c.title,
    content: c,
  }));

  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: "quadrant",
    density: "moderate",
    zones,
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "quadrant-cycle",
    },
    constraints: {
      maxCards: cards.length,
      cardWidthIn: 5.7,
      cardHeightIn: 1.9,
      hasCycleArrows: true,
      grid: "2x2",
    },
  });
}

module.exports = { planSlide: planGovernance };
