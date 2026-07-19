# M12.21 Profile-Driven Rendering — Specification

**Milestone**: M12.21
**Date**: 2026-07-19
**Status**: Complete

## Business Value

M12.20 made brand profiles loadable and usable by QA gates. M12.21 makes those same profiles affect the generated PowerPoint itself, which is the next step toward a commercial delivery product: users can run one terminal command and receive a deck whose colors, fonts, title placement, footer convention, and logo-safe rules are aligned to a selected brand profile.

## CLI Usage

```bash
npm run deliver:pptx -- fixtures/m12-21/good.md ./deliverables --brand-profile business-consulting
npm run deliver:pptx -- fixtures/m12-21/good.md ./deliverables --brand-profile fixtures/m12-21/custom-brand.json
npm run deliver:pptx -- fixtures/m12-21/good.md ./deliverables --style academic-clean --brand-profile academic-clean --json
```

## Rendering Behavior

- `brandConfig.allowedPalette` overrides theme color roles used by `layout.themeTokens` and per-slide `layout.colors`.
- `brandConfig.typographyRules` overrides theme font tokens used by layout planning and the generated PPTX theme font faces.
- `brandConfig.footerConvention` controls right-aligned footer text:
  - `none`: no brand footer
  - `slide-number`: `1 / N`
  - `brand-name`: profile name or explicit brand name
  - `both`: brand name plus page number
- Source references remain as a left footer when present, preserving traceability.
- `brandConfig.titlePlacement` controls title and closing slide vertical placement.
- Invalid profiles still fail before generation with exit code `2`.
- `--json` mode remains machine-readable.

## Verification

```bash
npm run check:m12-21-profile-driven-rendering
npm run check:m12-18-one-command-delivery-pipeline
npm run check
npm run check:all
```

## Remaining Gaps

- Profile settings are deterministic rule overlays, not a full design system editor.
- Logo assets are still declarative; automatic logo image placement remains future work.
- Typography is reflected through layout metadata and renderer behavior where existing primitives support it.
