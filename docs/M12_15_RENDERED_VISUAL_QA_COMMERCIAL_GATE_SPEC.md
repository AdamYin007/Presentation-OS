# M12.15 — Rendered Visual QA and Commercial Delivery Gate

> **Date**: 2026-07-19
> **Branch**: `feat/m12-15-rendered-visual-qa-commercial-gate`
> **Depends on**: M12.8 (visual QA), M12.14 (quality manifest)

## Problem Statement

Presentation OS can generate valid PPTX files and run content/structural QA checks, but it cannot verify how slides actually look when rendered. A deck might pass all content checks yet contain blank pages, severe text overflow, or layout defects invisible in the abstract spec layer.

For commercial delivery, we need:
1. **Rendered visual QA** — check actual rendered output (PDF/PNG) for visual defects.
2. **Deterministic structural checks** — blank slides, sparse content, page count mismatch, layout overlap/overflow.
3. **Commercial delivery verdict** — an actionable PASS / NEEDS_REVIEW / FAIL signal combining quality score + rendered gates.
4. **Graceful degradation** — when LibreOffice is unavailable, fall back to package-level checks with clear warnings, not false passes.

## Architecture

```
runPipeline() → PPTX buffer + slideSpecs + layoutPlan
       │
       ├── M12.14 quality-manifest.json (content + structure)
       │
       └── M12.15 rendered-visual-qa.cjs
            │
            ├── PPTX package inspection (unzip -Z1, XML analysis)
            ├── PDF conversion (LibreOffice soffice) [optional]
            │    ├── Page count validation
            │    ├── Blank page detection (ink ratio from PNG)
            │    ├── Sparse content detection (pdftotext char count)
            │    └── Text density / overflow estimation
            ├── Layout geometry validation (boxesForSlide + overlap)
            └── Commercial verdict computation
```

## Components

### 1. Helper Module: `packages/presentation-pipeline/src/rendered-visual-qa.js`

Shared logic for:
- `checkPptxPackage(pptxBuffer)` — unzip-based inspection: media count, relationship integrity, absolute path leakage, XML validity.
- `resolveRenderer()` — detect LibreOffice (soffice) availability; return `{ available: true, cmd }` or `{ available: false, reason }`.
- `renderToPdf(pptxPath, outputDir, renderer)` — convert PPTX→PDF via soffice.
- `analyzeRenderedPages(pdfPath, pageCount)` — render PDF→PNG (via pdfimages) + text extraction (pdftotext). Returns per-page stats.
- `validateLayoutGeometry(slideSpecs, layoutPlan)` — box overlap, out-of-bounds, zero-size, overflow density.
- `computeVerdict(manifest, renderedResults)` — combine M12.14 manifest + M12.15 rendered results into PASS / NEEDS_REVIEW / FAIL.

### 2. Checker Script: `scripts/check-m12-15-rendered-visual-qa-commercial-gate.cjs`

CLI entry point that:
- Runs pipeline on sample fixture
- Generates PPTX to disk
- Runs all rendered visual QA checks
- Writes `rendered-qa-report.json` alongside quality-manifest.json
- Writes `COMMERCIAL-VERDICT.md` with human-readable verdict
- Exits non-zero if any hard gate fails

### 3. Commercial Verdict Logic

| Condition | Verdict |
|---|---|
| All gates pass + qualityScore >= 80 | **PASS** — deck is commercially deliverable |
| Any warning-level issue OR qualityScore 50-79 | **NEEDS_REVIEW** — human should inspect before delivery |
| Any hard gate fail OR qualityScore < 50 | **FAIL** — deck must be regenerated/fixed |

Hard gates (any failure → FAIL):
- Blank slides detected in rendered output
- Absolute path leakage in PPTX XML
- Relationship target corruption
- Page count mismatch > 0
- Zero-size render boxes
- Negative coordinates

Warning gates (contribute to NEEDS_REVIEW):
- Sparse content slides (non-title/closing)
- High text density (>38 chars/sq-in)
- Critical overflow suspected (>55 chars/sq-in)
- Low layout diversity (<3 distinct layouts)
- Missing section dividers

### 4. Degradation Strategy

When LibreOffice is unavailable:
- Package checks (XML, relationships, media) still run → full fidelity
- Geometry checks still run → full fidelity
- Rendered page checks (blank, sparse, overflow) are SKIPPED with clear WARNING
- Verdict cannot be PASS if rendered gates are skipped → defaults to NEEDS_REVIEW
- The report explicitly states which checks were degraded

### 5. CLI Integration

One-command flow:
```bash
node scripts/check-m12-15-rendered-visual-qa-commercial-gate.cjs \
  [input.md] [output-dir]
```

Defaults to same fixtures/directories as M12.14 checker.

## Test Fixtures

Create `fixtures/m12-15/` with:
- `good-deck.md` — well-structured deck that should PASS
- `sparse-deck.md` — deck with very little content on content slides → NEEDS_REVIEW
- `broken-deck.md` — deck with structural issues → FAIL

Each fixture is a minimal markdown that exercises specific gate conditions.

## Deliverables

| File | Purpose |
|---|---|
| `docs/M12_15_RENDERED_VISUAL_QA_COMMERCIAL_GATE_SPEC.md` | This spec |
| `packages/presentation-pipeline/src/rendered-visual-qa.js` | Shared helper module |
| `scripts/check-m12-15-rendered-visual-qa-commercial-gate.cjs` | CLI checker |
| `fixtures/m12-15/good-deck.md` | PASS test fixture |
| `fixtures/m12-15/sparse-deck.md` | NEEDS_REVIEW test fixture |
| `fixtures/m12-15/broken-deck.md` | FAIL test fixture |
| `package.json` | Add `check:m12-15-rendered-visual-qa-commercial-gate` + update `check` pipeline |
| `docs/ROADMAP.md` | Mark M12.13/M12.14 complete, add M12.15 complete, next direction |

## Remaining Commercial-Grade Gaps

After M12.15:
1. **Color contrast verification** — WCAG AA compliance on rendered slides
2. **Typography consistency** — font family/size variance across slides
3. **Brand guideline enforcement** — logo placement, color palette compliance
4. **Multi-domain style packs** — domain-specific visual rules (education vs business vs technical)
5. **Automated fix suggestions** — when a gate fails, suggest concrete remediation steps
6. **CI/CD integration** — pre-commit hook that runs QA on every deck generation
