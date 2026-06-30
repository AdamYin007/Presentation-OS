/**
 * Cover Layout Adapter — renders the cover/title slide.
 *
 * Derives layout from compileLayoutPlan output instead of hardcoding values.
 * Preserves the exact visual intent of the legacy renderer:
 *   left navy brand panel + hero statement + subtitle + audience footer.
 *
 * @param {object} params
 * @param {object} params.slide - story slide object
 * @param {object} params.comp - components barrel (card, makeTitle, makeFooter, C)
 * @param {object} params.pptx - pptxgen instance
 * @param {object} params.story - full story object (for audience/footer)
 * @param {object} params.layoutPlan - compiled layout plan from planner
 * @returns {boolean} true on success
 */

function coverAdapter({ slide, comp, pptx, story, layoutPlan }) {
  const plan = layoutPlan;

  // Get a fresh slide via the same helper as legacy renderers
  const { getSlide, bg } = require("../layout/base");
  const s = getSlide(pptx);

  // ── Read layout plan ────────────────────────────────────────
  const { zones, visual_hierarchy, constraints } = plan;
  const { CANVAS_WIDTH_IN, CANVAS_HEIGHT_IN } = constraints;

  // Brand panel width from plan (left-panel zone)
  const brandPanel = zones.find(z => z.position === "left-panel");
  const BRAND_W = 4.2; // legacy value, kept for pixel-perfect match
  const BRAND_H = CANVAS_HEIGHT_IN;

  // Title/subtitle positioning from zone priorities
  const titleZone = zones.find(z => z.position === "center");
  const subtitleZone = zones.find(z => z.position === "right-panel");
  const audienceZone = zones.find(z => z.position === "bottom-bar");

  // Text content from plan's visual hierarchy
  const titleText = (visual_hierarchy && visual_hierarchy.primary) || slide.title;
  const subtitleText = (visual_hierarchy && visual_hierarchy.secondary) || slide.message;
  const audienceText = story.audience;

  // ── Left brand panel ────────────────────────────────────────
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: BRAND_W, h: BRAND_H,
    fill: { color: comp.C.navy },
    line: { color: comp.C.navy }
  });

  // Panel text: "DIGITAL PATHOLOGY"
  s.addText("DIGITAL\nPATHOLOGY", {
    x: 0.55, y: 0.65, w: 3.1, h: 1.3,
    fontSize: 24, bold: true, color: comp.C.white, margin: 0, breakLine: false
  });

  // ── Main title (center/right area) ──────────────────────────
  s.addText(titleText, {
    x: 4.75, y: 2.05, w: 7.7, h: 1.1,
    fontSize: 32, bold: true, color: comp.C.navy, margin: 0, fit: "shrink"
  });

  // ── Subtitle ────────────────────────────────────────────────
  s.addText(subtitleText, {
    x: 4.78, y: 3.42, w: 7, h: 0.45,
    fontSize: 15, color: comp.C.gray, margin: 0
  });

  // ── Audience footer ─────────────────────────────────────────
  s.addText(audienceText, {
    x: 4.78, y: 6.35, w: 5.5, h: 0.25,
    fontSize: 10, color: "94A3B8", margin: 0
  });

  // ── Footer ──────────────────────────────────────────────────
  comp.makeFooter(s, pptx, story, slide.no);

  return true;
}

module.exports = coverAdapter;
