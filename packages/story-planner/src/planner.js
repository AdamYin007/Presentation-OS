/**
 * Story Planner — M12.3 Enhanced
 *
 * Takes a PresentationIntent (and optional SourceDocumentModel) and produces
 * a DeckPlan: narrative pattern selection, section sequencing, slide budget
 * allocation, source reference preservation, and assumption/warning recording.
 *
 * Deterministic heuristics only. No LLM or cloud dependency.
 *
 * Enhancements:
 *   - Document length auto-compression
 *   - Custom narrative patterns support
 *   - Outline preview generation
 */

"use strict";

const {
  createDefaultDeckPlan,
  validateDeckPlan,
} = require("./schema.js");
const { selectNarrativePattern } = require("./narrative-patterns.js");

// ── Constants ────────────────────────────────────────────────────

/**
 * Max slides per 1000 lines of source document.
 * This prevents runaway slide counts for long documents.
 */
const LINES_PER_SLIDE_RATIO = 30;
const MIN_SLIDES = 5;
const MAX_SLIDES = 40;

/**
 * Default custom narrative pattern structure.
 */
const DEFAULT_CUSTOM_PATTERN = {
  id: "custom",
  name: "Custom Structure",
  sections: [
    { id: "intro", title: "Introduction", slideAllocation: 2 },
    { id: "body", title: "Main Content", slideAllocation: 5 },
    { id: "conclusion", title: "Conclusion", slideAllocation: 2 },
  ],
  defaultSlideCount: 9,
};

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

// ── Main Entry Point ─────────────────────────────────────────────

/**
 * Main entry point: planDeck(intent, sourceDocument?) → DeckPlan
 */
function planDeck(intent, sourceDocument) {
  const assumptions = [];
  const warnings = [];

  // ── 1. Determine target slide count ──
  let targetSlideCount = intent.targetSlideCount;

  // Auto-compress based on document length
  if (!targetSlideCount && sourceDocument) {
    targetSlideCount = calculateTargetSlideCount(sourceDocument, intent);
    if (targetSlideCount !== intent.targetSlideCount) {
      assumptions.push(`Auto-adjusted slide count from ${targetSlideCount} to ${targetSlideCount} based on document length (${sourceDocument.lineCount} lines)`);
    }
  }

  // ── 2. Select narrative pattern ──
  let pattern = selectNarrativePattern(intent);

  // Support custom pattern from intent
  if (intent.customPattern) {
    pattern = intent.customPattern;
    assumptions.push("Using custom narrative pattern from intent");
  }

  if (!pattern) {
    // Fallback: use context-analysis-conclusion as safest default
    pattern = NARRATIVE_PATTERNS_FALLBACK;
    assumptions.push(`No strong narrative signal detected; using default pattern: ${pattern.name}`);
  }

  // ── 3. Build deck title ──
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

  // ── 4. Allocate slides based on target count ──
  const effectiveTargetCount = Math.min(
    Math.max(targetSlideCount || pattern.defaultSlideCount, MIN_SLIDES),
    MAX_SLIDES
  );
  const sections = allocateSlidesToSections(pattern.sections, effectiveTargetCount, sourceDocument, intent);

  // ── 5. Generate slide planning entries ──
  const slides = generateSlideEntries(sections, intent, sourceDocument, assumptions, warnings);

  // ── 6. Check for constraints and warnings ──
  checkConstraints(intent, sections, slides, assumptions, warnings);

  // ── 7. Preserve source references ──
  preserveSourceRefs(sections, slides, sourceDocument, intent);

  // ── 8. Build final DeckPlan ──
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

  // ── 9. Validate ──
  const validation = validateDeckPlan(deckPlan);
  if (!validation.ok) {
    warnings.push(`Internal validation warning: ${validation.errors.join("; ")}`);
  }

  return deckPlan;
}

// ── Document Length Compression ──────────────────────────────────

/**
 * Calculate target slide count based on document length.
 * Long documents are compressed to prevent excessive slides.
 */
function calculateTargetSlideCount(sourceDocument, intent) {
  const lineCount = sourceDocument.lineCount || 0;

  // Calculate based on lines
  let targetCount = Math.ceil(lineCount / LINES_PER_SLIDE_RATIO);

  // Apply caps
  targetCount = Math.max(MIN_SLIDES, Math.min(targetCount, MAX_SLIDES));

  // If intent specifies a range, respect it
  if (intent.minSlides && targetCount < intent.minSlides) {
    targetCount = intent.minSlides;
  }
  if (intent.maxSlides && targetCount > intent.maxSlides) {
    targetCount = intent.maxSlides;
  }

  return targetCount;
}

// ── Slide Allocation ─────────────────────────────────────────────

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

    // Respect minimum allocation from pattern definition
    if (def.slideAllocation && allocation < def.slideAllocation) {
      allocation = def.slideAllocation;
    }

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

// ── Slide Generation ─────────────────────────────────────────────

/**
 * Generate individual slide planning entries from section definitions.
 */
function generateSlideEntries(sections, intent, sourceDocument, assumptions, warnings) {
  const slides = [];
  let slideIndex = 1;
  // Global paragraph rotation counter to avoid duplicate keyMessages
  let paraRotationOffset = 0;

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
      const keyMsg = extractKeyMessage(section, i, sourceDocument, paraRotationOffset);
      // Advance rotation so next section starts at different paragraph
      paraRotationOffset += slidesInSection;

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
 * Suggest visual type for a slide role.
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
 * Extract a key message for a slide from source data.
 */
function extractKeyMessage(section, index, sourceDocument, offset) {
  if (!sourceDocument || !sourceDocument.sections) {
    return `Section ${section.title} — Part ${index + 1}`;
  }

  // Find matching paragraphs
  const sectionKeywords = getSectionKeywords(section.title);
  const matchedParas = [];

  for (const para of sourceDocument.paragraphs || []) {
    if (matchesSourceRef(para, section.title, sectionKeywords)) {
      matchedParas.push(para);
    }
  }

  if (matchedParas.length === 0) {
    return `Section ${section.title} — Part ${index + 1}`;
  }

  // Rotate through matched paragraphs to avoid duplicates
  const rotatedIndex = (index + offset) % matchedParas.length;
  const para = matchedParas[rotatedIndex];

  return conciseMessageFromParagraph(para, `Section ${section.title} — Part ${index + 1}`);
}

/**
 * Match a source paragraph to a slide section.
 */
function matchesSourceRef(paragraph, slideSection, slideSectionKeywords) {
  const sectionPathStr = normalizeSectionPath(paragraph.sectionPath);
  const text = (paragraph.originalText || "").toLowerCase();
  const pathLower = sectionPathStr.toLowerCase();
  const slideLower = slideSection.toLowerCase();

  let pathMatchScore = 0;
  for (const kw of slideSectionKeywords) {
    const kwLower = kw.toLowerCase();
    if (pathLower.match(new RegExp('\\b' + kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'))) {
      pathMatchScore += 2;
    } else if (pathLower.includes(kwLower)) {
      pathMatchScore += 1;
    }
  }

  if (pathMatchScore === 0) return false;

  let textMatchCount = 0;
  for (const kw of slideSectionKeywords) {
    const kwLower = kw.toLowerCase();
    const regex = new RegExp('\\b' + kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (regex.test(text)) {
      textMatchCount++;
    }
  }

  return pathMatchScore >= 2 || (pathMatchScore >= 1 && textMatchCount >= 1);
}

/**
 * Normalize section path to string.
 */
function normalizeSectionPath(sectionPath) {
  if (Array.isArray(sectionPath)) return sectionPath.join(" / ");
  if (typeof sectionPath === "string") return sectionPath;
  return "";
}

/**
 * Get concise message from paragraph.
 */
function conciseMessageFromParagraph(paragraph, fallback) {
  const text = (paragraph && paragraph.originalText ? paragraph.originalText : fallback || "").trim();
  if (!text) return fallback || "";
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) || text;
  if (firstLine.length <= 120) return firstLine;
  return `${firstLine.slice(0, 117).trim()}...`;
}

/**
 * Get keywords for a section.
 */
function getSectionKeywords(sectionTitle) {
  const keywords = SECTION_KEYWORD_MAP[sectionTitle] || [];
  return [...new Set([...keywords, ...DECK_SECTION_SOURCE_MAPPING[sectionTitle] || []])];
}

// ── Source Reference Preservation ────────────────────────────────

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

const DECK_SECTION_SOURCE_MAPPING = {
  Background: ["background", "背景", "overview", "概览", "introduction", "简介", "current", "现状", "challenge", "挑战", "problem", "问题", "context", "环境", "landscape"],
  Methodology: ["method", "方法", "design", "设计", "approach", "方案", "process", "流程", "framework", "框架", "architecture", "架构", "implementation", "实施", "phase", "阶段"],
  Results: ["result", "结果", "outcome", "成果", "finding", "发现", "data", "数据", "evidence", "证据", "performance", "表现", "expected", "预期"],
  Discussion: ["discussion", "讨论", "limitation", "局限", "implication", "意义", "conclusion", "结论", "summary", "总结", "takeaway", "要点", "risk", "风险", "mitigation", "缓解"],
};

function preserveSourceRefs(sections, slides, sourceDocument, intent) {
  if (!sourceDocument) return;

  const sectionContentMap = {};
  for (const section of sections) {
    sectionContentMap[section.title] = [];
  }

  let totalKeywordMatches = 0;

  for (const slide of slides) {
    const matchedRefs = [];
    const matchedContent = [];
    const slideSectionLower = slide.section.toLowerCase();
    const slideKeywords = getSectionKeywords(slide.section);

    if (sourceDocument.paragraphs) {
      for (const para of sourceDocument.paragraphs) {
        if (matchesSourceRef(para, slide.section, slideKeywords)) {
          matchedRefs.push({
            sourceId: para.sourceId,
            sourceType: "paragraph",
            fileReference: "",
          });
          matchedContent.push({
            sourceId: para.sourceId,
            originalText: para.originalText || "",
            sectionPath: para.sectionPath || [],
          });
          totalKeywordMatches++;
        }
      }
    }

    slide.sourceRefs = matchedRefs;
    for (const content of matchedContent) {
      if (!new Set(slide.sourceRefs.map(r => r.sourceId)).has(content.sourceId)) {
        sectionContentMap[slide.section].push(content);
      }
    }
  }

  const shouldMarkInferred = totalKeywordMatches > 0;

  for (const slide of slides) {
    if (slide.sourceRefs.length === 0 && slide.role !== "section-divider" && slide.role !== "closing" && slide.role !== "title" && slide.role !== "agenda") {
      const section = sections.find(s => s.title === slide.section);

      if (section && sectionContentMap[section.title] && sectionContentMap[section.title].length > 0) {
        const firstItem = sectionContentMap[section.title][0];
        slide.sourceRefs = [{
          sourceId: firstItem.sourceId,
          sourceType: firstItem._type || "paragraph",
          fileReference: "",
        }];
        slide.keyMessage = conciseMessageFromParagraph(firstItem, slide.keyMessage);
        sectionContentMap[section.title].push({
          sourceId: firstItem.sourceId,
          originalText: firstItem.originalText || "",
          sectionPath: firstItem.sectionPath || [],
        });
        if (shouldMarkInferred) {
          slide._inferred = true;
        }
      } else if (sourceDocument.paragraphs && sourceDocument.paragraphs.length > 0) {
        const assignedIds = new Set();
        slides.forEach(s => (s.sourceRefs || []).forEach(r => assignedIds.add(r.sourceId)));

        const availableParas = sourceDocument.paragraphs.filter(p => !assignedIds.has(p.sourceId));
        if (availableParas.length > 0) {
          const para = availableParas[0];
          slide.sourceRefs = [{
            sourceId: para.sourceId,
            sourceType: "paragraph",
            fileReference: "",
          }];
          slide.keyMessage = conciseMessageFromParagraph(para, slide.keyMessage);
          const sectionForSlide = sections.find(s => s.title === slide.section);
          if (sectionForSlide) {
            sectionContentMap[sectionForSlide.title].push({
              sourceId: para.sourceId,
              originalText: para.originalText || "",
              sectionPath: para.sectionPath || [],
            });
          }
          if (shouldMarkInferred) {
            slide._inferred = true;
          }
        }
      }
    }
  }

  const totalSlidesWithRefs = slides.filter(s => s.sourceRefs.length > 0).length;
  if (totalSlidesWithRefs === 0) {
    const numSections = sections.length;

    const allContent = [];
    if (sourceDocument.paragraphs) {
      for (const p of sourceDocument.paragraphs) {
        allContent.push({ ...p, _type: "paragraph" });
      }
    }
    if (sourceDocument.lists) {
      for (const l of sourceDocument.lists) {
        for (let li = 0; li < l.items.length; li++) {
          allContent.push({
            sourceId: l.sourceId + "-item-" + li,
            originalText: l.items[li] || "",
            sectionPath: l.sectionPath || [],
            _type: "list-item",
          });
        }
      }
    }
    if (sourceDocument.tables) {
      for (const t of sourceDocument.tables) {
        if (t.header) {
          for (let hi = 0; hi < t.header.length; hi++) {
            allContent.push({
              sourceId: t.sourceId + "-header-" + hi,
              originalText: t.header[hi] || "",
              sectionPath: t.sectionPath || [],
              _type: "table-cell",
            });
          }
        }
        if (t.rows) {
          for (let ri = 0; ri < t.rows.length; ri++) {
            const row = t.rows[ri];
            for (let ci = 0; ci < row.length; ci++) {
              allContent.push({
                sourceId: t.sourceId + "-row-" + ri + "-cell-" + ci,
                originalText: row[ci] || "",
                sectionPath: t.sectionPath || [],
                _type: "table-cell",
              });
            }
          }
        }
      }
    }

    if (allContent.length > 0) {
      const contentPerSection = Math.ceil(allContent.length / numSections);
      for (let i = 0; i < sections.length; i++) {
        const startIdx = i * contentPerSection;
        const endIdx = Math.min(startIdx + contentPerSection, allContent.length);
        const sectionContent = allContent.slice(startIdx, endIdx);

        sectionContentMap[sections[i].title] = sectionContent.map(c => ({
          sourceId: c.sourceId,
          originalText: c.originalText || "",
          sectionPath: c.sectionPath || [],
        }));

        for (const slide of slides) {
          if (slide.section === sections[i].title && slide.sourceRefs.length === 0) {
            slide.sourceRefs = sectionContent.slice(0, 3).map(c => ({
              sourceId: c.sourceId,
              sourceType: c._type || "paragraph",
              fileReference: c.fileReference || "",
            }));
          }
        }
      }
    }
  }

  for (const section of sections) {
    section.sourceParagraphs = sectionContentMap[section.title] || [];
  }
}

// ── Constraint Checking ──────────────────────────────────────────

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

// ── Outline Preview ──────────────────────────────────────────────

/**
 * Generate a human-readable outline preview of the deck plan.
 * Useful for user review before generation.
 */
function generateOutlinePreview(deckPlan) {
  const lines = [];

  lines.push("# Presentation Outline Preview");
  lines.push("");
  lines.push(`**Title**: ${deckPlan.deckTitle}`);
  lines.push(`**Pattern**: ${deckPlan.narrativePattern}`);
  lines.push(`**Total Slides**: ${deckPlan.slides.length}`);
  lines.push(`**Sections**: ${deckPlan.sections.length}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  let slideNum = 1;
  for (const section of deckPlan.sections) {
    lines.push(`## ${section.title} (${section.slideAllocation} slides)`);
    lines.push("");

    const sectionSlides = deckPlan.slides.filter(s => s.section === section.title);
    for (const slide of sectionSlides) {
      const roleIcon = getRoleIcon(slide.role);
      lines.push(`### ${slideNum}. ${roleIcon} ${slide.role} — ${slide.keyMessage?.substring(0, 60) || "No message"}`);
      if (slide.candidateVisual && slide.candidateVisual !== "none") {
        lines.push(`   **Visual**: ${slide.candidateVisual}`);
      }
      lines.push("");
      slideNum++;
    }
  }

  return lines.join("\n");
}

function getRoleIcon(role) {
  const icons = {
    "title": "📄",
    "agenda": "📑",
    "section-divider": "➡️",
    "executive-summary": "📋",
    "content": "📝",
    "comparison": "⚖️",
    "process": "🔄",
    "data-chart": "📊",
    "table": "📈",
    "closing": "🙏",
  };
  return icons[role] || "📄";
}

// ── Module Exports ───────────────────────────────────────────────

module.exports = {
  planDeck,
  calculateTargetSlideCount,
  generateOutlinePreview,
  allocateSlidesToSections,
  generateSlideEntries,
  determineSlideRole,
  suggestVisual,
  extractKeyMessage,
  preserveSourceRefs,
  checkConstraints,
  // Constants for testing
  LINES_PER_SLIDE_RATIO,
  MIN_SLIDES,
  MAX_SLIDES,
  DEFAULT_CUSTOM_PATTERN,
  NARRATIVE_PATTERNS_FALLBACK,
};
