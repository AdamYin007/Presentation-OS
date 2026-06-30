/**
 * Layout Planner — maps slide data to a pure JSON Layout Plan.
 *
 * Phase 1: schema + planner only. No rendering, no pptxgenjs.
 *
 * Input: a slide object from story JSON (with optional .hero from hero-engine)
 * Output: a validated Layout Plan object conforming to schema.js
 */

const { compileContent } = require("../content-engine");
const {
  buildLayoutPlan,
  FLOW_TYPES,
  DENSITY_LEVELS,
  ZONE_POSITIONS,
} = require("./schema");

// ── Hero pattern lookup ──────────────────────────────────────────

/**
 * Extract hero metadata from a slide.
 * @param {object} slide - story slide (may have .hero from hero-engine)
 * @returns {{ patternId: string|null, statement: string|null, visualFocus: string|null }}
 */
function extractHeroInfo(slide) {
  if (!slide.hero) {
    return { patternId: null, statement: null, visualFocus: null };
  }
  return {
    patternId: slide.hero.pattern_id || null,
    statement: slide.hero.statement || null,
    visualFocus: slide.hero.visual_focus || null,
  };
}

// ── Zone builders ────────────────────────────────────────────────

/**
 * Build a simple zone descriptor.
 */
function zone(position, priority, span, label) {
  return { position, priority, span, label: label || position };
}

// ── Per-type planners ────────────────────────────────────────────

/**
 * Cover — hero statement, minimal content
 */
function planCover(slide, hero, _content) {
  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: FLOW_TYPES.CENTERED,
    density: DENSITY_LEVELS.SPARSE,
    zones: [
      zone(ZONE_POSITIONS.LEFT_PANEL, 0, "brand", "品牌侧栏"),
      zone(ZONE_POSITIONS.CENTER, 1, "hero-title", "主标语"),
      zone(ZONE_POSITIONS.RIGHT_PANEL, 2, "subtitle", "副标题/说明"),
      zone(ZONE_POSITIONS.BOTTOM_BAR, 3, "audience", "受众信息"),
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

/**
 * Workflow — pipeline flow with arrows
 */
function planWorkflow(slide, hero, _content) {
  const stepCount = 5; // known from renderer
  const cardW = 2.0;
  const gap = 0.15;
  const totalW = stepCount * cardW + (stepCount - 1) * gap;
  const startX = (12.8 - totalW) / 2;

  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: FLOW_TYPES.PIPELINE,
    density: DENSITY_LEVELS.MODERATE,
    zones: Array.from({ length: stepCount }, (_, i) =>
      zone(ZONE_POSITIONS.PIPELINE_LEFT, i, `${startX + i * (cardW + gap)}-${startX + i * (cardW + gap) + cardW}`, `步骤${i + 1}`)
    ).concat([
      zone(ZONE_POSITIONS.BOTTOM_BAR, stepCount, "insight", "洞察栏"),
    ]),
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

/**
 * Governance — quadrant cycle layout
 */
function planGovernance(slide, hero, _content) {
  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: FLOW_TYPES.QUADRANT,
    density: DENSITY_LEVELS.MODERATE,
    zones: [
      zone(ZONE_POSITIONS.QUADRANT_TL, 0, "5.7x1.9", "标准制定"),
      zone(ZONE_POSITIONS.QUADRANT_TR, 1, "5.7x1.9", "过程监控"),
      zone(ZONE_POSITIONS.QUADRANT_BR, 2, "5.7x1.9", "异常处置"),
      zone(ZONE_POSITIONS.QUADRANT_BL, 3, "5.7x1.9", "持续改进"),
    ],
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "quadrant-cycle",
      tertiary: "cycle-arrows",
    },
    constraints: {
      maxCards: 4,
      cardWidthIn: 5.7,
      cardHeightIn: 1.9,
      hasCycleArrows: true,
      grid: "2x2",
    },
  });
}

/**
 * Research — data flywheel / radial layout
 */
function planResearch(slide, hero, _content) {
  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: FLOW_TYPES.RADIAL,
    density: DENSITY_LEVELS.MODERATE,
    zones: [
      zone(ZONE_POSITIONS.HUB_CENTER, 0, "2.8x2.0", "数据资产中心"),
      zone(ZONE_POSITIONS.SATELLITE, 1, "2.2x0.7", "数字切片"),
      zone(ZONE_POSITIONS.SATELLITE, 2, "2.2x0.7", "诊断标签"),
      zone(ZONE_POSITIONS.SATELLITE, 3, "2.2x0.7", "病例数据"),
      zone(ZONE_POSITIONS.SATELLITE, 4, "2.2x0.7", "标注集"),
    ],
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "center-hub",
      tertiary: "orbiting-cards",
    },
    constraints: {
      maxCards: 5,
      hubSize: { w: 2.8, h: 2.0 },
      satelliteCount: 4,
      hasConnectors: true,
    },
  });
}

/**
 * Collaboration — regional network / hub + satellites
 */
function planCollaboration(slide, hero, _content) {
  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: FLOW_TYPES.RADIAL,
    density: DENSITY_LEVELS.MODERATE,
    zones: [
      zone(ZONE_POSITIONS.CENTER, 0, "2.4x1.2", "区域病理中心"),
      zone(ZONE_POSITIONS.SATELLITE, 1, "2.2x0.7", "三甲医院"),
      zone(ZONE_POSITIONS.SATELLITE, 2, "2.2x0.7", "社区医院"),
      zone(ZONE_POSITIONS.SATELLITE, 3, "2.2x0.7", "县级医院"),
      zone(ZONE_POSITIONS.SATELLITE, 4, "2.2x0.7", "乡镇卫生院"),
    ],
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "central-hub",
      tertiary: "satellite-nodes",
    },
    constraints: {
      maxCards: 5,
      hubSize: { w: 2.4, h: 1.2 },
      satelliteCount: 4,
      hasConnectors: true,
    },
  });
}

/**
 * ROI — value bridge / pillar cards
 */
function planRoi(slide, hero, _content) {
  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: FLOW_TYPES.GRID,
    density: DENSITY_LEVELS.MODERATE,
    zones: [
      zone(ZONE_POSITIONS.LEFT_PANEL, 0, "2.6x2.0", "效率提升"),
      zone(ZONE_POSITIONS.LEFT_PANEL, 1, "2.6x2.0", "质量改善"),
      zone(ZONE_POSITIONS.RIGHT_PANEL, 2, "2.6x2.0", "协同扩展"),
      zone(ZONE_POSITIONS.RIGHT_PANEL, 3, "2.6x2.0", "科研赋能"),
      zone(ZONE_POSITIONS.BOTTOM_BAR, 4, "11.4x0.6", "总结栏"),
    ],
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "pillar-cards",
      tertiary: "summary-bar",
    },
    constraints: {
      maxCards: 4,
      cardWidthIn: 2.6,
      cardHeightIn: 2.0,
      hasSummaryBar: true,
      grid: "2x2",
    },
  });
}

/**
 * Differentiation — comparison matrix
 */
function planDifferentiation(slide, hero, _content) {
  const rowCount = 5; // known from renderer
  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: FLOW_TYPES.MATRIX,
    density: DENSITY_LEVELS.DENSE,
    zones: [
      zone(ZONE_POSITIONS.TOP_BAR, 0, "全宽", "表头"),
      zone(ZONE_POSITIONS.LEFT_PANEL, 1, "3.5x0.75", "评估维度列"),
      zone(ZONE_POSITIONS.CENTER, 2, "3.5x0.75", "传统病理列"),
      zone(ZONE_POSITIONS.RIGHT_PANEL, 3, "3.5x0.75", "数字病理列"),
    ],
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "comparison-table",
      tertiary: "alternating-rows",
    },
    constraints: {
      maxCards: 0,
      tableColumns: 3,
      tableRows: rowCount,
      hasAlternatingBg: true,
      headerColors: ["navy", "gray", "blue"],
    },
  });
}

/**
 * Recommendation — action cards with emphasis bar
 */
function planRecommendation(slide, hero, _content) {
  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: FLOW_TYPES.LINEAR,
    density: DENSITY_LEVELS.MODERATE,
    zones: [
      zone(ZONE_POSITIONS.LEFT_PANEL, 0, "3.6x3.2", "定位升级"),
      zone(ZONE_POSITIONS.CENTER, 1, "3.6x3.2", "分步实施"),
      zone(ZONE_POSITIONS.RIGHT_PANEL, 2, "3.6x3.2", "持续运营"),
      zone(ZONE_POSITIONS.BOTTOM_BAR, 3, "11.8x0.6", "强调栏"),
    ],
    visualHierarchy: {
      primary: hero.statement || slide.title,
      secondary: "action-cards",
      tertiary: "emphasis-bar",
    },
    constraints: {
      maxCards: 3,
      cardWidthIn: 3.6,
      cardHeightIn: 3.2,
      hasEmphasisBar: true,
      cardVariants: ["badge"],
    },
  });
}

/**
 * Executive Summary — 3 takeaway badge cards (layout only).
 *
 * Layout Engine does NOT own business content. Content comes from Content Engine.
 */
function planExecutive(slide, hero, content) {
  // Attach content cards to zones
  const zones = content.cards.map((c, i) => ({
    position: [ZONE_POSITIONS.LEFT_PANEL, ZONE_POSITIONS.CENTER, ZONE_POSITIONS.RIGHT_PANEL][i],
    priority: i,
    span: "3.6x2.3",
    label: "takeaway-" + (i + 1),
    content: c,
  }));

  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: FLOW_TYPES.LINEAR,
    density: DENSITY_LEVELS.MODERATE,
    zones: zones,
    visualHierarchy: {
      primary: hero.statement || content.headline || slide.title,
      secondary: content.support || slide.message,
      tertiary: "three-takeaways",
    },
    constraints: {
      maxCards: content.cards.length,
      cardWidthIn: 3.6,
      cardHeightIn: 2.3,
      cardVariants: ["badge"],
      cardGapIn: 0.5,
      hasEmphasisBar: false,
    },
  });
}

/**
 * Generic fallback — 3-card badge layout
 */
function planGeneric(slide, hero, content) {
  // Use content.cards if available, otherwise fall back to hardcoded
  const cards = content && content.cards ? content.cards : [
    { title: "核心价值", body: "围绕业务流程形成持续改进能力。", color: "blue", badge: "01" },
    { title: "平台能力", body: "连接数据、应用、AI 与治理体系。", color: "green", badge: "02" },
    { title: "长期演进", body: "支撑科研、教学、区域协同与智能化升级。", color: "orange", badge: "03" },
  ];

  return buildLayoutPlan({
    slideNo: slide.no,
    slideType: slide.type,
    patternId: hero.patternId,
    flow: FLOW_TYPES.LINEAR,
    density: DENSITY_LEVELS.MODERATE,
    zones: cards.map((c, i) => ({
      position: [ZONE_POSITIONS.LEFT_PANEL, ZONE_POSITIONS.CENTER, ZONE_POSITIONS.RIGHT_PANEL][i],
      priority: i,
      span: "3.4x2.1",
      label: c.badge,
      content: c,
    })),
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

// ── Main dispatcher ──────────────────────────────────────────────

/**
 * Compile a Layout Plan for a single slide.
 *
 * @param {object} slide - story slide object { no, type, title, message, hero? }
 * @param {object} [options] - future extensibility
 * @returns {object} validated Layout Plan
 */
function compileLayoutPlan(slide, options = {}) {
  const hero = extractHeroInfo(slide);
  const content = compileContent(slide);

  const planners = {
    cover: planCover,
    "executive-summary": planExecutive,
    workflow: planWorkflow,
    governance: planGovernance,
    research: planResearch,
    collaboration: planCollaboration,
    roi: planRoi,
    differentiation: planDifferentiation,
    recommendation: planRecommendation,
  };

  const planner = planners[slide.type];
  if (planner) {
    return planner(slide, hero, content);
  }

  // Fallback to generic
  return planGeneric(slide, hero, content);
}

module.exports = { compileLayoutPlan };
