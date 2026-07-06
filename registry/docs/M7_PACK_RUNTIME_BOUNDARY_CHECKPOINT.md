# M7.5 Pack Runtime Boundary Checkpoint

> **Version**: 1.0.0  
> **Date**: 2026-07-05  
> **Status**: Checkpoint — M7 Pack Runtime Boundary Deepening Complete  
> **Related**: M7.0 RFC, M7.1 Boundary Design, M7.2 Context Hardening, M7.3 Resolver Alignment, M7.4 Smoke Checks, PR68  
> **Category**: Architecture — M7 Checkpoint  
> **Target Phase**: M7.5 (documentation-only checkpoint)

---

## Purpose

Freeze the M7 Pack Runtime Boundary state after M7.0–M7.4 completion. This checkpoint documents what is now stable, what remains explicitly blocked, what smoke/contract checks guard the boundary, and what must require a future RFC before implementation.

M7.5 is a **documentation-only checkpoint**. It does not change any runtime behavior, CLI behavior, or add new code.

## Scope

This checkpoint covers:

- M7 timeline summary (M7.0–M7.4 outcomes)
- Current stable boundary definition
- Current stable CLI contract
- Current stable PackRuntimeContext contract
- Current stable Pack Loader contract
- Current stable Pack Story Resolver contract
- Current output policy
- Current source-of-truth policy
- Current explicit opt-in policy
- Current manual smoke guard policy
- Current contract smoke guard policy
- Current parity guard policy
- Frozen red lines (what is permanently blocked without RFC)
- Future RFC requirements (what needs RFC before implementation)
- Allowed future directions (post-M7)
- Blocked future directions (immediate)
- M7 completion checklist
- M8 readiness assessment

## Non-goals

The following are **explicitly excluded** from M7.5:

- **No runtime implementation.** This is a checkpoint document only.
- **No CLI changes.** All existing CLI commands remain unchanged.
- **No `package.json` modifications.**
- **No new public CLI commands.**
- **No npm scripts added.**
- **No CI config changes.**
- **No source-of-truth migration.**
- **No planner extraction.**
- **No adapter extraction.**
- **No theme extraction.**
- **No automatic pack lookup.**
- **No resolver/loader consolidation.**
- **No marketplace behavior.**
- **No SDK API.**
- **No rendering behavior changes.**
- **No output path changes.**
- **No new smoke scripts.**
- **No CI automation of smoke checks.**

## M7 Timeline Summary

### M7.0 — Post-M6 Direction Decision RFC (PR63)

- **Chose Option A** — Pack Runtime Boundary Deepening.
- **Rejected immediate directions:**
  - Option B — Pack SDK Read-only Specification (deferred).
  - Option C — Multi-pack Expansion (deferred).
  - Option D — Marketplace Metadata Readiness (premature).
  - Option E — Source-of-truth Migration RFC (too high-risk).
- **Explicitly rejected:** planner extraction, adapter extraction, source-of-truth migration, automatic pack lookup.
- **Proposed M7 milestone sequence:** M7.0 → M7.1 → M7.2 → M7.3 → M7.4 → M7.5.

### M7.1 — Pack Runtime Boundary Design (PR64)

- **Documented Pack Runtime Boundary Design.**
- Defined 17 runtime boundary participants across loader-owned, bridge-owned, and core-owned layers.
- Documented data ownership model: pack-owned, registry-owned, core-owned, bridge-owned.
- Established frozen boundary principles:
  - `--story` remains registry-backed.
  - `--pack-story` remains explicit opt-in.
  - Packs are NOT default source of truth.
  - No automatic pack lookup.
  - No planner/adapter/theme extraction.
  - Pack Loader is read-only.
  - PackRuntimeContext is immutable.
  - Rendering pipeline is core-owned.

### M7.2 — Pack Runtime Context Inspection Hardening (PR65)

- **Hardened PackRuntimeContext inspection** with normalized read-only sections.
- Added 6 normalized sections: governance, runtime, boundaries, sourceOfTruth, outputPolicy, validation.
- PackRuntimeContext is deep-frozen and immutable.
- Inspection output remains compatible with pre-M7.2 format.
- Contract smoke extended from 17 to 31 checks.
- No CLI behavior change. No rendering behavior change.

### M7.3 — Pack Story Resolver / Loader Boundary Alignment Design (PR66)

- **Documented Pack Story Resolver / Loader alignment design.**
- Analyzed boundary mismatch between resolver and loader.
- Defined desired future alignment model (proposed, not implemented).
- Defined responsibility split: loader/metadata, resolver/story-path, context/immutable-sections.
- Proposed future resolver contract shape (not implemented).
- No resolver behavior change. No CLI behavior change. No rendering behavior change.

### M7.4 — Pack Runtime Boundary Smoke Checks (PR67)

- **Added manual Pack Runtime Boundary Smoke Checks.**
- Created `scripts/pack-runtime-boundary-smoke.js` — 60 checks across 7 categories.
- Validates PackRuntimeContext sections, CLI compatibility, rendering isolation.
- **60/60 checks pass.**
- Contract smoke remains 31/31.
- No npm script added. No package.json changes. No CI config changes.
- Manual invocation only: `node scripts/pack-runtime-boundary-smoke.js`.

## Current Stable Boundary

The following boundary is now **stable and frozen** after M7.0–M7.4:

| Aspect | Stable State |
|---|---|
| `--story` | Registry-backed. Uses `registry/packages/ppt-factory/story/`. |
| `--pack-story` | Explicit pack-backed rendering. Requires full `<pack-id>/<story-id>`. |
| Source of truth | Registry is default. Packs are NOT default. |
| Pack commands | Read-only. Never modify pack or registry files. |
| Pack Loader | Does not render. Does not own story registry. |
| Pack Story Resolver | Does not change `--story`. Remains explicit opt-in. |
| Rendering pipeline | Core-owned. Independent of pack commands. |
| PackRuntimeContext | Immutable and read-only. Deep-frozen. |
| `--list-packs` | Compatible output. No internal fields leaked. |
| `--inspect-pack` | Compatible output. No internal fields leaked. |

## Current Stable CLI Contract

The following CLI commands are now **stable and frozen**:

| Command | Source | Behavior |
|---|---|---|
| `--story <id>` | Registry | Loads registry story, renders PPTX to `output/ppt-factory/<id>.pptx` |
| `--pack-story <pack>/<id>` | Pack Story Resolver | Resolves pack, loads story JSON, renders to `output/ppt-factory/packs/<pack-id>/<id>.pptx` |
| `--list-packs` | Pack Loader | Lists available packs with metadata and validation status |
| `--inspect-pack <id>` | Pack Loader | Shows pack metadata, assets, runtime, governance |
| `--validate-pack-story-parity <pack>/<id>` | Both | Compares registry vs pack slide plans for parity |
| `--help` | CLI | Lists all supported commands with boundary notes |
| Unknown flag guard | CLI | Rejects unrecognized flags with "Unsupported option: ..." |

**M7.5 does NOT add any new public CLI command.**  
**M7.5 does NOT change any CLI behavior.**  
**M7.5 does NOT change `--help` output.**

## Current Stable PackRuntimeContext Contract

The `PackRuntimeContext` object (created by Pack Loader, hardened in M7.2) is now **stable and frozen**:

### Normalized Sections

| Section | Source | Type |
|---|---|---|
| `metadata` | pack.json | Identity, version, status |
| `governance` | Merged from manifest + hardcoded | Normalized governance fields |
| `runtime` | Merged from manifest + hardcoded | Normalized runtime fields |
| `boundaries` | Hardcoded constants | Frozen boundary enforcement |
| `sourceOfTruth` | Hardcoded policy constants | Source-of-truth policy |
| `outputPolicy` | Hardcoded path constants | Output path policy |
| `validation` | pack-validator result | Validation summary |

All sections are **deep-frozen** (`Object.isFrozen()` returns `true` for every property and nested object).

### Required Values

| Property | Required Value |
|---|---|
| `boundaries.storyRegistryDefault` | `true` |
| `boundaries.packStoryExplicit` | `true` |
| `boundaries.automaticPackLookup` | `false` |
| `boundaries.plannerExtraction` | `false` |
| `boundaries.adapterExtraction` | `false` |
| `boundaries.themeExtraction` | `false` |
| `boundaries.sourceOfTruthMigration` | `false` |
| `sourceOfTruth.packsAreDefault` | `false` |
| `runtime.loadedByDefault` | `false` |
| `runtime.requiresPackLoader` | `true` |
| `governance.coreChangesAllowed` | `false` |

**Any change to these values requires a future RFC.**

## Current Stable Pack Loader Contract

The Pack Loader (8 modules, post-M7.2) is now **stable and frozen**:

| Module | Responsibility |
|---|---|
| Discovery | Locate packs in known directories |
| Manifest Reader | Read and parse `pack.json` |
| Validator | Schema + asset existence validation |
| Asset Resolver | Resolve declared asset paths safely |
| Runtime Context | Build immutable context with normalized sections |
| Registry | In-memory pack context registry |
| Loader | Orchestrates the full lifecycle |
| Inspection | Public API for pack inspection |

**Return shape (success):** `{ ok: true, context: PackRuntimeContext }`  
**Return shape (failure):** `{ ok: false, errorCode, error, details }`  
**11 canonical error codes.**

Pack Loader is **read-only** and **does not render**.

## Current Stable Pack Story Resolver Contract

The Pack Story Resolver (post-M7.3 design) is now **stable and frozen**:

| Aspect | Stable Behavior |
|---|---|
| Input | `<pack-id>/<story-id>` from CLI |
| Pack existence | Verifies pack directory exists |
| Story declaration | Verifies story declared in pack.json |
| Story path | Constructs absolute path to story JSON |
| Story loading | Loads story JSON only for explicit `--pack-story` |
| Rendering handoff | Passes story object to existing rendering pipeline |
| Context usage | Does NOT consume PackRuntimeContext (M7.3 design only) |
| `--story` impact | Does NOT affect `--story` behavior |

**Resolver remains the explicit bridge into rendering.**

## Current Output Policy

| Command | Output Path | Isolation |
|---|---|---|
| `--story <id>` | `output/ppt-factory/<id>.pptx` | Registry namespace |
| `--pack-story <pack>/<id>` | `output/ppt-factory/packs/<pack-id>/<id>.pptx` | Pack namespace (isolated) |
| `--validate-pack-story-parity` | `output/ppt-factory/.parity-temp/` | Temporary (cleaned up) |

**Pack outputs remain isolated under `packs/<pack-id>/` to prevent collision with registry outputs.**

## Source-of-Truth Policy

1. **`--story` uses registry story source** (default).
2. **`--pack-story` uses pack story source** (explicit opt-in only).
3. **Packs are NOT the default source of truth.**
4. **No automatic pack lookup from `--story`.**
5. **Moving to packs as default requires a dedicated RFC.**

## Explicit Opt-in Policy

1. **`--pack-story` requires full `<pack-id>/<story-id>` argument.**
2. **No automatic pack discovery.**
3. **No implicit pack story resolution.**
4. **Packs remain opt-in, not opt-out.**

## Manual Smoke Guard Policy

The following manual smoke commands guard the M7 boundary:

### Boundary Smoke

```bash
node registry/packages/ppt-factory/scripts/pack-runtime-boundary-smoke.js
```

- **60 checks across 7 categories** (A–G).
- Validates PackRuntimeContext sections, CLI compatibility, rendering isolation.
- **Manual only.** Not integrated into CI.
- Run before any merge touching pack/loader/inspector code.

### Contract Smoke

```bash
node registry/packages/ppt-factory/scripts/pack-loader-contract-smoke.js
```

- **31 checks** covering loader modules, context sections, error codes.
- **Manual only.** Not integrated into CI.
- Run before any merge touching pack loader modules.

### Parity Guard

```bash
node registry/packages/ppt-factory/bin/run.js --validate-pack-story-parity digital-pathology/digital-pathology-15
```

- Compares registry vs pack slide plans.
- Checks slide count, titles, text, structure.
- Does NOT compare PPTX binary identity.
- **Manual only.** Not integrated into CI.

**These are regression guards for human review. They are not CI automation.**

## Frozen Red Lines

The following are **permanently blocked** without a future RFC:

| Red Line | Reason |
|---|---|
| No automatic pack lookup from `--story` | Preserves registry as default |
| No packs as default source of truth | Preserves explicit opt-in |
| No source-of-truth migration without RFC | High-risk, requires stakeholder review |
| No resolver/loader consolidation without RFC | Requires architectural review |
| No planner extraction without RFC | Core responsibility, not pack |
| No adapter extraction without RFC | Core responsibility, not pack |
| No theme extraction without RFC | Core responsibility, not pack |
| No marketplace behavior without RFC | Premature, requires design |
| No SDK API without RFC | Requires specification |
| No CLI expansion without RFC | Requires design review |
| No CI automation without explicit task | Manual guards sufficient for M7 |
| No output path change without RFC | Breaking change, affects users |
| No rendering behavior change without RFC | Core responsibility, high risk |

## Future RFC Requirements

The following **require a future RFC before implementation**:

| Change | Required RFC |
|---|---|
| Resolver consumes PackRuntimeContext | Pack Runtime RFC (M8+) |
| Source-of-truth migration | Source-of-Truth Migration RFC |
| Automatic pack lookup | Automatic Pack Lookup RFC |
| Planner Pack assets | Planner Extraction RFC |
| Adapter Pack assets | Adapter Extraction RFC |
| Theme Pack assets | Theme Extraction RFC |
| Marketplace metadata | Marketplace Metadata RFC |
| SDK API | SDK API RFC |
| Public CLI expansion | CLI Expansion RFC |
| CI integration of smoke checks | CI Automation RFC |
| Multi-pack resolution strategy | Multi-Pack Strategy RFC |
| Pack version compatibility policy | Pack Version RFC |

## Allowed Future Directions

The following are **allowed after RFC or explicit task**:

| Direction | Phase | Status |
|---|---|---|
| M8 Pack Runtime RFC | M8+ | Proposed |
| Resolver consumes PackRuntimeContext | M8+ | Design only (M7.3) |
| Multi-pack discovery hardening | M8+ | Deferred |
| Pack version compatibility design | M8+ | Deferred |
| CI integration proposal | M8+ | Manual guards sufficient for M7 |
| SDK boundary design | M8+ | Deferred |
| Marketplace metadata design | M8+ | Deferred |
| Additional Presentation Pack examples | Ongoing | Welcome |

## Blocked Future Directions

The following are **immediately blocked** (not selected for M7 or early M8):

| Block | Reason |
|---|---|
| Planner extraction | Core responsibility, not pack |
| Adapter extraction | Core responsibility, not pack |
| Theme extraction | Core responsibility, not pack |
| Source-of-truth migration | Too high-risk without RFC |
| Automatic pack lookup | Violates explicit opt-in |
| Runtime consolidation | Requires architectural review |
| Marketplace implementation | Premature |
| SDK implementation | Requires specification |
| Public CLI expansion | Requires design review |

## M7 Completion Checklist

- [x] M7.0 RFC selects Option A — Pack Runtime Boundary Deepening
- [x] M7.1 documents Pack Runtime Boundary Design
- [x] M7.2 hardens PackRuntimeContext with 6 normalized sections
- [x] M7.3 documents resolver/loader alignment design (no implementation)
- [x] M7.4 adds manual smoke script (60/60 checks)
- [x] M7.5 freezes M7 boundary state
- [x] No package.json changes
- [x] No new CLI commands
- [x] No rendering behavior changes
- [x] No source-of-truth migration
- [x] No planner/adapter/theme extraction
- [x] No automatic pack lookup
- [x] Contract smoke: 31/31 pass
- [x] Boundary smoke: 60/60 pass
- [x] Parity: passed
- [x] `--story` remains registry-backed
- [x] `--pack-story` remains explicit opt-in
- [x] PackRuntimeContext is immutable and frozen
- [x] M7.5 does not change CLI behavior
- [x] M7.5 does not add npm scripts
- [x] M7.5 does not modify src/ or scripts/

## M8 Readiness Assessment

### What's Ready for M8

1. **PackRuntimeContext is stable.** 6 normalized sections, deep-frozen, validated by 31/31 contract smoke.
2. **Boundary assumptions are validated.** 60/60 boundary smoke checks pass.
3. **Resolver/loader separation is documented.** M7.3 alignment design provides blueprint for future RFC.
4. **CLI commands are stable.** No breaking changes in M7.
5. **Parity validation works.** Registry and pack stories produce identical slide plans.
6. **Manual guards are in place.** Smoke scripts ready for human review.

### What M8 Needs

1. **A future RFC** to authorize any change beyond M7 boundary.
2. **Stakeholder review** for source-of-truth decisions.
3. **Architectural review** for resolver/loader consolidation.
4. **Design review** for any new CLI commands or SDK APIs.

### M8 Next Phase

**M8 — Pack Runtime RFC / Post-M7 Platform Direction Decision**

- M8.0 (PR69) has initiated Post-M7 Platform Direction:

- RFC-0009 selects Option A — Pack Runtime Contract Hardening.
- M7 frozen boundaries remain in force.
- Next task: M8.1 Pack Runtime Contract Hardening Design.
- **M8.1 (PR70) completed Pack Runtime Contract Hardening Design.**
- Documents hardened contracts for PackRuntimeContext, Loader, Resolver, Output, SoT, Compatibility, Validation.
- No runtime behavior change. No resolver/context consumption.
- Next task: M8.2 PackRuntimeContext Contract Schema Documentation.
- **M8.2 (PR71) completed PackRuntimeContext Contract Schema Documentation.**
- Full conceptual schema documented: 8 sections, 11 required values, compatibility/versioning/deprecation policies.
- No executable schema validation. No JSON schema files. No runtime shape change.
- Next task: M8.3 Multi-Pack Discovery Assumptions Design.

- Evaluate whether to implement any M7.3 proposed alignment.
- Decide on multi-pack expansion strategy.
- Consider SDK boundary design.
- Assess marketplace metadata readiness.
- All changes require RFC before implementation.

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-07-05 | Hermes | M7 Pack Runtime Boundary Checkpoint (M7.5) |
