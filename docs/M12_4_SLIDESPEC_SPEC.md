# M12.4 SlideSpec Contract Specification

> **Version**: 1.0.0  
> **Date**: 2026-07-09  
> **Status**: Implemented  
> **Next**: M12.5 Theme and Layout System

## Overview

The SlideSpec Contract converts a `DeckPlan` into an array of page-level `SlideSpec[]` objects. Each slide carries a primary message, body content, visual type, layout assignment, speaker notes, source references, and design hints — all deterministically derived from the DeckPlan's narrative structure.

**No PPTX rendering.** This milestone produces only the contract that downstream renderers consume.

## Input: DeckPlan

Defined in M12.3 (`packages/story-planner/src/schema.js`). The generator reads:

| DeckPlan Field | Usage in SlideSpec |
|---|---|
| `slides[]` | Each entry becomes one SlideSpec |
| `sections[]` | Section titles used for context and transitions |
| `deckTitle` | Used for title slides |
| `narrativePattern` | Influences visual type defaults |

## Output: SlideSpec

```json
{
  "id": "slide-001",
  "index": 1,
  "section": "",
  "role": "",
  "title": "",
  "subtitle": "",
  "keyMessage": "",
  "body": ["string"],
  "visualType": "",
  "visualSpec": {},
  "layout": "",
  "speakerNotes": "",
  "sourceRefs": [],
  "designHints": {}
}
```

### Field Definitions

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique slide identifier (e.g., "slide-001") |
| `index` | integer | 1-based slide position |
| `section` | string | Parent section title |
| `role` | string | Slide role from DeckPlan (executive-summary, content, data-chart, etc.) |
| `title` | string | Generated title (from keyMessage or section name) |
| `subtitle` | string | Reserved for future use |
| `keyMessage` | string | Primary message for this slide |
| `body` | string[] | Bullet points / content items |
| `visualType` | string | Chart/table/image/none with specific chart subtype |
| `visualSpec` | object | Structural parameters for the visual (columns, rows, steps) |
| `layout` | string | Layout family name for M12.5 theme system |
| `speakerNotes` | string | Multi-line notes with purpose, key argument, transition, duration |
| `sourceRefs` | array | Preserved from DeckPlan with normalized shape |
| `designHints` | object | Density, emphasis, and color hints for renderer |

## Layout Mapping

Deterministic mapping from slide roles to layout families:

| Role | Layout |
|---|---|
| title | title-slide |
| agenda | agenda |
| section-divider | section-divider |
| executive-summary | executive-summary |
| content | title-and-bullets |
| comparison | comparison |
| process | horizontal-process |
| timeline | timeline |
| roadmap | roadmap |
| data-chart | chart-and-insight |
| table | table |
| matrix | matrix |
| case-study | two-column |
| recommendation | title-and-bullets |
| closing | closing |

## Body Content Generation

Body items are generated from:
1. The slide's `keyMessage` (always included as first item)
2. Source paragraph matches from the DeckPlan section
3. Fallback templates based on role (e.g., "Step one: preparation" for process slides)

Max 5 body items per slide.

## Speaker Notes Generation

Each content slide gets speaker notes containing:
- Purpose (from DeckPlan objective)
- Key argument (from keyMessage)
- Transition hint (next slide's keyMessage)
- Suggested duration (total time / total slides)

Section dividers, title slides, and closing slides have empty speaker notes.

## Visual Spec Generation

Based on `visualType`:
- **Charts** (bar, line, area, pie, scatter): hasDataLabel=true, hasLegend=true
- **Table**: columns=2, rows=count(sourceRefs)+1
- **Process/Timeline/Roadmap**: steps=[1,2,3], direction="horizontal"
- **Comparison**: columns=2, hasHeader=true
- **None**: empty object

## Design Hints

Computed for every slide:
- `density`: "sparse" (≤1 body item), "medium" (2-3), "dense" (≥4)
- `emphasis`: "high" (executive-summary, recommendation), "medium" (data-chart, table), "low" (other)
- `sectionColorHint`: parent section title for theme color mapping

## Validation

`validateSlideSpec()` checks:
- All 12 required fields present
- `role` is from VALID_ROLES list
- `visualType` is from VALID_VISUAL_TYPES list
- `layout` is from VALID_LAYOUTS list
- `body` is an array of strings
- `sourceRefs` is an array
- `visualSpec` and `designHints` are objects when present

## Module Structure

```
packages/slidespec/
├── package.json
└── src/
    ├── index.js          # Public API: generateSlideSpecs(), validateSlideSpec()
    ├── schema.js         # SlideSpec contract + validation rules
    └── generator.js      # DeckPlan → SlideSpec[] conversion logic
```

## Out of Scope

- PPTX rendering (M12.6)
- Theme/layout selection engine (M12.5)
- Natural-language revision (M12.9)
- Visual QA (M12.8)

## Next Milestone

M12.5 — Theme and Layout System: Map SlideSpec roles and visual needs into concrete theme tokens and layout families.
