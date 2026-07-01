# RFC-0005 — Presentation Compiler Specification

> **Status**: Draft  
> **Authors**: Presentation OS Architecture Board  
> **Date**: 2026-07-01  
> **Version**: 1.0.0  
> **Track**: Platform  
> **Supersedes**: None  
> **Depends On**: RFC-0001, RFC-0002

---

## 1. Status

**Draft**

This RFC defines the Presentation Compiler — a global optimization layer that sits between the Core Engines and the Renderer Engine. The Compiler does not draw slides; it generates optimized Render Plans.

---

## 2. Authors

Presentation OS Architecture Board

---

## 3. Motivation

### Why a Compiler?

Currently, each slide is rendered independently. The Renderer Engine processes slides one-by-one:
1. Try adapter for slide N.
2. Fallback to legacy renderer for slide N.
3. Move to slide N+1.

This approach has limitations:
- No awareness of global constraints (e.g., total slide count, presentation length).
- No optimization across slides (e.g., repeated layouts, shared resources).
- No overflow detection at the presentation level.
- No intelligent pagination when content exceeds canvas bounds.
- No theme resolution across the entire presentation.

The Compiler solves these by analyzing the **entire presentation** before rendering begins.

### What the Compiler Is NOT

- The Compiler does NOT draw slides.
- The Compiler does NOT generate content.
- The Compiler does NOT decide narrative structure.
- The Compiler does NOT replace the Renderer Engine.

The Compiler generates a **Render Plan** — an optimized set of rendering instructions. The Renderer Engine executes the Render Plan.

---

## 4. Goals

1. **Global Optimization** — Analyze the entire presentation, not individual slides.

2. **Constraint Solving** — Resolve conflicts between layout, theme, and content constraints.

3. **Overflow Detection** — Detect content that exceeds canvas bounds and adjust automatically.

4. **Smart Pagination** — Split oversized content across multiple slides while maintaining visual consistency.

5. **Resource Deduplication** — Identify and cache repeated visual elements (icons, charts, theme tokens).

6. **Performance Improvement** — Reduce rendering time through batching and caching.

---

## 5. Non-Goals

This RFC does NOT define:

- **Compiler user interface** — UI is out of scope.
- **Compiler CLI** — Command-line interface is out of scope.
- **Compiler caching strategy** — Detailed caching implementation is deferred.
- **Compiler parallelization** — Multi-threading is out of scope.
- **Compiler benchmarking** — Performance targets are out of scope.

---

## 6. Compiler Architecture

```
Presentation Compiler
├── Input Analyzer
├── Constraint Solver
├── Overflow Detector
├── Pagination Manager
├── Theme Resolver
├── Resource Optimizer
└── Render Plan Generator
```

### Input Analyzer

Analyzes the compiled presentation data:
- Total slide count.
- Slide types distribution.
- Content density per slide.
- Theme requirements.
- Audience metadata.

### Constraint Solver

Resolves conflicts between constraints:
- Layout vs. content size conflicts.
- Theme vs. accessibility conflicts (e.g., contrast ratio).
- Cross-slide consistency conflicts.

### Overflow Detector

Detects content that exceeds canvas bounds:
- Text overflow (too long for slide area).
- Card overflow (too many cards for slide area).
- Chart overflow (chart too large for slide area).

### Pagination Manager

Handles content that exceeds a single slide:
- Splits dense content across multiple slides.
- Maintains visual continuity across split slides.
- Adds navigation indicators ("continued...").

### Theme Resolver

Resolves theme tokens to concrete values:
- Maps abstract tokens (`colors.primary`) to hex values.
- Applies theme variants from Packs.
- Ensures theme consistency across the presentation.

### Resource Optimizer

Identifies and optimizes repeated resources:
- Caches repeated icons.
- Deduplicates chart data structures.
- Batches component render calls.

### Render Plan Generator

Produces the final Render Plan:
- Ordered list of rendering instructions.
- Resource references (cached items).
- Pagination decisions.
- Theme resolutions.

---

## 7. Render Plan Format

The Render Plan is a JSON structure that the Renderer Engine executes.

```json
{
  "meta": {
    "totalSlides": 15,
    "estimatedSize": "320KB",
    "themesResolved": true,
    "paginationDecisions": 2,
    "resourceDeduplication": 5
  },
  "slides": [
    {
      "no": 1,
      "type": "cover",
      "renderMethod": "adapter",
      "adapter": "cover-adapter",
      "theme": "medical-professional",
      "resources": [],
      "overflow": null,
      "pagination": null
    },
    {
      "no": 2,
      "type": "executive-summary",
      "renderMethod": "adapter",
      "adapter": "executive-adapter",
      "theme": "medical-professional",
      "resources": ["icon:hospital", "chart:bar-01"],
      "overflow": null,
      "pagination": null
    },
    {
      "no": 5,
      "type": "problem",
      "renderMethod": "adapter",
      "adapter": "problem-adapter",
      "theme": "medical-professional",
      "resources": [],
      "overflow": "text:slide-5-message",
      "pagination": {
        "split": true,
        "nextSlideNo": 6,
        "indicator": "continued..."
      }
    }
  ],
  "resources": {
    "cached": [
      { "id": "icon:hospital", "type": "icon", "reference": "shared" },
      { "id": "chart:bar-01", "type": "chart", "reference": "shared" }
    ]
  }
}
```

---

## 8. Compiler Pipeline

```
Story → Content Engine → Hero Engine → Layout Engine → Theme Engine
                                                    │
                                                    ▼
                                            Input Analyzer
                                                    │
                                                    ▼
                                            Constraint Solver
                                                    │
                                                    ▼
                                            Overflow Detector
                                                    │
                                                    ▼
                                            Pagination Manager
                                                    │
                                                    ▼
                                            Theme Resolver
                                                    │
                                                    ▼
                                            Resource Optimizer
                                                    │
                                                    ▼
                                           Render Plan Generator
                                                    │
                                                    ▼
                                          Renderer Engine (execution)
```

### Pipeline Steps

1. **Pre-computation** — All Engines produce their outputs (Content, Hero, Layout, Theme).
2. **Analysis** — Input Analyzer examines the complete presentation.
3. **Constraint Solving** — Resolve conflicts between layout, theme, and content.
4. **Overflow Detection** — Identify content exceeding canvas bounds.
5. **Pagination** — Split oversized content across slides.
6. **Theme Resolution** — Map tokens to concrete values.
7. **Resource Optimization** — Deduplicate repeated resources.
8. **Render Plan Generation** — Produce the final Render Plan.
9. **Execution** — Renderer Engine executes the Render Plan.

---

## 9. Compiler Modes

### 9.1 Fast Mode

- Skips resource optimization.
- Skips pagination analysis.
- Skips theme resolution (uses defaults).
- Produces Render Plan immediately.

**Use case**: Quick drafts, iterative development.

### 9.2 Standard Mode

- Performs overflow detection.
- Performs theme resolution.
- Basic resource deduplication.

**Use case**: Regular presentation generation.

### 9.3 Optimized Mode

- Full constraint solving.
- Full pagination analysis.
- Full resource optimization.
- Accessibility checking (contrast ratios).

**Use case**: Production-grade presentations, investor decks, board presentations.

---

## 10. Compiler as an Opt-In Feature

The Compiler is controlled by a flag:

```bash
# Without compiler — current behavior
aos factory ppt --story medical-proposal

# With compiler — standard mode
aos factory ppt --story medical-proposal --compiler

# With compiler — optimized mode
aos factory ppt --story medical-proposal --compiler --optimize
```

**Default behavior remains unchanged.** The Compiler is opt-in.

---

## 11. Compiler Error Handling

### 11.1 Error Types

```typescript
type CompilerError =
  | ConstraintConflict   // Layout vs. content conflict
  | OverflowError        // Content exceeds bounds, cannot paginate
  | ThemeResolutionError // Theme token not found
  | ResourceError        // Resource deduplication failed
  | PaginationError      // Pagination logic failed
```

### 11.2 Error Recovery

- **Constraint Conflict** → Log warning, use default resolution.
- **Overflow Error** → Log warning, truncate content with ellipsis.
- **Theme Resolution Error** → Fallback to default theme.
- **Resource Error** → Log warning, skip deduplication.
- **Pagination Error** → Log warning, keep content on single slide.

**The Compiler must never crash the rendering pipeline.**

---

## 12. Compiler Performance Targets

| Mode | Max Slides | Target Time |
|---|---|---|
| Fast | 50 | < 1 second |
| Standard | 100 | < 3 seconds |
| Optimized | 100 | < 10 seconds |

These targets are aspirational. Exact numbers will be refined in implementation.

---

## 13. Extension Rules

### 13.1 Adding a New Compiler Stage

1. Define the stage interface.
2. Implement the stage.
3. Add to the pipeline configuration.
4. No RFC required (additive change).

### 13.2 Modifying the Render Plan Schema

1. Define the new schema version.
2. Implement migration from previous versions.
3. Require RFC-0005 amendment.

### 13.3 Adding a New Compiler Mode

1. Define the mode configuration.
2. Implement mode-specific pipeline stages.
3. No RFC required (additive change).

---

## 14. Future RFCs

| RFC | Topic | Relationship |
|---|---|---|
| RFC-0001 | Platform Specification | Defines the platform this Compiler serves |
| RFC-0002 | SDK Specification | Defines the SDK interfaces the Compiler uses |
| RFC-0006 | Audience Engine Specification | Audience Engine output feeds into the Compiler |

---

## 15. Implementation Status

**Not for Immediate Implementation**

RFC-0005 defines the Presentation Compiler — a global optimization layer. The Compiler is an opt-in feature (controlled by `--compiler` flag) and does not affect default behavior. Its pipeline stages (Input Analyzer, Constraint Solver, Overflow Detector, Pagination Manager, Theme Resolver, Resource Optimizer, Render Plan Generator) build on top of the existing seven-layer architecture. Implementation should follow after Adapter Migration (M3) and Content Data Migration (M4) are complete, when the rendering pipeline is stable enough to benefit from global optimization.

---

## Appendix A: Compiler Version History

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-07-01 | Initial Compiler specification. Pipeline, modes, Render Plan format, error handling. |

---

*This RFC defines the Presentation Compiler specification. It will be updated as the platform evolves. Last reviewed: 2026-07-01.*
