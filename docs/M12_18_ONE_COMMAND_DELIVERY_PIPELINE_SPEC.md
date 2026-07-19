# M12.18 — Productized One-Command Delivery Pipeline

> **Date**: 2026-07-19
> **Branch**: `feat/m12-18-one-command-delivery-pipeline`
> **Depends on**: M12.17 (pixel accessibility gate), M12.16 (visual design standards), M12.15 (rendered visual QA)

## Problem Statement

After M12.17, the AWE project has a complete set of quality gates (M12.14–M12.17) but no single command to go from input document to commercial-grade deliverable. Each milestone has its own checker script with different invocation patterns, output directories, and artifact sets. There is no unified "one-command delivery" experience.

For commercial-grade CLI product delivery, we need:

1. **Single command**: `node scripts/deliver-pptx.js input.md output-dir --style X` → PPTX + all QA artifacts + commercial verdict
2. **Reusable package**: M12.17 core logic extracted into `packages/pixel-accessibility-gate/` as a proper module
3. **Graceful degradation**: Missing rendering tools → NEEDS_REVIEW, not false PASS or crash
4. **Consistent artifacts**: All checks produce the same set of output files regardless of which checker runs
5. **Machine-readable + human-readable**: Both JSON report and Markdown summaries from one invocation
6. **Testable**: Unit tests verify artifact existence, exit codes, and graceful degradation

## Scope

### In Scope

1. **Package extraction**: Move M12.17 core functions (`checkPixelContrast`, `checkColorBlindness`, `checkFontFallback`, `mergeCommercialReadiness`, `detectEnvironment`) from `scripts/check-m12-17*.cjs` into `packages/pixel-accessibility-gate/src/index.js`. Keep the existing checker as a thin wrapper that imports from the package.

2. **Product CLI**: Create `scripts/deliver-pptx.js` — a user-facing command that:
   - Accepts `--style`, `--title`, `--json`, `--help` flags
   - Runs full pipeline (M12.14 quality manifest → M12.15 rendered QA → M12.16 visual design → M12.17 pixel accessibility)
   - Writes all expected artifacts to output directory
   - Returns correct exit codes (0 for PASS/NEEDS_REVIEW, 1 for FAIL, 2 for errors)

3. **NPM scripts**: Register `npm run deliver:pptx` and `npm run check:m12-18-one-command-delivery-pipeline` in package.json. Add the new check to `check:all`.

4. **Tests**: Focused test suite verifying:
   - Script exists and is importable
   - Missing input → exit code 2
   - Empty input → exit code 2
   - Good fixture → all 8 artifacts exist and non-empty
   - Verdict is not FAIL for good fixture
   - Different styles produce different outputs
   - JSON mode outputs valid machine-readable JSON
   - Help flag works
   - Package exports are correct functions
   - Package functions return valid data structures
   - NPM scripts are registered
   - Graceful degradation works

5. **Documentation**: Update ROADMAP.md, create M12_18 spec document.

### Out of Scope

- Cloud API integration (stays local-only)
- GUI/web application
- Additional quality gates beyond M12.17
- CI/CD pipeline configuration (reserved for future milestones)
- Multi-user collaboration features

## Architecture

```
User Input (markdown)
       │
       ▼
┌─────────────────────┐
│  deliver-pptx.js    │  ← Product-facing CLI (entry point)
│  (scripts/)         │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  runPipeline()      │  ← M12.7 end-to-end pipeline
│  (presentation-     │     chains: ingest → intent → story →
│   pipeline/)        │     slidespec → theme → renderer
└────────┬────────────┘
         │
    slideSpecs + layoutPlan + manifest
         │
    ┌────┼──────────────────────────────────────────────────┐
    │    │                                                    │
    ▼    ▼                                                    ▼
┌──────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│M12.15    │  │M12.16 Visual Design Gate  │  │M12.17 Pixel Accessibility│
│Rendered  │  │(packages/visual-design-   │  │(packages/pixel-           │
│QA        │  │  gate/)                   │  │  accessibility-gate/)     │
│(rendered-│  │                          │  │                           │
│visual-qa)│  │  • Color contrast (WCAG) │  │  • Pixel contrast         │
│          │  │  • Typography consistency│  │  • Color-blindness sim    │
│  • PPTX→ │  │  • Brand guidelines      │  │  • Font fallback/readability
│  PDF→PNG │  │                          │  │                           │
│  • Blank │  │                          │  │                           │
│  detection│ │                          │  │                           │
└──────────┘  └──────────────────────────┘  └──────────────────────────┘
         │                                                    │
         └──────────────────┬─────────────────────────────────┘
                            │
                            ▼
                  ┌─────────────────┐
                  │mergeCommercial  │
                  │Readiness()      │
                  │(pixel-acc-gate) │
                  └────────┬────────┘
                           │
                    overallVerdict
                    (PASS/NEEDS_REVIEW/FAIL)
                           │
                           ▼
                  ┌─────────────────┐
                  │Write All        │
                  │Artifacts        │
                  │(8 files)        │
                  └─────────────────┘
```

## Deliverable Artifacts

The `deliver-pptx.js` command produces these files in the output directory:

| File | Source | Description |
|------|--------|-------------|
| `output.pptx` | PPTX Renderer | Generated PowerPoint deck |
| `quality-manifest.json` | M12.14 | Deterministic quality scoring |
| `QA-SUMMARY.md` | M12.14 | Content + structural QA summary |
| `VISUAL-DESIGN-SUMMARY.md` | M12.16 | Visual design analysis with WCAG checks |
| `rendered-qa-report.json` | M12.15 | Rendered page analysis (blank, overflow, geometry) |
| `PIXEL-ACCESSIBILITY-SUMMARY.md` | M12.17 | Pixel contrast + color-blindness simulation |
| `COMMERCIAL-VERDICT.md` | Merger | Final commercial-readiness verdict |
| `machine-report.json` | Merger | Machine-readable JSON report (all gates merged) |

## User Invocation Examples

```bash
# Basic usage: input → output directory with default style
node scripts/deliver-pptx.js docs/proposal.md ./deliverables

# Specify theme style
node scripts/deliver-pptx.js slides.md ./out --style business-consulting

# Override title
node scripts/deliver-pptx.js slides.md ./out --title "Q3 Review"

# JSON-only mode (machine-readable to stdout)
node scripts/deliver-pptx.js slides.md --json --style academic-clean

# Via npm script
npm run deliver:pptx -- docs/business-review.md ./deliverables

# Help
node scripts/deliver-pptx.js --help
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | PASS or NEEDS_REVIEW (informational, no action required) |
| 1 | FAIL (hard defects detected, remediation needed) |
| 2 | Error (invalid input, missing file, pipeline crash) |

## Graceful Degradation Matrix

| Missing Tool | Impact | Verdict Behavior |
|-------------|--------|------------------|
| LibreOffice | No PDF/PNG rendering | M12.15 → NEEDS_REVIEW, M12.17 pixel contrast → color proxy |
| ImageMagick | No pixel-level contrast | M12.17 pixel contrast → color metadata proxy (NEEDS_REVIEW at worst) |
| Poppler | No PDF text extraction | M12.17 font readability → metadata-only (NEEDS_REVIEW at worst) |
| All renderers | No rendered output | All pixel checks → NEEDS_REVIEW, NOT false PASS |
| **Hard defects** (blank pages, path leaks, color-blind FAIL) | Any environment | Always → FAIL regardless of tool availability |

## Package Structure

```
packages/pixel-accessibility-gate/
  src/
    index.js          # Core library (extracted from M12.17 checker)
                        # Exports: detectEnvironment, estimatePixelContrast,
                        #         checkPixelContrast, checkColorBlindness,
                        #         checkFontFallback, mergeCommercialReadiness,
                        #         computeColorContrast

scripts/
  deliver-pptx.js     # Product-facing CLI entry point
  check-m12-17*.cjs   # Thin wrapper (imports from package)

tests/
  m12-18-one-command-delivery-pipeline.test.js
```

## Testing Strategy

Tests verify:
1. **Existence**: Script and package files exist
2. **Error handling**: Missing/empty input → exit code 2
3. **Artifact completeness**: All 8 expected files produced
4. **Verdict correctness**: Good fixture does not produce FAIL
5. **Style variation**: Different styles produce different outputs
6. **JSON mode**: Machine-readable output is valid JSON with expected fields
7. **Help**: --help flag works correctly
8. **Package API**: All exported functions work with valid inputs
9. **NPM registration**: Scripts are in package.json
10. **Degradation**: Script does not crash without rendering tools

## Integration with Prior Milestones

- **M12.14**: Quality manifest and QA summary generation reused via pipeline emit hook
- **M12.15**: Rendered visual QA (PPTX→PDF→PNG, blank detection, geometry validation) reused via `rendered-visual-qa.js`
- **M12.16**: Visual design gate (color contrast, typography, brand rules) reused via `visual-design-gate/src/index.js`
- **M12.17**: Core logic extracted into package, checker becomes thin wrapper
- **Combined**: `deliver-pptx.js` orchestrates all prior gates into a single command

## Rules

1. **One PR = One Goal**: This PR adds the one-command delivery pipeline only
2. **No Feature Creep**: No new quality gates added; only packaging and orchestration
3. **Local-Only**: No cloud APIs, no paid dependencies
4. **Backward Compatible**: Existing checker scripts continue to work unchanged
5. **Test Before Ship**: All tests must pass before merge
