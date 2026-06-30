# AWE Presentation OS — Roadmap

## Current Status (2026-06-30)

| Component | Status | Details |
|---|---|---|
| **Story Layer** | ✅ Done | JSON-driven slide definition, 15 slide types |
| **Hero Engine** | ✅ Done | Narrative enrichment via `enrichStoryWithHero()`, `--hero` flag |
| **Layout Engine** | ✅ Done | `compileLayoutPlan()` → zones/flows/density/constraints, `--layout-engine` flag |
| **Theme Engine Core** | ✅ Done | Palette system in `components/helpers.js`, multi-theme ready |
| **Workflow Adapter** | ✅ Done | Pipeline layout from plan, covers `workflow` type |
| **Cover Adapter** | ✅ Done | Brand panel + hero statement from plan, covers `cover` type |
| **Layout Adapter v0.4** | 🔄 In Progress | 2/15 types covered, dispatch infrastructure ready |
| **Executive Adapter** | 📋 Next | `executive-summary` type, 3-card badge layout |
| **Problem Adapter** | 📋 Planned | `problem` type, 2×2 grid icon cards |
| **Presentation Compiler** | 📋 Future | Optimizes render instructions, batches component calls |
| **Audience Engine** | 📋 Future | Adapts output based on story.audience metadata |

## Completed

### Hero Engine
- `enrichStoryWithHero(story, heroSequence, options)` merges narrative layers into slides
- Supports `overrideTitle: true` for hero-statement-first mode
- Hero sequences stored alongside story JSON (`*-hero-sequence.json`)

### Layout Engine
- `compileLayoutPlan(slide)` produces validated Layout Plans
- 9 planner functions: cover, workflow, governance, research, collaboration, roi, differentiation, recommendation, generic
- Schema validation: flow types, density levels, zone structure

### Layout Adapters
- `dispatchAdapter({slide, comp, pptx, story, layoutPlan})` routes by `slide.type`
- Cover adapter: reads zones/visual_hierarchy/constraints from plan
- Workflow adapter: reads pipeline zones/card dimensions from plan
- All adapters use `comp.*` components, not raw pptxgenjs

## In Progress

### Layout Adapter v0.4
Expanding adapter coverage from 2/15 types toward 5/15. Current focus: executive and problem adapters.

## Planned

### Executive Adapter (PR12)
- Add `planExecutive()` to planner.js
- Create `executive.js` adapter
- Map 3 takeaway cards from `slide.message` to zones

### Problem Adapter (PR13)
- Add `planProblem()` to planner.js
- Create `problem.js` adapter
- Map 2×2 grid from `constraints.grid`

### Presentation Compiler
- Transform story JSON → optimized render batch
- Deduplicate repeated component calls
- Enable plan caching across stories

### Audience Engine
- Parse `story.audience` (e.g., "院长办公会 / 病理科 / 信息中心")
- Adjust terminology, detail level, emphasis per audience segment
- Integrate with hero engine for audience-aware narratives

## Metrics

| Metric | Current | Target |
|---|---|---|
| Adapter coverage | 2/15 types | 15/15 types |
| Legacy renderers in run.js | 12 functions | Reduce as adapters grow |
| Plan-driven rendering | 13% | 100% |
