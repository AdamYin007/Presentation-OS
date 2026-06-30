/**
 * Workflow — pipeline flow with arrows.
 */

const { buildLayoutPlan, zone, ZONE_POSITIONS } = require("../schema");

function planWorkflow(slide, hero, _content) {
  const stepCount = 5;
  const cardW = 2.0;
  const gap = 0.15;
  const totalW = stepCount * cardW + (stepCount - 1) * gap;
  const startX = (12.8 - totalW) / 2;

  const zones = Array.from({ length: stepCount }, (_, i) =>
    zone(
      ZONE_POSITIONS.PIPELINE_LEFT,
      i,
      (startX + i * (cardW + gap)).toFixed(2) + "-" + (startX + i * (cardW + gap) + cardW).toFixed(2),
      "步骤" + (i + 1)
    )
  ).concat([
    zone(ZONE_POSITIONS.BOTTOM_BAR, stepCount, "insight", "洞察栏"),
  ]);

  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: "pipeline",
    density: "moderate",
    zones,
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "pipeline-steps",
      tertiary: "insight-bar",
    },
    constraints: {
      maxCards: stepCount,
      cardWidthIn: cardW,
      cardHeightIn: 1.3,
      hasArrows: true,
      hasBottomBar: true,
    },
  });
}

module.exports = { planSlide: planWorkflow };
