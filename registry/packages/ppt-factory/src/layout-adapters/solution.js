/**
 * Solution Layout Adapter — platform hub with satellite modules.
 *
 * Preserves the exact visual intent of the legacy renderer:
 *   center hub "数字病理\n软件平台" + 6 satellite modules
 *   rendered via comp.platformHub() component.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object
 * @param {object} params.layoutPlan - compiled layout plan
 * @returns {boolean} true on success
 */

function solutionAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  bg(s);

  comp.makeTitle(s, slide.title, slide.message);

  // Hardcoded modules matching legacy platformHubSlide() renderer
  const modules = [
    { label: "LIS", icon: "📋" },
    { label: "扫描仪", icon: "📷" },
    { label: "AI 模型", icon: "🧠" },
    { label: "数字阅片", icon: "🖥" },
    { label: "质控", icon: "✅" },
    { label: "归档/会诊", icon: "📁" },
  ];

  // Try to override with zone content from planner
  if (plan && plan.zones && plan.zones.length > 1) {
    for (let i = 0; i < modules.length && i < plan.zones.length - 1; i++) {
      const zone = plan.zones[i + 1]; // skip center hub (zone 0)
      if (zone && zone.content) {
        if (zone.content.label) modules[i].label = zone.content.label;
        if (zone.content.icon) modules[i].icon = zone.content.icon;
      }
    }
  }

  comp.platformHub(s, "数字病理\n软件平台", modules, pptx, { autoLayout: true, radius: 3.8 });

  comp.makeFooter(s, pptx, story, slide.no);
  return true;
}

module.exports = solutionAdapter;
