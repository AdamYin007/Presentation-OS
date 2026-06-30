/**
 * Workflow Layout Adapter — renders the AI workflow pipeline slide.
 *
 * Derives layout from compileLayoutPlan output instead of hardcoding values.
 * Preserves the exact visual intent of the legacy renderer:
 *   5 horizontal icon cards with arrows + bottom insight bar.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel (card, makeTitle, makeFooter, C)
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object (for audience/footer)
 * @param {object} params.layoutPlan - compiled layout plan from planner
 * @returns {boolean} true on success
 */

function workflowAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;

  // Get a fresh slide via the same helper as legacy renderers
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  bg(s);

  // ── Read layout constraints from plan ──────────────────────
  const { cardWidthIn, cardHeightIn, hasArrows, hasBottomBar } = plan.constraints;
  const stepCount = plan.zones.filter(z => z.position === "pipeline-start" || z.label.startsWith("步骤")).length;
  const GAP = 0.15; // inches — matches legacy renderer
  const CARD_W = cardWidthIn || 2.0;
  const CARD_H = cardHeightIn || 1.3;
  const TOTAL_W = stepCount * CARD_W + (stepCount - 1) * GAP;
  const START_X = (12.8 - TOTAL_W) / 2;
  const START_Y = 2.2;

  // ── Render pipeline steps ──────────────────────────────────
  const steps = [
    { title: "数据接入", desc: "批量/实时切片导入", color: comp.C.blue },
    { title: "预处理", desc: "去噪、配准、归一化", color: comp.C.cyan },
    { title: "AI 推理", desc: "筛查、分割、分类", color: comp.C.green },
    { title: "医生复核", desc: "人机协同诊断决策", color: comp.C.orange },
    { title: "报告归档", desc: "结构化报告与质控", color: comp.C.navy },
  ];

  // If slide has hero data, use hero statement as title override
  const slideTitle = slide.hero?.statement || slide.title;

  // Title area (same as legacy)
  comp.makeTitle(s, slideTitle, slide.message);

  // Cards + arrows
  steps.forEach((st, i) => {
    const x = START_X + i * (CARD_W + GAP);
    comp.card(s, x, START_Y, CARD_W, CARD_H, st.title, st.desc, st.color, pptx,
      { variant: "icon", iconChar: "●" });

    // Arrow between cards
    if (hasArrows && i < stepCount - 1) {
      s.addShape(pptx.ShapeType.rightArrow, {
        x: x + CARD_W, y: START_Y + CARD_H / 2 - 0.075,
        w: GAP, h: 0.15,
        fill: { color: comp.C.border },
        line: { color: comp.C.border },
      });
    }
  });

  // ── Bottom insight bar ─────────────────────────────────────
  if (hasBottomBar) {
    const BAR_X = 0.7;
    const BAR_W = 11.4;
    const BAR_Y = 4.2;
    const BAR_H = 0.7;

    s.addShape(pptx.ShapeType.roundRect, {
      x: BAR_X, y: BAR_Y, w: BAR_W, h: BAR_H,
      rectRadius: 0.06,
      fill: { color: comp.C.lightBlue },
      line: { color: comp.C.blue, width: 1 },
    });

    s.addText(
      "AI 嵌入工作流，不替代医生决策 — 每步均可追溯、可审计、可优化。",
      {
        x: BAR_X + 0.2, y: BAR_Y + 0.1, w: BAR_W - 0.4, h: BAR_H - 0.2,
        fontSize: 12, color: comp.C.navy, margin: 0, bold: true,
      }
    );
  }

  // ── Footer ─────────────────────────────────────────────────
  comp.makeFooter(s, pptx, story, slide.no);

  return true;
}

module.exports = workflowAdapter;
