/**
 * Story Planner — M12.3
 *
 * Takes a PresentationIntent (and optional SourceDocumentModel) and produces
 * a DeckPlan: narrative pattern selection, section sequencing, slide budget
 * allocation, source reference preservation, and assumption/warning recording.
 *
 * Deterministic heuristics only. No LLM or cloud dependency.
 */

"use strict";

const {
  createDefaultDeckPlan,
  validateDeckPlan,
} = require("./schema.js");
const { selectNarrativePattern } = require("./narrative-patterns.js");

/**
 * Main entry point: planDeck(intent, sourceDocument?) → DeckPlan
 */
function planDeck(intent, sourceDocument) {
  const assumptions = [];
  const warnings = [];

  // ── 1. Select narrative pattern ──
  let pattern = selectNarrativePattern(intent);
  if (!pattern) {
    // Fallback: use context-analysis-conclusion as safest default
    const fallback = NARRATIVE_PATTERNS_FALLBACK;
    pattern = fallback;
    assumptions.push(`No strong narrative signal detected; using default pattern: ${fallback.name}`);
  }

  // ── 2. Build deck title ──
  let deckTitle = intent.topic || "Untitled Presentation";
  let subtitle = "";

  if (sourceDocument && sourceDocument.title) {
    deckTitle = sourceDocument.title;
    assumptions.push("Deck title inferred from SourceDocumentModel title");
  }

  if (intent.audience || intent.purpose) {
    const parts = [];
    if (intent.audience) parts.push(`for ${intent.audience}`);
    if (intent.purpose !== "inform") parts.push(intent.purpose);
    subtitle = parts.join(" · ") || "";
  }

  // ── 3. Allocate slides based on target count ──
  const targetSlideCount = intent.targetSlideCount || pattern.defaultSlideCount;
  const sections = allocateSlidesToSections(pattern.sections, targetSlideCount, sourceDocument, intent);

  // ── 4. Generate slide planning entries ──
  const slides = generateSlideEntries(sections, intent, sourceDocument, assumptions, warnings);

  // ── 5. Check for constraints and warnings ──
  checkConstraints(intent, sections, slides, assumptions, warnings);

  // ── 6. Preserve source references ──
  preserveSourceRefs(sections, slides, sourceDocument, intent);

  // ── 7. Build final DeckPlan ──
  const deckPlan = createDefaultDeckPlan({
    deckTitle,
    subtitle,
    audience: intent.audience || "",
    purpose: intent.purpose || "",
    language: intent.language || "",
    narrativePattern: pattern.id,
    sections,
    slides,
    assumptions,
    warnings,
  });

  // ── 8. Validate ──
  const validation = validateDeckPlan(deckPlan);
  if (!validation.ok) {
    warnings.push(`Internal validation warning: ${validation.errors.join("; ")}`);
  }

  return deckPlan;
}

/**
 * Default fallback narrative pattern when no match found.
 */
const NARRATIVE_PATTERNS_FALLBACK = {
  id: "context-analysis-conclusion",
  name: "Context → Analysis → Conclusion",
  purposeMatches: ["inform", "summarize"],
  domainMatches: ["general", "research", "technical"],
  defaultSlideCount: 7,
};

/**
 * Distribute targetSlideCount across sections proportionally, with minimum 1 per section.
 * Adjusts based on source document content density when available.
 */
function allocateSlidesToSections(sectionDefs, targetCount, sourceDocument, intent) {
  const n = sectionDefs.length;
  if (n === 0) return [];

  // Start with equal distribution, ensuring at least 1 per section
  const base = Math.max(1, Math.floor(targetCount / n));
  let allocated = base * n;
  const remainder = targetCount - allocated;

  const result = sectionDefs.map((def, i) => {
    let allocation = base + (i < remainder ? 1 : 0);

    // Boost sections that have more source material
    if (sourceDocument) {
      const boost = estimateSectionBoost(def.id, sourceDocument, intent);
      allocation = Math.max(1, allocation + boost);
    }

    return {
      ...def,
      slideAllocation: allocation,
    };
  });

  // Verify total matches target
  const total = result.reduce((sum, s) => sum + s.slideAllocation, 0);
  if (total !== targetCount) {
    // Adjust last section to hit exact target
    result[result.length - 1].slideAllocation += targetCount - total;
  }

  return result;
}

/**
 * Estimate how many extra slides a section deserves based on source content.
 */
function estimateSectionBoost(sectionId, sourceDocument, intent) {
  if (!sourceDocument || !sourceDocument.sections) return 0;

  const sectionKeywords = {
    context: ["背景", "background", "overview", "introduction", "intro", "概述"],
    problem: ["问题", "problem", "challenge", "gap", "pain", "痛点", "挑战"],
    insight: ["洞察", "insight", "finding", "data", "发现", "数据", "分析"],
    solution: ["方案", "solution", "approach", "proposal", "建议", "方法"],
    action: ["行动", "action", "next step", "plan", "timeline", "计划", "时间"],
    why: ["为什么", "why", "purpose", "motivation", "原因"],
    what: ["什么", "what", "product", "concept", "定义", "产品"],
    how: ["如何", "how", "method", "process", "执行", "实施"],
    value: ["价值", "value", "roi", "impact", "效果", "回报"],
    current: ["当前", "current", "现状", "baseline", "present"],
    gap: ["差距", "gap", "deficiency", "不足"],
    target: ["目标", "target", "future", "愿景", "期望"],
    roadmap: ["路线图", "roadmap", "milestone", "phase", "阶段"],
    "exec-summary": ["摘要", "summary", "executive", "结论", "top line"],
    evidence: ["证据", "evidence", "data", "result", "数据", "结果"],
    recommendation: ["建议", "recommendation", "decision", "决策"],
    analysis: ["分析", "analysis", "findings", "results", "研究"],
    conclusion: ["结论", "conclusion", "implication", "总结"],
    objective: ["目标", "objective", "goal", "目的"],
    progress: ["进展", "progress", "accomplishment", "完成", "成果"],
    issues: ["问题", "issue", "risk", "风险", "障碍"],
    "next-steps": ["下一步", "next step", "upcoming", "后续"],
    market: ["市场", "market", "opportunity", "规模"],
    product: ["产品", "product", "solution", "服务"],
    advantage: ["优势", "advantage", "competitive", "差异化", "竞争"],
    "business-model": ["商业模式", "business model", "revenue", "收入", "盈利"],
    background: ["背景", "background", "literature", "文献"],
    method: ["方法", "method", "design", "设计", "实验"],
    results: ["结果", "result", "finding", "发现", "数据"],
    discussion: ["讨论", "discussion", "limitation", "局限", "意义"],
    concept: ["概念", "concept", "theory", "理论", "定义"],
    example: ["案例", "example", "case", "示例", "实例"],
    practice: ["实践", "practice", "exercise", "练习", "应用"],
    summary: ["总结", "summary", "takeaway", "要点", "回顾"],
    proposal: ["提案", "proposal", "overview", "概览"],
    scope: ["范围", "scope", "deliverable", "交付物"],
    plan: ["计划", "plan", "timeline", "时间表", "里程碑"],
    budget: ["预算", "budget", "cost", "成本", "资源"],
    risk: ["风险", "risk", "mitigation", "缓解", "应对"],
  };

  const keywords = sectionKeywords[sectionId] || [];
  if (keywords.length === 0) return 0;

  // Count keyword matches in source sections
  let matchCount = 0;
  for (const section of sourceDocument.sections) {
    const text = section.originalText || section.title || "";
    for (const kw of keywords) {
      if (text.includes(kw)) {
        matchCount++;
        break;
      }
    }
  }

  // Each match adds a small boost (max +2)
  return Math.min(2, Math.floor(matchCount / 2));
}

/**
 * Generate individual slide planning entries from section definitions.
 */
function generateSlideEntries(sections, intent, sourceDocument, assumptions, warnings) {
  const slides = [];
  let slideIndex = 1;

  for (const section of sections) {
    // Add section divider slide if not the first section
    if (slides.length > 0) {
      slides.push({
        slideId: `slide-${String(slideIndex).padStart(3, "0")}`,
        index: slideIndex,
        role: "section-divider",
        section: section.title,
        objective: `Transition to ${section.title}`,
        keyMessage: section.keyMessage,
        candidateVisual: "none",
        sourceRefs: [],
      });
      slideIndex++;
    }

    // Generate content slides for this section
    const slidesInSection = section.slideAllocation || 1;
    for (let i = 0; i < slidesInSection; i++) {
      const role = determineSlideRole(i, slidesInSection, section);
      const keyMsg = extractKeyMessage(section, i, sourceDocument);

      slides.push({
        slideId: `slide-${String(slideIndex).padStart(3, "0")}`,
        index: slideIndex,
        role,
        section: section.title,
        objective: `${section.title} — Part ${i + 1}`,
        keyMessage: keyMsg,
        candidateVisual: suggestVisual(role, intent),
        sourceRefs: [],
      });
      slideIndex++;
    }
  }

  // Add closing slide if speaker notes requested
  if (intent.speakerNotes !== false && slides.length > 1) {
    slides.push({
      slideId: `slide-${String(slideIndex).padStart(3, "0")}`,
      index: slideIndex,
      role: "closing",
      section: "Closing",
      objective: "Thank you and Q&A",
      keyMessage: "Summary and contact information",
      candidateVisual: "none",
      sourceRefs: [],
    });
  }

  return slides;
}

/**
 * Determine the specific slide role within a section.
 */
function determineSlideRole(index, totalInSection, section) {
  if (index === 0 && totalInSection === 1) return "content";

  switch (section.id) {
    case "exec-summary":
      return index === 0 ? "executive-summary" : "content";
    case "context":
      return index === 0 ? "agenda" : "content";
    case "problem":
      return index === 0 ? "content" : "comparison";
    case "insight":
    case "results":
      return "data-chart";
    case "solution":
    case "how":
      return "process";
    case "action":
    case "next-steps":
    case "roadmap":
      return "roadmap";
    case "evidence":
      return index === 0 ? "content" : "table";
    case "market":
      return "data-chart";
    case "advantage":
      return "comparison";
    case "background":
      return index === 0 ? "content" : "architecture";
    case "method":
      return "process";
    case "concept":
      return index === 0 ? "content" : "example";
    case "example":
      return "case-study";
    case "practice":
      return "content";
    case "proposal":
      return index === 0 ? "executive-summary" : "content";
    case "scope":
      return "content";
    case "budget":
      return "table";
    case "risk":
      return "matrix";
    default:
      return index === 0 ? "content" : "content";
  }
}

/**
 * Normalize sectionPath to a string for comparison.
 */
function normalizeSectionPath(sectionPath) {
  if (Array.isArray(sectionPath)) return sectionPath.join(" / ");
  if (typeof sectionPath === "string") return sectionPath;
  return "";
}

/**
 * Extract a key message for a slide from source data.
 */
function extractKeyMessage(section, index, sourceDocument) {
  if (sourceDocument && sourceDocument.paragraphs && sourceDocument.paragraphs.length > 0) {
    const sectionParagraphs = sourceDocument.paragraphs.filter((p) => {
      const path = normalizeSectionPath(p.sectionPath);
      return path.toLowerCase().includes(section.id.toLowerCase()) ||
             path.toLowerCase().includes(section.title.toLowerCase());
    });
    if (sectionParagraphs.length > 0) {
      const para = sectionParagraphs[index % sectionParagraphs.length];
      return para.originalText ? para.originalText.substring(0, 120) : section.keyMessage;
    }
  }
  return section.keyMessage;
}

/**
 * Suggest a visual type based on slide role and intent.
 */
function suggestVisual(role, intent) {
  const visualMap = {
    "data-chart": "bar-chart",
    "comparison": "comparison",
    "process": "process",
    "roadmap": "timeline",
    "case-study": "image",
    "executive-summary": "metric-cards",
    "section-divider": "none",
    "title": "none",
    "agenda": "none",
    "closing": "none",
    "q-and-a": "none",
    "quote": "none",
    "recommendation": "none",
  };
  return visualMap[role] || "none";
}

/**
 * Check for constraint violations and add warnings.
 */
function checkConstraints(intent, sections, slides, assumptions, warnings) {
  const totalPlanned = sections.reduce((sum, s) => sum + s.slideAllocation, 0);

  if (totalPlanned > 25) {
    warnings.push(`Slide budget (${totalPlanned}) exceeds recommended maximum of 25. Consider splitting into multiple decks.`);
  }

  if (totalPlanned < 4) {
    warnings.push(`Slide budget (${totalPlanned}) is very low. Deck may lack sufficient depth.`);
  }

  if (intent.mustInclude && intent.mustInclude.length > 0) {
    const coveredTopics = slides.map((s) => `${s.role} ${s.keyMessage}`).join(" ").toLowerCase();
    for (const mustInclude of intent.mustInclude) {
      if (!coveredTopics.includes(mustInclude.toLowerCase())) {
        warnings.push(`mustInclude item "${mustInclude}" may not be adequately addressed in the current plan.`);
      }
    }
  }
}

/**
 * Populate sourceRefs by matching source document elements to planned slides.
 * Uses keyword-based matching since narrative section names may differ from source paths.
 */
const SECTION_KEYWORD_MAP = {
  "Current State": ["current", "现状", "baseline", "present", "当前", "收入", "revenue", "业绩"],
  "Gap Analysis": ["gap", "差距", "不足", "deficiency", "问题", "problem", "挑战"],
  "Target State": ["target", "目标", "vision", "愿景", "期望", "future"],
  Roadmap: ["roadmap", "路线图", "milestone", "phase", "阶段", "plan", "计划"],
  "Executive Summary": ["summary", "摘要", "executive", "结论", "top line", "overview"],
  Evidence: ["evidence", "数据", "data", "result", "结果", "finding", "证据"],
  Recommendation: ["recommendation", "建议", "decision", "决策", "action"],
  Context: ["context", "背景", "background", "overview", "introduction", "概述"],
  Problem: ["problem", "问题", "challenge", "pain", "痛点", "风险", "risk"],
  Insight: ["insight", "洞察", "finding", "发现", "分析", "analysis"],
  Solution: ["solution", "方案", "approach", "proposal", "方法", "解决"],
  "Action Plan": ["action", "行动", "next step", "计划", "timeline", "安排"],
  Why: ["why", "为什么", "purpose", "动机", "motivation"],
  What: ["what", "什么", "product", "概念", "definition", "产品"],
  How: ["how", "如何", "method", "process", "执行", "实施"],
  Value: ["value", "价值", "roi", "impact", "回报", "效果"],
  Objectives: ["objective", "目标", "goal", "目的"],
  Progress: ["progress", "进展", "accomplishment", "完成", "成果"],
  "Issues & Risks": ["issue", "问题", "risk", "风险", "blocker", "障碍"],
  "Next Steps": ["next step", "下一步", "upcoming", "后续", "priority"],
  "Market Opportunity": ["market", "市场", "opportunity", "规模", "trend"],
  "Product / Solution": ["product", "产品", "solution", "服务", "feature"],
  "Competitive Advantage": ["advantage", "优势", "competitive", "差异化", "竞争"],
  "Business Model": ["business model", "商业模式", "revenue", "收入", "盈利"],
  Background: ["background", "背景", "literature", "文献"],
  Methodology: ["method", "方法", "design", "设计", "实验"],
  Results: ["result", "结果", "finding", "发现", "数据"],
  Discussion: ["discussion", "讨论", "limitation", "局限", "意义", "implication"],
  Concept: ["concept", "概念", "theory", "理论", "定义"],
  Example: ["example", "案例", "case", "示例", "实例"],
  Practice: ["practice", "实践", "exercise", "练习", "应用"],
  "Summary & Key Takeaways": ["summary", "总结", "takeaway", "要点", "回顾"],
  "Proposal Overview": ["proposal", "提案", "overview", "概览"],
  Scope: ["scope", "范围", "deliverable", "交付物"],
  "Implementation Plan": ["implementation", "实施", "plan", "计划", "timeline", "时间表"],
  Budget: ["budget", "预算", "cost", "成本", "resource", "资源"],
  "Risk Management": ["risk", "风险", "mitigation", "缓解", "应对"],
};

function getSectionKeywords(sectionTitle) {
  return SECTION_KEYWORD_MAP[sectionTitle] || [];
}

function matchesSourceRef(paragraph, slideSection, slideSectionKeywords) {
  const sectionPathStr = normalizeSectionPath(paragraph.sectionPath);
  const text = (paragraph.originalText || "").toLowerCase();
  const pathLower = sectionPathStr.toLowerCase();
  const slideLower = slideSection.toLowerCase();

  // Priority 1: Section path must contain at least one keyword as a word boundary match
  // This prevents "design" from matching "designed" in arbitrary text
  let pathMatchScore = 0;
  for (const kw of slideSectionKeywords) {
    const kwLower = kw.toLowerCase();
    // Check for word-boundary match in section path (section headers use clean names)
    if (pathLower.match(new RegExp('\\b' + kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'))) {
      pathMatchScore += 2;
    }
    // Also check for substring match (fallback for compound paths)
    else if (pathLower.includes(kwLower)) {
      pathMatchScore += 1;
    }
  }
  
  // If no path match at all, skip this paragraph entirely
  if (pathMatchScore === 0) return false;

  // Priority 2: Text content should corroborate (not override) path matching
  // Only count text matches if we already have a path match
  let textMatchCount = 0;
  for (const kw of slideSectionKeywords) {
    const kwLower = kw.toLowerCase();
    // Use word boundary regex to avoid partial matches like "designed" -> "design"
    const regex = new RegExp('\\b' + kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (regex.test(text)) {
      textMatchCount++;
    }
  }

  // Return true if path match is strong enough OR if both path and text match
  return pathMatchScore >= 2 || (pathMatchScore >= 1 && textMatchCount >= 1);
}

function preserveSourceRefs(sections, slides, sourceDocument, intent) {
  if (!sourceDocument || !sourceDocument.paragraphs) return;

  // Build a map from deck section title -> matched paragraphs
  const sectionParaMap = {};
  for (const section of sections) {
    sectionParaMap[section.title] = [];
  }

  for (const slide of slides) {
    const matchedRefs = [];
    const matchedParagraphs = [];
    const slideSectionLower = slide.section.toLowerCase();
    const slideKeywords = getSectionKeywords(slide.section);

    // Match paragraphs by keyword-based matching (not exact sectionPath)
    for (const para of sourceDocument.paragraphs) {
      if (matchesSourceRef(para, slide.section, slideKeywords)) {
        matchedRefs.push({
          sourceId: para.sourceId,
          sourceType: para.sourceType,
          fileReference: para.fileReference || "",
        });
        matchedParagraphs.push({
          sourceId: para.sourceId,
          originalText: para.originalText || "",
          sectionPath: para.sectionPath || [],
        });
      }
    }

    // Deduplicate by sourceId
    const seen = new Set();
    slide.sourceRefs = matchedRefs.filter((ref) => {
      if (seen.has(ref.sourceId)) return false;
      seen.add(ref.sourceId);
      return true;
    });

    // Store matched paragraphs on the section for downstream use
    if (matchedParagraphs.length > 0) {
      if (!sectionParaMap[slide.section]) {
        sectionParaMap[slide.section] = [];
      }
      const existingIds = new Set(sectionParaMap[slide.section].map(p => p.sourceId));
      for (const para of matchedParagraphs) {
        if (!existingIds.has(para.sourceId)) {
          sectionParaMap[slide.section].push(para);
        }
      }
    }
  }

  // Fallback: if NO slides have refs, distribute paragraphs proportionally across sections
  const totalSlidesWithRefs = slides.filter(s => s.sourceRefs.length > 0).length;
  if (totalSlidesWithRefs === 0 && sourceDocument.paragraphs.length > 0) {
    const numSections = sections.length;
    const parasPerSection = Math.ceil(sourceDocument.paragraphs.length / numSections);

    for (let i = 0; i < sections.length; i++) {
      const startIdx = i * parasPerSection;
      const endIdx = Math.min(startIdx + parasPerSection, sourceDocument.paragraphs.length);
      const sectionParas = sourceDocument.paragraphs.slice(startIdx, endIdx);

      sectionParaMap[sections[i].title] = sectionParas.map(p => ({
        sourceId: p.sourceId,
        originalText: p.originalText || "",
        sectionPath: p.sectionPath || [],
      }));

      // Also assign refs to slides in this section
      for (const slide of slides) {
        if (slide.section === sections[i].title && slide.sourceRefs.length === 0) {
          slide.sourceRefs = sectionParas.map(p => ({
            sourceId: p.sourceId,
            sourceType: p.sourceType,
            fileReference: p.fileReference || "",
          }));
        }
      }
    }
  }

  // Assign sourceParagraphs to sections
  for (const section of sections) {
    section.sourceParagraphs = sectionParaMap[section.title] || [];
  }
}

module.exports = {
  planDeck,
};
