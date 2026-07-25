# Presentation OS — Architecture Overview

> **AWE (Awesome Workspace Engine)** — A modular, pipeline-based presentation generation system.  
> Converts markdown/plain-text documents into professional PPTX files with zero LLM dependency.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI / Studio                          │
│  awe present | awe studio:pptx | deliver-pptx.js            │
└──────────────────────────┬──────────────────────────────────┘
                           │ markdown + options (+ template.pptx)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Pipeline Orchestrator                      │
│           packages/presentation-pipeline/src/pipeline.js     │
│                                                             │
│  [template-analyzer] → ingest → [content-architect]        │
│    → intent → story-planner → slidespec                    │
│    → [audience-engine] → theme-layout → [compiler]         │
│    → renderer → [template-injector] → [visual-qa]          │
│    → manifest                                               │
└──────┬──────────┬──────────┬──────────┬────────────────────┘
       │          │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌──▼────┐
  │ Ingest │ │Intent  │ │Story   │ │Slide  │
  │Document│ │Parser  │ │Planner  │ │Spec   │
  └────────┘ └────────┘ └────────┘ └────────┘
       │          │          │          │
  ┌────▼──────────▼──────────▼──────────▼────┐
  │         Opt-in Extension Layer            │
  │                                          │
  │  ┌──────────────┐  ┌──────────────────┐ │
  │  │Audience Engine│  │Presentation      │ │
  │  │(M12.25)       │  │Compiler (M12.24) │ │
  │  └──────────────┘  └──────────────────┘ │
  │                                          │
  │  ┌──────────────┐  ┌──────────────────┐ │
  │  │Brand Profiles │  │Content Architect │ │
  │  │(M12.20/21)    │  │(M12.28)          │ │
  │  └──────────────┘  └──────────────────┘ │
  └──────┬──────────┬──────────┬────────────┘
         │          │          │
  ┌──────▼──────────▼──────────▼────────────┐
  │          Rendering & QA Layer            │
  │                                         │
  │  ┌──────────┐  ┌──────────┐  ┌────────┐│
  │  │Theme     │  │PPTX      │  │Visual  ││
  │  │Layout    │  │Renderer  │  │QA Gate  ││
  │  │(M12.5)   │  │(M12.6)   │  │(M12.15-││
  │  │          │  │          │  │ 17)     ││
  │  └──────────┘  └──────────┘  └────────┘│
  │                                         │
  │  ┌──────────────────────────────────┐   │
  │  │Template Injector (M12.27)        │   │
  │  └──────────────────────────────────┘   │
  └─────────────────────────────────────────┘
```

## Package Index

| Package | Responsibility | Key Exports |
|---------|---------------|-------------|
| `document-ingest` | Format detection, plain-text/markdown parsing | `ingestDocument()` |
| `template-analyzer` | PPTX template element extraction + principles.md generation | `analyzeTemplate()` |
| `intent-parser` | Natural language → structured presentation intent | `parsePresentationIntent()` |
| `story-planner` | Narrative pattern selection, slide budget allocation | `planDeck()` |
| `slidespec` | Slide-level contract: role, title, body, visualType | `generateSlideSpecs()` |
| `presentation-audience-engine` | Speaker×audience adaptation (opt-in) | `adaptDeck()` |
| `theme-layout` | Theme tokens, layout family assignment | `generateLayoutPlan()` |
| `presentation-compiler` | Overflow detection, pagination optimization (opt-in) | `compilePresentation()` |
| `pptx-renderer` | SlideSpec+LayoutPlan → editable .pptx via pptxgenjs | `renderPptx()`, `generateBuffer()` |
| `brand-profiles` | Brand config loading, profile inheritance | `loadBrandProfile()` |
| `content-architect` | Structured outline generation (LLM-free) | `architect()` |
| `presentation-revision` | Natural language slide revision | `reviseSlides()` |
| `visual-design-gate` | WCAG contrast, typography consistency | `runVisualDesignGate()` |
| `logo-safe-area-gate` | Logo bounding-box safe area enforcement | `checkLogoSafeArea()` |
| `pixel-accessibility-gate` | Color-blindness simulation, font fallback | `checkPixelContrast()` |
| `cli` | CLI commands: present, doctor, install, sprint | Entry point |
| `template-analyzer` | PPTX模板解析与原则生成 (M12.31) | `analyzeTemplate()` |
| `presentation-components` | React/Vue/Svelte reusable components | Platform hubs |

## Data Contracts

### SourceDocumentModel
Raw parsed content with paragraphs, sections, and metadata.

### PresentationIntent
Structured extraction: `{ topic, purpose, audience, language, slideCount, duration, style, tone, domain }`

### DeckPlan
Narrative structure: `{ narrativePattern, sections[], slides[], assumptions[], warnings[] }`

### SlideSpec[]
Per-slide contract: `{ id, index, role, title, body[], visualType, designHints, speakerNotes, sourceRefs }`

### LayoutPlan
Visual specification: `{ themeTokens, layouts[], colors }`

### RenderPlan (Compiler output)
Optimization decisions: `{ overflowReport, paginationDecisions, resourceOptimization }`

### AdaptationPlan (Audience Engine output)
Speaker×audience adjustments: `{ contract, slideAdjustments[], deckHints[] }`

## Design Principles

1. **Opt-in by default** — New features never change default behavior
2. **Non-destructive** — Engines return plans without modifying original data
3. **Graceful degradation** — Missing tools produce warnings, not crashes
4. **Zero cloud dependency** — All logic is deterministic, offline-first
5. **Pipeline composability** — Each stage is independently testable

## External Tool Dependencies

| Tool | Purpose | Fallback |
|------|---------|----------|
| LibreOffice | PDF conversion for Visual QA | Skip QA, continue |
| ImageMagick | Pixel contrast analysis | Color proxy mode |
| Poppler (pdftotext) | Text extraction quality check | Metadata-only |
| Python 3 | Template injection script | Skip template |

Paths are centralized in `packages/presentation-pipeline/src/tool-paths.js`. Override via `LIBREOFFICE_PATH` env var.
