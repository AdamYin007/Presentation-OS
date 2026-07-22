/**
 * SlideSpec Generator — M12.4
 *
 * Converts a DeckPlan into an array of SlideSpec objects.
 * Deterministic mapping from slide planning entries to page-level contracts.
 * No PPTX rendering, no theme/layout engine — just the contract.
 */

"use strict";

const { createDefaultSlideSpec, validateSlideSpec, VALID_LAYOUTS } = require("./schema.js");

/**
 * Map DeckPlan slide roles to SlideSpec layout families.
 * Uses a small set of MVP layouts: title-slide, section-divider,
 * title-and-bullets, two-column, table, comparison, process, roadmap,
 * data-chart, closing, agenda, executive-summary.
 */
const ROLE_TO_LAYOUT = {
  title: "title-slide",
  agenda: "agenda",
  "section-divider": "section-divider",
  "executive-summary": "executive-summary",
  content: "title-and-bullets",
  comparison: "comparison",
  process: "horizontal-process",
  timeline: "timeline",
  roadmap: "roadmap",
  "data-chart": "chart-and-insight",
  table: "table",
  matrix: "matrix",
  architecture: "title-and-bullets",
  "case-study": "two-column",
  recommendation: "title-and-bullets",
  quote: "title-and-bullets",
  "q-and-a": "title-and-bullets",
  closing: "closing",
};

/**
 * Generate SlideSpec[] from a DeckPlan.
 * Each DeckPlan slide entry becomes one SlideSpec with body content,
 * speaker notes, sourceRefs, and layout selection.
 */
function generateSlideSpecs(deckPlan) {
  const specs = [];

  for (const slidePlan of deckPlan.slides) {
    const spec = mapDeckPlanToSlideSpec(slidePlan, deckPlan);
    specs.push(spec);
  }

  // Validate all generated specs
  for (const spec of specs) {
    const validation = validateSlideSpec(spec);
    if (!validation.ok) {
      // Don't throw — record as a warning in the first spec
      if (specs.length > 0) {
        specs[0].designHints = specs[0].designHints || {};
        specs[0].designHints._validationWarnings = specs[0].designHints._validationWarnings || [];
        specs[0].designHints._validationWarnings.push(
          `Slide ${spec.id}: ${validation.errors.join("; ")}`,
        );
      }
    }
  }

  return specs;
}

/**
 * Map a single DeckPlan slide entry to a SlideSpec object.
 */
function mapDeckPlanToSlideSpec(slidePlan, deckPlan) {
  const role = slidePlan.role || "content";
  const sectionTitle = slidePlan.section || "";
  const layout = ROLE_TO_LAYOUT[role] || "title-and-bullets";

  // Generate title based on role
  let title = generateTitle(role, slidePlan, sectionTitle, deckPlan);

  // Generate body content from keyMessage and source data
  const body = generateBody(role, slidePlan, deckPlan, title);

  // Generate speaker notes
  const speakerNotes = generateSpeakerNotes(role, slidePlan, deckPlan, sectionTitle);

  // Map candidateVisual to visualType
  const visualType = mapVisualType(slidePlan.candidateVisual, role);

  // Build sourceRefs from DeckPlan slide
  const sourceRefs = (slidePlan.sourceRefs || []).map((ref) => ({
    sourceId: ref.sourceId || "",
    sourceType: ref.sourceType || "paragraph",
    fileReference: ref.fileReference || "",
  }));

  // Design hints for downstream renderer
  const designHints = {
    density: inferDensity(role, body),
    emphasis: inferEmphasis(role, slidePlan.keyMessage),
    sectionColorHint: sectionTitle,
  };

  return createDefaultSlideSpec({
    id: slidePlan.slideId,
    index: slidePlan.index,
    section: sectionTitle,
    role,
    title,
    subtitle: "",
    keyMessage: slidePlan.keyMessage || "",
    body,
    visualType,
    visualSpec: generateVisualSpec(visualType, role, slidePlan),
    layout,
    speakerNotes,
    sourceRefs,
    designHints,
  });
}

/**
 * Generate a slide title from the DeckPlan entry.
 *
 * For content slides within a section that has multiple slides,
 * generates differentiated titles based on the page-specific source paragraph.
 */
function generateTitle(role, slidePlan, sectionTitle, deckPlan) {
  // If the slide plan already has an explicit title (from content-plan), use it directly
  if (slidePlan._explicitTitle && slidePlan._explicitTitle.trim()) {
    return slidePlan._explicitTitle;
  }

  if (role === "title") {
    return deckPlan.deckTitle || "Untitled";
  }

  if (role === "section-divider") {
    return sectionTitle;
  }

  if (role === "closing") {
    return "Thank You";
  }

  if (role === "agenda") {
    return "Agenda";
  }

  // For content slides, try to generate a page-specific title
  const contentTitle = generateContentTitle(slidePlan, sectionTitle, deckPlan);
  if (contentTitle) {
    return contentTitle;
  }

  // Fallback: section + part number
  const partNum = getPartNumber(slidePlan);
  return `${sectionTitle}${partNum ? ` — Part ${partNum}` : ""}`;
}

/**
 * Generate a differentiated title for a content slide.
 * Uses the page-specific source paragraph to create a unique conclusion title.
 */
function generateContentTitle(slidePlan, sectionTitle, deckPlan) {
  const km = (slidePlan.keyMessage || "").trim();

  // Try to extract page-specific insight from source paragraph
  const pageSpecificInsight = extractPageSpecificInsight(slidePlan, deckPlan);

  if (pageSpecificInsight) {
    return pageSpecificInsight;
  }

  // If no page-specific insight, check if this is the only slide in its section
  const sectionSlides = deckPlan.slides.filter(
    (s) => s.section === slidePlan.section && s.role !== "section-divider",
  );

  if (sectionSlides.length <= 1) {
    // Only one slide in this section, safe to use keyMessage
    if (km && km.length < 60) {
      return km;
    }
  } else {
    // Multiple slides in section - use keyMessage only if it contains page-specific info
    // (e.g., includes a data point, specific finding, or numbered item)
    if (km && km.length < 60 && isDifferentiatedKeyMessage(km, slidePlan, sectionSlides)) {
      return km;
    }
  }

  return null;
}

/**
 * Extract page-specific insight from the source paragraph assigned to this slide.
 */
function extractPageSpecificInsight(slidePlan, deckPlan) {
  // Find the section this slide belongs to
  const section = deckPlan.sections.find((s) => s.title === slidePlan.section);

  if (!section || !section.sourceParagraphs || section.sourceParagraphs.length === 0) {
    return null;
  }

  // Find which paragraph index this slide should use (round-robin distribution)
  const sectionSlides = deckPlan.slides.filter(
    (s) => s.section === slidePlan.section && s.role !== "section-divider",
  );
  const slideLocalIdx = sectionSlides.findIndex((s) => s.index === slidePlan.index);

  if (slideLocalIdx < 0) {
    return null;
  }

  // Use modular indexing so we don't exceed available paragraphs
  const paraIdx = slideLocalIdx % section.sourceParagraphs.length;
  const para = section.sourceParagraphs[paraIdx];
  if (!para || !para.originalText) {
    return null;
  }

  // Extract a concise conclusion from the source paragraph
  const text = para.originalText.trim();

  // If text is short enough, use it directly
  if (text.length <= 80) {
    return text;
  }

  // Otherwise, extract first meaningful clause (up to 80 chars)
  const match = text.match(/^.{1,80}(?:\s*[,.。；；]|$)/);
  if (match) {
    return match[0].replace(/[,.。；；]$/, "").trim();
  }

  return text.substring(0, 80).trim();
}

/**
 * Check if a keyMessage is already differentiated from other slides in the same section.
 */
function isDifferentiatedKeyMessage(keyMessage, currentSlide, sectionSlides) {
  // Count how many other slides in this section have similar keyMessage
  let similarCount = 0;
  const normalizedCurrent = normalizeForComparison(keyMessage);

  for (const otherSlide of sectionSlides) {
    if (otherSlide.index === currentSlide.index) continue;

    const otherKm = (otherSlide.keyMessage || "").trim();
    if (normalizeForComparison(otherKm) === normalizedCurrent) {
      similarCount++;
    }
  }

  // If more than 50% of other slides have the same keyMessage, it's not differentiated
  return similarCount < sectionSlides.length / 2;
}

/**
 * Normalize text for comparison (lowercase, trim, remove punctuation).
 */
function normalizeForComparison(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "");
}

function getPartNumber(slidePlan) {
  const idx = slidePlan.index || 1;
  // Simple heuristic: if index is a multiple of section allocation, it's a new part
  // For MVP, just return the slide index as a simple identifier
  return idx;
}

/**
 * Generate body content items for a slide.
 * Uses keyMessage and source data to produce 1-5 bullet points.
 */
function generateBody(role, slidePlan, deckPlan, title) {
  // Section dividers and special roles have empty body
  if (role === "section-divider" || role === "title" || role === "closing") {
    return [];
  }

  const body = [];
  const keyMsg = slidePlan.keyMessage || "";
  const MAX_BULLETS = 5;

  // ── Explicit content plan: use pre-parsed bodyItems directly ──
  if (Array.isArray(slidePlan.bodyItems) && slidePlan.bodyItems.length > 0) {
    for (const item of slidePlan.bodyItems) {
      if (!item) continue;
      let bullet = item.trim();
      // Strip Markdown ** bold markers for plain text rendering
      bullet = bullet.replace(/\*\*(.*?)\*\*/g, "$1");
      // Skip known metadata marker lines (e.g. "标题：xxx", "内容：xxx")
      if (/^(?:标题|副标题|关键句|模板要求|视觉建议|边界|内容)[：:]/.test(bullet)) continue;
      if (bullet.length < 2) continue;
      if (bullet.length > 120) bullet = bullet.slice(0, 117) + "...";
      body.push(bullet);
      if (body.length >= MAX_BULLETS) break;
    }
    if (body.length > 0) return body;
  }

  // Try to get source paragraph text from deckPlan sections
  if (deckPlan.sections && slidePlan.sourceRefs && slidePlan.sourceRefs.length > 0) {
    const section = deckPlan.sections.find((s) => s.title === slidePlan.section);
    if (section && section.sourceParagraphs && section.sourceParagraphs.length > 0) {
      // Distribute paragraphs across slides in this section by position
      const sectionSlides = deckPlan.slides.filter(
        (s) => s.section === slidePlan.section && s.role !== "section-divider",
      );
      const slideLocalIdx = sectionSlides.findIndex((s) => s.index === slidePlan.index);
      const totalSourcePara = section.sourceParagraphs.length;

      if (totalSourcePara > 0) {
        // Each slide gets up to MAX_BULLETS paragraphs starting from its local index
        // Use modular indexing so slides with few paragraphs still get content
        const startIdx = slideLocalIdx % Math.max(1, totalSourcePara);
        let count = 0;
        for (let i = 0; i < totalSourcePara && count < MAX_BULLETS; i++) {
          const paraIdx = (startIdx + i) % totalSourcePara;
          const para = section.sourceParagraphs[paraIdx];
          if (para && para.originalText) {
            let bullet = para.originalText.trim();

            // Avoid title/body duplication: truncate bullets that are identical or
            // prefix-similar to the slide title (which comes from the same paragraph)
            const titleLower = (title || "").toLowerCase().trim();
            if (titleLower && bullet.toLowerCase().startsWith(titleLower)) {
              // Bullet is a prefix/extension of title — skip the title portion
              // and take the remainder, or fall back to keyMessage
              const remainder = bullet.substring(titleLower.length).trim();
              if (remainder && remainder.length > 10) {
                bullet = remainder;
              } else {
                // Remainder too short — use keyMessage instead
                bullet = keyMsg;
              }
            }

            if (bullet && bullet.length > 120) {
              bullet = bullet.slice(0, 117) + "...";
            }
            if (bullet) {
              body.push(bullet);
              count++;
            }
          }
        }
      }
    }
  }

  // Deduplicate body items that are identical to the title (case-insensitive)
  const titleNorm = (title || "")
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]+$/, "");
  const deduped = [];
  for (const item of body) {
    const itemNorm = item
      .trim()
      .toLowerCase()
      .replace(/[.,!?;:]+$/, "");
    if (!titleNorm || titleNorm !== itemNorm) {
      deduped.push(item);
    }
  }

  // If all body items were duplicates of the title, fall back to keyMessage
  if (deduped.length === 0 && body.length > 0) {
    if (keyMsg && !titleNorm) {
      deduped.push(keyMsg);
    } else if (keyMsg) {
      const keyMsgNorm = keyMsg
        .trim()
        .toLowerCase()
        .replace(/[.,!?;:]+$/, "");
      if (keyMsgNorm !== titleNorm) {
        deduped.push(keyMsg);
      } else {
        // Title and keyMessage are the same — use the first available source item
        // or an empty body (slide should have been designed differently)
        deduped.push("");
      }
    } else {
      deduped.push("");
    }
  }

  // Fallback: if no source paragraphs found, use keyMessage
  // But never push a body item identical to the title
  if (deduped.length === 0 && keyMsg) {
    const trimmedTitle = title.trim();
    if (keyMsg.trim() !== trimmedTitle) {
      deduped.push(keyMsg);
    } else {
      // Title and keyMessage are the same — use first available source paragraph
      const section = deckPlan.sections?.find((s) => s.title === slidePlan.section);
      if (section?.sourceParagraphs?.length > 0) {
        const firstPara = section.sourceParagraphs[0].originalText?.trim();
        if (firstPara) {
          deduped.push(firstPara.length > 120 ? firstPara.slice(0, 117) + "..." : firstPara);
        } else {
          deduped.push("");
        }
      } else {
        deduped.push("");
      }
    }
  }

  // Ensure we don't exceed max bullets after dedup
  while (deduped.length > MAX_BULLETS) {
    deduped.pop();
  }

  return deduped;
}

function generateBodyPoint(index, role, deckPlan) {
  const templates = {
    "data-chart": ["Data point analysis", "Trend observation", "Statistical finding"],
    comparison: ["Alternative A perspective", "Alternative B perspective", "Trade-off analysis"],
    process: ["Step one: preparation", "Step two: execution", "Step three: validation"],
    roadmap: ["Phase 1: Foundation", "Phase 2: Expansion", "Phase 3: Optimization"],
    "executive-summary": ["Bottom line summary", "Key recommendation", "Expected impact"],
    content: ["Supporting detail", "Evidence point", "Contextual note"],
  };

  const pool = templates[role] || templates["content"];
  return pool[index % pool.length];
}

/**
 * Generate speaker notes for a slide.
 */
function generateSpeakerNotes(role, slidePlan, deckPlan, sectionTitle) {
  if (role === "section-divider" || role === "title" || role === "closing") {
    return "";
  }

  const notes = [];

  // Page purpose
  notes.push(`Purpose: ${slidePlan.objective || slidePlan.keyMessage}`);

  // Key argument
  if (slidePlan.keyMessage) {
    notes.push(`Key argument: ${slidePlan.keyMessage}`);
  }

  // Transition
  const nextSlide = findNextSlide(slidePlan, deckPlan);
  if (nextSlide) {
    notes.push(`Transition: Next slide covers ${nextSlide.keyMessage}`);
  }

  // Suggested duration
  const totalSlides = deckPlan.slides.length;
  const durationPerSlide = totalSlides > 0 ? Math.floor(60 / totalSlides) : 5;
  notes.push(`Suggested duration: ~${durationPerSlide}s`);

  return notes.join("\n");
}

function findNextSlide(currentSlide, deckPlan) {
  const idx = currentSlide.index || 0;
  const next = deckPlan.slides.find((s) => s.index === idx + 1);
  return next || null;
}

/**
 * Map candidateVisual to standard visualType.
 */
function mapVisualType(candidate, role) {
  if (!candidate || candidate === "none") {
    // Determine visual type from role
    const roleVisualMap = {
      "data-chart": "bar-chart",
      comparison: "comparison",
      process: "process",
      roadmap: "timeline",
      "case-study": "image",
      table: "table",
      matrix: "matrix",
    };
    return roleVisualMap[role] || "none";
  }
  return candidate;
}

/**
 * Generate visualSpec based on visualType and role.
 */
function generateVisualSpec(visualType, role, slidePlan) {
  if (visualType === "none") return {};

  const spec = {};

  if (
    ["bar-chart", "line-chart", "area-chart", "pie-chart", "scatter-chart"].includes(visualType)
  ) {
    spec.type = visualType;
    spec.hasDataLabel = true;
    spec.hasLegend = true;
  }

  if (visualType === "table") {
    spec.columns = 2;
    spec.rows = Math.max(3, (slidePlan.sourceRefs || []).length + 1);
  }

  if (visualType === "process" || visualType === "timeline" || visualType === "roadmap") {
    spec.steps = [1, 2, 3];
    spec.direction = "horizontal";
  }

  if (visualType === "comparison") {
    spec.columns = 2;
    spec.hasHeader = true;
  }

  return spec;
}

/**
 * Infer content density from body items.
 */
function inferDensity(role, body) {
  if (role === "section-divider" || role === "title") return "sparse";
  if (body.length <= 1) return "sparse";
  if (body.length <= 3) return "medium";
  return "dense";
}

/**
 * Infer emphasis level from key message.
 */
function inferEmphasis(role, keyMessage) {
  if (role === "executive-summary" || role === "recommendation") return "high";
  if (role === "data-chart" || role === "table") return "medium";
  return "low";
}

module.exports = {
  generateSlideSpecs,
  ROLE_TO_LAYOUT,
};
