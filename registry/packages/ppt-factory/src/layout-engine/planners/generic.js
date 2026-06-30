/**
 * Generic fallback — 3-card badge layout.
 */

const { buildLayoutPlan, zone, ZONE_POSITIONS } = require("../schema");

function planGeneric(slide, hero, content) {
  const cards = content && content.cards
    ? content.cards
    : [
        { title: "核心价值", body: "围绕业务流程形成持续改进能力。", color: "blue", badge: "01" },
        { title: "平台能力", body: "连接数据、应用、AI 与治理体系。", color: "green", badge: "02" },
        { title: "长期演进", body: "支撑科研、教学、区域协同与智能化升级。", color: "orange", badge: "03" },
      ];

  const zones = cards.map((c, i) => ({
    position: [ZONE_POSITIONS.LEFT_PANEL, ZONE_POSITIONS.CENTER, ZONE_POSITIONS.RIGHT_PANEL][i],
    priority: i,
    span: "3.4x2.1",
    label: c.badge,
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
      primary: hero.statement || content.headline || slide.title,
      secondary: content.support || "three-cards",
    },
    constraints: {
      maxCards: cards.length,
      cardWidthIn: 3.4,
      cardHeightIn: 2.1,
      cardVariants: ["badge"],
    },
  });
}

module.exports = { planSlide: planGeneric };
