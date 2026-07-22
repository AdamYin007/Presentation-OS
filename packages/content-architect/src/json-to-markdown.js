/**
 * Bridge: Architect JSON → ### Slide N Markdown format
 *
 * Converts the Content Architect's structured JSON output into the
 * markdown content-plan format that document-ingest already understands.
 * This allows seamless integration without modifying downstream modules.
 */

const { mapLayoutToRole, mapLayoutToSlideSpecLayout } = require("./schema.js");

/**
 * Convert architect slides array to markdown content plan string.
 * 
 * @param {object[]} architectSlides - Array of slide objects from architect()
 * @returns {string} Markdown formatted as ### Slide N headers
 */
function architectToMarkdown(architectSlides) {
  if (!Array.isArray(architectSlides) || architectSlides.length === 0) {
    return "# PPT Content Plan\n\n";
  }

  const lines = [];
  lines.push("# PPT Content Plan\n");
  lines.push(`---\ntitle: ${architectSlides[0]?.title || "Presentation"}\nlayout_type: architect\n---\n`);

  for (const slide of architectSlides) {
    // Convert slide_id to 1-indexed slide number
    const slideNum = slide.slide_id;
    
    // Determine role from layout type
    const role = mapLayoutToRole(slide.type);
    
    // Map layout type to SlideSpec layout
    const layout = mapLayoutToSlideSpecLayout(slide.type);

    lines.push(`### Slide ${slideNum} — ${slide.title}\n`);
    
    // Add metadata fields
    lines.push(`**标题**：${slide.title}\n`);
    if (slide.subtitle && slide.subtitle.trim()) {
      lines.push(`**副标题**：${slide.subtitle}\n`);
    }
    
    // Key message (first content item or title itself)
    const keyMsg = (slide.content && slide.content[0]) || slide.title;
    lines.push(`**关键句**：${keyMsg}\n`);
    
    // Layout type hint
    lines.push(`**模板要求**：${slide.type} (${layout})\n`);
    
    // Visual suggestion
    if (slide.visual_suggestion && slide.visual_suggestion.trim()) {
      lines.push(`**视觉建议**：${slide.visual_suggestion}\n`);
    }
    
    // Body content
    if (slide.content && Array.isArray(slide.content) && slide.content.length > 0) {
      lines.push("**内容**：\n");
      for (const item of slide.content) {
        lines.push(`- ${item}\n`);
      }
    }
    
    // Speaker notes
    if (slide.notes && slide.notes.trim()) {
      lines.push(`**演讲备注**：${slide.notes}\n`);
    }
    
    // Section divider marker for special slides
    if (slide.type === "SectionDivider") {
      lines.push("---\n");
    }
  }

  return lines.join("\n");
}

/**
 * Convert architect slides to a SourceDocumentModel-compatible object.
 * This is an alternative output format for direct pipeline injection.
 * 
 * @param {object[]} architectSlides - Array of slide objects
 * @returns {object} SourceDocumentModel with paragraphs
 */
function architectToSourceDocument(architectSlides) {
  const model = {
    schemaVersion: "1.0.0",
    title: architectSlides[0]?.title || "Presentation",
    metadata: { sourceType: "content-plan" },
    sections: [],
    paragraphs: [],
    lists: [],
    tables: [],
    images: [],
    dataBlocks: [],
    sourceMap: [],
  };

  for (const slide of architectSlides) {
    const role = mapLayoutToRole(slide.type);
    const bodyItems = slide.content || [];
    
    const paragraph = {
      sourceId: `slide-${String(slide.slide_id).padStart(2, "0")}`,
      sourceType: "slide-content",
      sourceOrder: slide.slide_id,
      originalText: slide.title,
      sectionPath: [slide.type],
      confidence: 1.0,
      fileReference: "",
      origin: "sourced",
      slideNumber: slide.slide_id,
      slideTitle: slide.title,
      role,
      title: slide.title,
      subtitle: slide.subtitle || "",
      keyMessage: bodyItems[0] || slide.title,
      templateRequirement: `${slide.type} (${mapLayoutToSlideSpecLayout(slide.type)})`,
      bodyItems,
      visualSuggestion: slide.visual_suggestion || "",
      speakerNotes: slide.notes || "",
    };

    model.paragraphs.push(paragraph);
    model.sourceMap.push({
      sourceId: paragraph.sourceId,
      sourceType: "slide-content",
      sourceOrder: slide.slide_id,
      lineNumbers: [slide.slide_id],
      fileReference: "",
    });
  }

  return model;
}

module.exports = {
  architectToMarkdown,
  architectToSourceDocument,
};
