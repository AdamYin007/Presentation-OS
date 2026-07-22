/**
 * @awe/audience-engine — Schema & Constants (M12.25)
 *
 * Defines audience roles, speaker profiles, adaptation dimensions,
 * and the SlideAdaptationContract schema.
 */

"use strict";

// ── Speaker Profiles ───────────────────────────────────────
// Authority level + domain familiarity + communication style

const SPEAKER_PROFILES = {
  executive: {
    id: "executive",
    label: "Executive / C-Level",
    authority: "high",
    domainFamiliarity: "strategic_only",
    communicationStyle: "concise",
    preferredVisualPriority: ["key_metrics", "outcomes", "risk"],
    detailThreshold: 0.3, // low detail tolerance
  },
  manager: {
    id: "manager",
    label: "Manager / Director",
    authority: "medium_high",
    domainFamiliarity: "tactical",
    communicationStyle: "structured",
    preferredVisualPriority: ["process", "metrics", "timeline"],
    detailThreshold: 0.5,
  },
  specialist: {
    id: "specialist",
    label: "Subject Matter Expert",
    authority: "medium",
    domainFamiliarity: "deep",
    communicationStyle: "detailed",
    preferredVisualPriority: ["data", "methodology", "evidence"],
    detailThreshold: 0.8,
  },
  student: {
    id: "student",
    label: "Student / Learner",
    authority: "low",
    domainFamiliarity: "beginner",
    communicationStyle: "pedagogical",
    preferredVisualPriority: ["examples", "diagrams", "summary"],
    detailThreshold: 0.6,
  },
  general_public: {
    id: "general_public",
    label: "General Public",
    authority: "low",
    domainFamiliarity: "none",
    communicationStyle: "accessible",
    preferredVisualPriority: ["stories", "simple_charts", "takeaways"],
    detailThreshold: 0.2,
  },
};

// ── Audience Roles ─────────────────────────────────────────
// Who will receive the presentation

const AUDIENCE_ROLES = {
  board: {
    id: "board",
    label: "Board of Directors",
    expertiseLevel: "strategic",
    priorKnowledge: "high_context",
    decisionPower: "high",
    timeBudget: "short",
    riskSensitivity: "high",
    terminologyDepth: "executive",
  },
  executives: {
    id: "executives",
    label: "Executive Team",
    expertiseLevel: "strategic_operational",
    priorKnowledge: "high",
    decisionPower: "high",
    timeBudget: "short",
    riskSensitivity: "medium",
    terminologyDepth: "professional",
  },
  managers: {
    id: "managers",
    label: "Middle Management",
    expertiseLevel: "operational",
    priorKnowledge: "medium",
    decisionPower: "medium",
    timeBudget: "medium",
    riskSensitivity: "medium",
    terminologyDepth: "professional",
  },
  engineers: {
    id: "engineers",
    label: "Technical Team / Engineers",
    expertiseLevel: "deep_technical",
    priorKnowledge: "high_technical",
    decisionPower: "advisory",
    timeBudget: "long",
    riskSensitivity: "analytical",
    terminologyDepth: "technical",
  },
  students: {
    id: "students",
    label: "Students",
    expertiseLevel: "beginner",
    priorKnowledge: "low",
    decisionPower: "none",
    timeBudget: "long",
    riskSensitivity: "low",
    terminologyDepth: "basic",
  },
  investors: {
    id: "investors",
    label: "Investors / VCs",
    expertiseLevel: "financial_strategic",
    priorKnowledge: "market_aware",
    decisionPower: "high",
    timeBudget: "short",
    riskSensitivity: "very_high",
    terminologyDepth: "business",
  },
  customers: {
    id: "customers",
    label: "Customers / Prospects",
    expertiseLevel: "domain_varies",
    priorKnowledge: "product_aware",
    decisionPower: "purchase",
    timeBudget: "short",
    riskSensitivity: "value_focused",
    terminologyDepth: "accessible",
  },
  general: {
    id: "general",
    label: "General Audience",
    expertiseLevel: "mixed",
    priorKnowledge: "varies",
    decisionPower: "low",
    timeBudget: "medium",
    riskSensitivity: "low",
    terminologyDepth: "general",
  },
};

// ── Adaptation Dimensions ──────────────────────────────────
// What aspects of each slide get adjusted

const ADAPTATION_DIMENSIONS = {
  TITLE_DEPTH: "title_depth", // how literal vs interpretive the title
  BODY_DETAIL: "body_detail", // bullet count, sentence length
  TERMINOLOGY: "terminology", // jargon level
  VISUAL_PRIORITY: "visual_priority", // chart vs text vs diagram
  EMPHASIS: "emphasis", // which points to highlight
  SPEAKER_NOTES_TONE: "speaker_notes_tone", // formal vs conversational
  METRIC_DEPTH: "metric_depth", // high-level KPI vs raw data
  NARRATIVE_ANGLE: "narrative_angle", // problem-first vs solution-first
};

// ── Title Depth Levels ─────────────────────────────────────

const TITLE_DEPTH_LEVELS = {
  executive: { label: "Executive", pattern: "outcome_first", maxChars: 40 },
  professional: { label: "Professional", pattern: "insight_driven", maxChars: 60 },
  technical: { label: "Technical", pattern: "precise_literal", maxChars: 80 },
  basic: { label: "Basic", pattern: "descriptive_simple", maxChars: 50 },
};

// ── Terminology Depth ──────────────────────────────────────

const TERMINOLOGY_LEVELS = {
  executive: {
    label: "Executive Summary",
    rules: [
      {
        type: "replace",
        match: /\b(?:KPI|OKR|ROI|SLA|SLI)\b/gi,
        replace: (m) => {
          const map = {
            KPI: "关键指标",
            OKR: "目标与关键成果",
            ROI: "投资回报",
            SLA: "服务标准",
            SLI: "服务等级",
          };
          return map[m.toUpperCase()] || m;
        },
      },
      { type: "simplify", threshold: 0.7 },
    ],
  },
  professional: {
    label: "Professional",
    rules: [{ type: "keep_domain_terms" }, { type: "simplify", threshold: 0.5 }],
  },
  technical: {
    label: "Technical",
    rules: [{ type: "preserve_all" }, { type: "add_glossary_note" }],
  },
  basic: {
    label: "Accessible",
    rules: [
      { type: "explain_all_jargon" },
      { type: "use_analogies" },
      { type: "simplify", threshold: 0.9 },
    ],
  },
};

// ── Default Adaptation Contract ────────────────────────────

const DEFAULT_ADAPTATION_CONTRACT = {
  titleDepth: "professional",
  bodyDetailLevel: "medium",
  terminology: "professional",
  visualPriority: ["insight", "data", "supporting"],
  emphasis: "balanced",
  speakerNotesTone: "professional",
  metricDepth: "summary",
  narrativeAngle: "balanced",
  assumptions: [],
  warnings: [],
};

module.exports = {
  SPEAKER_PROFILES,
  AUDIENCE_ROLES,
  ADAPTATION_DIMENSIONS,
  TITLE_DEPTH_LEVELS,
  TERMINOLOGY_LEVELS,
  DEFAULT_ADAPTATION_CONTRACT,
};
