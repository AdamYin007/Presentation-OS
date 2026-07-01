/**
 * Roadmap — horizontal timeline with 4 stages.
 */

const { buildLayoutPlan, zone, ZONE_POSITIONS } = require("../schema");

function planRoadmap(slide, hero, _content) {
  const stages = [
    { label: "阶段一", title: "扫描阅片", body: "完成数字化入口", color: "blue" },
    { label: "阶段二", title: "平台协同", body: "打通流程与质控", color: "cyan" },
    { label: "阶段三", title: "AI 应用", body: "接入辅助诊断与科研", color: "green" },
    { label: "阶段四", title: "区域运营", body: "形成会诊与数据资产", color: "orange" },
  ];

  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: "horizontal",
    density: "moderate",
    zones: stages.map((s, i) => ({
      position: i === 0 ? ZONE_POSITIONS.LEFT_PANEL : i === 3 ? ZONE_POSITIONS.RIGHT_PANEL : ZONE_POSITIONS.CENTER,
      priority: i,
      span: "2.5x1.7",
      label: s.label,
      content: s,
    })),
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "timeline-stages",
    },
    constraints: {
      stageCount: stages.length,
      showArrows: true,
      connectorWidth: 2.5,
    },
  });
}

module.exports = { planSlide: planRoadmap };
