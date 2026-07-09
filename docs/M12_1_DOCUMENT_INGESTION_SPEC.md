# M12.1 General Document Ingestion — Specification

> Version: 1.0.0
> Date: 2026-07-09
> Status: Implementation specification
> Related: M12.0 General PPT Product Specification (Section 6 — SourceDocumentModel)

## 1. Overview

M12.1 implements the **General Document Ingestion** thin slice — the first product implementation milestone in the M12 phase. It provides a domain-agnostic pipeline that converts plain text and Markdown input into the standardized `SourceDocumentModel` JSON schema.

This module forms the foundation for all downstream presentation generation. It does not depend on any industry-specific logic, template system, or presentation-domain knowledge.

## 2. Scope

### In scope

- Plain text ingestion (heuristic paragraph/section splitting)
- Markdown ingestion (headings, paragraphs, lists, tables, images, code blocks)
- `SourceDocumentModel` JSON schema definition with validation
- Unified `ingestDocument()` API with auto-detection
- Format detection (plain text vs Markdown)
- Source traceability via `sourceMap` / `sourceRefs`
- Unit and integration tests
- Sample output fixtures

### Out of scope (future milestones)

- DOCX parsing (M12.1+ or separate effort)
- PDF / Excel / CSV ingestion
- PresentationIntent parsing (M12.2)
- Story Planner (M12.3)
- DeckPlan / SlideSpec generation
- PPTX rendering
- CLI integration beyond script-based invocation

## 3. SourceDocumentModel Schema

The schema is defined in `packages/document-ingest/src/schema.js` and mirrors the contract from M12.0 Section 6.

```json
{
  "schemaVersion": "1.0.0",
  "title": "Document Title",
  "metadata": {
    "sourceType": "plain-text" | "markdown"
  },
  "sections": [SectionElement],
  "paragraphs": [ParagraphElement],
  "lists": [ListElement],
  "tables": [TableElement],
  "images": [ImageElement],
  "dataBlocks": [DataBlock],
  "sourceMap": [SourceRef]
}
```

### SectionElement

```json
{
  "sourceId": "sec-001",
  "sourceType": "section" | "heading",
  "sourceOrder": 1,
  "originalText": "Section Title",
  "sectionPath": ["Section Title"],
  "confidence": 0.9,
  "fileReference": "input.txt",
  "origin": "sourced"
}
```

### ParagraphElement

```json
{
  "sourceId": "para-001",
  "sourceType": "paragraph",
  "sourceOrder": 2,
  "originalText": "Paragraph content...",
  "sectionPath": ["Section Title"],
  "confidence": 1.0,
  "fileReference": "input.txt",
  "origin": "sourced"
}
```

### ListElement

```json
{
  "sourceId": "list-001",
  "sourceType": "list",
  "sourceOrder": 3,
  "listType": "ordered" | "unordered",
  "items": ["Item 1", "Item 2"],
  "sectionPath": ["Section Title"],
  "confidence": 0.95,
  "fileReference": "input.md",
  "origin": "sourced"
}
```

### TableElement

```json
{
  "sourceId": "tbl-001",
  "sourceType": "table",
  "sourceOrder": 4,
  "header": ["Column A", "Column B"],
  "rows": [["Val 1", "Val 2"], ["Val 3", "Val 4"]],
  "lineRange": [5, 6, 7, 8],
  "columnCount": 2,
  "sectionPath": ["Section Title"],
  "confidence": 0.95,
  "fileReference": "input.md",
  "origin": "sourced"
}
```

### SourceRef (sourceMap entry)

```json
{
  "sourceId": "para-001",
  "sourceType": "paragraph",
  "sourceOrder": 2,
  "lineNumbers": [12],
  "fileReference": "input.txt"
}
```

## 4. Module Structure

```
packages/document-ingest/
├── package.json
├── src/
│   ├── index.js          # Unified API: ingestDocument(), detectFormat()
│   ├── schema.js         # SourceDocumentModel schema + validation
│   ├── plain-text.js     # Plain text ingestion
│   └── markdown.js       # Markdown ingestion
tests/document-ingest/
└── document-ingest.test.js
fixtures/document-ingest/
├── sample-plain-text.txt
├── sample-markdown.md
├── sample-plain-text-output.json
└── sample-markdown-output.json
scripts/
└── generate-sample-ingestion-output.cjs
```

## 5. API Reference

### `ingestDocument(content, options)`

Unified entry point. Auto-detects format and routes to the appropriate parser.

**Parameters:**
- `content` (string): raw document content
- `options.format` (string, optional): `"auto"` | `"plain-text"` | `"markdown"`
- `options.title` (string, optional): explicit document title
- `options.sourceFile` (string, optional): file reference for sourceMap
- `options.metadata` (object, optional): additional metadata

**Returns:** `{ model: SourceDocumentModel, format: string }`

### `ingestPlainText(text, options)`

Ingest plain text. Detects section headers (ALL CAPS lines) and accumulates consecutive lines into paragraphs.

### `ingestMarkdown(markdown, options)`

Ingest Markdown. Parses headings, paragraphs, lists, tables, images, and code blocks.

### `detectFormat(content, formatHint)`

Detect whether content is plain text or Markdown based on syntax heuristics.

### `validateSourceDocumentModel(model)`

Validate that an object conforms to the SourceDocumentModel contract. Returns `{ ok: boolean, errors: string[] }`.

## 6. Design Principles

1. **Domain-agnostic**: No industry-specific logic. The parser operates purely on text structure.
2. **Traceability**: Every element has a `sourceId`, `sourceOrder`, and `sourceMap` entry linking back to the original input.
3. **Minimal dependencies**: Only Node.js builtins (`fs`, `path`, `util`). No third-party Markdown parsers.
4. **Extensible**: The unified `ingestDocument()` API makes it straightforward to add new format handlers (DOCX, PDF, etc.).
5. **Fail-safe**: Graceful handling of empty input, malformed Markdown, and edge cases.

## 7. Acceptance Criteria

- [x] Plain text input produces valid SourceDocumentModel with paragraphs and sections
- [x] Markdown input produces valid SourceDocumentModel with headings, paragraphs, lists, tables, images, code blocks
- [x] Format auto-detection correctly distinguishes plain text from Markdown
- [x] All elements have sourceMap entries with line numbers
- [x] All elements have origin="sourced" and confidence scores
- [x] Schema validation passes on all produced models
- [x] Unit tests cover all major ingestion paths
- [x] Sample output files demonstrate valid conversion

## 8. Dependencies on Other Milestones

M12.1 is the **first implementation milestone** in the M12 product delivery phase. It has no dependencies on other M12 milestones but provides the foundational data model that downstream milestones consume:

- **M12.2 (Presentation Intent Parser)**: Will consume SourceDocumentModel alongside user prompts
- **M12.3 (Story Planner)**: Will use SourceDocumentModel sections and paragraphs as input
- **M12.4 (SlideSpec Contract)**: Will reference sourceMap entries for traceability

## 9. Known Limitations

- Plain text section detection relies on ALL CAPS heuristic; mixed-case section headers are not detected
- Markdown table parsing handles simple pipe-delimited tables only (no nested tables, no multiline cells)
- Markdown list parsing does not handle nested/indented lists
- No DOCX, PDF, or binary format support in M12.1
