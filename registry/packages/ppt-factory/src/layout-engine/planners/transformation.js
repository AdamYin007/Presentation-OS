/**
 * Transformation Layout Planner — 3 stage cards with arrows.
 */

const { buildLayoutPlan, zone, ZONE_POSITIONS } = require("../schema");

function planTransformation(slide, hero, content) {
  const cards = [
    { title: "硬件数字化", body: "完成切片扫描与图像采集", icon: "📷" },
    { title: "平台流程化", body: "打通业务流程、质控与协同", icon: "⚙" },
    { title: "AI 智能化", body: "形成辅助诊断与数据资产能力", icon: "🧠" },
  ];

  const zones = cards.map((c, i) => ({
    position: i === 0 ? ZONE_POSITIONS.LEFT_PANEL : i === 1 ? ZONE_POSITIONS.CENTER : ZONE_POSITIONS.RIGHT_PANEL,
    priority: i,
    span: "3.1x2.0",
    label: c.title,
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
      primary: hero.statement || slide.title,
      secondary: "three-stage-cards",
    },
    constraints: {
      maxCards: cards.length,
      cardWidthIn: 3.1,
      cardHeightIn: 2.0,
      hasArrows: true,
    },
  });
}

module.exports = { planSlide: planTransformation };
