# M7.1 Pack Runtime Boundary Design

> **Version**: 1.0.0  
> **Date**: 2026-07-05  
> **Status**: Design Document  
> **Related**: RFC-0008 Post-M6 Direction Decision, M6 Pack Loader Checkpoint  
> **Category**: Architecture — Pack Runtime Boundary  
> **Target Phase**: M7.1 (design document only)

---

## Purpose

This document defines the intended runtime boundary between **Pack Loader** (pack-owned metadata and governance) and **Core Runtime** (story registry, rendering pipeline, planners, adapters, themes). It establishes a shared vocabulary and responsibility model for all future M7 milestones.

M7.1 is a **design document only**. No code is written. No runtime behavior changes. No CLI changes. No package.json modifications.

---

## Scope

This document covers:

- Pack Loader modules and their responsibilities
- Pack Runtime Context as the bridge between pack metadata and core runtime
- Explicit Pack Story Resolver as the existing pack story resolution path
- Pack Inspection and Pack Validation as read-only operations
- Core runtime components (Story Registry, Rendering Pipeline, Planners, Adapters, Themes)
- CLI entry points and their ownership
- Data ownership model
- Source-of-truth policy
- Error and validation policy
- Compatibility and rollback policy

---

## Non-goals

The following are **explicitly excluded** from M7.1:

- **No runtime implementation.** This is a design document only.
- **No CLI changes.** All existing CLI commands remain unchanged.
- **No `package.json` modifications.**
- **No source-of-truth migration.** `--story` remains registry-backed.
- **No planner extraction.** Planners remain in core.
- **No adapter extraction.** Adapters remain in core.
- **No theme extraction.** Themes remain in core.
- **No marketplace behavior.**
- **No SDK API.**
- **No automatic pack lookup from `--story`.**
- **No change to `--pack-story` rendering behavior.**
- **No change to `--list-packs` or `--inspect-pack` output.**
- **No new public CLI commands.**

---

## Current State After M6

After M6.6 (Pack Loader Checkpoint), the system has the following capabilities:

### Pack Loader (8 modules)

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

### CLI Commands

| Command | Source | Behavior |
|---|---|---|
| `--help` | — | Lists all supported commands |
| `--validate-pack <path>` | Read-only | Validates pack manifest and assets |
| `--list-packs` | Pack Loader | Lists available packs with metadata |
| `--inspect-pack <id>` | Pack Loader | Shows pack metadata, assets, runtime, governance |
| `--story <id>` | Registry | Loads registry story, renders PPTX |
| `--pack-story <pack>/<id>` | Pack Story Resolver | Resolves pack, loads story, renders PPTX |
| `--validate-pack-story-parity <pack>/<id>` | Both | Compares registry vs pack slide plans |
| `--legacy-renderer` | Flag | Forces legacy renderer for any command |
| `--layout-engine` | Flag | Selects layout engine variant |
| Unknown option guard | CLI | Rejects unrecognized flags with error |

### Frozen Boundaries

1. `--story` uses **registry story source** (default).
2. `--pack-story` uses **pack story source** (explicit opt-in).
3. Presentation Packs are **NOT** the default source of truth.
4. No automatic pack lookup from `--story`.
5. Pack Loader does **not** own story registry.
6. Pack Loader does **not** own planners, adapters, or themes.
7. Pack Loader does **not** own rendering.
8. Pack Loader is **read-only** — never modifies pack or registry files.
9. Pack Loader does **not** execute code from packs.
10. Contract smoke must pass (17/17 checks) before any loader-related merge.

---

## Boundary Design Principles

The following principles govern all M7 boundary decisions:

1. **Explicit over implicit.** Pack story resolution must always be explicit (`--pack-story <pack>/<id>`). No automatic pack discovery from `--story`.

2. **Registry remains default.** `--story` continues to use the story registry as its sole source. Packs do not compete with or supplement the registry.

3. **Packs remain opt-in.** Packs are accessed only through explicit CLI commands. No implicit pack loading.

4. **Loader context is metadata/governance first.** `PackRuntimeContext` describes what a pack is, what it contains, and how it is governed. It does not drive rendering decisions.

5. **Runtime integration must be reversible.** Any future pack runtime integration must have a clear rollback path to the M6 baseline.

6. **Inspection and validation must remain read-only.** `--list-packs`, `--inspect-pack`, and `--validate-pack` never modify files, never execute code, never change state.

7. **Pack story rendering must stay explicit.** `--pack-story` renders from pack stories only when explicitly invoked. It does not affect `--story` behavior.

8. **No planner/adapter/theme extraction without RFC.** Moving planners, adapters, or themes into packs requires a dedicated RFC with full risk assessment.

9. **No source-of-truth migration without RFC.** Making packs the default source of truth requires a separate strategic RFC and stakeholder review.

10. **Compatibility before capability.** Existing CLI output must remain byte-compatible. New capabilities are additive, never replacing.

11. **Boundary before implementation.** M7.1 defines the boundary. M7.2+ implements within the boundary. No implementation starts until the boundary is accepted.

---

## Pack Runtime Boundary Definition

The **Pack Runtime Boundary** is the conceptual interface between:

- **Pack-owned layer** (Pack Loader, Pack Runtime Context, Pack Inspection, Pack Validation) — responsible for discovering, loading, validating, and exposing pack metadata.
- **Core-owned layer** (Story Registry, Rendering Pipeline, Planners, Adapters, Themes, Renderer Engine) — responsible for story resolution, content compilation, layout planning, theme application, and PPTX rendering.
- **Bridge-owned layer** (Explicit Pack Story Resolver, Pack Story Parity Validator) — responsible for resolving pack stories and validating parity between registry and pack rendering.

The boundary is **read-only and reversible**. Pack Loader provides metadata to the bridge layer. The bridge layer may use pack metadata for resolution decisions, but the core rendering pipeline remains independent.

---

## Runtime Boundary Participants

### Pack Loader Responsibility

**Ownership**: Pack Loader (loader-owned)

The Pack Loader is responsible for the complete lifecycle of pack metadata:

1. **Discovery** — Scan known directories for `pack.json` files.
2. **Reading** — Parse and normalize `pack.json` manifest fields.
3. **Validation** — Validate schema, required fields, asset existence, path safety.
4. **Asset Resolution** — Resolve declared asset paths with containment enforcement.
5. **Context Construction** — Build immutable `PackRuntimeContext` per pack.
6. **Registry** — Register pack metadata in in-memory `PackRegistry`.
7. **Inspection** — Expose pack metadata for CLI commands (`--inspect-pack`).

**What Pack Loader does NOT own:**
- Story resolution (belongs to Story Registry or Pack Story Resolver).
- Content compilation (belongs to Content Engine).
- Layout planning (belongs to Layout Engine / Planners).
- Theme application (belongs to Theme Engine).
- PPTX rendering (belongs to Renderer Engine).
- Output writing (belongs to Output Writer).

### Pack Runtime Context Responsibility

**Ownership**: Bridge-owned (created by Pack Loader, consumed by bridge)

The `PackRuntimeContext` is an **immutable, deep-frozen object** that describes a loaded pack's:

- Identity (`packId`, `name`, `version`, `status`)
- Asset inventory (stories, hero sequences, terminology, references)
- Runtime flags (`loadedByDefault`, `requiresPackLoader`)
- Governance rules (`coreChangesAllowed`, `migrationMode`)
- Validation result

**Purpose:** Provide a single, consistent, read-only view of pack state for all bridge operations (inspection, validation, explicit pack story resolution).

**Boundaries:**
- Created by Pack Loader during load.
- Consumed by Pack Inspection, Pack Validation, and Explicit Pack Story Resolver.
- Never mutated after creation.
- Never used by `--story` rendering path.
- Never used by core rendering pipeline directly.

### Pack Registry Responsibility

**Ownership**: Pack Loader (loader-owned)

The `PackRegistry` is an in-memory store of `PackRuntimeContext` objects:

- Lookup by pack ID.
- Duplicate detection.
- Iterator for `--list-packs`.
- Cleared between test runs (test isolation).

**Boundaries:**
- In-memory only. No persistence.
- No effect on `--story` rendering.
- No effect on core rendering pipeline.

### Pack Manifest Reader Responsibility

**Ownership**: Pack Loader (loader-owned)

Reads and normalizes `pack.json`:

- Parse JSON.
- Validate required fields.
- Normalize version, status, runtime, governance fields.
- Reject malformed manifests.

### Pack Asset Resolver Responsibility

**Ownership**: Pack Loader (loader-owned)

Resolves declared asset paths:

- Resolve relative to pack root.
- Enforce path containment (no `..`, no absolute paths).
- Validate file existence.
- Return resolved paths for `PackRuntimeContext`.

### Pack Validator Responsibility

**Ownership**: Pack Loader (loader-owned)

Validates pack manifest and assets:

- Schema validation (semver, type values, runtime/governance sub-fields).
- Asset path safety.
- Asset existence.
- Returns validation result with warnings/errors.

### Pack Inspection Responsibility

**Ownership**: Bridge-owned (uses Pack Loader internally)

Public API for pack inspection:

- Calls `loadPack()` internally.
- Transforms context into inspection result shape.
- Used by `--inspect-pack` CLI command.
- Read-only — never modifies state.

### Pack Story Resolver Responsibility

**Ownership**: Bridge-owned (exists independently of Pack Loader)

Resolves pack stories for explicit rendering:

- Takes `<pack-id>/<story-id>` input.
- Validates pack exists.
- Confirms story is declared in `pack.json`.
- Resolves story file path.
- Returns resolved path for rendering.

**Relationship to Pack Loader:** Currently independent. M7.3 will define alignment.

### Pack Story Parity Validator Responsibility

**Ownership**: Bridge-owned (exists independently of Pack Loader)

Compares registry and pack story rendering:

- Spawns `--story` and `--pack-story` subprocesses.
- Compares slide plans (count, titles, text, structure).
- Reports pass/fail with specific mismatch details.
- Uses isolated temp directories.

### CLI Entry Points Responsibility

**Ownership**: Core-owned (in `bin/run.js`)

Maps CLI flags to appropriate handlers:

- `--story` → Story Registry → Rendering Pipeline
- `--pack-story` → Pack Story Resolver → Rendering Pipeline
- `--list-packs` → Pack Loader → Pack Registry iterator
- `--inspect-pack` → Pack Inspection
- `--validate-pack` → Pack Validator
- `--validate-pack-story-parity` → Pack Story Parity Validator
- `--legacy-renderer` → Flag passed to rendering pipeline
- `--layout-engine` → Flag passed to layout engine
- Unknown option guard → Rejects unrecognized flags

---

## Current Participant Responsibility Table

| Participant | Ownership | Currently Used By | Notes |
|---|---|---|---|
| **Pack Loader** | Loader-owned | `--list-packs`, `--inspect-pack` | 8 modules, read-only |
| **Pack Runtime Context** | Bridge-owned | Pack Inspection, Pack Validation | Immutable, deep-frozen |
| **Pack Registry** | Loader-owned | `--list-packs` | In-memory, cleared between test runs |
| **Pack Manifest Reader** | Loader-owned | Pack Loader pipeline | Parse + normalize `pack.json` |
| **Pack Asset Resolver** | Loader-owned | Pack Loader pipeline | Path safety enforcement |
| **Pack Validator** | Loader-owned | `--validate-pack`, Pack Loader pipeline | Schema + asset validation |
| **Pack Inspection** | Bridge-owned | `--inspect-pack` | Calls `loadPack()` internally |
| **Pack Story Resolver** | Bridge-owned | `--pack-story` | Independent of Pack Loader |
| **Pack Story Parity Validator** | Bridge-owned | `--validate-pack-story-parity` | Compares registry vs pack |
| **CLI entry points** | Core-owned | `bin/run.js` | Maps flags to handlers |
| **Story Registry** | Core-owned | `--story` | Default story source |
| **Rendering Pipeline** | Core-owned | `--story`, `--pack-story` | Content → Layout → Theme → Render |
| **Planners** | Core-owned | Content Engine | 14 layout planners |
| **Layout Adapters** | Core-owned | Renderer Engine | 16 adapters |
| **Theme System** | Core-owned | Theme Engine | `medical-consulting` default |
| **Renderer Engine** | Core-owned | `--story`, `--pack-story` | Adapter-first + legacy fallback |
| **Output Writer** | Core-owned | Rendering Pipeline | Writes PPTX + slide plan |

---

## Future Participant Responsibility Table

| Participant | Ownership | Future State | Notes |
|---|---|---|---|
| **Pack Loader** | Loader-owned | Unchanged in M7.1 | Same 8 modules |
| **Pack Runtime Context** | Bridge-owned | May gain governance fields | Enhanced metadata for M7.2 |
| **Pack Registry** | Loader-owned | Unchanged | In-memory, no persistence |
| **Pack Manifest Reader** | Loader-owned | Unchanged | Same parse + normalize |
| **Pack Asset Resolver** | Loader-owned | Unchanged | Same path safety |
| **Pack Validator** | Loader-owned | Unchanged | Same schema + asset validation |
| **Pack Inspection** | Bridge-owned | May share more context with Loader | M7.2 alignment |
| **Pack Story Resolver** | Bridge-owned | May align with Pack Loader context | M7.3 alignment design |
| **Pack Story Parity Validator** | Bridge-owned | Unchanged | Same comparison logic |
| **CLI entry points** | Core-owned | Unchanged | No new commands in M7.1 |
| **Story Registry** | Core-owned | Unchanged | Remains default |
| **Rendering Pipeline** | Core-owned | Unchanged | Same content → layout → theme → render |
| **Planners** | Core-owned | Unchanged | No extraction in M7.1 |
| **Layout Adapters** | Core-owned | Unchanged | No extraction in M7.1 |
| **Theme System** | Core-owned | Unchanged | No extraction in M7.1 |
| **Renderer Engine** | Core-owned | Unchanged | Same adapter-first + legacy fallback |
| **Output Writer** | Core-owned | Unchanged | Same output path isolation |

**Future intended state (post-M7.1 design):**

- Pack Loader may provide normalized runtime context for pack metadata and governance.
- Pack Story Resolver may align more closely with Pack Loader context (M7.3).
- Inspection, validation, and explicit pack story resolution may share a consistent boundary model.
- Pack Runtime Context may become a read-only bridge into runtime decisions.
- Any source-of-truth migration requires a separate RFC.
- Any planner/adapter/theme extraction requires a separate RFC.

---

## Data Ownership Model

### Pack-Owned Data

Data that belongs to and is managed by Presentation Packs:

| Data | Location | Owner | Notes |
|---|---|---|---|
| `pack.json` | Pack root | Pack | Manifest — identity, assets, runtime, governance |
| Pack metadata | `pack.json` | Pack | name, version, status, domain, description |
| Declared pack assets | Pack subdirectories | Pack | stories/, hero-sequences/, terminology/, references/ |
| Pack story copies | `presentation-packs/<pack>/stories/` | Pack | Copies of registry stories for migration tracking |
| Hero sequence copies | `presentation-packs/<pack>/hero-sequences/` | Pack | Companion metadata for Hero Engine |
| Terminology assets | `presentation-packs/<pack>/terminology/` | Pack | Story grammar, narrative structure |
| Reference assets | `presentation-packs/<pack>/references/` | Pack | Layout design patterns, domain references |

**Governance:** Pack-owned data is read-only by the loader. The loader never modifies pack files.

### Registry-Owned Data

Data that belongs to and is managed by the Core story registry:

| Data | Location | Owner | Notes |
|---|---|---|---|
| Default story registry | `registry/packages/ppt-factory/story/` | Core | Canonical story source |
| Default `--story` behavior | `bin/run.js` | Core | Registry-backed story resolution |
| Canonical rendering story source | Core | Core | Until source-of-truth migration RFC |

**Governance:** Registry data is the default and only source for `--story`. Packs do not compete with or supplement the registry.

### Core-Owned Data

Data that belongs to and is managed by the Core runtime:

| Data | Location | Owner | Notes |
|---|---|---|---|
| Planners | `src/layout-engine/planners/` | Core | 14 layout planners |
| Layout adapters | `src/layout-adapters/` | Core | 16 adapters |
| Theme system | `src/theme/` | Core | Theme configuration and helpers |
| Renderer Engine | `src/renderer-engine/` | Core | Adapter-first + legacy fallback |
| Output Writer | `src/` | Core | PPTX + slide plan generation |
| Legacy renderer | `src/` | Core | Rollback renderer |
| CLI entry point | `bin/run.js` | Core | Flag parsing and dispatch |

**Governance:** Core-owned data is immutable from the pack layer. Packs cannot override core components.

### Bridge-Owned Data

Data that exists between Pack and Core layers:

| Data | Location | Owner | Notes |
|---|---|---|---|
| Explicit pack story resolution | `src/pack-story-resolver.js` | Bridge | Resolves `<pack>/<id>` to story path |
| Pack inspection | `src/pack-inspection.js` | Bridge | Public API for `--inspect-pack` |
| Pack validation | `src/pack-validator.js` | Bridge | Read-only pack manifest validation |
| Pack story parity validation | `scripts/pack-story-parity-validator.js` | Bridge | Compares registry vs pack slide plans |
| Pack Runtime Context | In-memory (loader-created) | Bridge | Immutable view of pack state |

**Governance:** Bridge-owned data connects pack metadata to core runtime without modifying either layer.

---

## Source-of-Truth Policy

**This is the critical boundary for M7.**

### Current Policy (Frozen)

1. **`--story` remains registry-backed.** The default story source is `registry/packages/ppt-factory/story/`.
2. **`--pack-story` remains explicit pack-backed story rendering.** Packs are accessed only via explicit `--pack-story <pack>/<id>`.
3. **Packs are NOT default source of truth.** No automatic pack lookup from `--story`.
4. **No automatic pack lookup from `--story`.** The registry path is independent of packs.
5. **Pack assets remain copy-first migration assets.** Assets in packs are copies for migration tracking, not runtime replacements.
6. **Output path isolation.** `--pack-story` outputs under `output/ppt-factory/packs/<pack-id>/` to avoid collision with `--story` outputs.

### Migration Policy

Moving from registry to pack as the default source of truth requires:

1. A **dedicated RFC** (e.g., Source-of-truth Migration RFC).
2. **Stakeholder review** — not a technical decision alone.
3. **Backward compatibility guarantee** — existing `--story` users must not be affected.
4. **Migration playbook** — copy-first, verify, switch.
5. **Rollback plan** — if migration causes issues.

**This RFC explicitly blocks source-of-truth migration until a separate RFC is approved.**

---

## CLI Behavior Policy

### Current Commands (Unchanged)

All existing CLI commands remain unchanged in M7.1:

| Command | Behavior | Changed? |
|---|---|---|
| `--help` | Lists all supported commands | No |
| `--validate-pack <path>` | Read-only pack validation | No |
| `--list-packs` | Pack Loader-backed pack listing | No |
| `--inspect-pack <id>` | Pack Loader-backed pack inspection | No |
| `--story <id>` | Registry story rendering | No |
| `--story <id> --legacy-renderer` | Registry + legacy renderer | No |
| `--pack-story <pack>/<id>` | Explicit pack story rendering | No |
| `--pack-story <pack>/<id> --legacy-renderer` | Pack + legacy renderer | No |
| `--validate-pack-story-parity <pack>/<id>` | Registry vs pack parity | No |
| `--validate-pack-story-parity <pack>/<id> --legacy-renderer` | Parity + legacy | No |
| `--legacy-renderer` | Legacy renderer flag | No |
| `--layout-engine` | Layout engine flag | No |
| Unknown option guard | Rejects unrecognized flags | No |

### New Commands

**None.** M7.1 does not add any new public CLI commands.

### Help Text

**Unchanged.** `--help` output remains identical.

---

## Output Path Policy

| Command | Output Path | Changed? |
|---|---|---|
| `--story <id>` | `output/ppt-factory/<id>.pptx` | No |
| `--pack-story <pack>/<id>` | `output/ppt-factory/packs/<pack-id>/<id>.pptx` | No |
| `--validate-pack-story-parity` | `output/ppt-factory/.parity-temp/` (temporary) | No |

**Pack outputs remain isolated** under `packs/<pack-id>/` to prevent collision with registry outputs.

---

## Error and Validation Policy

### Pack Loader Error Contract

The Pack Loader error contract remains **active and unchanged**:

- **Reference:** [`docs/M6_PACK_LOADER_VALIDATION_CONTRACT.md`](M6_PACK_LOADER_VALIDATION_CONTRACT.md)
- All loader functions return `{ ok: true, ... }` or `{ ok: false, errorCode, error, details }`.
- Canonical error code table (11 error codes) remains valid.
- CLI error mapping for `--list-packs` and `--inspect-pack` remains valid.

### Regression Guard

- **Reference:** [`docs/M6_PACK_LOADER_REGRESSION_GUARD.md`](M6_PACK_LOADER_REGRESSION_GUARD.md)
- Contract smoke script: `node registry/packages/ppt-factory/scripts/pack-loader-contract-smoke.js`
- Must return `Contract: passed (17/17 checks)` before any loader-related merge.
- **M7.1 makes no error contract change.** The guard remains manual. No CI/npm script added.

### Pack Story Parity

- `--validate-pack-story-parity` must pass before any M7 merge affecting pack story resolution.
- Compares slide plans (count, titles, text, structure) — not PPTX binary identity.

---

## Regression Guard Policy

### What Triggers the Guard

Run the contract smoke before merging any change to:

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

### M7.1 Status

**M7.1 does not trigger the guard.** This PR modifies only documentation files. No loader modules, no `pack.json` changes, no CLI behavior changes.

### Guard Status

**Manual only.** M6.5 intentionally kept the guard manual. M7.1 preserves this. No `package.json` script, no CI pipeline step, no pre-commit hook.

---

## Compatibility and Rollback Policy

### Compatibility Guarantees

M7.1 Pack Runtime Boundary Design must satisfy all of the following:

1. **`--story` rendering remains unchanged.** Registry story loading is independent.
2. **Legacy renderer rollback remains available.** `--legacy-renderer` works for all commands.
3. **Pack story output path remains unchanged.** `output/ppt-factory/packs/<pack-id>/`.
4. **Parity validation remains unchanged.** Compares registry vs pack slide plans.
5. **Registry story files remain in place.** No deletion or relocation.
6. **Presentation Pack structure remains compatible.** `pack.json` schema unchanged.
7. **Existing engines untouched.** Hero Engine, Layout Engine, Renderer Engine unchanged.
8. **Existing adapters untouched.** 16 adapters remain core components.
9. **Existing planners untouched.** Layout engine planners remain core components.
10. **No breaking changes to existing CLI behavior.**

### Rollback Strategy

If future M7 implementation introduces issues:

1. **Revert to M6.6 checkpoint.** Tag `m6-6-pack-loader-checkpoint` is the stable baseline.
2. **Restore `--story` registry path.** `--story` remains independent of M7 changes.
3. **Restore M5 explicit `--pack-story` behavior.** `pack-story-resolver.js` remains available as rollback.
4. **No state persistence.** M7 changes are additive and reversible.

Rollback is safe because:
- M7 is bounded by M6 frozen guardrails.
- No behavioral changes to `--story`, `--pack-story`, `--list-packs`, or `--inspect-pack`.
- All M7 work is gated by contract smoke and parity validation.

---

## Future M7 Milestone Implications

M7.1 defines the boundary. Later milestones implement within it.

| Milestone | Title | Type | Dependency | Notes |
|---|---|---|---|---|
| **M7.0** | Post-M6 Direction Decision RFC | Documentation | — | PR63 — Selected Option A |
| **M7.1** | Pack Runtime Boundary Design | **Design** | M7.0 | **This PR** — Defines boundary |
| M7.2 | Pack Runtime Context Inspection Hardening | Implementation | M7.1 accepted | Improve context usefulness |
| M7.3 | Pack Story Resolver / Loader Boundary Alignment Design | Design | M7.1 accepted | Align resolver with loader |
| M7.4 | Pack Runtime Boundary Smoke Checks | Testing | M7.2, M7.3 | Verify boundary assumptions |
| M7.5 | M7 Runtime Boundary Checkpoint | Documentation | M7.2–M7.4 | Formal checkpoint, frozen boundaries |

**Critical constraint:** M7.2 should **not** start implementation until M7.1 is accepted. The boundary must be designed before it is coded.

**M7.2 must not start implementation until M7.1 is accepted.** The boundary must be designed before it is coded.

---

## Review Checklist

Before merging PR64, verify:

- [ ] `docs/M7_PACK_RUNTIME_BOUNDARY_DESIGN.md` created
- [ ] `docs/ROADMAP.md` updated with M7.1 entry
- [ ] `docs/RFC-0008_POST_M6_DIRECTION_DECISION.md` updated with M7.1 implementation note
- [ ] `presentation-packs/digital-pathology/README.md` updated with M7.1 status
- [ ] `presentation-packs/digital-pathology/USAGE.md` updated with M7.1 note
- [ ] `package.json` NOT modified
- [ ] `bin/run.js` NOT modified
- [ ] `src/` NOT modified
- [ ] `story/` NOT modified
- [ ] `scripts/` NOT modified
- [ ] `adapters/` NOT modified
- [ ] `planners/` NOT modified
- [ ] Boundary design principles documented (11 principles)
- [ ] All 17 runtime boundary participants defined
- [ ] Current responsibility table complete
- [ ] Future responsibility table complete
- [ ] Data ownership model documented (pack/registry/core/bridge)
- [ ] Source-of-truth policy explicitly blocks migration
- [ ] CLI behavior policy confirms no changes
- [ ] Output path policy confirms no changes
- [ ] Error/validation policy references M6 contract
- [ ] Regression guard policy confirms manual-only
- [ ] Compatibility guarantees documented
- [ ] Rollback strategy documented
- [ ] Future M7 milestone implications mapped
- [ ] Contract smoke passes (17/17 checks)
- [ ] `--list-packs` output compatible
- [ ] `--inspect-pack` output compatible
- [ ] Parity validation passes
- [ ] `--story` behavior unchanged
- [ ] `--pack-story` behavior unchanged
- [ ] Unknown flag guard still works
- [ ] No adapters/planners/story JSON changed
- [ ] Packs NOT made default source of truth
- [ ] No CI or npm script added
- [x] M7.2 set to Pack Runtime Context Inspection Hardening

---

## M7.2 Implementation Note

M7.2 (PR65) implemented Pack Runtime Context Inspection Hardening:

- PackRuntimeContext hardened with normalized read-only sections (governance, runtime, boundaries, sourceOfTruth, outputPolicy, validation).
- Pack inspection derives from normalized context internally.
- CLI visible output remains compatible.
- Rendering unchanged.
- Source-of-truth unchanged.
- Contract smoke extended from 17 to 31 checks.

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-07-05 | Hermes | Initial Pack Runtime Boundary Design (M7.1) |
