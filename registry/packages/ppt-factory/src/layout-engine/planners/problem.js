/**
 * Problem Layout Planner — 2x2 icon cards grid.
 */

const { buildLayoutPlan, zone, ZONE_POSITIONS } = require("../schema");

function planProblem(slide, hero, content) {
  const cards = content && content.cards
    ? content.cards
    : [
        { title: "效率瓶颈", body: "玻片流转、人工阅片和报告周期压力增加", color: "blue", badge: "⏱" },
        { title: "质控瓶颈", body: "过程记录分散，复核和追溯成本高", color: "orange", badge: "⚠" },
        { title: "协同瓶颈", body: "远程会诊、区域病理和多院区协同困难", color: "blue", badge: "🔗" },
        { title: "数据瓶颈", body: "切片、诊断和科研数据难以沉淀复用", color: "orange", badge: "📊" },
      ];

  const zones = cards.map((c, i) => {
    const row = i < 2 ? 0 : 1;
    const col = i % 2;
    return {
      position: col === 0 ? ZONE_POSITIONS.LEFT_PANEL : ZONE_POSITIONS.RIGHT_PANEL,
      priority: i,
      span: "5.1x1.55",
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
      primary: hero.statement || content.headline || slide.title,
      secondary: "two-by-two-grid",
    },
    constraints: {
      maxCards: cards.length,
      cardWidthIn: 5.1,
      cardHeightIn: 1.55,
      gridRows: 2,
      gridCols: 2,
      startXIn: 1.1,
      startYIn: 1.75,
      cardVariants: ["icon"],
    },
  });
}

module.exports = { planSlide: planProblem };
