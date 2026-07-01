/**
 * Architecture — layered architecture diagram.
 */

const { buildLayoutPlan, zone, ZONE_POSITIONS } = require("../schema");

function planArchitecture(slide, hero, _content) {
  const layers = [
    { name: "应用层", desc: "阅片、AI、会诊、科研、教学", color: "blue", sideLabel: "V" },
    { name: "平台层", desc: "流程编排、质控、权限、日志、接口", color: "lightBlue", sideLabel: "IV" },
    { name: "数据层", desc: "切片、病例、诊断、标注、模型结果", color: "lightBlue", sideLabel: "III" },
    { name: "连接层", desc: "LIS、扫描仪、存储、AI、院内系统", color: "lightBlue", sideLabel: "I" },
  ];

  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: "stacked",
    density: "moderate",
    zones: layers.map((l, i) => ({
      position: i === 0 ? ZONE_POSITIONS.TOP_BAR : ZONE_POSITIONS.CENTER,
      priority: i,
      span: "full-width",
      label: l.name,
      content: l,
    })),
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "layered-architecture",
    },
    constraints: {
      layerCount: layers.length,
      sidePanel: true,
      showArrows: true,
    },
  });
}

module.exports = { planSlide: planArchitecture };
