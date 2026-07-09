#!/usr/bin/env node
/**
 * Generate sample SourceDocumentModel JSON outputs from fixture files.
 * Used for demonstration and testing purposes.
 */

const fs = require("fs");
const path = require("path");
const { ingestPlainText } = require("../packages/document-ingest/src/plain-text.js");
const { ingestMarkdown } = require("../packages/document-ingest/src/markdown.js");

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "document-ingest");

// Generate plain text sample output
const textInput = fs.readFileSync(path.join(FIXTURES_DIR, "sample-plain-text.txt"), "utf8");
const textModel = ingestPlainText(textInput, { sourceFile: "sample-plain-text.txt" });
fs.writeFileSync(
  path.join(FIXTURES_DIR, "sample-plain-text-output.json"),
  JSON.stringify(textModel, null, 2)
);
console.log(
  "Plain text:",
  textModel.paragraphs.length,
  "paragraphs,",
  textModel.sections.length,
  "sections"
);

// Generate markdown sample output
const mdInput = fs.readFileSync(path.join(FIXTURES_DIR, "sample-markdown.md"), "utf8");
const mdModel = ingestMarkdown(mdInput, { sourceFile: "sample-markdown.md" });
fs.writeFileSync(
  path.join(FIXTURES_DIR, "sample-markdown-output.json"),
  JSON.stringify(mdModel, null, 2)
);
console.log(
  "Markdown:",
  mdModel.paragraphs.length,
  "paragraphs,",
  mdModel.sections.length,
  "sections,",
  mdModel.tables.length,
  "tables,",
  mdModel.lists.length,
  "lists"
);
