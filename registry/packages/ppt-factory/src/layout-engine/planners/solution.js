/**
 * Solution Layout Planner — platform hub with satellite modules.
 */

const { buildLayoutPlan, zone, ZONE_POSITIONS } = require("../schema");

function planSolution(slide, hero, content) {
  const modules = [
    { label: "LIS", icon: "📋" },
    { label: "扫描仪", icon: "📷" },
    { label: "AI 模型", icon: "🧠" },
    { label: "数字阅片", icon: "🖥" },
    { label: "质控", icon: "✅" },
    { label: "归档/会诊", icon: "📁" },
  ];

  const zones = [
    {
      position: ZONE_POSITIONS.CENTER,
      priority: 0,
      span: "center-hub",
      label: "数字病理软件平台",
      content: { title: "数字病理\n软件平台" },
    },
  ].concat(modules.map((m, i) => ({
    position: ZONE_POSITIONS.SATELLITE,
    priority: i + 1,
    span: "auto",
    label: m.label,
    content: m,
  })));

  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: "radial",
    density: "moderate",
    zones,
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "platform-hub",
    },
    constraints: {
      hubSize: { w: 2.8, h: 2.0 },
      satelliteCount: modules.length,
      autoLayout: true,
      radius: 3.8,
    },
  });
}

module.exports = { planSlide: planSolution };
