# M12.24 — Presentation Compiler Spec

> **Status**: Complete  
> **Date**: 2026-07-19  
> **Package**: `packages/presentation-compiler/`  
> **Tests**: `tests/presentation-compiler/presentation-compiler.test.js` (18 tests)

---

## Overview

The Presentation Compiler is a global optimization layer that sits between the Layout/Theme engines and the Renderer Engine. It analyzes the entire presentation before rendering begins and generates an optimized Render Plan.

**What it does NOT do:**
- Does NOT draw slides
- Does NOT generate content
- Does NOT decide narrative structure
- Does NOT replace the Renderer Engine

It generates a **Render Plan** — an optimized set of rendering instructions. The Renderer Engine executes the Render Plan.

---

## Pipeline Position

```
Story → Content Engine → Hero Engine → Layout Engine → Theme Engine
                                                    │
                                                    ▼
                                            Input Analyzer (Compiler)
                                                    │
                                                    ▼
                                            Constraint Solver
                                                    │
                                                    ▼
                                            Overflow Detector
                                                    │
                                                    ▼
                                            Pagination Manager (Optimized only)
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

---

## Three Modes

### Fast Mode (`--compiler fast`)
Skips all analysis. Pass-through. Use for quick drafts.

### Standard Mode (`--compiler standard`, default via `--compiler` flag)
- Input analysis (slide counts, type distribution, duration estimate)
- Constraint solving (bullet limits, heading length, auto-density adjustment)
- Overflow detection (text overflow, chart overload)
- Theme consistency warnings
- Resource deduplication (charts, diagrams)

### Optimized Mode (`--optimize`)
All of Standard +:
- Full pagination analysis (split oversized content across slides)
- Full constraint solving with remediation
- Accessibility checking (contrast ratios)

---

## Seven Stages

### 1. Input Analyzer
Analyzes compiled presentation data: total slide count, type distribution, content density per slide, estimated duration (~1.5 min/slide).

### 2. Constraint Solver
Resolves conflicts between layout, theme, and content constraints. Auto-adjusts sparse layouts to medium when bullet count exceeds threshold. Warns on long titles (>120 chars).

### 3. Overflow Detector
Detects content exceeding canvas bounds: text overflow, bullet overload (>6 bullets), chart data point overload (>20 points).

### 4. Pagination Manager (Optimized only)
Splits dense content across multiple slides. Maintains visual continuity. Adds "continued..." indicators.

### 5. Theme Resolver
Ensures theme token consistency. Warns when >3 different font configurations exist. Maps abstract tokens to concrete values.

### 6. Resource Optimizer
Identifies and caches repeated visual elements: bar charts, line charts, process/timeline diagrams. Deduplicates by hashing series data.

### 7. Render Plan Generator
Produces final Render Plan with metadata: total slides, themes resolved, pagination decisions, resource deduplication count, estimated duration.

---

## Integration

### Pipeline (`pipeline.js`)
Compiler runs between layout/theme generation and PPTX rendering. When `opts.compiler` is truthy, calls `compilePresentation()` and attaches results to pipeline output as `result.compiler`.

### CLI (`deliver-pptx.js`)
- `--compiler` → standard mode
- `--optimize` → optimized mode
- Neither flag → compiler disabled (zero impact on existing behavior)

---

## Error Handling

| Error Type | Recovery |
|---|---|
| ConstraintConflict | Log warning, use default resolution |
| OverflowError | Log warning, truncate with ellipsis |
| ThemeResolutionError | Fallback to default theme |
| ResourceError | Log warning, skip deduplication |
| PaginationError | Log warning, keep content on single slide |

**The Compiler must never crash the rendering pipeline.** Graceful degradation: null layoutPlan → empty warnings, never false PASS.

---

## Test Matrix

| Scenario | Expected |
|---|---|
| Module exports | compilePresentation function, COMPILER_MODES object |
| Fast mode passthrough | Empty analysis, no warnings |
| Standard analysis | Correct slide counts, type distribution |
| Bullet overflow detection | Detects >6 bullets |
| No overflow normal slides | Empty report |
| Optimized pagination | Splits overloaded slides |
| Standard no pagination | Empty decisions |
| Theme resolution | Font map from layout plan |
| Font variant warning | >3 variants triggers warning |
| Chart deduplication | Repeated charts cached |
| Fast skips resources | totalCached = 0 |
| Full render plan | Correct meta, slides array |
| Render plan entry structure | no, type, adapter present |
| Auto-density adjustment | Sparse→Medium for high content |
| Long title warning | >120 chars triggers warning |
| Null layoutPlan | Empty warnings, still produces plan |
| Empty slide specs | Graceful, totalSlides = 0 |
