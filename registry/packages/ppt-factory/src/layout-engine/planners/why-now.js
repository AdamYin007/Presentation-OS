/**
 * Why-Now Layout Planner — 4 icon cards in a row.
 *
 * Content is hardcoded here because the Content Engine
 * does not have a dedicated why-now planner.
 */

const { buildLayoutPlan, ZONE_POSITIONS } = require("../schema");

function planWhyNow(slide, hero, content) {
  // Hardcoded content matching legacy whyNow() renderer
  const cards = [
    { title: "诊断需求增长", body: "肿瘤诊疗增长推动病理需求持续上升。", color: "blue", badge: "▲" },
    { title: "病理医生稀缺", body: "优质病理资源分布不均，基层能力不足。", color: "green", badge: "👤" },
    { title: "AI 技术成熟", body: "AI 已从算法演示进入工作流整合阶段。", color: "orange", badge: "◆" },
    { title: "区域协同需求", body: "医联体和远程会诊需要统一数字底座。", color: "red", badge: "◎" },
  ];

  const zones = cards.map((c, i) => {
    const positions = [
      ZONE_POSITIONS.LEFT_PANEL,
      ZONE_POSITIONS.CENTER,
      ZONE_POSITIONS.RIGHT_PANEL,
      ZONE_POSITIONS.RIGHT_PANEL,
    ];
    return {
      position: positions[i],
      priority: i,
      span: "2.55x2.4",
      label: c.badge,
      content: c,
    };
  });

  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: "linear",
    density: "moderate",
    zones,
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "four-icon-cards",
    },
    constraints: {
      maxCards: cards.length,
      cardWidthIn: 2.55,
      cardHeightIn: 2.4,
      cardGapIn: 0.45,
      startXIn: 0.8,
      startYIn: 2.05,
      cardVariants: ["icon"],
    },
  });
}

module.exports = { planSlide: planWhyNow };
