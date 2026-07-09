/**
 * @awe/document-ingest — Public API
 *
 * Provides a unified entry point for document ingestion.
 * Detects input format and routes to the appropriate parser.
 */

const { ingestPlainText } = require("./plain-text.js");
const { ingestMarkdown } = require("./markdown.js");
const { validateSourceDocumentModel } = require("./schema.js");

/**
 * Auto-detect input format and ingest document to SourceDocumentModel.
 *
 * @param {string} content — raw document content
 * @param {object} [options]
 * @param {"auto"|"plain-text"|"markdown"} [options.format] — input format hint
 * @param {string} [options.title] — explicit document title
 * @param {string} [options.sourceFile] — optional file reference
 * @param {object} [options.metadata] — additional metadata
 * @returns {{ model: object, format: string }}
 */
function ingestDocument(content, { format, ...rest } = {}) {
  const detectedFormat = detectFormat(content, format);

  let model;
  if (detectedFormat === "markdown") {
    model = ingestMarkdown(content, rest);
  } else {
    model = ingestPlainText(content, rest);
  }

  return { model, format: detectedFormat };
}

/**
 * Detect the input format from content and/or explicit hint.
 * @param {string} content
 * @param {"auto"|"plain-text"|"markdown"|undefined} formatHint
 * @returns {"plain-text"|"markdown"}
 */
function detectFormat(content, formatHint) {
  if (formatHint === "plain-text") return "plain-text";
  if (formatHint === "markdown") return "markdown";
  if (formatHint === "auto") {
    // Heuristic: if content has Markdown syntax, treat as markdown
    if (/^#{1,6}\s+/m.test(content) || /!\[/.test(content) || /^\|/.test(content) || /^[-*+]\s+/m.test(content) || /^\d+\.\s+/m.test(content)) {
      return "markdown";
    }
    return "plain-text";
  }
  // Default: auto-detect
  if (/^#{1,6}\s+/m.test(content) || /!\[/.test(content) || /^\|/.test(content) || /^[-*+]\s+/m.test(content) || /^\d+\.\s+/m.test(content)) {
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
