# M12.16 — Visual Design Standards Gate

## Overview

M12.16 adds a deterministic, local-only **Visual Design Standards Gate** that analyzes SlideSpec/manifest/rendered artifacts for commercial-grade visual quality. It moves beyond structural and rendered QA toward client-ready deck visual standards.

This gate is fully self-contained — no cloud APIs, no paid dependencies, no GUI/web app. All analysis runs on the pipeline's internal data structures (SlideSpec, LayoutPlan, theme tokens, color palettes).

## Scope

The gate covers four dimensions:

### 1. Color Contrast Validation (WCAG-style)

Analyzes text/background color pairs across all slides using WCAG 2.1 relative luminance formula:

- **AA Normal Text (<18pt)**: contrast ratio ≥ 4.5:1 → FAIL if below
- **AA Large Text (≥18pt)**: contrast ratio ≥ 3:1 → FAIL if below  
- **AAA Normal Text**: contrast ratio ≥ 7:1 → NEEDS_REVIEW if below AA threshold
- **AAA Large Text**: contrast ratio ≥ 4.5:1 → NEEDS_REVIEW if below AA threshold

Checked pairs per slide: `text/bg`, `secondaryText/bg`, `mutedText/bg`, `accent/bg`, `primary/bg`, `text/surface`, `secondaryText/surface`.

### 2. Typography Consistency Checks

Validates font family and size hierarchy consistency across slides:

- **Heading size variance** within each layout family: >50% variance → FAIL, >20% → NEEDS_REVIEW
- **Body size variance** within each layout family: same thresholds
- **Font family consistency**: all slides must use fonts from the defined theme family
- **Heading-to-body ratio**: consistent ~1.5x ratio expected, >0.5 spread → NEEDS_REVIEW

### 3. Brand Guideline Rule Hooks / Config

Configurable brand compliance checks via `brandConfig` object:

| Rule | Default | Severity |
|------|---------|----------|
| Required title slide | true | FAIL if missing |
| Required closing slide | true | FAIL if missing |
| Allowed palette | empty (use theme colors) | WARN if off-palette |
| Max slides per section | 10 | WARN if exceeded |
| Title placement | "top" | INFO |
| Footer convention | "slide-number" | INFO |

Custom brand configs can be provided via `config/brand-guidelines.json` or passed programmatically.

### 4. Actionable Remediation Suggestions

Every violation includes a machine-readable suggestion field with specific guidance for remediation. Output includes:

- **Machine-readable report**: `visual-design-report.json` with structured violation data
- **Human QA summary**: `VISUAL-DESIGN-SUMMARY.md` with formatted markdown report

## Verdict Levels

| Verdict | Meaning | CI Behavior |
|---------|---------|-------------|
| **PASS** | Meets all commercial visual standards | Exit 0 |
| **NEEDS_REVIEW** | Soft issues detected (AAA misses, minor variance) | Exit 0 (informational) |
| **FAIL** | Hard violations (AA contrast fails, major inconsistency) | Exit 1 |

## M12.15 Integration

The gate integrates with the M12.15 commercial verdict to prevent false positives:

- If M12.15 returned **FAIL**, M12.16 cannot return **PASS** (downgraded to NEEDS_REVIEW)
- This ensures degraded rendered environments don't falsely pass visual quality checks
- The integration is tracked in `m12_15_integration.overridden` field of the report

## API Usage

```javascript
const { runVisualDesignGate } = require("./packages/visual-design-gate/src/index.js");

// Minimal usage
const result = await runVisualDesignGate(slideSpecs, layoutPlan);
console.log(result.overallVerdict); // "PASS" | "NEEDS_REVIEW" | "FAIL"

// With brand config
const result = await runVisualDesignGate(slideSpecs, layoutPlan, {
  brandConfig: {
    allowedPalette: ["#1A1A1A", "#FFFFFF", "#3B82F6"],
    requiredTitleSlide: true,
    maxSlidesPerSection: 8,
  },
  m12_15_verdict: "FAIL",  // integrate prior commercial gate
});

// Generate reports
const { generateHumanSummary, generateMachineReport } = 
  require("./packages/visual-design-gate/src/index.js");

const humanMd = generateHumanSummary(result);   // markdown string
const machineJson = generateMachineReport(result); // structured JSON
```

## CLI Usage

```bash
# Default (sample-markdown.md → examples/business-review/m12-16-audit/)
npm run check:m12-16-visual-design-standards-gate

# Custom input/output
node scripts/check-m12-16-visual-design-standards-gate.cjs \
  path/to/input.md \
  path/to/output/dir
```

## File Outputs

| File | Description |
|------|-------------|
| `examples/<deck>/m12-16-audit/visual-design-report.json` | Machine-readable JSON report |
| `examples/<deck>/m12-16-audit/VISUAL-DESIGN-SUMMARY.md` | Human-readable markdown summary |
| `examples/<deck>/quality-manifest.json` | Updated manifest with `m12_16` section |

## Test Coverage

Unit tests cover:
- Color contrast utilities (hex parsing, luminance, ratio calculation)
- PASS scenario: all WCAG AA thresholds met
- FAIL scenario: AA threshold violations
- NEEDS_REVIEW scenario: AAA threshold misses
- Typography: consistent, variable (FAIL), moderate (NEEDS_REVIEW)
- Brand guidelines: complete deck, missing required slides
- Full gate integration: PASS, FAIL, M12.15 override
- Graceful degradation: null layout plan

Run with: `node tests/m12-16-visual-design-gate.test.js`

## Files Added

| Path | Purpose |
|------|---------|
| `packages/visual-design-gate/src/index.js` | Core library: contrast, typography, brand checks + report generation |
| `scripts/check-m12-16-visual-design-standards-gate.cjs` | CLI entrypoint |
| `tests/m12-16-visual-design-gate.test.js` | Unit tests (13 test scenarios) |
| `docs/M12_16_VISUAL_DESIGN_STANDARDS_GATE_SPEC.md` | This document |

## Remaining Commercial-Grade Gaps

These are intentionally OUT OF SCOPE for M12.16 (can be addressed in future milestones):

1. **Rendered pixel-level contrast**: Current analysis uses theme/layout color data from the pipeline, not actual rendered pixels. True pixel-level contrast requires PDF/PNG rendering + per-pixel sampling.
2. **Logo safe area enforcement**: Brand config supports `logoSafeArea` definition but doesn't enforce it without explicit logo bounding box data in SlideSpec.
3. **Cross-theme consistency**: Only validates within a single theme. Multi-theme decks would need cross-theme palette alignment.
4. **Accessibility audit**: No screen reader / semantic structure analysis (that's M12.14 domain).
5. **Image/media contrast**: Charts, images, and decorative elements aren't analyzed for contrast.
