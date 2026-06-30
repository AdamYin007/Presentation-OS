/**
 * Cover slide — hero statement, minimal content.
 *
 * Layout Engine does NOT own business content. Content comes from Content Engine.
 */

const { buildLayoutPlan, ZONE_POSITIONS } = require("../schema");

function planCover(slide, hero, _content) {
  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: "centered",
    density: "sparse",
    zones: [
      { position: ZONE_POSITIONS.LEFT_PANEL, priority: 0, span: "brand", label: "品牌侧栏" },
      { position: ZONE_POSITIONS.CENTER, priority: 1, span: "hero-title", label: "主标语" },
      { position: ZONE_POSITIONS.RIGHT_PANEL, priority: 2, span: "subtitle", label: "副标题/说明" },
      { position: ZONE_POSITIONS.BOTTOM_BAR, priority: 3, span: "audience", label: "受众信息" },
    ],
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: slide.message,
      tertiary: "audience",
    },
    constraints: {
      maxCards: 0,
      emphasisStyle: "brand-bar",
    },
  });
}

module.exports = { planSlide: planCover };
