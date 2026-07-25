/**
 * @awe/document-ingest — Content Plan Parser (M12.26)
 *
 * Detects and parses PPT content plans with explicit ### Slide N headers.
 * When found, extracts structured slide data directly instead of treating
 * the document as a generic article.
 */

const { createEmptySourceDocumentModel } = require("./schema.js");

function looksLikeContentPlan(content) {
  const slideMatches = (content.match(/###\s+Slide\s+\d+/g) || []);
  return slideMatches.length >= 3;
}

function parseContentPlan(content) {
  const model = createEmptySourceDocumentModel({
    title: "PPT Content Plan",
    metadata: { sourceType: "content-plan" },
  });

  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and non-slide headers
    if (trimmed === "" || !trimmed.startsWith("### Slide ")) {
      i++;
      continue;
    }

    // Parse slide header: ### Slide N — Title
    const match = trimmed.match(/^###\s+Slide\s+(\d+)\s*[—\-]\s*(.+)$/);
    if (!match) {
      i++;
      continue;
    }

    const slideNum = parseInt(match[1], 10);
    const slideTitle = match[2].trim();

    // Collect body lines until next ### Slide or ---
    const bodyLines = [];
    i++;
    while (i < lines.length) {
      const nextLine = lines[i].trim();
      if (nextLine.startsWith("### Slide ") || nextLine === "---") break;
      bodyLines.push(lines[i]);
      i++;
    }

    const bodyText = bodyLines.join("\n").trim();

    // Extract structured fields from body
    const titleMatch = bodyText.match(/\*\*标题\*\*[:：]\s*(.+)/);
    const subtitleMatch = bodyText.match(/\*\*副标题\*\*[:：]\s*(.+)/);
    const keyMessageMatch = bodyText.match(/\*\*关键句\*\*[:：]\s*(.+)/);
    const templateMatch = bodyText.match(/\*\*模板要求\*\*[:：]\s*(.+)/);

    const items = [];

    // ── 1. Bullet list items: "- text", "* text", "+ text" ──
    const itemRegex = /^(?:\s*)[-*+] (?!.*\*\*(?:标题|副标题|关键句|模板要求|视觉建议|内容)\*\*)(.+)$/gm;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(bodyText)) !== null) {
      const text = itemMatch[1].trim();
      if (!text) continue;
      items.push(text);
    }

    // ── 2. Numbered list items: "1. text" or "2) text" ──
    const numRegex = /^(?:\s*)\d+[.)] (?!.*\*\*(?:标题|副标题|关键句|模板要求|视觉建议|内容)\*\*)(.+)$/gm;
    let numMatch;
    while ((numMatch = numRegex.exec(bodyText)) !== null) {
      const text = numMatch[1].trim();
      if (!text) continue;
      if (!items.includes(text)) {
        items.push(text);
      }
    }

    // ── 3. Markdown tables: convert each data row into a bullet ──
    const tableRows = bodyText.match(/^\|(.+)\|$/gm);
    if (tableRows && tableRows.length >= 2) {
      let seenSeparator = false;
      for (let t = 0; t < tableRows.length; t++) {
        const raw = tableRows[t].replace(/^\|(.+)\|$/, "$1").trim();
        if (!raw) continue;
        // Skip separator rows: all cells are dashes/colons/pipes only
        const stripped = raw.replace(/[|\s:-]/g, "");
        if (stripped.length === 0 || /^[-]+$/.test(stripped)) {
          seenSeparator = true;
          continue;
        }
        // Skip header row (before separator)
        if (!seenSeparator) continue;
        // Skip rows with fewer than 2 cells
        const cells = raw.split("|").map(c => c.trim()).filter(c => c.length > 0);
        if (cells.length < 2) continue;
        const bullet = cells.join("：");
        if (!items.includes(bullet)) {
          items.push(bullet);
        }
      }
    }

    // Determine role from title/section
    let role = "content";
    if (/封面/.test(slideTitle) || slideNum === 1) role = "title";
    else if (/目录|提纲/.test(slideTitle)) role = "agenda";
    else if (/结语|Thank|感谢|需要院里支持/.test(slideTitle)) role = "closing";
    else if (/第一部分|第二部分|第三部分|第四部分|第五部分|第六部分|开场/.test(slideTitle)) role = "section-divider";

    const paragraph = {
      sourceId: `slide-${String(slideNum).padStart(2, "0")}`,
      sourceType: "slide-content",
      sourceOrder: slideNum,
      originalText: bodyText,
      sectionPath: [`Slide ${slideNum}`],
      confidence: 1.0,
      fileReference: "",
      origin: "sourced",
      slideNumber: slideNum,
      slideTitle,
      role,
      title: titleMatch ? titleMatch[1] : slideTitle,
      subtitle: subtitleMatch ? subtitleMatch[1] : "",
      keyMessage: keyMessageMatch ? keyMessageMatch[1] : "",
      templateRequirement: templateMatch ? templateMatch[1] : "",
      bodyItems: items,
    };

    model.paragraphs.push(paragraph);
    model.sourceMap.push({
      sourceId: paragraph.sourceId,
      sourceType: "slide-content",
      sourceOrder: slideNum,
      lineNumbers: [i - bodyLines.length + 1],
      fileReference: "",
    });
  }

  return model;
}

module.exports = {
  looksLikeContentPlan,
  parseContentPlan,
};
