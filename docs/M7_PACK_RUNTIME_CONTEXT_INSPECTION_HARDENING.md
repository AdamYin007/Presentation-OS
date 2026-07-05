# M7.2 Pack Runtime Context Inspection Hardening — Implementation Note

> **Version**: 1.0.0  
> **Date**: 2026-07-05  
> **Status**: Implementation Note  
> **Related**: M7.1 Pack Runtime Boundary Design, PR65  
> **Category**: Implementation — Pack Runtime Context  
> **Target Phase**: M7.2 (implementation)

---

## Purpose

Document the M7.2 implementation: hardening Pack Runtime Context inspection in a read-only, backward-compatible way by exposing normalized metadata/governance/boundary information internally for inspection use, without changing rendering behavior or existing successful CLI output format.

## Scope

- `src/pack-runtime-context.js` — Added normalized read-only context sections
- `src/pack-inspection.js` — Updated to derive from normalized context internally
- `src/pack-loader.js` — Tolerated duplicate registration (loadAllPacks + loadPack coexistence)
- `scripts/pack-loader-contract-smoke.js` — Extended with 14 new context/boundary checks
- Documentation files — Updated to reflect M7.2 completion

## Non-goals

The following are **explicitly excluded** from M7.2:

- **No rendering behavior change.** All rendering paths (registry, pack, legacy) unchanged.
- **No `--story` behavior change.** Registry story loading is independent.
- **No `--pack-story` behavior change.** Pack story rendering is independent.
- **No source-of-truth migration.** `--story` remains registry-backed.
- **No planner extraction.** Planners remain in core.
- **No adapter extraction.** Adapters remain in core.
- **No theme extraction.** Themes remain in core.
- **No new public CLI commands.** No `package.json` changes.
- **No change to `--help` output.**
- **No change to successful `--list-packs` visible output format.**
- **No change to successful `--inspect-pack` visible output format.**
- **No change to successful `--validate-pack-story-parity` output.**
- **No change to successful `--story` output.**
- **No change to successful `--pack-story` output.**
- **No change to unknown flag guard behavior.**

## Context After M7.1

M7.1 (PR64) defined the Pack Runtime Boundary:

- 17 runtime boundary participants documented
- Current and future responsibility tables established
- Data ownership model defined (pack/registry/core/bridge)
- Source-of-truth policy explicitly blocks migration
- CLI behavior policy confirms no changes
- 11 boundary design principles established

M7.1 was documentation-only. No code was modified.

## What Changed in M7.2

### 1. PackRuntimeContext Normalized Sections

Added six normalized read-only sections to `PackRuntimeContext`:

| Section | Source | Purpose |
|---|---|---|
| `governance` | Derived from manifest.governance + manifest.runtime | Normalized governance fields (coreChangesAllowed, migrationMode, loadedByDefault) |
| `runtime` | Derived from manifest.runtime | Normalized runtime fields (requiresPackLoader, loadedByDefault, renderingMode) |
| `boundaries` | Hardcoded boundary constants | M6 frozen boundary enforcement (storyRegistryDefault=true, automaticPackLookup=false, etc.) |
| `sourceOfTruth` | Hardcoded policy constants | Source-of-truth policy (defaultStorySource=registry, packsAreDefault=false) |
| `outputPolicy` | Hardcoded path constants | Output path policy (registryOutputPath, packOutputPath, parityTempPath) |
| `validation` | Passed through from pack-validator | Validation result (validationPassed, warnings, errorCode, details) |

All sections are deep-frozen and immutable. The manifest itself is NOT mutated.

### 2. Pack Inspection Internal Derivation

Updated `pack-inspection.js` to:

- Derive `runtime` and `governance` fields from normalized `PackRuntimeContext` sections
- Expose `_boundaries`, `_sourceOfTruth`, `_outputPolicy` as internal-only fields on the result object
- These internal fields are NOT printed by `--inspect-pack` CLI output

### 3. Pack Loader Duplicate Registration Tolerance

Updated `pack-loader.js` to:

- Tolerate `DUPLICATE_PACK_ID` errors during registration
- Allows `loadAllPacks` (which pre-registers all packs) and `loadPack` (which may be called independently by inspection) to coexist
- Other error codes still propagate normally

### 4. Contract Smoke Extension

Extended `pack-loader-contract-smoke.js` from 17 to 31 checks:

**14 new checks:**
- `context.governance exists`
- `context.runtime exists`
- `context.boundaries exists`
- `context.sourceOfTruth exists`
- `context.outputPolicy exists`
- `context.validation exists`
- `boundaries.storyRegistryDefault === true`
- `boundaries.packStoryExplicit === true`
- `boundaries.automaticPackLookup === false`
- `boundaries.plannerExtraction === false`
- `boundaries.adapterExtraction === false`
- `boundaries.themeExtraction === false`
- `boundaries.sourceOfTruthMigration === false`
- `sourceOfTruth.packsAreDefault === false`

## PackRuntimeContext Normalized Sections

### governance (normalized)

```javascript
{
  coreChangesAllowed: false,
  migrationMode: "copy-first",
  loadedByDefault: false,
}
```

Derived from `manifest.governance` with fallbacks. Deep-frozen.

### runtime (normalized)

```javascript
{
  requiresPackLoader: true,
  loadedByDefault: false,
  renderingMode: "adapter-first",
}
```

Derived from `manifest.runtime` with fallbacks. Deep-frozen.

### boundaries (hardcoded constants)

```javascript
{
  storyRegistryDefault: true,
  packStoryExplicit: true,
  automaticPackLookup: false,
  plannerExtraction: false,
  adapterExtraction: false,
  themeExtraction: false,
  sourceOfTruthMigration: false,
  marketplaceEnabled: false,
}
```

Hardcoded boundary enforcement. Deep-frozen. These values are policy constants, not derived from pack manifest.

### sourceOfTruth (hardcoded constants)

```javascript
{
  defaultStorySource: "registry",
  packStorySource: "explicit-pack",
  packsAreDefault: false,
  migrationRequired: true,
}
```

Hardcoded source-of-truth policy. Deep-frozen.

### outputPolicy (hardcoded constants)

```javascript
{
  registryOutputPath: "output/ppt-factory/<id>.pptx",
  packOutputPath: "output/ppt-factory/packs/<pack-id>/<id>.pptx",
  parityTempPath: "output/ppt-factory/.parity-temp/",
}
```

Hardcoded output path policy. Deep-frozen.

### validation (passed through)

```javascript
{
  validationPassed: true/false,
  warnings: [...],
  errorCode: "...",
  details: {...},
}
```

Passed through from pack-validator result. Deep-frozen.

## Inspection Compatibility Policy

### Internal Derivation

- `inspectPack()` now derives `runtime` and `governance` from normalized `PackRuntimeContext` sections
- This improves internal consistency without changing visible output
- The `_boundaries`, `_sourceOfTruth`, `_outputPolicy` fields are added to the result object but NOT printed by CLI

### Visible Output

- `--inspect-pack` visible output remains **byte-compatible** with pre-M7.2
- No new visible sections are printed
- Existing `--inspect-pack` lines remain identical:
  ```
  Presentation Pack: digital-pathology
  name: Digital Pathology Presentation Pack
  version: 0.1.0
  status: experimental
  path: ...
  validation: passed
  assets: ...
  runtime:
    loadedByDefault: false
    requiresPackLoader: true
  governance:
    coreChangesAllowed: false
    migrationMode: copy-first
  ```

## CLI Compatibility Policy

### Unchanged Commands

| Command | Behavior | Changed? |
|---|---|---|
| `--help` | Lists all supported commands | No |
| `--validate-pack <path>` | Read-only pack validation | No |
| `--list-packs` | Pack Loader-backed pack listing | No |
| `--inspect-pack <id>` | Pack Loader-backed pack inspection | No (visible output) |
| `--story <id>` | Registry story rendering | No |
| `--pack-story <pack>/<id>` | Explicit pack story rendering | No |
| `--validate-pack-story-parity <pack>/<id>` | Registry vs pack parity | No |
| `--legacy-renderer` | Legacy renderer flag | No |
| `--layout-engine` | Layout engine flag | No |
| Unknown option guard | Rejects unrecognized flags | No |

### New Internal Behavior

- Pack Loader tolerates duplicate registration (for `loadAllPacks` + `loadPack` coexistence)
- Pack Runtime Context includes normalized sections (internal only)
- Pack Inspection derives from normalized context (internal only)

## Source-of-Truth Guarantees

1. **`--story` remains registry-backed.** The default story source is unchanged.
2. **`--pack-story` remains explicit.** Pack story rendering is unchanged.
3. **Packs are NOT default source of truth.** `sourceOfTruth.packsAreDefault === false` enforced in context.
4. **No automatic pack lookup from `--story`.** `boundaries.automaticPackLookup === false` enforced.
5. **Source-of-truth migration blocked.** `boundaries.sourceOfTruthMigration === false` enforced.

## Rendering Guarantees

1. **No rendering behavior change.** All rendering pipelines (registry, pack, legacy) unchanged.
2. **No visual output change.** PPTX generation is identical to pre-M7.2.
3. **No slide plan change.** Slide plans are identical.
4. **No parity validation change.** `--validate-pack-story-parity` output is identical.

## Regression Guard Updates

### Contract Smoke

- **Before M7.2:** 17/17 checks
- **After M7.2:** 31/31 checks
- New checks verify normalized context sections and boundary enforcement
- Smoke output format unchanged: `Contract: passed`

### Manual Guard

- Contract smoke remains manual (no CI/npm script added)
- Must pass before any loader-related merge
- No behavioral change to existing smoke checks

### Parity Validation

- `--validate-pack-story-parity` remains unchanged
- Still compares registry vs pack slide plans
- Still uses isolated temp directories

## Validation Matrix

| Check | Expected | Actual |
|---|---|---|
| Contract smoke | 31/31 passed | ✅ 31/31 passed |
| `--list-packs` output | Compatible | ✅ Compatible |
| `--inspect-pack` output | Compatible | ✅ Compatible |
| `--validate-pack-story-parity` | Passed | ✅ Passed |
| `--story` rendering | Unchanged | ✅ Unchanged |
| `--pack-story` rendering | Unchanged | ✅ Unchanged |
| `--help` output | Unchanged | ✅ Unchanged |
| Unknown flag guard | Exit 1 | ✅ Exit 1 |
| Context frozen | `Object.isFrozen(ctx) === true` | ✅ true |
| Context.governance | exists | ✅ exists |
| Context.runtime | exists | ✅ exists |
| Context.boundaries | exists | ✅ exists |
| Context.sourceOfTruth | exists | ✅ exists |
| Context.outputPolicy | exists | ✅ exists |
| Context.validation | exists | ✅ exists |
| boundaries.storyRegistryDefault | === true | ✅ true |
| boundaries.packStoryExplicit | === true | ✅ true |
| boundaries.automaticPackLookup | === false | ✅ false |
| boundaries.plannerExtraction | === false | ✅ false |
| boundaries.adapterExtraction | === false | ✅ false |
| boundaries.themeExtraction | === false | ✅ false |
| boundaries.sourceOfTruthMigration | === false | ✅ false |
| sourceOfTruth.packsAreDefault | === false | ✅ false |

## Risk Assessment

### Low Risk

- **Normalization is read-only.** No mutation of manifest, assets, or context.
- **Normalized sections are internal-only.** Not printed by any CLI command.
- **Boundary constants are hardcoded.** Cannot be overridden by pack manifest.
- **Duplicate registration tolerance is minimal.** Only suppresses `DUPLICATE_PACK_ID`; all other errors propagate.
- **No new public CLI commands.** No `package.json` changes.

### Medium Risk

- **Contract smoke increased from 17 to 31.** Existing automation that checks for "17/17" must be updated to accept the new count.
- **Internal result shape changed.** The `inspectPack` result now includes `_boundaries`, `_sourceOfTruth`, `_outputPolicy` fields. These are not printed by CLI but could be accessed programmatically.

### Rollback Strategy

1. **Revert to M7.1 checkpoint.** Tag `m7-1-pack-runtime-boundary-design` is the stable baseline.
2. **Restore pre-M7.2 source files.** `pack-runtime-context.js`, `pack-inspection.js`, `pack-loader.js`, `pack-loader-contract-smoke.js`.
3. **No state persistence.** M7.2 changes are additive and reversible.
4. **No behavioral regression.** `--story`, `--pack-story`, `--list-packs`, `--inspect-pack` all revert to pre-M7.2 behavior.

## Review Checklist

- [x] `docs/M7_PACK_RUNTIME_CONTEXT_INSPECTION_HARDENING.md` created
- [x] `registry/packages/ppt-factory/src/pack-runtime-context.js` updated with normalized sections
- [x] `registry/packages/ppt-factory/src/pack-inspection.js` updated to derive from normalized context
- [x] `registry/packages/ppt-factory/src/pack-loader.js` updated for duplicate registration tolerance
- [x] `registry/packages/ppt-factory/scripts/pack-loader-contract-smoke.js` extended to 31 checks
- [x] `docs/M7_PACK_RUNTIME_BOUNDARY_DESIGN.md` updated with M7.2 note
- [x] `docs/ROADMAP.md` updated
- [x] `docs/RFC-0008_POST_M6_DIRECTION_DECISION.md` updated
- [x] `presentation-packs/digital-pathology/README.md` updated
- [x] `presentation-packs/digital-pathology/USAGE.md` updated
- [x] `package.json` NOT modified
- [x] `bin/run.js` NOT modified
- [x] Contract smoke passes (31/31)
- [x] `--list-packs` output compatible
- [x] `--inspect-pack` output compatible
- [x] `--validate-pack-story-parity` passes
- [x] `--story` behavior unchanged
- [x] `--pack-story` behavior unchanged
- [x] `--help` output unchanged
- [x] Unknown flag guard works
- [x] Context is frozen (immutable)
- [x] No adapters/planners/story JSON changed
- [x] Packs NOT made default source of truth
- [x] No CI or npm script added
- [x] M7.3 set to Pack Story Resolver / Loader Boundary Alignment Design

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-07-05 | Hermes | Initial Pack Runtime Context Inspection Hardening note (M7.2) |
