# M12.17 — Pixel-Level Accessibility and Rendered Visual Robustness Gate

> **Date**: 2026-07-19
> **Branch**: `feat/m12-17-pixel-accessibility-rendered-robustness`
> **Depends on**: M12.15 (rendered visual QA), M12.16 (visual design standards)

## Problem Statement

M12.15 can render PPTX→PDF→PNG and detect blank pages; M12.16 validates color contrast and typography from layout metadata. But neither checks the **actual rendered pixels** for accessibility or color-blindness distinguishability. A deck might pass all metadata checks yet contain subtle contrast failures, color pairs that merge under protanopia/deuteranopia, or fonts that fail to embed properly.

For commercial-grade delivery, we need:
1. **Pixel-level contrast estimation** on actual rendered PNGs using ImageMagick nearest-neighbor downsampling + bimodal luminance clustering.
2. **Color-blindness simulation** via deterministic matrix transforms on palette colors, flagging indistinguishable pairs.
3. **Font fallback/readability validation** combining theme metadata with PDF text extraction quality.
4. **Unified commercial-readiness report** merging all M12.15/M12.16/M12.17 gates.

## Scope

### 1. Pixel-Based Contrast Estimation

On each rendered PNG page:
- Downsample using **nearest-neighbor** (`magick -filter point`) to ~100x56 while preserving bimodal luminance distribution.
- Extract all pixel RGB values via `magick txt:` format.
- Compute WCAG relative luminance for each pixel.
- Cluster into dark/light groups at median threshold.
- Estimate contrast ratio = `(lighter_mean + 0.05) / (darker_mean + 0.05)`.
- Thresholds: AA normal < 4.5:1 → FAIL, AA large < 3.0:1 → FAIL, AAA < 7.0:1 → WARN.

**Degradation**: When ImageMagick unavailable, fall back to layoutPlan color metadata (same as M12.16).

### 2. Color-Blindness Simulation

Deterministic 3×3 matrix transforms applied to palette colors:
- **Protanopia** (red-blind): `[0.567, 0.433, 0.0] / [0.558, 0.442, 0.0] / [0.0, 0.242, 0.758]`
- **Deuteranopia** (green-blind): `[0.625, 0.375, 0.0] / [0.700, 0.300, 0.0] / [0.0, 0.300, 0.700]`
- **Tritanopia** (blue-blind): `[0.950, 0.050, 0.0] / [0.0, 0.433, 0.567] / [0.0, 0.475, 0.525]`

Distinguishability check: Euclidean distance in RGB space between simulated foreground/background.
- Distance < 30 → indistinguishable → FAIL for protanopia/deuteranopia (most common types)
- Distance < 30 → indistinguishable → WARN for tritanopia (less common)

Checked pairs per slide: `text/accent`, `text/background`, `secondaryText/background`, `primary/background`, `text/surface`.

### 3. Font Fallback / Readability Checks

- **Font family validation**: Known safe families (Arial, Helvetica, etc.) pass; custom fonts trigger NEEDS_REVIEW warning.
- **Size variance**: >4x ratio within same font family triggers warning.
- **Rendered text extraction**: When Poppler available, verify pdftotext extractable char count per non-title slide. Zero chars → FAIL (font embedding broken). <10 chars → WARN (sparse content).

### 4. Unified Commercial Readiness Report

Merges all gates into single verdict:
| Gate | Source | Data |
|------|--------|------|
| M12.15 Rendered Visual QA | PPTX→PDF→PNG, geometry | Blank pages, overflow, path leaks |
| M12.16 Visual Design Standards | SlideSpec + LayoutPlan | Contrast (WCAG), typography, brand rules |
| M12.17 Pixel Contrast | Rendered PNG pixels | Actual pixel luminance clustering |
| M12.17 Color-Blindness | LayoutPlan colors | Matrix-transformed distinguishability |
| M12.17 Font Readability | LayoutPlan + PDF text | Font fallback + extraction quality |

**Overall verdict**: Worst-of-all-wins. If any gate returns FAIL → overall FAIL.

## Architecture

```
runPipeline() → PPTX buffer + slideSpecs + layoutPlan + manifest
       │
       ├── M12.15: PPTX→PDF (LibreOffice) → PNG (ImageMagick)
       │         → page count, blank detection, text extraction, geometry
       │
       ├── M12.16: color contrast + typography + brand rules
       │
       └── M12.17: pixel-accessibility-gate
                │
                ├── Pixel contrast on PNGs (magick txt:)
                ├── Color-blindness simulation (matrix transforms)
                ├── Font fallback/readability (metadata + pdftotext)
                └── Unified commercial readiness report
```

## Components

### Module: `packages/pixel-accessibility-gate/src/index.js`

Shared logic for:
- `estimatePixelContrast(pngPath)` — nearest-neighbor downsample + bimodal luminance clustering.
- `checkPixelContrast(pngFiles, slideSpecs, layoutPlan)` — per-page pixel contrast analysis.
- `checkColorBlindness(layoutPlan)` — matrix transform simulation across all slide layouts.
- `checkFontFallback(slideSpecs, layoutPlan, pdfTextPages, environment)` — font + readability validation.
- `mergeCommercialReadiness(...)` — unified report with consolidated verdict and remediations.

### Checker Script: `scripts/check-m12-17-pixel-accessibility-rendered-robustness.cjs`

CLI entry point that:
1. Runs pipeline on sample fixture
2. Generates PPTX→PDF→PNG via LibreOffice + ImageMagick
3. Runs M12.15 rendered QA → M12.16 visual design → M12.17 pixel/accessibility
4. Writes unified `pixel-accessibility-report.json` + `PIXEL-ACCESSIBILITY-SUMMARY.md` + `COMMERCIAL-VERDICT.md`
5. Exits non-zero if overall verdict is FAIL

## Test Fixtures

Located in `fixtures/m12-17/`:

| Fixture | Purpose | Expected Verdict |
|---------|---------|-----------------|
| `good-deck.md` | All slides high contrast, standard fonts, embedded correctly | PASS |
| `low-contrast-deck.md` | Slides with gray-on-white text (ratio < 4.5:1) | FAIL (pixel contrast) |
| `colorblind-risk-deck.md` | Red/green accent pairs that merge under deuteranopia | FAIL (color-blindness) |
| `font-fallback-deck.md` | Custom font not embedded, pdftotext returns 0 chars | FAIL (font readability) |
| `degraded-env-deck.md` | Simulates missing ImageMagick → falls back to color proxy | NEEDS_REVIEW |

## Verdict Levels

| Verdict | Meaning | CI Behavior |
|---------|---------|-------------|
| **PASS** | Meets all accessibility and rendered robustness criteria | Exit 0 |
| **NEEDS_REVIEW** | Soft issues detected (degraded env, minor contrast misses) | Exit 0 (informational) |
| **FAIL** | Hard violations (poor color-blind distinguishability, unreadable text, AA contrast fails) | Exit 1 |

## Degradation Strategy

| Missing Tool | Impact | Degraded Behavior |
|-------------|--------|-------------------|
| LibreOffice | No PDF/PNG rendering | Package-level checks only (M12.15 geometry) |
| ImageMagick | No pixel contrast | Falls back to layoutPlan color metadata |
| Poppler | No text extraction | Font checks limited to metadata only |
| All renderers | No rendered output | All pixel checks → NEEDS_REVIEW |

## API Usage

```javascript
const {
  checkPixelContrast,
  checkColorBlindness,
  checkFontFallback,
  mergeCommercialReadiness,
} = require("./packages/pixel-accessibility-gate/src/index.js");

// Run individual checks
const pixelResult = checkPixelContrast(pngFiles, slideSpecs, layoutPlan);
const cbResult = checkColorBlindness(layoutPlan);
const fontResult = checkFontFallback(slideSpecs, layoutPlan, pdfTextPages, env);

// Merge into unified report
const report = mergeCommercialReadiness(
  m12_15_verdict, m12_16_gate, pixelResult, cbResult, fontResult, env
);
console.log(report.overallVerdict); // "PASS" | "NEEDS_REVIEW" | "FAIL"
```

## Integration with Prior Milestones

- **M12.15**: Pixel contrast uses the same PNG files generated by M12.15's PDF→PNG pipeline. The checker reuses `resolveRenderer()`, `renderToPdf()`, `renderPdfToPng()` from `rendered-visual-qa.js`.
- **M12.16**: Color-blindness simulation complements M12.16's WCAG contrast checks. M12.16 checks text/background ratios; M12.17 checks whether accent vs background pairs remain distinguishable after color-blindness simulation.
- **Combined**: The unified report ensures no gate can override a harder failure — if M12.15 says FAIL (blank pages), M12.17 cannot return PASS.
