/**
 * @awe/audience-engine — Core Engine (M12.25)
 *
 * Universal dynamic adaptation engine that adjusts presentation content
 * based on speaker profile AND audience role. Operates at two levels:
 *
 * 1. Deck-level: adjusts subtitle, narrative angle, section emphasis
 * 2. Slide-level: adjusts title depth, body detail, terminology, visual priority
 *
 * Non-destructive: returns an AdaptationPlan without modifying original specs.
 */

"use strict";

const {
  SPEAKER_PROFILES,
  AUDIENCE_ROLES,
  ADAPTATION_DIMENSIONS,
  TITLE_DEPTH_LEVELS,
  TERMINOLOGY_LEVELS,
  DEFAULT_ADAPTATION_CONTRACT,
} = require("./schema.js");

/**
 * Main entry point: adaptDeck(slideSpecs, layoutPlan, { speaker, audience }) → AdaptationPlan
 *
 * @param {Array} slideSpecs - Array of SlideSpec objects
 * @param {Object|null} layoutPlan - LayoutPlan from theme-layout engine (for density info)
 * @param {Object} options - Adaptation options
 * @param {string} [options.speaker] - Speaker profile ID (e.g., "executive", "specialist")
 * @param {string} [options.audience] - Audience role ID (e.g., "board", "engineers")
 * @param {Object} [options.customRules] - Override specific adaptation dimensions
 * @returns {{ contract: Object, slideAdjustments: Array, deckHints: Object }}
 */
function adaptDeck(slideSpecs, layoutPlan, options = {}) {
  const { speaker = null, audience = null, customRules = {} } = options;
  const assumptions = [];
  const warnings = [];

  // ── Resolve speaker profile ──
  let speakerProfile = null;
  if (speaker && SPEAKER_PROFILES[speaker]) {
    speakerProfile = SPEAKER_PROFILES[speaker];
    assumptions.push(`Speaker profile set to: ${speakerProfile.label}`);
  } else if (speaker) {
    warnings.push(`Unknown speaker profile "${speaker}", using default`);
  }

  // ── Resolve audience role ──
  let audienceRole = null;
  if (audience && AUDIENCE_ROLES[audience]) {
    audienceRole = AUDIENCE_ROLES[audience];
    assumptions.push(`Audience role set to: ${audienceRole.label}`);
  } else if (audience) {
    warnings.push(`Unknown audience role "${audience}", using default`);
  }

  // ── Derive adaptation contract ──
  const contract = deriveContract(speakerProfile, audienceRole, customRules, assumptions, warnings);

  // ── Generate slide-level adjustments ──
  const slideAdjustments = slideSpecs.map((spec, index) => {
    return adaptSlide(spec, contract, speakerProfile, audienceRole, index, assumptions, warnings);
  });

  // ── Generate deck-level hints ──
  const deckHints = generateDeckHints(
    slideSpecs,
    contract,
    speakerProfile,
    audienceRole,
    assumptions,
  );

  return {
    contract,
    slideAdjustments,
    deckHints,
    assumptions,
    warnings,
  };
}

/**
 * Derive the full adaptation contract from speaker + audience profiles.
 * Uses a weighted merge: audience role takes precedence for terminology,
 * speaker profile influences communication style and detail threshold.
 */
function deriveContract(speakerProfile, audienceRole, customRules, assumptions, warnings) {
  const contract = {
    ...DEFAULT_ADAPTATION_CONTRACT,
    assumptions: [...assumptions],
    warnings: [...warnings],
  };

  // ── Terminology depth: driven by audience expertise ──
  if (audienceRole) {
    contract.terminology = audienceRole.terminologyDepth || "professional";
  } else {
    contract.terminology = "professional";
  }

  // ── Title depth: driven by speaker authority × audience time budget ──
  if (speakerProfile && audienceRole) {
    if (speakerProfile.authority === "high" && audienceRole.timeBudget === "short") {
      contract.titleDepth = "executive";
    } else if (
      speakerProfile.domainFamiliarity === "deep" &&
      audienceRole.expertiseLevel === "deep_technical"
    ) {
      contract.titleDepth = "technical";
    } else if (audienceRole.expertiseLevel === "beginner") {
      contract.titleDepth = "basic";
    } else {
      contract.titleDepth = "professional";
    }
  } else if (speakerProfile) {
    contract.titleDepth =
      speakerProfile.communicationStyle === "concise" ? "executive" : "professional";
  } else if (audienceRole) {
    contract.titleDepth = audienceRole.expertiseLevel === "beginner" ? "basic" : "professional";
  }

  // ── Body detail: driven by speaker detailThreshold × audience timeBudget ──
  if (speakerProfile && audienceRole) {
    const detailScore =
      speakerProfile.detailThreshold * (audienceRole.timeBudget === "short" ? 0.4 : 1.0);
    if (detailScore < 0.3) contract.bodyDetailLevel = "minimal";
    else if (detailScore < 0.6) contract.bodyDetailLevel = "moderate";
    else contract.bodyDetailLevel = "detailed";
  } else if (speakerProfile) {
    contract.bodyDetailLevel = speakerProfile.detailThreshold < 0.4 ? "minimal" : "moderate";
  } else {
    contract.bodyDetailLevel = "moderate";
  }

  // ── Visual priority: driven by audience decision power + speaker preference ──
  if (audienceRole && speakerProfile) {
    const priority = [...(speakerProfile.preferredVisualPriority || [])];
    if (audienceRole.decisionPower === "high") {
      if (!priority.includes("key_metrics")) priority.unshift("key_metrics");
    }
    if (audienceRole.expertiseLevel === "beginner") {
      if (!priority.includes("examples")) priority.splice(1, 0, "examples");
    }
    contract.visualPriority = priority.length > 0 ? priority : ["insight", "data", "supporting"];
  } else if (speakerProfile) {
    contract.visualPriority = speakerProfile.preferredVisualPriority || [
      "insight",
      "data",
      "supporting",
    ];
  }

  // ── Emphasis: driven by purpose alignment ──
  if (audienceRole) {
    if (audienceRole.riskSensitivity === "high" || audienceRole.riskSensitivity === "very_high") {
      contract.emphasis = "risk_aware";
    } else if (audienceRole.expertiseLevel === "deep_technical") {
      contract.emphasis = "evidence_based";
    } else {
      contract.emphasis = "balanced";
    }
  }

  // ── Speaker notes tone ──
  if (speakerProfile) {
    switch (speakerProfile.communicationStyle) {
      case "concise":
        contract.speakerNotesTone = "direct";
        break;
      case "pedagogical":
        contract.speakerNotesTone = "explanatory";
        break;
      case "detailed":
        contract.speakerNotesTone = "comprehensive";
        break;
      case "structured":
        contract.speakerNotesTone = "organized";
        break;
      case "accessible":
        contract.speakerNotesTone = "conversational";
        break;
      default:
        contract.speakerNotesTone = "professional";
    }
  }

  // ── Metric depth ──
  if (audienceRole) {
    if (audienceRole.expertiseLevel === "beginner" || audienceRole.timeBudget === "short") {
      contract.metricDepth = "summary";
    } else if (audienceRole.expertiseLevel === "deep_technical") {
      contract.metricDepth = "raw_data";
    } else {
      contract.metricDepth = "insight";
    }
  }

  // ── Narrative angle ──
  if (audienceRole && speakerProfile) {
    if (audienceRole.decisionPower === "high" && speakerProfile.authority === "high") {
      contract.narrativeAngle = "recommendation_first";
    } else if (audienceRole.expertiseLevel === "beginner") {
      contract.narrativeAngle = "story_first";
    } else {
      contract.narrativeAngle = "balanced";
    }
  }

  // ── Apply custom rule overrides ──
  for (const [dim, value] of Object.entries(customRules)) {
    if (dim in contract) {
      contract[dim] = value;
      assumptions.push(`Custom rule override: ${dim} = ${JSON.stringify(value)}`);
    }
  }

  return contract;
}

/**
 * Generate slide-level adaptation adjustments.
 * Returns an array of { slideIndex, adjustments: { dimension, oldValue, newValue, rationale } }
 */
function adaptSlide(
  slideSpec,
  contract,
  speakerProfile,
  audienceRole,
  index,
  assumptions,
  warnings,
) {
  const adjustments = [];
  const role = slideSpec.role;

  // Skip non-content slides for most adaptations
  const skipRoles = ["title", "section-divider", "closing", "agenda"];
  if (skipRoles.includes(role)) {
    // Still adjust closing/title for speaker/audience branding
    if (role === "title") {
      const titleAdj = adjustTitleForAudience(slideSpec.title, contract, audienceRole);
      if (titleAdj)
        adjustments.push({
          dimension: ADAPTATION_DIMENSIONS.TITLE_DEPTH,
          oldValue: slideSpec.title,
          newValue: titleAdj.text,
          rationale: titleAdj.rationale,
        });
    }
    if (role === "closing") {
      const noteAdj = adjustSpeakerNotesTone(slideSpec.speakerNotes, contract);
      if (noteAdj)
        adjustments.push({
          dimension: ADAPTATION_DIMENSIONS.SPEAKER_NOTES_TONE,
          oldValue: "(empty)",
          newValue: noteAdj.text,
          rationale: "Closing slide tone adapted",
        });
    }
    return { slideIndex: index, role, adjustments };
  }

  // ── Title depth adjustment ──
  const titleAdj = adjustTitleForAudience(slideSpec.title, contract, audienceRole);
  if (titleAdj)
    adjustments.push({
      dimension: ADAPTATION_DIMENSIONS.TITLE_DEPTH,
      oldValue: slideSpec.title,
      newValue: titleAdj.text,
      rationale: titleAdj.rationale,
    });

  // ── Body detail adjustment ──
  const bodyAdj = adjustBodyDetail(slideSpec.body, contract, speakerProfile);
  if (bodyAdj)
    adjustments.push({
      dimension: ADAPTATION_DIMENSIONS.BODY_DETAIL,
      oldValue: Array.isArray(slideSpec.body) ? slideSpec.body.length : 0,
      newValue: bodyAdj.length,
      rationale: bodyAdj.rationale,
    });

  // ── Terminology adjustment ──
  const termAdj = adjustTerminology(slideSpec, contract, audienceRole);
  if (termAdj)
    adjustments.push({
      dimension: ADAPTATION_DIMENSIONS.TERMINOLOGY,
      oldValue: "original",
      newValue: termAdj.level,
      rationale: termAdj.rationale,
    });

  // ── Emphasis adjustment ──
  const emphAdj = adjustEmphasis(slideSpec, contract, audienceRole);
  if (emphAdj)
    adjustments.push({
      dimension: ADAPTATION_DIMENSIONS.EMPHASIS,
      oldValue: "default",
      newValue: emphAdj.style,
      rationale: emphAdj.rationale,
    });

  // ── Speaker notes tone adjustment ──
  const noteAdj = adjustSpeakerNotesTone(slideSpec.speakerNotes, contract);
  if (noteAdj)
    adjustments.push({
      dimension: ADAPTATION_DIMENSIONS.SPEAKER_NOTES_TONE,
      oldValue: "original",
      newValue: noteAdj.tone,
      rationale: noteAdj.rationale,
    });

  return { slideIndex: index, role, adjustments };
}

/**
 * Adjust slide title based on audience terminology depth.
 */
function adjustTitleForAudience(title, contract, audienceRole) {
  if (!title || !contract) return null;

  const depthLevel = contract.titleDepth || "professional";
  const maxChars = TITLE_DEPTH_LEVELS[depthLevel]?.maxChars || 60;

  if (title.length <= maxChars) return null; // already fits

  const rationale = `Title truncated to ${maxChars} chars for ${depthLevel} audience`;
  return { text: title.slice(0, maxChars - 3).trim() + "...", rationale };
}

/**
 * Adjust body bullet count based on speaker detail threshold and audience time budget.
 */
function adjustBodyDetail(body, contract, speakerProfile) {
  if (!body || !Array.isArray(body)) return { length: 0, rationale: "No body content" };

  const detailLevel = contract?.bodyDetailLevel || "moderate";
  const speakerThreshold = speakerProfile?.detailThreshold ?? 0.5;

  let targetCount;
  switch (detailLevel) {
    case "minimal":
      targetCount = Math.min(3, Math.ceil(body.length * 0.5));
      break;
    case "moderate":
      targetCount = Math.min(5, Math.ceil(body.length * 0.75));
      break;
    case "detailed":
      targetCount = Math.min(7, body.length);
      break;
    default:
      targetCount = body.length;
  }

  // Speaker with low detail threshold further reduces
  if (speakerThreshold < 0.4 && targetCount > 3) {
    targetCount = 3;
  }

  return {
    length: targetCount,
    rationale: `${detailLevel} detail, speaker threshold ${speakerThreshold}`,
  };
}

/**
 * Adjust terminology level based on audience expertise.
 */
function adjustTerminology(slideSpec, contract, audienceRole) {
  if (!contract) return null;

  const termLevel = contract.terminology || "professional";
  const rules = TERMINOLOGY_LEVELS[termLevel];

  if (!rules) return null;

  return {
    level: termLevel,
    rationale: `Applied ${rules.label} terminology rules (${rules.rules.length} rules)`,
    ruleCount: rules.rules.length,
  };
}

/**
 * Adjust emphasis style based on audience risk sensitivity and expertise.
 */
function adjustEmphasis(slideSpec, contract, audienceRole) {
  if (!contract) return null;

  const emphasis = contract.emphasis || "balanced";

  return {
    style: emphasis,
    rationale: `Emphasis style: ${emphasis}`,
  };
}

/**
 * Adjust speaker notes tone based on speaker profile.
 */
function adjustSpeakerNotesTone(notes, contract) {
  if (!contract) return null;

  const tone = contract.speakerNotesTone || "professional";

  return {
    tone,
    rationale: `Speaker notes tone: ${tone}`,
  };
}

/**
 * Generate deck-level adaptation hints.
 */
function generateDeckHints(slideSpecs, contract, speakerProfile, audienceRole, assumptions) {
  const hints = {};

  // Section emphasis ordering
  if (speakerProfile && audienceRole) {
    const sections = new Set(slideSpecs.map((s) => s.section));
    const sectionScores = new Map();

    for (const section of sections) {
      let score = 0;
      if (
        audienceRole.decisionPower === "high" &&
        /summary|result|conclusion|recommendation/i.test(section)
      ) {
        score += 3;
      }
      if (
        audienceRole.expertiseLevel === "beginner" &&
        /context|background|overview|intro/i.test(section)
      ) {
        score += 2;
      }
      if (speakerProfile.authority === "high" && /risk|issue|challenge|gap/i.test(section)) {
        score += 2;
      }
      sectionScores.set(section, score);
    }

    hints.sectionEmphasisOrder = [...sectionScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([section]) => section);
  }

  // Content density recommendation
  const totalSlides = slideSpecs.length;
  const contentSlides = slideSpecs.filter(
    (s) => !["title", "section-divider", "closing", "agenda"].includes(s.role),
  ).length;

  hints.totalSlides = totalSlides;
  hints.contentSlides = contentSlides;
  hints.contentRatio = totalSlides > 0 ? (contentSlides / totalSlides).toFixed(2) : "0";

  return hints;
}

module.exports = {
  adaptDeck,
  SPEAKER_PROFILES,
  AUDIENCE_ROLES,
  ADAPTATION_DIMENSIONS,
};
