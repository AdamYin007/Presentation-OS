# M12.6 Editable PPTX Renderer Specification

> **Version**: 1.0.0  
> **Date**: 2026-07-09  
> **Status**: Implemented  
> **Next**: M12.7 End-to-End General PPT MVP

## Overview

The Editable PPTX Renderer consumes SlideSpec[] + LayoutPlan and generates a real, editable .pptx file using pptxgenjs v4. This is the first milestone where users get a tangible output artifact they can open in PowerPoint or Google Slides.

**MVP scope**: Text-only slides with roles (title, section-divider, content, chart, closing). No images, no charts, no tables yet — those come in M12.7+.

## Pipeline

```
SlideSpec[] → renderPptx() → PptxGenJS instance → generateBuffer() → Buffer (.pptx)
```

## Module Structure

```
packages/pptx-renderer/
├── package.json          # @awe/pptx-renderer, depends on pptxgenjs ^4.0.1
└── src/
    ├── index.js          # Public API: renderPptx(), generateBuffer()
    ├── schema.js         # Render options, validation
    └── renderer.js       # Core rendering logic
```

## Input Contract

| Source | Field | Usage |
|---|---|---|
| `SlideSpec[]` | `role`, `title`, `body`, `speakerNotes`, `sourceRefs` | Per-slide content |
| `LayoutPlan` | `theme`, `colors`, `spacing`, `fontSize`, `maxWidth` | Per-slide styling |
| Options | `author`, `company`, `subject` | PPTX metadata |

## Output Contract

Returns a Node.js `Buffer` containing a valid ZIP/PPTX file that can be opened in:
- Microsoft PowerPoint (Windows/Mac)
- Google Slides (upload)
- Apple Keynote (import)
- LibreOffice Impress

## Rendering Rules

### Title Slide
- Large centered heading
- Optional subtitle below

### Section Divider
- Full-width section title
- Minimal styling

### Content Slide
- Heading at top
- Bullet points from `body` array
- Font size from layout plan

### Executive Summary
- Same as content but with higher emphasis colors
- Larger heading

### Data Chart Slide
- Heading + body bullets
- Placeholder for chart visualization (text-based for MVP)

### Closing Slide
- "Thank You" or custom title
- Optional key message

## Speaker Notes
Slides with `speakerNotes` field get notes attached via `slide.notes`.

## Footer / Source References
If a slide has `sourceRefs`, they appear as small text at the bottom of each slide.

## Theme Integration

Colors flow from LayoutPlan into each slide:
- `colors.background` → slide background
- `colors.text` → primary text
- `colors.secondaryText` → subtitles/metadata
- `colors.accent` → headings/links
- `spacing.*` → padding, margin, gap

## Out of Scope (Deferred to M12.7+)

- Image insertion/embedding
- Chart generation (bar, line, pie, scatter)
- Table rendering
- SmartArt / diagram shapes
- Master slide customization
- Slide transitions/animations
- Font embedding/substitution
- PDF export

## Test Coverage

15 tests covering:
- Module exports verification
- Slide count matching
- Per-slide text content verification
- Role-specific rendering (exec-summary, section-divider, closing, content, data-chart)
- Buffer generation and ZIP format validation
- Custom render options (author, company)
- Empty specs edge case
- Cross-domain leakage check

## Next Milestone

M12.7 — End-to-End General PPT MVP: Full pipeline script (`input.md` → `.pptx`), sample artifacts, README/command docs.
