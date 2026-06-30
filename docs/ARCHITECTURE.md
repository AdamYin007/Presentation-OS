# AWE Presentation OS — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Story Layer                              │
│  story JSON → slide objects { no, type, title, message, hero? } │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
   ┌──────────────────┐          ┌──────────────────┐
   │   Hero Engine    │          │ Layout Engine    │
   │ (narrative)      │          │ (spatial)        │
   │ enrichStoryWith  │          │ compileLayoutPlan│
   │ Hero Sequence    │          │ → zones+flows    │
   └────────┬─────────┘          └────────┬─────────┘
            │                             │
            ▼                             ▼
   ┌─────────────────────────────────────────────┐
   │            dispatchAdapter()                │
   │  cover? executive? workflow? governance?... │
   │  → true = adapter handled it                │
   │  → false = fallthrough to legacy renderer   │
   └──────────────────┬──────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Layout Adapter   │    │ Legacy Renderer  │
│ (new)            │    │ (existing)       │
│ cover.js         │    │ run.js: cover()  │
│ executive.js     │    │ run.js: problem()│
│ workflow.js      │    │ ... all functions│
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
          ┌──────────────────┐
          │   Component Lib  │
          │   card, timeline │
          │   platformHub,   │
          │   layeredArch    │
          └────────┬─────────┘
                   ▼
          ┌──────────────────┐
          │   pptxgenjs      │
          │   .pptx output   │
          └──────────────────┘
```

## Layers

### Story Layer
Single source of truth. JSON file defining slides, each with `no`, `type`, `title`, `message`, optional `hero`. Types map to renderers: `cover`, `executive-summary`, `problem`, `workflow`, `governance`, etc.

### Hero Engine
Narrative enrichment layer. Takes a story and a hero sequence, merges hero statements into slides (`slide.hero.pattern_id`, `slide.hero.statement`, `slide.hero.visual_focus`). Controlled by `--hero` flag.

### Layout Engine
Spatial planning layer. Takes a slide object, outputs a validated Layout Plan (JSON) containing:
- `flow`: layout pattern (CENTERED, PIPELINE, QUADRANT, RADIAL, GRID, MATRIX, LINEAR)
- `density`: content density (SPARSE, MODERATE, DENSE)
- `zones`: array of {position, priority, span, label}
- `visual_hierarchy`: {primary, secondary, tertiary}
- `constraints`: canvas dimensions, card sizes, grid specs

Controlled by `--layout-engine` flag.

### Layout Adapter
Bridge between Layout Engine and Rendering. Each adapter:
- Receives `{slide, comp, pptx, story, layoutPlan}`
- Reads `layoutPlan.zones`, `layoutPlan.constraints`, `layoutPlan.flow`
- Uses `comp.*` components for rendering
- Returns `true` (handled) or `false` (fallback)
- Registered in `layout-adapters/index.js`

### Theme Engine
Color/font/typography system. Currently uses `components/helpers.js` palette (`C.navy`, `C.blue`, etc.). Theme Engine Core is a planned abstraction layer for multi-theme support.

### Renderer
The output layer. Two paths:
1. **Adapter path**: `dispatchAdapter()` → specific adapter → components → pptxgenjs
2. **Legacy path**: `run.js` functions (cover, executive, problem, etc.) → components → pptxgenjs

### Presentation Compiler (TODO)
Planned: transforms story JSON → optimized render instructions. Consolidates repeated patterns, batches component calls, enables caching.

### Audience Engine (TODO)
Planned: adapts output based on audience metadata from story (e.g., "院长办公会" vs "技术评审"). Controls detail level, terminology, emphasis.

## File Structure

```
registry/packages/ppt-factory/
├── bin/run.js                  # CLI entry, legacy renderers
├── src/
│   ├── layout-engine/          # Layout Engine
│   │   ├── index.js            # exports: compileLayoutPlan, schema
│   │   ├── planner.js          # per-type planner functions
│   │   └── schema.js           # types, validators, buildLayoutPlan
│   ├── layout-adapters/        # Layout Adapters
│   │   ├── index.js            # dispatchAdapter()
│   │   ├── cover.js            # cover adapter
│   │   └── workflow.js         # workflow adapter
│   ├── hero-engine/            # Hero Engine
│   └── layout/base.js          # getSlide(), bg()
components/
├── index.js                    # Barrel export
├── helpers.js                  # C palette, makeTitle, makeFooter
├── card.js                     # Card component
├── timeline.js                 # Timeline component
├── platform-hub.js             # Platform Hub component
└── layered-architecture.js     # Layered Arch component
```

## Key Principles

1. **Default mode never changes.** Everything is opt-in via flags.
2. **Adapters read plans, don't recompute.** Layout decisions come from `compileLayoutPlan()`.
3. **Legacy renderers are the fallback.** Adapters return `false` → legacy takes over.
4. **Components are shared.** Adapters and legacy renderers use the same `comp.*` API.
5. **run.js grows slowly.** New slide types should prefer adapters over adding new functions.
