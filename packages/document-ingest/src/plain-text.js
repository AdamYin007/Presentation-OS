/**
 * Plain text ingestion module.
 *
 * Converts a plain text string into a SourceDocumentModel JSON representation.
 * The parser performs a simple heuristic split on blank lines to identify
 * paragraphs and top-level headings (lines starting with "# " or uppercase
 * lines ending with ":" or lines that are short and emphatic).
 *
 * This module is intentionally lightweight and domain-agnostic. It does not
 * depend on any third-party libraries beyond Node.js builtins.
 */

const { createEmptySourceDocumentModel } = require("./schema.js");

/**
 * Ingest plain text and produce a SourceDocumentModel.
 *
 * @param {string} text — raw plain text content
 * @param {object} [options]
 * @param {string} [options.title] — explicit document title (falls back to first line)
 * @param {string} [options.sourceFile] — optional file reference for sourceMap
 * @param {object} [options.metadata] — additional metadata to attach
 * @returns {object} SourceDocumentModel
 */
function ingestPlainText(text, { title, sourceFile = "", metadata = {} } = {}) {
  const model = createEmptySourceDocumentModel({
    title: title || extractTitleFromText(text),
    metadata: { ...metadata, sourceType: "plain-text" },
  });

  const lines = text.split("\n");
  let currentSection = null;
  let sourceOrder = 0;
  let paraIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed === "") {
      continue;
    }

    // Detect section headers (simple heuristic: ALL CAPS line or line ending with ":")
    const isSectionHeader =
      trimmed === trimmed.toUpperCase() &&
      trimmed.length > 3 &&
      trimmed.length < 100 &&
      /[A-Z]/.test(trimmed);

    if (isSectionHeader) {
      currentSection = { name: trimmed, order: sourceOrder };
      model.sections.push({
        sourceId: `sec-${String(paraIndex).padStart(3, "0")}`,
        sourceType: "section",
        sourceOrder: sourceOrder++,
        originalText: trimmed,
        sectionPath: [trimmed],
        confidence: 0.9,
        fileReference: sourceFile || "stdin",
        origin: "sourced",
      });
      model.sourceMap.push({
        sourceId: `sec-${String(paraIndex).padStart(3, "0")}`,
        sourceType: "section",
        sourceOrder: sourceOrder - 1,
        lineNumbers: [i + 1],
        fileReference: sourceFile || "stdin",
      });
      continue;
    }

    // Treat consecutive non-empty, non-header lines as a paragraph
    const paraText = accumulateParagraph(lines, i);
    const paraId = `para-${String(paraIndex).padStart(3, "0")}`;
    const sectionPath = currentSection ? [currentSection.name] : [""];

    model.paragraphs.push({
      sourceId: paraId,
      sourceType: "paragraph",
      sourceOrder: sourceOrder++,
      originalText: paraText,
      sectionPath,
      confidence: 1.0,
      fileReference: sourceFile || "stdin",
      origin: "sourced",
    });

    model.sourceMap.push({
      sourceId: paraId,
      sourceType: "paragraph",
      sourceOrder: sourceOrder - 1,
      lineNumbers: [i + 1],
      fileReference: sourceFile || "stdin",
    });

    // Advance i past the accumulated paragraph lines
    const paraLines = paraText.split("\n");
    i += paraLines.length - 1;
    paraIndex++;
  }

  return model;
}

/**
 * Accumulate consecutive meaningful lines into a single paragraph.
 * @param {string[]} lines
 * @param {number} startIndex
 * @returns {string}
 */
function accumulateParagraph(lines, startIndex) {
  const parts = [];
  for (let i = startIndex; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === "") break;

    // Stop if this looks like a section header
    if (
      trimmed === trimmed.toUpperCase() &&
      trimmed.length > 3 &&
      trimmed.length < 100 &&
      /[A-Z]/.test(trimmed)
    )
      break;

    parts.push(trimmed);
  }
  return parts.join(" ");
}

/**
 * Extract a title from the first non-empty line of text.
 * @param {string} text
 * @returns {string}
 */
function extractTitleFromText(text) {
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return "Untitled";
}

module.exports = {
  ingestPlainText,
  extractTitleFromText,
};
