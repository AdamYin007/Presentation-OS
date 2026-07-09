// Tests for Document Ingestion module (M12.1)
// Run: node tests/document-ingest/document-ingest.test.js

const {
  ingestDocument,
  ingestPlainText,
  ingestMarkdown,
  detectFormat,
} = require("../../packages/document-ingest/src/index.js");
const {
  createEmptySourceDocumentModel,
  validateSourceDocumentModel,
} = require("../../packages/document-ingest/src/schema.js");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log("\n📄 Document Ingestion Tests (M12.1)");
console.log("====================================\n");

// ── Schema Tests ──
console.log("Schema:");

test("createEmptySourceDocumentModel returns valid structure", () => {
  const model = createEmptySourceDocumentModel({ title: "Test" });
  assert(model.schemaVersion === "1.0.0", "schemaVersion mismatch");
  assert(model.title === "Test", "title mismatch");
  assert(Array.isArray(model.sections), "sections not array");
  assert(Array.isArray(model.paragraphs), "paragraphs not array");
  assert(Array.isArray(model.lists), "lists not array");
  assert(Array.isArray(model.tables), "tables not array");
  assert(Array.isArray(model.images), "images not array");
  assert(Array.isArray(model.dataBlocks), "dataBlocks not array");
  assert(Array.isArray(model.sourceMap), "sourceMap not array");
});

test("validateSourceDocumentModel accepts valid model", () => {
  const model = createEmptySourceDocumentModel({ title: "Valid" });
  const result = validateSourceDocumentModel(model);
  assert(result.ok === true, `Should be valid, errors: ${result.errors.join(", ")}`);
});

test("validateSourceDocumentModel rejects missing fields", () => {
  const result = validateSourceDocumentModel({});
  assert(result.ok === false, "Should be invalid");
  assert(result.errors.length > 0, "Should have errors");
});

test("validateSourceDocumentModel rejects null", () => {
  const result = validateSourceDocumentModel(null);
  assert(result.ok === false, "null should be invalid");
});

// ── Plain Text Ingestion Tests ──
console.log("\nPlain Text Ingestion:");

test("ingestPlainText basic text produces paragraphs", () => {
  const model = ingestPlainText("Hello world.\nThis is a test.");
  assert(model.paragraphs.length > 0, "Should have paragraphs");
  assert(model.paragraphs[0].sourceType === "paragraph");
  assert(model.paragraphs[0].origin === "sourced");
});

test("ingestPlainText detects section headers", () => {
  const model = ingestPlainText("INTRODUCTION\nSome intro text.\nCONCLUSION\nFinal thoughts.");
  assert(model.sections.length > 0, "Should have sections");
  assert(model.sections.some((s) => s.originalText === "INTRODUCTION"));
  assert(model.sections.some((s) => s.originalText === "CONCLUSION"));
});

test("ingestPlainText preserves sourceMap entries", () => {
  const model = ingestPlainText("Line one.\nLine two.");
  assert(model.sourceMap.length > 0, "Should have sourceMap entries");
  assert(model.sourceMap.every((ref) => ref.sourceId && ref.sourceType && ref.sourceOrder !== undefined));
});

test("ingestPlainText with explicit title", () => {
  const model = ingestPlainText("Some text", { title: "My Title", sourceFile: "test.txt" });
  assert(model.title === "My Title", "Title should match explicit value");
  assert(model.sourceMap[0]?.fileReference === "test.txt", "fileReference should be set");
});

test("ingestPlainText infers title from first line", () => {
  const model = ingestPlainText("First line is title\nSecond line is content.");
  assert(model.title === "First line is title", "Title should be first non-empty line");
});

test("ingestPlainText empty text", () => {
  const model = ingestPlainText("");
  assert(model.title === "Untitled", "Empty text should have Untitled title");
  assert(model.paragraphs.length === 0, "No paragraphs expected");
});

test("ingestPlainText metadata attachment", () => {
  const model = ingestPlainText("Content", { metadata: { author: "Test" } });
  assert(model.metadata.author === "Test", "Custom metadata should be attached");
  assert(model.metadata.sourceType === "plain-text", "sourceType should be plain-text");
});

// ── Markdown Ingestion Tests ──
console.log("\nMarkdown Ingestion:");

test("ingestMarkdown parses headings as sections", () => {
  const model = ingestMarkdown("# Main Title\n## Subtitle\nSome content.");
  assert(model.sections.length > 0, "Should have sections from headings");
  assert(model.sections.some((s) => s.originalText === "Main Title"));
});

test("ingestMarkdown extracts title from h1", () => {
  const model = ingestMarkdown("# Document Title\n\nBody text.");
  assert(model.title === "Document Title", "Title should come from h1");
});

test("ingestMarkdown parses paragraphs", () => {
  const model = ingestMarkdown("# Title\n\nFirst paragraph.\n\nSecond paragraph.");
  assert(model.paragraphs.length >= 2, "Should have at least 2 paragraphs");
});

test("ingestMarkdown parses unordered lists", () => {
  const model = ingestMarkdown("# Title\n\n- Item one\n- Item two\n- Item three");
  assert(model.lists.length > 0, "Should have lists");
  assert(model.lists[0].listType === "unordered", "Should be unordered list");
  assert(model.lists[0].items.length === 3, "Should have 3 items");
});

test("ingestMarkdown parses ordered lists", () => {
  const model = ingestMarkdown("# Title\n\n1. First step\n2. Second step\n3. Third step");
  assert(model.lists.length > 0, "Should have lists");
  assert(model.lists[0].listType === "ordered", "Should be ordered list");
  assert(model.lists[0].items.length === 3, "Should have 3 items");
});

test("ingestMarkdown parses pipe tables", () => {
  const model = ingestMarkdown("# Title\n\n| Col A | Col B |\n|---|---|\n| Val 1 | Val 2 |\n| Val 3 | Val 4 |");
  assert(model.tables.length > 0, "Should have tables");
  assert(model.tables[0].header.length === 2, "Header should have 2 columns");
  assert(model.tables[0].rows.length === 2, "Should have 2 data rows");
});

test("ingestMarkdown parses images", () => {
  const model = ingestMarkdown("# Title\n\n![Alt text](https://example.com/image.png)");
  assert(model.images.length > 0, "Should have images");
  assert(model.images[0].altText === "Alt text", "Alt text should match");
  assert(model.images[0].imageUrl === "https://example.com/image.png", "URL should match");
});

test("ingestMarkdown parses fenced code blocks", () => {
  const model = ingestMarkdown("# Title\n\n```javascript\nconst x = 1;\n```");
  assert(model.dataBlocks.length > 0, "Should have code blocks");
  assert(model.dataBlocks[0].language === "javascript", "Language should be detected");
  assert(model.dataBlocks[0].code.includes("const x = 1"), "Code content should be preserved");
});

test("ingestMarkdown sourceMap has line numbers", () => {
  const model = ingestMarkdown("# Title\n\nSome paragraph.");
  assert(model.sourceMap.length > 0, "Should have sourceMap entries");
  assert(Array.isArray(model.sourceMap[0].lineNumbers), "lineNumbers should be array");
  assert(model.sourceMap[0].lineNumbers.length > 0, "lineNumbers should not be empty");
});

test("ingestMarkdown section path tracking", () => {
  const model = ingestMarkdown("# Root\n## Child\n\nContent here.");
  const para = model.paragraphs.find((p) => p.originalText === "Content here.");
  assert(para !== undefined, "Should find paragraph");
  assert(para.sectionPath.length > 0, "Section path should be set");
});

test("ingestMarkdown with explicit title overrides h1", () => {
  const model = ingestMarkdown("# H1 Title\n\nBody", { title: "Override Title" });
  assert(model.title === "Override Title", "Explicit title should override h1");
});

test("ingestMarkdown empty content", () => {
  const model = ingestMarkdown("");
  assert(model.title === "Untitled", "Empty markdown should have Untitled title");
});

// ── Format Detection Tests ──
console.log("\nFormat Detection:");

test("detectFormat auto-detects plain text", () => {
  const fmt = detectFormat("Just plain text.\nNo special markers.", "auto");
  assert(fmt === "plain-text", `Expected plain-text, got ${fmt}`);
});

test("detectFormat auto-detects markdown headings", () => {
  const fmt = detectFormat("# Heading\n\nContent", "auto");
  assert(fmt === "markdown", `Expected markdown, got ${fmt}`);
});

test("detectFormat respects explicit hint", () => {
  const fmt = detectFormat("# Heading", "plain-text");
  assert(fmt === "plain-text", `Explicit hint should override detection, got ${fmt}`);
});

test("detectFormat detects markdown images", () => {
  const fmt = detectFormat("![alt](url)", "auto");
  assert(fmt === "markdown", `Should detect markdown image, got ${fmt}`);
});

test("detectFormat detects markdown lists", () => {
  const fmt = detectFormat("- item one\n- item two", "auto");
  assert(fmt === "markdown", `Should detect markdown list, got ${fmt}`);
});

// ── ingestDocument (Unified API) Tests ──
console.log("\nUnified ingestDocument API:");

test("ingestDocument routes plain text correctly", () => {
  const { model, format } = ingestDocument("Plain text content");
  assert(format === "plain-text", `Format should be plain-text, got ${format}`);
  assert(model.paragraphs.length > 0, "Should have paragraphs");
});

test("ingestDocument routes markdown correctly", () => {
  const { model, format } = ingestDocument("# Title\n\nContent", { format: "markdown" });
  assert(format === "markdown", `Format should be markdown, got ${format}`);
  assert(model.sections.length > 0, "Should have sections");
});

test("ingestDocument validates output model", () => {
  const { model } = ingestDocument("Sample content");
  const result = validateSourceDocumentModel(model);
  assert(result.ok, `Model should be valid: ${result.errors.join(", ")}`);
});

test("ingestDocument with metadata", () => {
  const { model } = ingestDocument("Content", { metadata: { custom: "value" } });
  assert(model.metadata.custom === "value", "Custom metadata should be preserved");
});

// ── SourceMap Traceability Tests ──
console.log("\nSourceMap Traceability:");

test("every paragraph has a sourceMap entry", () => {
  const model = ingestMarkdown("# Title\n\nPara one.\n\nPara two.");
  const paraIds = model.paragraphs.map((p) => p.sourceId);
  const mapIds = model.sourceMap.filter((m) => m.sourceType === "paragraph").map((m) => m.sourceId);
  for (const id of paraIds) {
    assert(mapIds.includes(id), `sourceMap should have entry for ${id}`);
  }
});

test("sourceMap entries have required fields", () => {
  const model = ingestPlainText("Test content");
  for (const ref of model.sourceMap) {
    assert(ref.sourceId, "sourceId required");
    assert(ref.sourceType, "sourceType required");
    assert(ref.sourceOrder !== undefined, "sourceOrder required");
  }
});

// ── Origin Tracking Tests ──
console.log("\nOrigin Tracking:");

test("all sourced elements have origin=sourced", () => {
  const model = ingestMarkdown("# Title\n\nContent.");
  const allElements = [...model.paragraphs, ...model.sections, ...model.lists, ...model.tables];
  for (const el of allElements) {
    assert(el.origin === "sourced", `Element ${el.sourceId} should have origin=sourced`);
  }
});

test("all sourced elements have confidence scores", () => {
  const model = ingestPlainText("Content");
  const allElements = [...model.paragraphs, ...model.sections];
  for (const el of allElements) {
    assert(typeof el.confidence === "number", "confidence should be a number");
    assert(el.confidence >= 0 && el.confidence <= 1, "confidence should be 0-1");
  }
});

// ── Summary ──
console.log("\n====================================");
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log(`\n❌ ${failed} test(s) failed\n`);
  process.exit(1);
}

console.log("✅ All document ingestion tests passed!\n");
