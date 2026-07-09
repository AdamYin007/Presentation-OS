# M12.7 End-to-End General PPT MVP Specification

> **Version**: 1.0.0  
> **Date**: 2026-07-09  
> **Status**: Implemented

## Overview

M12.7 delivers the first end-to-end pipeline: a single `runPipeline(markdownInput)` call that chains all 6 modules into a real `.pptx` file. This is the MVP moment — users can take any markdown document and get an editable PowerPoint deck.

## Pipeline Architecture

```
input.md (markdown text)
    │
    ▼
[1] Document Ingestion → SourceDocumentModel
    │
    ▼
[2] Intent Parser → PresentationIntent
    │
    ▼
[3] Story Planner → DeckPlan (narrative pattern + slide plan)
    │
    ▼
[4] SlideSpec Contract → SlideSpec[] (page-level contracts)
    │
    ▼
[5] Theme & Layout System → LayoutPlan (colors, spacing, fonts per slide)
    │
    ▼
[6] PPTX Renderer → Buffer (.pptx file via pptxgenjs)
```

## Public API

```javascript
const { runPipeline } = require("@awe/presentation-pipeline");

const result = await runPipeline(markdownText, { style: "minimal-modern" });
// result = {
//   sourceDocument, intent, deckPlan, slideSpecs, layoutPlan,
//   pptxBuffer (NodeBuffer), slideCount
// }
```

## Input/Output Examples

### Input: Markdown Document
Any structured markdown with headings, bullet points, and paragraphs.

### Output: .pptx File
A valid ZIP-based PowerPoint file with:
- 16-18 slides for typical business documents
- Role-appropriate layouts (title, content, section-divider, closing)
- Theme colors, font sizes, spacing from LayoutPlan
- Speaker notes where available
- Source reference footers

## Module Dependencies

| Module | Package | Depends On |
|---|---|---|
| Document Ingestion | `@awe/document-ingest` | None |
| Intent Parser | `@awe/intent-parser` | Document Ingestion |
| Story Planner | `@awe/story-planner` | Intent Parser |
| SlideSpec Contract | `@awe/slidespec` | Story Planner |
| Theme & Layout | `@awe/theme-layout` | SlideSpec |
| PPTX Renderer | `@awe/pptx-renderer` | SlideSpec + LayoutPlan |

## CLI Entry Point

```bash
node scripts/generate-pptx.js input.md output.pptx
```

Or via package.json:
```json
{ "bin": { "generate-pptx": "./scripts/generate-pptx.js" } }
```

## Test Coverage

10 tests covering:
- Module exports verification
- Full pipeline execution (markdown → .pptx)
- All intermediate artifacts verified
- Different theme styles
- Empty input edge case
- Fixture validation
- Scope boundary checks

## Sample Artifacts

- `examples/business-review/e2e-output.pptx` — 130KB end-to-end output
- `examples/business-review/deck-plan.json` — narrative plan
- `examples/business-review/slidespec.json` — page specs
- `examples/business-review/layout-plan.json` — layout assignments
- `examples/business-review/output.pptx` — renderer-only output

## Next Milestone

M12.8+ — Content and Visual QA: chart rendering, image insertion, table support, smart shapes, visual consistency checks.
