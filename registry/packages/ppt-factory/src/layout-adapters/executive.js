/**
 * Executive Summary Layout Adapter — renders takeaway badge cards.
 *
 * Fully plan-driven: card count, size, labels, positions, content all
 * derived from compileLayoutPlan output. fallbackTakeaways only activates
 * when plan zones lack semantic content.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel (card, makeTitle, makeFooter, C)
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object (for audience/footer)
 * @param {object} params.layoutPlan - compiled layout plan from planner
 * @returns {boolean} true on success
 */

function executiveAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;

  // Get a fresh slide via the same helper as legacy renderers
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);
  bg(s);

  // ── Read layout plan ────────────────────────────────────────
  const { zones, constraints } = plan;
  const {
    cardWidthIn,
    cardHeightIn,
    maxCards,
    badgeLabels,
    cardGapIn,
    CANVAS_WIDTH_IN,
  } = constraints;

  const CARD_W = cardWidthIn || 3.6;
  const CARD_H = cardHeightIn || 2.3;
  const CARD_COUNT = maxCards || zones.length || 3;
  const BADGE_LABELS = badgeLabels || ["01", "02", "03"];
  const GAP = cardGapIn || 0.5;
  const TOTAL_W = CARD_COUNT * CARD_W + (CARD_COUNT - 1) * GAP;
  const START_X = ((CANVAS_WIDTH_IN || 12.8) - TOTAL_W) / 2;
  const START_Y = 2.05;

  // ── Card content from plan zones ────────────────────────────
  // Primary path: read zone.content (title, desc, color, badge)
  const cards = [];
  for (let i = 0; i < CARD_COUNT; i++) {
    const zone = zones[i];
    if (zone && zone.content) {
      const c = zone.content;
      // Resolve color name to hex via comp.C, or use raw hex value
      const resolvedColor = comp.C[c.color] || c.color || comp.C.blue;
      cards.push({
        title: c.title,
        desc: c.desc,
        color: resolvedColor,
        badge: c.badge,
      });
    }
  }

  // Fallback: only when plan zones lack content
  const fallbackTakeaways = [
    { title: "不是设备采购", desc: "数字病理建设不能停留在扫描仪参数比较，而应转向平台能力建设。", color: comp.C.blue, badge: "01" },
    { title: "软件是中枢", desc: "平台连接 LIS、阅片、AI、质控、归档与会诊，决定长期价值。", color: comp.C.green, badge: "02" },
    { title: "AI 是增量能力", desc: "AI 嵌入诊断工作流，提升效率、质量、科研和区域协同能力。", color: comp.C.orange, badge: "03" },
  ];

  while (cards.length < CARD_COUNT) {
    const fb = fallbackTakeaways[cards.length] || fallbackTakeaways[fallbackTakeaways.length - 1];
    cards.push({
      title: fb.title,
      desc: fb.desc,
      color: fb.color,
      badge: BADGE_LABELS[cards.length] || fb.badge,
    });
  }

  // If slide has hero data, use hero statement as title override
  const slideTitle = slide.hero?.statement || slide.title;

  // Title area
  comp.makeTitle(s, slideTitle, slide.message);

  // ── Render badge cards ──────────────────────────────────────
  cards.forEach((card, i) => {
    const x = START_X + i * (CARD_W + GAP);
    comp.card(s, x, START_Y, CARD_W, CARD_H, card.title, card.desc, card.color, pptx,
      { variant: "badge", badgeText: card.badge || BADGE_LABELS[i] || String(i + 1).padStart(2, "0") });
  });

  // ── Footer ──────────────────────────────────────────────────
  comp.makeFooter(s, pptx, story, slide.no);

  return true;
}

module.exports = executiveAdapter;
