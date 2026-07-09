# M12.5 Theme and Layout System Specification

> **Version**: 1.0.0  
> **Date**: 2026-07-09  
> **Status**: Implemented  
> **Next**: M12.6 Editable PPTX Renderer

## Overview

The Theme and Layout System maps SlideSpec[] into a concrete `LayoutPlan` with theme tokens, color palettes, spacing, font sizes, and max widths — ready for the PPTX renderer (M12.6).

**Pragmatic MVP.** Implements 3 themes and ~24 layout families. No complex design engine, no SVG illustration system, no marketplace.

## Input

| Source | Field | Usage |
|---|---|---|
| `SlideSpec[]` | `layout`, `role`, `designHints.density/emphasis` | Determines layout family, colors, spacing |
| `designHints` | `sectionColorHint` | Optional color tint per section |
| Deck metadata | `style` | Theme name (`minimal-modern`, `business-consulting`, `academic-clean`) |

## Output: LayoutPlan

```json
{
  "schemaVersion": "1.0.0",
  "theme": "minimal-modern",
  "themeTokens": { ... },
  "totalSlides": 18,
  "layoutFamiliesUsed": ["title-and-bullets", "chart-and-insight", ...],
  "layouts": [
    {
      "slideId": "slide-001",
      "index": 1,
      "role": "executive-summary",
      "layoutFamily": "executive-summary",
      "theme": "minimal-modern",
      "themeTokens": { ... },
      "colors": { "background": "#FFFFFF", "text": "#1A1A1A", ... },
      "spacing": { "padding": 32, "margin": 16, "gap": 12 },
      "fontSize": { "heading": 22, "body": 14 },
      "maxWidth": 800,
      "visualSpec": { ... }
    }
  ]
}
```

## Layout Resolution Logic

Deterministic mapping from SlideSpec properties to layout families:

| Condition | Layout Family |
|---|---|
| role = "section-divider" | section-divider |
| role = "title" | title-slide |
| role = "closing" | closing |
| role = "agenda" | agenda |
| visualType = "table" + body ≤ 5 | table |
| visualType = bar/line/pie/area/scatter chart | chart-and-insight |
| visualType = "comparison" | comparison |
| visualType = process/timeline/roadmap | horizontal-process |
| visualType = "image" | image-and-text |
| body ≥ 4 items + dense | three-card |
| body = 2 items | two-column |
| default | title-and-bullets |

## Theme Tokens

### minimal-modern (default)
- Colors: near-black primary (#1A1A1A), blue accent (#3B82F6)
- Fonts: Inter/sans-serif
- Border radius: 8px, subtle shadow

### business-consulting
- Colors: navy primary (#1E3A5F), gold accent (#D4A843)
- Fonts: Georgia serif heading, Helvetica Neue body
- Border radius: 0, classic consulting aesthetic

### academic-clean
- Colors: slate primary (#2C3E50), blue accent (#2980B9)
- Fonts: Source Sans Pro
- Border radius: 4px, clean academic look

## Color Palette Generation

Per-slide color palette derived from theme tokens:
- `background`: theme background
- `text`: theme primary
- `secondaryText`: theme secondary
- `mutedText`: theme muted
- `accent`: theme accent if emphasis="high", else theme border
- `surface`: theme surface
- `border`: theme border

## Spacing by Density

- **sparse**: padding 48px, margin 24px, gap 20px
- **medium**: padding 32px, margin 16px, gap 12px
- **dense**: padding 24px, margin 12px, gap 8px
- **title-slide**: paddingTop 120px, paddingBottom 80px
- **section-divider**: paddingTop 160px, paddingBottom 160px

## Font Sizes by Layout

| Layout Family | Heading | Body |
|---|---|---|
| title-slide | 44 | 20 |
| section-divider | 36 | 16 |
| closing | 36 | 16 |
| agenda | 28 | 16 |
| chart-and-insight | 22 | 14 |
| title-and-bullets (sparse) | 24 | 15 |
| title-and-bullets (medium) | 22 | 14 |
| title-and-bullets (dense) | 22 | 13 |
| table | 20 | 14 |
| three-card | 18 | 13 |
| two-column | 20 | 14 |
| horizontal-process | 18 | 13 |

## Max Widths

- Full-width charts: 960px
- Multi-card layouts (three-card, two-column, comparison): 720px
- Default (title-and-bullets, table, etc.): 800px

## Module Structure

```
packages/theme-layout/
├── package.json
└── src/
    ├── index.js          # Public API: generateLayoutPlan()
    ├── schema.js         # Theme tokens, layout families
    └── generator.js      # LayoutPlan generation logic
```

## Out of Scope

- Complex design engine or CSS-in-JS
- SVG illustration system
- Image asset management
- Domain-specific visual styles
- Dynamic theme switching at runtime

## Next Milestone

M12.6 — Editable PPTX Renderer: Consume LayoutPlan + SlideSpec to generate real editable .pptx using pptxgenjs.
