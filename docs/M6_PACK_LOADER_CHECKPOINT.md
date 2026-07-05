# M6 Pack Loader Checkpoint

> **Version**: 1.0.0
> **Date**: 2026-07-04
> **Status**: M6 Closed — Checkpoint Complete
> **Related**: RFC-0007 Pack Loader Design, PR62

---

## Purpose

This document formalizes the **M6 Pack Loader Checkpoint**, closing the M6 phase with a comprehensive summary of all completed milestones, frozen capabilities, documented boundaries, and M7 entry criteria.

M6.6 does **not** change any runtime behavior, CLI command, or package configuration. It is a documentation-only milestone that:

1. Summarizes M6.0 through M6.5 accomplishments.
2. Freezes current Pack Loader capabilities and boundaries.
3. Documents the validation contract and regression guard as the M6 baseline.
4. Defines M7 entry criteria without committing to any specific direction.

---

## Scope

This checkpoint covers:

- Pack Loader architecture and modules (M6.0–M6.1)
- CLI integration via `--list-packs` and `--inspect-pack` (M6.2)
- Error model hardening with standardized `errorCode` + `details` (M6.3)
- Validation contract formalization (M6.4)
- Regression guard documentation (M6.5)
- Source-of-truth boundaries
- Runtime boundaries
- Output path policy
- Rollback compatibility

---

## Non-goals

The following are **explicitly excluded** from M6.6 and from M6 as a whole:

- **No source-of-truth migration** — Packs remain explicit opt-in.
- **No planner extraction** — Planners remain in the core.
- **No adapter extraction** — Adapters remain in the core.
- **No marketplace behavior** — No download, install, or update logic.
- **No SDK API** — Pack consumers interact via CLI only.
- **No `package.json` changes** — No npm scripts added.
- **No CI integration** — Regression guard remains manual.
- **No new public CLI commands** — All M6 commands were introduced in M5 or M6.1–M6.2.
- **No `--story` behavior change** — Registry remains default source.
- **No `--pack-story` rendering change** — Explicit pack story rendering unchanged.

---

## M6 Milestone Summary

| Milestone | PR | Title | Status |
|---|---|---|---|
| M6.0 | PR56 | Pack Loader Design RFC | ✅ Done |
| M6.1 | PR57 | Read-only Pack Loader Skeleton | ✅ Done |
| M6.2 | PR58 | Pack Loader CLI Integration | ✅ Done |
| M6.3 | PR59 | Pack Loader Error Model Hardening | ✅ Done |
| M6.4 | PR60 | Pack Loader Validation Contract | ✅ Done |
| M6.5 | PR61 | Pack Loader Contract Regression Guard | ✅ Done |
| M6.6 | PR62 | M6 Pack Loader Checkpoint | ✅ Done |

**M6 is now closed.** All six milestones are complete.

---

## Current Pack Loader Capabilities

### Modules

| Module | File | Responsibility |
|---|---|---|
| Discovery | `src/pack-discovery.js` | Locate packs in known directories |
| Manifest Reader | `src/pack-manifest-reader.js` | Read and parse `pack.json` |
| Validator | `src/pack-validator.js` | Schema + asset existence validation |
| Asset Resolver | `src/pack-asset-resolver.js` | Resolve declared asset paths safely |
| Runtime Context | `src/pack-runtime-context.js` | Build immutable context object |
| Registry | `src/pack-registry.js` | In-memory pack context registry |
| Loader | `src/pack-loader.js` | Orchestrates the full lifecycle |
| Inspection | `src/pack-inspection.js` | Public API for pack inspection |

### Capabilities

- **Pack discovery** — Scans `presentation-packs/` for valid pack manifests.
- **Manifest validation** — Parses `pack.json`, validates schema, checks asset paths.
- **Asset resolution** — Resolves declared asset paths with path safety enforcement.
- **Immutable context** — Builds deep-frozen `PackRuntimeContext` per pack.
- **In-memory registry** — Lookup by pack ID, duplicate detection.
- **CLI integration** — Powers `--list-packs` and `--inspect-pack`.
- **Structured errors** — Standardized `errorCode` + `details` for all failure paths.
- **Pack story rendering** — `--pack-story` resolves packs via loader and renders stories.

---

## Current CLI Behavior Matrix

| Command | Source | Behavior |
|---|---|---|
| `--help` | — | Lists all supported commands |
| `--validate-pack <path>` | Read-only | Validates pack manifest and assets |
| `--list-packs` | Pack Loader | Lists available packs with metadata |
| `--inspect-pack <id>` | Pack Loader | Shows pack metadata, assets, runtime, governance |
| `--story <id>` | Registry | Loads registry story, renders PPTX |
| `--story <id> --legacy-renderer` | Registry | Same, legacy renderer |
| `--pack-story <pack-id>/<story-id>` | Pack Loader | Resolves pack, loads story, renders PPTX |
| `--pack-story <pack-id>/<story-id> --legacy-renderer` | Pack Loader | Same, legacy renderer |
| `--validate-pack-story-parity <pack-id>/<story-id>` | Both | Compares registry vs pack slide plans |
| `--validate-pack-story-parity <pack-id>/<story-id> --legacy-renderer` | Both | Same, legacy mode |
| `--legacy-renderer` | Flag | Forces legacy renderer for any command |
| `--layout-engine` | Flag | Selects layout engine variant |
| Unknown option guard | CLI | Rejects unrecognized flags with error |

---

## Source-of-Truth Boundaries

The following boundaries are **frozen** as of M6.6:

1. **`--story` remains registry-backed.** The default story source is `registry/packages/ppt-factory/story/`.
2. **`--pack-story` remains explicit pack-backed story rendering.** Packs are accessed only via explicit `--pack-story <pack>/<id>`.
3. **Packs are NOT default source of truth.** No automatic pack lookup from `--story`.
4. **No automatic pack lookup from `--story`.** The registry path is independent of packs.
5. **Pack assets remain copy-first migration assets.** Assets in packs are copies for migration tracking, not runtime replacements.
6. **Output path isolation.** `--pack-story` outputs under `output/ppt-factory/packs/<pack-id>/` to avoid collision with `--story` outputs.

Moving to pack-as-default-source-of-truth requires a **separate RFC** and stakeholder review.

---

## Pack Runtime Boundaries

The following runtime boundaries are **frozen** as of M6.6:

1. **`--list-packs` and `--inspect-pack` are Pack Loader-backed.** These commands use the loader for discovery and metadata.
2. **`--pack-story` rendering still uses explicit pack story resolution path.** The loader resolves the pack; rendering uses existing engines.
3. **Pack Loader does NOT yet replace story registry.** `--story` remains independent.
4. **Pack Loader does NOT yet own planner / adapter / theme loading.** These remain core components.
5. **Pack Loader does NOT yet implement marketplace behavior.** No download, install, or update logic.
6. **Pack Loader is read-only.** It never modifies pack files or registry files.
7. **Pack Loader does not execute code from packs.** JSON/data resolution only.
8. **Pack Loader does not access remote resources.** Only local directory scanning.

---

## Current Validation Contract

The Pack Loader validation contract is documented in:

**[`docs/M6_PACK_LOADER_VALIDATION_CONTRACT.md`](M6_PACK_LOADER_VALIDATION_CONTRACT.md)**

The contract specifies:

- Success result shapes for `loadPack()`, `loadAllPacks()`, `inspectPack()`
- Failure result shape with standardized `errorCode` + `details`
- Canonical error code table (11 error codes)
- CLI error mapping for `--list-packs` and `--inspect-pack`
- Successful output compatibility guarantees
- Negative-path smoke test cases

**Reference**: See `M6_PACK_LOADER_VALIDATION_CONTRACT.md` for the complete contract specification.

---

## Current Regression Guard

The Pack Loader contract regression guard is documented in:

**[`docs/M6_PACK_LOADER_REGRESSION_GUARD.md`](M6_PACK_LOADER_REGRESSION_GUARD.md)**

### Guard Command

```bash
node registry/packages/ppt-factory/scripts/pack-loader-contract-smoke.js
```

### Required Passing Output

```
Contract: passed (17/17 checks)
```

The guard verifies:

- Error code consistency across all loader modules
- Structured error details fields
- Successful `loadPack()`, `loadAllPacks()`, `inspectPack()` behavior
- Context immutability (deep-frozen)
- CLI output compatibility

### When to Run

Run **before merging** any change to:

- `src/pack-loader.js`
- `src/pack-manifest-reader.js`
- `src/pack-asset-resolver.js`
- `src/pack-inspection.js`
- `src/pack-discovery.js`
- `src/pack-registry.js`
- `src/pack-runtime-context.js`
- `src/pack-validator.js`
- Any `pack.json` manifest structure change
- `--list-packs` or `--inspect-pack` behavior change
- Error code or CLI error mapping change

### Guard Status

**Manual only.** M6.5 intentionally keeps the guard manual. No `package.json` script, no CI pipeline step, no pre-commit hook.

---

## Output Path Policy

| Command | Output Path |
|---|---|
| `--story <id>` | `output/ppt-factory/<id>.pptx` |
| `--pack-story <pack>/<id>` | `output/ppt-factory/packs/<pack-id>/<id>.pptx` |
| `--validate-pack-story-parity` | `output/ppt-factory/.parity-temp/` (temporary) |

Pack outputs are isolated under `packs/<pack-id>/` to prevent collision with registry outputs.

---

## Rollback Compatibility

The following rollback paths are preserved:

1. **`--pack-story` fallback** — If loader fails, `pack-story-resolver.js` remains available as rollback path.
2. **`--story` independence** — Registry story loading is unaffected by loader changes.
3. **`--legacy-renderer`** — Available for all rendering commands.
4. **M5 explicit `--pack-story` behavior** — Preserved as rollback baseline.
5. **No state persistence** — Loader is in-memory only; no persistent state to corrupt.

---

## Explicitly Blocked Work

The following work items are **explicitly blocked** from M6 and must not be introduced:

| Blocked Item | Reason |
|---|---|
| Planner extraction | Requires separate RFC; not in M6 scope |
| Adapter extraction | Requires separate RFC; not in M6 scope |
| Source-of-truth migration | Strategic decision requiring stakeholder review |
| Automatic pack lookup from `--story` | Violates explicit opt-in principle |
| Marketplace behavior | Out of scope; requires RFC-0004 implementation |
| SDK packaging | Out of scope; requires RFC-0002 implementation |
| `package.json` / npm script integration | M6.5 intentionally kept guard manual |
| CI integration | Future work; not in M6 scope |

---

## M7 Entry Criteria

The following criteria **must be met** before M7 work begins:

1. **M6 checkpoint accepted and tagged.** `m6-6-pack-loader-checkpoint` tag created.
2. **Contract smoke passing.** `node registry/packages/ppt-factory/scripts/pack-loader-contract-smoke.js` returns `Contract: passed (17/17 checks)`.
3. **`--list-packs` and `--inspect-pack` stable.** Output is byte-compatible with M6 baseline.
4. **`--story` and `--pack-story` parity stable.** `--validate-pack-story-parity` passes consistently.
5. **Explicit source-of-truth decision made.** Before any migration work, a decision must be documented (via RFC).
6. **RFC required before moving planners/adapters/themes into packs.** No extraction without RFC approval.
7. **Regression guard must run before loader-related merges.** Manual guard is mandatory.
8. **No forbidden files changed.** `package.json`, `bin/run.js`, `src/`, `story/`, `adapters/`, `planners/` unchanged unless specifically scoped.

---

## M7 Recommended Directions

The following directions are **recommended for consideration** in M7 planning. M6.6 does **not** commit to any single direction.

### Option A — Pack Runtime Boundary Deepening

Extend pack loader to own more runtime assets (themes, content) while maintaining explicit opt-in. Requires RFC.

### Option B — Pack SDK Read-only Specification

Define a read-only SDK API for pack consumers (metadata queries, asset listing) per RFC-0002.

### Option C — Multi-pack Expansion

Add additional domain packs beyond digital-pathology. Requires pack structure validation.

### Option D — Marketplace Metadata Readiness

Prepare pack manifests for marketplace metadata fields (version compatibility, dependencies) per RFC-0004.

### Option E — Source-of-truth Migration RFC

Draft RFC for strategic decision on making packs the default source of truth. Requires stakeholder review.

**Note**: M6.6 does **not** recommend planner extraction as the immediate next task. Any extraction work requires a dedicated RFC with full risk assessment.

---

## M6 Final Status

| Dimension | Status |
|---|---|
| Pack Loader modules | ✅ 8 modules implemented |
| CLI integration | ✅ `--list-packs`, `--inspect-pack` loader-backed |
| Error model | ✅ Standardized `errorCode` + `details` |
| Validation contract | ✅ Documented (M6.4) |
| Regression guard | ✅ Documented, manual (M6.5) |
| Source-of-truth | ✅ Frozen — registry default, pack explicit opt-in |
| Runtime boundaries | ✅ Frozen — no planner/adapter/theme ownership |
| Output path policy | ✅ Frozen — pack outputs isolated |
| Rollback compatibility | ✅ Frozen — M5 resolver available |
| M6 milestone count | ✅ 7/7 (M6.0–M6.6) |
| **M6 overall** | **✅ CLOSED** |

---

## Version History

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-07-04 | Initial M6 checkpoint (M6.6) |
