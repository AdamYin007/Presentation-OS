/**
 * @awe/document-ingest — Public API (M12.26)
 *
 * Provides a unified entry point for document ingestion.
 * Auto-detects input format and routes to the appropriate parser.
 * Content plans (### Slide N headers) are parsed directly into structured slides.
 */

const { ingestPlainText } = require("./plain-text.js");
const { ingestMarkdown } = require("./markdown.js");
const { looksLikeContentPlan, parseContentPlan } = require("./content-plan.js");
const { validateSourceDocumentModel } = require("./schema.js");

function ingestDocument(content, { format, ...rest } = {}) {
  // Content plan detection takes priority
  if (!format || format === "auto") {
    if (looksLikeContentPlan(content)) {
      const model = parseContentPlan(content);
      return { model, format: "content-plan" };
    }
  }

  const detectedFormat = detectFormat(content, format);

  let model;
  if (detectedFormat === "markdown") {
    model = ingestMarkdown(content, rest);
  } else {
    model = ingestPlainText(content, rest);
  }

  return { model, format: detectedFormat };
}

function detectFormat(content, formatHint) {
  if (formatHint === "plain-text") return "plain-text";
  if (formatHint === "markdown") return "markdown";
  if (formatHint === "auto") {
    if (
      /^#{1,6}\s+/m.test(content) ||
      /!\[/.test(content) ||
      /^\|/.test(content) ||
      /^[-*+]\s+/m.test(content) ||
      /^\d+\.\s+/m.test(content)
    ) {
      return "markdown";
    }
    return "plain-text";
  }
  if (
    /^#{1,6}\s+/m.test(content) ||
    /!\[/.test(content) ||
    /^\|/.test(content) ||
    /^[-*+]\s+/m.test(content) ||
    /^\d+\.\s+/m.test(content)
  ) {
    return "markdown";
  }
  return "plain-text";
}

module.exports = {
  ingestDocument,
  ingestPlainText,
  ingestMarkdown,
  detectFormat,
  validateSourceDocumentModel: require("./schema.js").validateSourceDocumentModel,
};
