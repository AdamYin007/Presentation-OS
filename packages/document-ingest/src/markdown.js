/**
 * Markdown ingestion module.
 *
 * Converts a Markdown string into a SourceDocumentModel JSON representation.
 * Supports a subset of Markdown sufficient for structured document ingestion:
 *   - Headings (h1-h6)
 *   - Paragraphs
 *   - Unordered lists (-, *, +)
 *   - Ordered lists (1., 2., 3.)
 *   - Tables (pipe-delimited)
 *   - Images (![alt](src))
 *   - Code blocks (fenced with ```)
 *
 * This module is intentionally lightweight and domain-agnostic. It implements
 * a simple line-by-line parser rather than depending on a full Markdown AST
 * library, keeping dependencies minimal.
 */

const { createEmptySourceDocumentModel } = require("./schema.js");

/**
 * Ingest Markdown text and produce a SourceDocumentModel.
 *
 * @param {string} markdown — raw Markdown content
 * @param {object} [options]
 * @param {string} [options.title] — explicit document title (falls back to h1)
 * @param {string} [options.sourceFile] — optional file reference for sourceMap
 * @param {object} [options.metadata] — additional metadata to attach
 * @returns {object} SourceDocumentModel
 */
function ingestMarkdown(markdown, { title, sourceFile = "", metadata = {} } = {}) {
  const model = createEmptySourceDocumentModel({
    title: title || extractTitleFromMarkdown(markdown),
    metadata: { ...metadata, sourceType: "markdown" },
  });

  const lines = markdown.split("\n");
  let i = 0;
  let sourceOrder = 0;
  let paraIndex = 0;
  let listIndex = 0;
  let tableIndex = 0;
  let imageIndex = 0;
  let currentSectionPath = [""];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed === "") {
      i++;
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      sourceOrder++;

      // Update current section path based on heading level
      currentSectionPath = currentSectionPath.slice(0, level);
      currentSectionPath.push(headingText);

      model.sections.push({
        sourceId: `sec-${String(sourceOrder).padStart(3, "0")}`,
        sourceType: "heading",
        sourceOrder,
        originalText: headingText,
        sectionPath: [...currentSectionPath],
        confidence: 1.0,
        fileReference: sourceFile || "stdin",
        origin: "sourced",
      });

      model.sourceMap.push({
        sourceId: `sec-${String(sourceOrder).padStart(3, "0")}`,
        sourceType: "heading",
        sourceOrder,
        lineNumbers: [i + 1],
        fileReference: sourceFile || "stdin",
      });

      i++;
      continue;
    }

    // Table (pipe-delimited, must have at least 2 rows with pipes)
    if (trimmed.startsWith("|") && looksLikeTable(lines, i)) {
      const { table, consumed } = parseTable(lines, i);
      table.sourceOrder = sourceOrder++;
      table.sourceId = `tbl-${String(tableIndex).padStart(3, "0")}`;
      table.sectionPath = [...currentSectionPath];
      table.confidence = 0.95;
      table.fileReference = sourceFile || "stdin";
      table.origin = "sourced";
      model.tables.push(table);

      model.sourceMap.push({
        sourceId: table.sourceId,
        sourceType: "table",
        sourceOrder: table.sourceOrder,
        lineNumbers: table.lineRange,
        fileReference: sourceFile || "stdin",
      });

      i += consumed;
      tableIndex++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      const { items, consumed } = parseList(lines, i, false);
      const listEntry = {
        sourceId: `list-${String(listIndex).padStart(3, "0")}`,
        sourceType: "list",
        sourceOrder: sourceOrder++,
        listType: "unordered",
        items,
        sectionPath: [...currentSectionPath],
        confidence: 0.95,
        fileReference: sourceFile || "stdin",
        origin: "sourced",
      };
      model.lists.push(listEntry);

      model.sourceMap.push({
        sourceId: listEntry.sourceId,
        sourceType: "list",
        sourceOrder: listEntry.sourceOrder,
        lineNumbers: listEntry.items.map((_, idx) => i + idx + 1),
        fileReference: sourceFile || "stdin",
      });

      i += consumed;
      listIndex++;
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const { items, consumed } = parseList(lines, i, true);
      const listEntry = {
        sourceId: `list-${String(listIndex).padStart(3, "0")}`,
        sourceType: "list",
        sourceOrder: sourceOrder++,
        listType: "ordered",
        items,
        sectionPath: [...currentSectionPath],
        confidence: 0.95,
        fileReference: sourceFile || "stdin",
        origin: "sourced",
      };
      model.lists.push(listEntry);

      model.sourceMap.push({
        sourceId: listEntry.sourceId,
        sourceType: "list",
        sourceOrder: listEntry.sourceOrder,
        lineNumbers: listEntry.items.map((_, idx) => i + idx + 1),
        fileReference: sourceFile || "stdin",
      });

      i += consumed;
      listIndex++;
      continue;
    }

    // Image
    const imageMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imageMatch) {
      const imageEntry = {
        sourceId: `img-${String(imageIndex).padStart(3, "0")}`,
        sourceType: "image",
        sourceOrder: sourceOrder++,
        altText: imageMatch[1],
        imageUrl: imageMatch[2],
        sectionPath: [...currentSectionPath],
        confidence: 1.0,
        fileReference: sourceFile || "stdin",
        origin: "sourced",
      };
      model.images.push(imageEntry);

      model.sourceMap.push({
        sourceId: imageEntry.sourceId,
        sourceType: "image",
        sourceOrder: imageEntry.sourceOrder,
        lineNumbers: [i + 1],
        fileReference: sourceFile || "stdin",
      });

      i++;
      imageIndex++;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const codeBlock = {
        sourceId: `code-${String(paraIndex).padStart(3, "0")}`,
        sourceType: "code-block",
        sourceOrder: sourceOrder++,
        language: lang || null,
        code: codeLines.join("\n"),
        sectionPath: [...currentSectionPath],
        confidence: 1.0,
        fileReference: sourceFile || "stdin",
        origin: "sourced",
      };
      model.dataBlocks.push(codeBlock);

      model.sourceMap.push({
        sourceId: codeBlock.sourceId,
        sourceType: "code-block",
        sourceOrder: codeBlock.sourceOrder,
        lineNumbers: [i - codeLines.length],
        fileReference: sourceFile || "stdin",
      });

      continue;
    }

    // Paragraph: accumulate consecutive non-special lines
    const paraText = accumulateParagraph(lines, i);
    const paraEntry = {
      sourceId: `para-${String(paraIndex).padStart(3, "0")}`,
      sourceType: "paragraph",
      sourceOrder: sourceOrder++,
      originalText: paraText,
      sectionPath: [...currentSectionPath],
      confidence: 1.0,
      fileReference: sourceFile || "stdin",
      origin: "sourced",
    };
    model.paragraphs.push(paraEntry);

    model.sourceMap.push({
      sourceId: paraEntry.sourceId,
      sourceType: "paragraph",
      sourceOrder: paraEntry.sourceOrder,
      lineNumbers: [i + 1],
      fileReference: sourceFile || "stdin",
    });

    const paraLineCount = paraText.split("\n").length;
    i += paraLineCount;
    paraIndex++;
  }

  return model;
}

/**
 * Check if lines starting at index form a pipe-delimited table.
 * @param {string[]} lines
 * @param {number} startIndex
 * @returns {boolean}
 */
function looksLikeTable(lines, startIndex) {
  let pipeCount = 0;
  let rowCount = 0;
  for (let j = startIndex; j < Math.min(startIndex + 5, lines.length); j++) {
    const trimmed = lines[j].trim();
    if (trimmed === "") break;
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (!isSeparatorRow(trimmed)) {
        pipeCount++;
        rowCount++;
      }
    }
    if (rowCount >= 2 && pipeCount >= 2) return true;
  }
  return false;
}

/**
 * Parse a pipe-delimited table.
 * @param {string[]} lines
 * @param {number} startIndex
 * @returns {{ table: object, consumed: number }}
 */
function parseTable(lines, startIndex) {
  const rows = [];
  let headerParsed = false;
  let consumed = 0;

  for (let j = startIndex; j < lines.length; j++) {
    const trimmed = lines[j].trim();
    if (trimmed === "") break;

    // Skip separator rows (e.g., |---|---| or | :--- | :--- |)
    if (isSeparatorRow(trimmed)) {
      consumed++;
      continue;
    }

    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) break;

    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim());

    if (!headerParsed) {
      rows.header = cells;
      headerParsed = true;
    } else {
      rows.push(cells);
    }
    consumed++;
  }

  const lineRange = [];
  for (let k = 0; k < consumed; k++) lineRange.push(startIndex + k + 1);

  return {
    table: {
      header: rows.header || [],
      rows: Array.isArray(rows.header) ? rows : [],
      lineRange,
      columnCount: (rows.header || []).length,
    },
    consumed,
  };
}

/**
 * Check if a trimmed line is a Markdown table separator row.
 * Matches patterns like: |---|---|, | :--- | :--- |, |---|:---|
 */
function isSeparatorRow(line) {
  if (!line.startsWith("|") || !line.endsWith("|")) return false;
  // Remove pipes and trim, check if only dashes, colons, spaces, underscores remain
  const withoutPipes = line.replace(/\|/g, "").trim();
  return /^[:\-_\s]+$/.test(withoutPipes) && withoutPipes.length > 0;
}

/**
 * Parse a list (ordered or unordered).
 * @param {string[]} lines
 * @param {number} startIndex
 * @param {boolean} ordered
 * @returns {{ items: string[], consumed: number }}
 */
function parseList(lines, startIndex, ordered) {
  const items = [];
  const pattern = ordered ? /^\d+\.\s+(.+)$/ : /^[-*+]\s+(.+)$/;

  for (let j = startIndex; j < lines.length; j++) {
    const trimmed = lines[j].trim();
    if (trimmed === "") break;

    const match = trimmed.match(pattern);
    if (match) {
      items.push(match[1]);
    } else {
      break;
    }
  }

  return { items, consumed: items.length };
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

    // Stop at special constructs
    if (/^#{1,6}\s+/.test(trimmed)) break;
    if (trimmed.startsWith("|")) break;
    if (/^[-*+]\s+/.test(trimmed)) break;
    if (/^\d+\.\s+/.test(trimmed)) break;
    if (trimmed.startsWith("```")) break;
    if (/^!\[/.test(trimmed)) {
      // Only take the image line, not more
      parts.push(trimmed);
      return parts.join(" ");
    }

    parts.push(trimmed);
  }
  return parts.join(" ");
}

/**
 * Extract title from the first h1 heading in Markdown.
 * @param {string} markdown
 * @returns {string}
 */
function extractTitleFromMarkdown(markdown) {
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) return match[1].trim();
  }
  // Fallback: first non-empty line
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return "Untitled";
}

module.exports = {
  ingestMarkdown,
  extractTitleFromMarkdown,
};
