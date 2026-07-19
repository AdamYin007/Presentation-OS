# M12.20 Brand Template Profile Packs — Specification

**Milestone**: M12.20
**Date**: 2026-07-19
**Status**: Complete
**PR**: feat/m12-20-brand-template-profile-packs

---

## Business Value

Presentation OS outputs commercial-grade decks, but different clients and industries require different brand rules: logo margins, allowed color palettes, typography constraints, footer conventions, and slide structure requirements. M12.20 introduces **reusable brand profile packs** that let users apply a named profile (or custom JSON) to enforce these rules automatically across all QA gates.

This makes Presentation OS commercially viable for agencies and consultants who deliver branded presentations — no manual configuration per deck needed.

---

## Architecture

### Package: `@awe/brand-profiles`

Located at `packages/brand-profiles/`, this package provides:

| Module | Purpose |
|--------|---------|
| `src/schema.js` | Profile schema validation — defines required fields, types, enum checks |
| `src/builtins.js` | Three canonical built-in profiles with full brand rules |
| `src/loader.js` | Profile loading from built-in names or custom JSON file paths |
| `src/index.js` | Public API — re-exports everything above |

### Built-in Profiles

Three profiles ship out of the box, each aligned with an existing theme token:

| Profile ID | Theme Style | Logo Safe Area | Footer | Title Slide Required | Closing Required | Max Slides/Section |
|------------|-------------|----------------|--------|----------------------|------------------|--------------------|
| `minimal-modern` | minimal-modern | 40px all sides | slide-number | No | Yes | 10 |
| `business-consulting` | business-consulting | 50px all sides | brand-name | Yes | Yes | 8 |
| `academic-clean` | academic-clean | 30px all sides | both | Yes | Yes | 12 |

Each profile includes:
- `logoSafeArea`: brand-specific safe-area margins (px)
- `allowedPalette`: hex colors approved for use in the deck
- `typographyRules`: heading/body font families and size constraints
- `footerConvention`: "none" | "slide-number" | "brand-name" | "both"
- `titlePlacement`: "top" | "center"
- `requiredSlides`: titleSlide/closingSlide booleans
- `maxSlidesPerSection`: section length limit

### Integration Points

The profile config flows into two existing gates via `resolveBrandConfig()`:

1. **M12.16 Visual Design Standards Gate** (`packages/visual-design-gate/src/index.js`): receives `brandConfig` which feeds `checkBrandGuidelines()` — palette enforcement, footer conventions, slide structure rules.
2. **M12.19 Logo Safe Area Gate** (`packages/logo-safe-area-gate/src/index.js`): receives `brandConfig` which overrides default logo margins via `logoSafeArea` field.

---

## CLI Usage

### Built-in Profiles

```bash
# Apply business-consulting profile
node scripts/deliver-pptx.js docs/proposal.md ./deliverables --brand-profile business-consulting

# Combine style + profile (profile takes precedence for brand rules)
node scripts/deliver-pptx.js slides.md ./out --style academic-clean --brand-profile business-consulting
```

### Custom JSON Profiles

```bash
# Load from absolute path
node scripts/deliver-pptx.js slides.md ./out --brand-profile /path/to/my-brand.json
```

### Help

```bash
node scripts/deliver-pptx.js --help
```

Shows available built-ins and usage examples.

---

## Custom Profile JSON Format

```json
{
  "name": "My Company Brand",
  "id": "my-company-brand",
  "description": "Brand rules for Acme Corp presentations.",
  "inheritsTheme": false,
  "logoSafeArea": { "top": 50, "bottom": 50, "left": 50, "right": 50 },
  "allowedPalette": [ "#0B3D91", "#F5A623", "#FFFFFF", "#1A1A1A" ],
  "typographyRules": {
    "headingFont": "Arial, sans-serif",
    "bodyFont": "Arial, sans-serif",
    "monoFont": "Courier New, monospace"
  },
  "footerConvention": "brand-name",
  "titlePlacement": "center",
  "requiredSlides": { "titleSlide": true, "closingSlide": true },
  "maxSlidesPerSection": 6
}
```

All fields are optional except `name` or `id`. Missing fields fall back to gate defaults.

---

## Schema Validation

The loader validates every profile (built-in or custom) before applying it. Invalid profiles cause `exit code 2` with a descriptive error message listing all validation failures.

Validation covers:
- `logoSafeArea`: must be `{top, bottom, left, right}` with non-negative numbers
- `allowedPalette`: array of `#RRGGBB` hex strings
- `typographyRules`: object with optional string fields
- `footerConvention`: one of `none`, `slide-number`, `brand-name`, `both`
- `titlePlacement`: one of `top`, `center`
- `requiredSlides`: object with boolean `titleSlide` and `closingSlide`
- `maxSlidesPerSection`: positive number

---

## Test Coverage

Test suite at `tests/m12-20-brand-template-profile-packs.test.js` covers:

1. **Module exports** — all public APIs present
2. **Built-in profile discovery** — `getBuiltInProfiles()` returns 3 names
3. **Profile validation** — valid/invalid objects rejected correctly
4. **Built-in loading** — all 3 profiles load with correct margins/config
5. **Custom JSON loading** — file-based profiles resolve correctly
6. **Error handling** — missing files, bad JSON, bad schema all rejected
7. **Logo safe-area influence** — tight margins turn PASS into FAIL
8. **Deliver-pptx integration** — flag parsing, profile loading, config forwarding
9. **NPM script registration** — check:m12-20 registered in package.json
10. **Package structure** — all source files exist

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `packages/brand-profiles/package.json` | Created | NPM package manifest |
| `packages/brand-profiles/src/schema.js` | Created | Profile schema validation |
| `packages/brand-profiles/src/builtins.js` | Created | Three built-in profiles |
| `packages/brand-profiles/src/loader.js` | Created | Profile loader (builtin + file) |
| `packages/brand-profiles/src/index.js` | Created | Public API |
| `scripts/deliver-pptx.js` | Modified | Added --brand-profile flag, loads config, forwards to gates |
| `package.json` | Modified | Added npm script, wired into check/check:all |
| `tests/m12-20-brand-template-profile-packs.test.js` | Created | Full test suite |
| `fixtures/m12-20/custom-brand-profile.json` | Created | Custom profile fixture |
| `fixtures/m12-20/invalid-profile.json` | Created | Bad JSON fixture |
| `fixtures/m12-20/bad-schema-profile.json` | Created | Invalid schema fixture |
| `docs/M12_20_BRAND_TEMPLATE_PROFILE_PACKS_SPEC.md` | Created | This specification |
| `docs/ROADMAP.md` | Modified | M12.20 entry added |

---

## Remaining Gaps (Future Work)

1. **Profile inheritance/composition** — currently profiles are standalone; no merging of multiple profiles
2. **Dynamic palette override** — `allowedPalette` is checked but not enforced in rendering (only in QA gate)
3. **Typography enforcement** — `typographyRules` stored in config but not actively enforced during rendering
4. **Profile discovery API** — no CLI subcommand to list/search installed profiles
5. **Pack integration** — profiles cannot yet be bundled inside presentation packs
6. **CI integration** — check:m12-20 not yet wired into GitHub Actions workflow
