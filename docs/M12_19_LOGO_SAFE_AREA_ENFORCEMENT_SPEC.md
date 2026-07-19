# M12.19 — Logo Safe Area Enforcement

## Overview

Deterministic logo safe-area enforcement gate that validates all logo bounding boxes declared in SlideSpec sit within configurable brand-safe margins on every slide.

**Verdict levels:**
- `PASS` — every declared logo sits fully inside its safe-area rectangle
- `NEEDS_REVIEW` — no logo bounding-box data found (enforcement impossible without concrete logo position data)
- `FAIL` — at least one logo protrudes outside the safe-area margin

## Specification

### Safe-Area Model

A logo is considered "safe" if its entire bounding box fits within:
```
x >= left_margin
y >= top_margin
x + width <= slide_width - right_margin
y + height <= slide_height - bottom_margin
```

Default margins (40px on each side):
| Margin | Default |
|--------|---------|
| Top    | 40px    |
| Bottom | 40px    |
| Left   | 40px    |
| Right  | 40px    |

Slide dimensions: 1279 x 720 px (standard pptxgenjs 13.33 x 7.5 inches at 96 DPI).

### Logo Data Sources

The checker reads logo bounding-box data from two locations in SlideSpec:

1. **Primary**: `designHints.logo.boundingBox` — `{ x, y, width, height }` in px
2. **Secondary**: `visualSpec.logo.boundingBox` — same shape
3. **Tertiary**: `designHints.logo` or `visualSpec.logo` with explicit `x, y, width, height` keys
4. **Fallback**: presence of `designHints.logo` or `visualSpec.logo` without box → WARN (cannot verify)

### Brand Config Override

Custom margins can be provided via `brandConfig.logoSafeArea`:
```js
const result = checkLogoSafeArea(slideSpecs, layoutPlan, {
  logoSafeArea: { top: 60, bottom: 60, left: 60, right: 60 }
});
```

## API

```js
const { checkLogoSafeArea } = require('./packages/logo-safe-area-gate/src/index.js');

const result = checkLogoSafeArea(slideSpecs, layoutPlan, brandConfig);
// Returns:
// {
//   verdict: "PASS" | "NEEDS_REVIEW" | "FAIL",
//   passCount: number,
//   failCount: number,
//   warnCount: number,
//   totalLogosChecked: number,
//   results: [{ slide, status, message, box?, source? }],
//   issues: [{ slide, category, severity, suggestion }],
//   margins: { top, bottom, left, right },
//   slideDimensions: { width, height }
// }
```

## CLI Usage

```bash
# Default (sample-markdown.md → examples/business-review/m12-19-audit/)
npm run check:m12-19-logo-safe-area-enforcement

# Custom input/output
node scripts/check-m12-19-logo-safe-area-enforcement.cjs \
  path/to/input.md \
  path/to/output/dir
```

## File Outputs

| File | Description |
|------|-------------|
| `examples/<deck>/m12-19-audit/logo-safe-area-report.json` | Machine-readable JSON report |
| `examples/<deck>/m12-19-audit/LOGO-SAFE-AREA-SUMMARY.md` | Human-readable markdown summary |

## Test Coverage

Unit tests cover:
- PASS scenario: all logos within safe area
- FAIL scenario: logo protrudes outside safe area
- NEEDS_REVIEW scenario: logo declared without bounding box
- NEEDS_REVIEW scenario: no logos declared at all
- Empty specs handling
- Custom brand config margins
- visualSpec logo source detection
- Mixed scenario (pass + fail + warn together)
- Module exports verification
- NPM script registration
- Package directory existence

Run with: `node tests/m12-19-logo-safe-area-enforcement.test.js`

## Integration

M12.19 is integrated into:
1. `scripts/deliver-pptx.js` — Step 4/6, runs after M12.16, before M12.17
2. `packages/pixel-accessibility-gate/src/index.js` — `mergeCommercialReadiness()` accepts M12.19 result for overall verdict computation and remediation generation
3. `npm run check` — included in the sequential check chain
4. `npm run check:all` — inherited through `npm run check`

## Files Added

| Path | Purpose |
|------|---------|
| `packages/logo-safe-area-gate/src/index.js` | Core library: logo safe-area checker with PASS/NEEDS_REVIEW/FAIL verdicts |
| `scripts/check-m12-19-logo-safe-area-enforcement.cjs` | CLI entrypoint |
| `tests/m12-19-logo-safe-area-enforcement.test.js` | Unit tests (12 test scenarios) |
| `docs/M12_19_LOGO_SAFE_AREA_ENFORCEMENT_SPEC.md` | This document |
