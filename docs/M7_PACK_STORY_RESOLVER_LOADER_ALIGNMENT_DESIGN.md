# M7.3 Pack Story Resolver / Loader Boundary Alignment Design

> **Version**: 1.0.0  
> **Date**: 2026-07-05  
> **Status**: Design Document  
> **Related**: M7.1 Pack Runtime Boundary Design, M7.2 Pack Runtime Context Inspection Hardening, PR66  
> **Category**: Architecture — Pack Story Resolver Alignment  
> **Target Phase**: M7.3 (design document only)

---

## Purpose

This document defines how the **Pack Story Resolver** should align with **Pack Loader** and **PackRuntimeContext** boundaries in future milestones. It proposes a shared contract without changing any current behavior.

M7.3 is a **design document only**. No code is written. No runtime behavior changes. No CLI changes. No package.json modifications.

## Scope

This document covers:

- Current Pack Story Resolver behavior
- Current Pack Loader behavior
- Current PackRuntimeContext model (post-M7.2)
- Boundary mismatch analysis between resolver and loader
- Desired future alignment model
- Responsibility split between resolver, loader, and context
- Future resolver contract (proposed shape only)
- Future loader contract (proposed shape only)
- Future shared context contract (proposed shape only)
- Story resolution lifecycle
- Validation lifecycle
- Error handling model
- Compatibility policy
- Output path policy
- Source-of-truth policy
- Migration phases
- Regression guard policy

## Non-goals

The following are **explicitly excluded** from M7.3:

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
- **No implementation of resolver context consumption.** This is proposed only.
- **No removal of `pack-story-resolver.js`.**
- **No removal of `pack-story-parity-validator.js`.**

## Current State After M7.2

After M7.2 (Pack Runtime Context Inspection Hardening), the system has:

### Pack Loader (8 modules)

| Module | File | Responsibility |
|---|---|---|
| Discovery | `src/pack-discovery.js` | Locate packs in known directories |
| Manifest Reader | `src/pack-manifest-reader.js` | Read and parse `pack.json` |
| Validator | `src/pack-validator.js` | Schema + asset existence validation |
| Asset Resolver | `src/pack-asset-resolver.js` | Resolve declared asset paths safely |
| Runtime Context | `src/pack-runtime-context.js` | Build immutable context with normalized sections |
| Registry | `src/pack-registry.js` | In-memory pack context registry |
| Loader | `src/pack-loader.js` | Orchestrates the full lifecycle |
| Inspection | `src/pack-inspection.js` | Public API for pack inspection |

### PackRuntimeContext (Post-M7.2)

After M7.2, `PackRuntimeContext` includes six normalized read-only sections:

| Section | Source | Purpose |
|---|---|---|
| `governance` | Derived from manifest.governance + manifest.runtime | Normalized governance fields |
| `runtime` | Derived from manifest.runtime | Normalized runtime fields |
| `boundaries` | Hardcoded boundary constants | M6 frozen boundary enforcement |
| `sourceOfTruth` | Hardcoded policy constants | Source-of-truth policy |
| `outputPolicy` | Hardcoded path constants | Output path policy |
| `validation` | Passed through from pack-validator | Validation result |

All sections are deep-frozen and immutable.

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
10. Contract smoke must pass (31/31 checks) before any loader-related merge.

## Problem Statement

The Pack Story Resolver and Pack Loader currently operate on parallel paths:

- **Resolver** parses `<pack-id>/<story-id>`, verifies pack existence, resolves story path, loads story JSON for rendering.
- **Loader** discovers packs, reads manifests, validates assets, builds PackRuntimeContext, registers in memory.
- Both understand pack identity, manifest validity, and declared story assets.
- Both have separate validation paths (resolver checks story existence; loader checks all assets).
- Both have separate error handling (resolver uses its own codes; loader uses standardized errorCode + details).
- PackRuntimeContext is not yet the primary input to the resolver.
- This parallelism is acceptable today but creates opportunities for future alignment without changing current behavior.

## Design Principles

The following principles govern all M7.3 alignment decisions:

1. **Resolver remains explicit.** `--pack-story` must always be invoked with an explicit `<pack-id>/<story-id>`. No automatic discovery.

2. **Loader remains read-only.** Pack Loader never modifies pack or registry files. Never executes code from packs.

3. **PackRuntimeContext remains immutable.** Once created, the context is deep-frozen. No mutations at any layer.

4. **Resolver must not make packs default.** The resolver must never affect `--story` behavior or make packs the default source of truth.

5. **Resolver must not affect `--story`.** `--story` continues to use the registry exclusively.

6. **Resolver must not load planner / adapter / theme assets.** The resolver only loads story JSON for explicit `--pack-story`. It does not load content planners, layout adapters, or theme configurations.

7. **Resolver must not migrate source of truth.** No future alignment should change the fact that the registry is the default story source.

8. **Alignment must be incremental.** Future changes should be additive, not replacing existing resolver logic.

9. **Compatibility before consolidation.** Existing resolver behavior must remain byte-compatible. New contracts are additive.

10. **Boundary before implementation.** M7.3 defines the alignment contract. M7.4+ implements within the contract. No implementation starts until the design is accepted.

## Current Resolver Model

### Behavior

The Pack Story Resolver (existing in `src/pack-story-resolver.js`) operates as follows:

1. **Input parsing** — Parses `<pack-id>/<story-id>` from CLI argument.
2. **Pack existence check** — Verifies the pack directory exists under `presentation-packs/`.
3. **Story declaration check** — Verifies the story is declared in the pack's `pack.json` manifest.
4. **Story path resolution** — Constructs the absolute path to the story JSON file.
5. **Story loading** — Loads the story JSON file for rendering.
6. **Rendering handoff** — Passes the story object into the existing rendering pipeline (Content Engine → Layout Engine → Theme Engine → Renderer Engine).

### Key Properties

- **Explicit only.** `--pack-story` requires a full `<pack-id>/<story-id>` argument.
- **Independent from loader.** The resolver does not call `loadPack()` or use `PackRuntimeContext`.
- **Independent from `--story`.** The resolver does not interact with the story registry.
|- **Separate error handling.** The resolver has its own error codes and messages.
|- **Separate validation.** The resolver validates story existence but does not share pack validation logic.
|- **Direct rendering path.** The resolver loads story JSON and hands it directly to the rendering pipeline.

### M7.4 Boundary Smoke Protection

M7.4 (PR67) adds a **manual smoke script** that protects this separation:

- Boundary smoke checks protect the current resolver/loader separation.
- Resolver still does not consume PackRuntimeContext in M7.4.
- Future alignment remains design-only until separately approved.
- 60/60 checks pass across 7 categories.
- No CLI behavior change. No rendering behavior change.

### What the Resolver Does NOT Do

- Does not build or use PackRuntimeContext.
- Does not call `loadPack()` or `loadAllPacks()`.
- Does not use the in-memory PackRegistry.
- Does not share validation results with the loader.
- Does not affect `--story` behavior.
- Does not make packs the default source of truth.
- Does not load planner / adapter / theme assets.
- Does not implement automatic pack lookup.

## Current Loader Model

### Behavior

The Pack Loader (8 modules, post-M7.2) operates as follows:

1. **Discovery** — Scans `presentation-packs/` for `pack.json` files.
2. **Manifest reading** — Parses and normalizes `pack.json` fields.
3. **Validation** — Validates schema, required fields, asset existence, path safety.
4. **Asset resolution** — Resolves declared asset paths with containment enforcement.
5. **Context construction** — Builds immutable `PackRuntimeContext` with normalized sections.
6. **Registration** — Registers pack metadata in in-memory `PackRegistry`.
7. **Inspection** — Exposes pack metadata for CLI commands (`--inspect-pack`).

### Key Properties

- **Read-only.** Never modifies pack or registry files.
- **Immutable context.** `PackRuntimeContext` is deep-frozen.
- **Normalized sections.** Post-M7.2 context includes governance, runtime, boundaries, sourceOfTruth, outputPolicy, validation.
- **Standardized errors.** All loader functions return `{ ok, errorCode, error, details }`.
- **Separate from rendering.** Loader does not import engines/adapters/planners.
- **Separate from story resolution.** Loader does not load story JSON.

## Current PackRuntimeContext Model

### Structure (Post-M7.2)

```javascript
{
  packId: string,           // Pack identifier
  packRoot: string,         // Absolute path to pack root
  manifestPath: string|null, // Absolute path to pack.json
  manifest: frozenObject,   // Parsed pack.json (deep-frozen)
  assets: frozenObject,     // Resolved asset map (deep-frozen)
  validation: frozenObject, // Validation result (deep-frozen)
  governance: frozenObject, // Normalized governance (deep-frozen)
  runtime: frozenObject,    // Normalized runtime (deep-frozen)
  boundaries: frozenObject, // Hardcoded boundary constants (deep-frozen)
  sourceOfTruth: frozenObject, // Hardcoded source-of-truth policy (deep-frozen)
  outputPolicy: frozenObject,  // Hardcoded output path policy (deep-frozen)
}
```

### Key Properties

- **Deep-frozen.** Every property and nested object is frozen.
- **Immutable after creation.** No mutations at any layer.
- **Normalized sections.** governance, runtime derived from manifest; boundaries, sourceOfTruth, outputPolicy are hardcoded constants.
- **Not loaded for inspection.** Story JSON is NOT loaded into context.
- **Not used by rendering.** Context is metadata-only; rendering uses story JSON directly.

## Boundary Mismatch Analysis

### Areas of Overlap

| Area | Resolver | Loader | Mismatch |
|---|---|---|---|
| Pack identity | Parses from `--pack-story` arg | Derives from `pack.json` name | Different source of truth |
| Manifest validity | Implicit (assumes valid pack.json) | Explicit (schema validation) | Different validation depth |
| Story declaration | Checks `pack.json` contents.stories | Checks all declared assets | Different scope |
| Story path resolution | Constructs path from pack root | Resolves via asset resolver | Different path handling |
| Error handling | Own error codes/messages | Standardized errorCode + details | Different error shapes |
| Asset validation | Story existence only | All declared assets | Different completeness |
| Context usage | None | Full PackRuntimeContext | No shared context |

### Why This Is Acceptable

The boundary mismatch is **acceptable in M7.3** because:

1. **No behavior change intended.** Both resolver and loader work correctly today.
2. **Separate concerns.** Resolver focuses on story resolution; loader focuses on metadata/validation.
3. **Incremental alignment.** Future milestones can gradually unify validation, error handling, and context usage.
4. **No risk to rendering.** The mismatch does not affect rendering output.
5. **No risk to `--story`.** The resolver is independent of the story registry.

### Opportunities for Future Alignment

| Opportunity | Impact | Risk | Phase |
|---|---|---|---|
| Resolver accepts PackRuntimeContext as input | Unified validation, fewer redundant checks | Low (additive) | M8+ or RFC |
| Shared error codes between resolver and loader | Consistent error messages | Low (backward compatible) | M7.4 |
| Resolver uses context.boundaries for policy enforcement | Explicit boundary compliance | None (constants are immutable) | M7.4 |
| Resolver uses context.sourceOfTruth to verify non-default status | Policy enforcement | None | M7.4 |
| Resolver uses context.outputPolicy for path consistency | Path policy alignment | None | M7.4 |
| Resolver uses context.validation to avoid duplicate work | Performance improvement | Low | M7.4 |

## Desired Future Alignment Model

### Conceptual Model

```
                    ┌─────────────────────┐
                    │   PackRuntimeContext │
                    │   (immutable, frozen)│
                    │                     │
                    │  governance         │
                    │  runtime            │
                    │  boundaries         │
                    │  sourceOfTruth      │
                    │  outputPolicy       │
                    │  validation         │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                 │
              ▼                ▼                 ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │   Pack Loader │  │ Pack Story   │  │   Core       │
     │   (metadata)  │  │ Resolver     │  │ Runtime      │
     │               │  │ (story path) │  │ (rendering)  │
     └──────────────┘  └──────────────┘  └──────────────┘
              │                │                 │
              │                │                 │
              ▼                ▼                 ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │ --list-packs  │  │ --pack-story │  │ --story      │
     │ --inspect-pack│  │ (renders PPTX)│ │ (renders PPTX)│
     └──────────────┘  └──────────────┘  └──────────────┘
```

### Future Alignment Details

In a future milestone (M8+ or separate RFC), the Pack Story Resolver **may**:

1. **Accept or derive a PackRuntimeContext** as an input parameter.
2. **Use `context.assets.stories`** for story declaration checks instead of re-parsing the manifest.
3. **Use `context.boundaries`** to enforce explicit pack story behavior (e.g., verify `packStoryExplicit === true`).
4. **Use `context.sourceOfTruth`** to ensure packs are not treated as default source (e.g., verify `packsAreDefault === false`).
5. **Use `context.outputPolicy`** for path policy consistency (e.g., verify pack output path matches `packOutputPath` template).
6. **Use `context.validation`** to avoid duplicate validation work (skip validation if `validationPassed === true`).

### What Remains Unchanged

- **Pack Loader remains read-only.** No new write operations.
- **Resolver remains the explicit bridge into rendering.** No automatic resolution.
- **Rendering pipeline remains core-owned.** No changes to Content Engine, Layout Engine, Theme Engine, or Renderer Engine.
- **`--story` remains registry-backed.** No automatic pack lookup.
- **`--pack-story` remains explicit.** No behavioral change in M7.3.
- **PackRuntimeContext remains immutable.** No mutations.

## Responsibility Split

### Pack Loader Responsibilities

| Responsibility | Description |
|---|---|
| Manifest reading | Parse and normalize `pack.json` |
| Validation | Schema + asset existence validation |
| Asset normalization | Resolve declared asset paths safely |
| PackRuntimeContext creation | Build immutable context with normalized sections |
| Inspection inputs | Provide context to `--inspect-pack` |
| Registry management | In-memory pack context registry |

### Pack Story Resolver Responsibilities

| Responsibility | Description |
|---|---|
| Parsing `<pack-id>/<story-id>` | Extract pack and story identifiers from CLI argument |
| Verifying story declaration | Confirm story is declared in pack manifest |
| Resolving story path | Construct absolute path to story JSON |
| Loading story JSON | Read story JSON only for explicit `--pack-story` |
| Passing story to rendering | Hand off story object to existing rendering pipeline |
| Using context (future) | May accept PackRuntimeContext as input (M8+ or RFC) |

### PackRuntimeContext Responsibilities

| Responsibility | Description |
|---|---|
| Immutable metadata | Store pack identity, version, status |
| Governance | Store normalized governance rules |
| Boundary flags | Store hardcoded boundary enforcement constants |
| Source-of-truth flags | Store hardcoded source-of-truth policy |
| Output policy | Store hardcoded output path policy |
| Validation summary | Store validation result from pack-validator |

### Core Runtime Responsibilities

| Responsibility | Description |
|---|---|
| Story registry | Default story source for `--story` |
| Planners | 14 layout planners |
| Adapters | 16 layout adapters |
| Themes | Theme configuration and helpers |
| Renderer | Adapter-first + legacy fallback rendering |
| Output writer | PPTX + slide plan generation |

## Future Resolver Contract

> **Note: This is a PROPOSED contract shape only. No implementation is included in M7.3.**

### Success Shape (Proposed)

```javascript
{
  ok: true,
  packId: "digital-pathology",
  storyId: "digital-pathology-15",
  context: /* PackRuntimeContext from loader */,
  storyPath: "/absolute/path/to/story.json",
  storyRelativePath: "stories/digital-pathology-15.json",
  story: /* parsed story JSON object */,
  source: "pack",
  explicit: true,
  renderingAllowed: true,
  outputPolicy: /* from context.outputPolicy */,
}
```

### Failure Shape (Proposed)

```javascript
{
  ok: false,
  errorCode: "PACK_NOT_FOUND" | "STORY_NOT_DECLARED" | "STORY_FILE_MISSING" | "STORY_PARSE_ERROR",
  error: "Human-readable error message",
  details: {
    packId: "optional-pack-id",
    storyId: "optional-story-id",
    /* additional context-specific details */
  },
}
```

### Key Design Decisions (Proposed)

1. **`context` is optional.** In M7.3+, the resolver may receive context from the caller. In legacy usage, the resolver may construct it internally.
2. **`explicit: true`** is always set for `--pack-story` to enforce the explicit opt-in policy.
3. **`renderingAllowed`** may be derived from `context.boundaries.packStoryExplicit` in future alignment.
4. **`outputPolicy`** comes from the context, ensuring path consistency.
5. **Error codes may align with loader error codes** in future milestones.

## Future Loader Contract

> **Note: This is a PROPOSED contract shape only. No implementation is included in M7.3.**

The loader contract remains unchanged from M7.2:

```javascript
{
  ok: true,
  context: /* PackRuntimeContext */,
}
```

or on failure:

```javascript
{
  ok: false,
  errorCode: "PACK_NOT_FOUND" | "MANIFEST_MISSING" | "MANIFEST_INVALID_JSON" | "VALIDATION_FAILED" | "ASSET_UNSAFE_PATH" | "ASSET_MISSING",
  error: "Human-readable error message",
  details: { /* error-specific details */ },
}
```

**No changes to loader contract in M7.3.** The loader contract is stable since M6.6 and was hardened in M7.2.

## Future Shared Context Contract

> **Note: This is a PROPOSED contract shape only. No implementation is included in M7.3.**

The shared context contract is the `PackRuntimeContext` object created by the loader and potentially consumed by the resolver.

### Immutable Properties (All Frozen)

| Property | Type | Source | Notes |
|---|---|---|---|
| `packId` | string | Manifest | Pack identifier |
| `packRoot` | string | Discovery | Absolute path |
| `manifestPath` | string\|null | Manifest reader | Path to pack.json |
| `manifest` | frozen object | Manifest reader | Full parsed manifest |
| `assets` | frozen object | Asset resolver | Resolved asset paths |
| `validation` | frozen object | Validator | Validation result |
| `governance` | frozen object | Normalized | coreChangesAllowed, migrationMode, loadedByDefault |
| `runtime` | frozen object | Normalized | requiresPackLoader, loadedByDefault, renderingMode |
| `boundaries` | frozen object | Hardcoded | storyRegistryDefault, packStoryExplicit, etc. |
| `sourceOfTruth` | frozen object | Hardcoded | defaultStorySource, packsAreDefault, etc. |
| `outputPolicy` | frozen object | Hardcoded | registryOutputPath, packOutputPath, parityTempPath |

### Usage by Resolver (Proposed)

In future alignment, the resolver may read from context:

- `context.assets.stories` — for story declaration verification
- `context.boundaries.packStoryExplicit` — to verify explicit pack story policy
- `context.boundaries.automaticPackLookup` — to verify no auto-lookup
- `context.sourceOfTruth.packsAreDefault` — to verify packs are not default
- `context.outputPolicy.packOutputPath` — for output path consistency
- `context.validation.validationPassed` — to skip redundant validation

## Story Resolution Lifecycle

### Current Lifecycle (Resolver-Only)

```
CLI: --pack-story digital-pathology/digital-pathology-15
  ↓
Resolver parses "<pack-id>/<story-id>"
  ↓
Resolver verifies pack directory exists
  ↓
Resolver checks story is declared in pack.json
  ↓
Resolver constructs absolute story path
  ↓
Resolver loads story JSON
  ↓
Resolver passes story to rendering pipeline
  ↓
Rendering pipeline generates PPTX
```

### Proposed Future Lifecycle (With Context)

```
CLI: --pack-story digital-pathology/digital-pathology-15
  ↓
Loader.loadPack("digital-pathology") → PackRuntimeContext
  ↓
Resolver receives context + "<pack-id>/<story-id>"
  ↓
Resolver uses context.assets.stories for declaration check
  ↓
Resolver uses context.boundaries for policy verification
  ↓
Resolver uses context.validation to skip redundant checks
  ↓
Resolver constructs absolute story path
  ↓
Resolver loads story JSON
  ↓
Resolver passes story to rendering pipeline
  ↓
Rendering pipeline generates PPTX
```

**Note:** The future lifecycle is proposed only. No implementation in M7.3.

## Validation Lifecycle

### Current State

| Component | Validates | Result Used By |
|---|---|---|
| Pack Loader | Schema, assets, path safety | PackRuntimeContext.validation, --inspect-pack |
| Pack Story Resolver | Story existence (implicit) | Resolver's own error handling |
| Parity Validator | Registry vs pack slide plans | --validate-pack-story-parity output |

### Future Alignment (Proposed)

- **Resolver may use `context.validation`** to skip redundant story existence checks.
- **Resolver may rely on loader's asset validation** for story path safety.
- **Parity validation remains unchanged** — still compares registry vs pack slide plans.

## Error Handling Model

### Current State

| Component | Error Shape | Codes |
|---|---|---|
| Pack Loader | `{ ok, errorCode, error, details }` | 11 canonical codes |
| Pack Story Resolver | `{ ok, errorCode, error, details }` | Resolver-specific codes |
| Parity Validator | Console output + exit code | Pass/fail |

### Future Alignment (Proposed)

- **Shared error code taxonomy.** Resolver may adopt loader error codes for common failures (PACK_NOT_FOUND, STORY_NOT_DECLARED, STORY_FILE_MISSING).
- **Error details may reference context.** Resolver errors may include `context.packId` and `context.storyId` for consistency.
- **No change in M7.3.** Current error handling remains unchanged.

## Compatibility Policy

### Current Commands (Unchanged in M7.3)

All existing CLI commands remain unchanged in M7.3:

| Command | Behavior | Changed? |
|---|---|---|
| `--help` | Lists all supported commands | No |
| `--validate-pack <path>` | Read-only pack validation | No |
| `--list-packs` | Pack Loader-backed pack listing | No |
| `--inspect-pack <id>` | Pack Loader-backed pack inspection | No |
| `--story <id>` | Registry story rendering | No |
| `--pack-story <pack>/<id>` | Explicit pack story rendering | No |
| `--validate-pack-story-parity <pack>/<id>` | Registry vs pack parity | No |
| `--legacy-renderer` | Legacy renderer flag | No |
| `--layout-engine` | Layout engine flag | No |
| Unknown option guard | Rejects unrecognized flags | No |

### New Commands

**None.** M7.3 does not add any new public CLI commands.

### Help Text

**Unchanged.** `--help` output remains identical.

## Output Path Policy

| Command | Output Path | Changed? |
|---|---|---|
| `--story <id>` | `output/ppt-factory/<id>.pptx` | No |
| `--pack-story <pack>/<id>` | `output/ppt-factory/packs/<pack-id>/<id>.pptx` | No |
| `--validate-pack-story-parity` | `output/ppt-factory/.parity-temp/` (temporary) | No |

**Pack outputs remain isolated** under `packs/<pack-id>/` to prevent collision with registry outputs.

## Source-of-Truth Policy

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

**This design explicitly blocks source-of-truth migration until a separate RFC is approved.**

## Migration Phases

### M7.3 — Alignment Design Only (This PR)

- Document desired future alignment between resolver and loader.
- Define responsibility split.
- Propose future resolver contract shape.
- Analyze boundary mismatches.
- **No code changes.**
- **No behavior changes.**

### M7.4 — Pack Runtime Boundary Smoke Checks

- Add smoke tests that verify boundary assumptions.
- Verify `context.boundaries` values are enforced.
- Verify `context.sourceOfTruth` values are correct.
- Verify resolver and loader operate within boundaries.
- **Design document only.** No implementation.

### M7.5 — M7 Runtime Boundary Checkpoint

- Formal checkpoint documenting M7.1 through M7.4 outcomes.
- Freeze M7 boundary definitions.
- Document what is and is not allowed in future M7 milestones.
- **Documentation only.** No implementation.

### Future M8 or RFC — Resolver Consumes PackRuntimeContext

- **Proposed only.** Requires separate RFC before implementation.
- Resolver may accept `PackRuntimeContext` as input.
- Resolver may use context for validation, policy enforcement, and path consistency.
- **Not in M7.3 scope.**

### Future RFC — Source-of-truth Migration Decision

- **Proposed only.** Requires separate RFC before implementation.
- Would evaluate making packs the default source of truth.
- Requires stakeholder review, migration playbook, and rollback plan.
- **Not in M7.3 scope.**

## Regression Guard Policy

### What Triggers the Guard

Run the contract smoke before merging any change to:

- `src/pack-loader.js`
- `src/pack-runtime-context.js`
- `src/pack-inspection.js`
- `src/pack-discovery.js`
- `src/pack-registry.js`
- `src/pack-manifest-reader.js`
- `src/pack-asset-resolver.js`
- `src/pack-validator.js`
- Any `pack.json` manifest structure change
- `--list-packs` or `--inspect-pack` behavior change
- Error code or CLI error mapping change

### M7.3 Status

**M7.3 does not trigger the guard.** This PR modifies only documentation files. No loader modules, no `pack.json` changes, no CLI behavior changes.

### Guard Status

**Manual only.** Contract smoke: `node scripts/pack-loader-contract-smoke.js` must pass (31/31 checks) before any loader-related merge. No CI/npm script added.

## Review Checklist

Before merging PR66, verify:

- [ ] `docs/M7_PACK_STORY_RESOLVER_LOADER_ALIGNMENT_DESIGN.md` created
- [ ] `docs/M7_PACK_RUNTIME_BOUNDARY_DESIGN.md` updated with M7.3 note
- [ ] `docs/M7_PACK_RUNTIME_CONTEXT_INSPECTION_HARDENING.md` updated with M7.3 note
- [ ] `docs/ROADMAP.md` updated with M7.3 entry
- [ ] `docs/RFC-0008_POST_M6_DIRECTION_DECISION.md` updated with M7.3 note
- [ ] `presentation-packs/digital-pathology/README.md` updated with M7.3 status
- [ ] `presentation-packs/digital-pathology/USAGE.md` updated with M7.3 note
- [ ] `package.json` NOT modified
- [ ] `bin/run.js` NOT modified
- [ ] `src/` NOT modified
- [ ] `story/` NOT modified
- [ ] `scripts/` NOT modified
- [ ] `adapters/` NOT modified
- [ ] `planners/` NOT modified
- [ ] Design principles documented (10 principles)
- [ ] Current resolver model documented
- [ ] Current loader model documented
- [ ] Current PackRuntimeContext model documented
- [ ] Boundary mismatch analysis complete
- [ ] Desired future alignment model defined
- [ ] Responsibility split documented
- [ ] Future resolver contract defined as proposed only
- [ ] Future loader contract unchanged
- [ ] Future shared context contract defined as proposed only
- [ ] Story resolution lifecycle documented (current + proposed)
- [ ] Validation lifecycle documented
- [ ] Error handling model documented
- [ ] Compatibility policy confirms no changes
- [ ] Output path policy confirms no changes
- [ ] Source-of-truth policy explicitly blocks migration
- [ ] Migration phases documented (M7.3 → M7.5 → M8+)
- [ ] Regression guard policy confirms manual-only
- [ ] Contract smoke passes (31/31 checks)
- [ ] `--list-packs` output compatible
- [ ] `--inspect-pack` output compatible
- [ ] Parity validation passes
- [ ] `--story` behavior unchanged
- [ ] `--pack-story` behavior unchanged
- [ ] `--help` output unchanged
- [ ] Unknown flag guard still works
- [ ] No adapters/planners/story JSON changed
- [ ] Packs NOT made default source of truth
- [ ] No CI or npm script added
- [x] M7.4 set to Pack Runtime Boundary Smoke Checks
- [x] M7.5 set to Pack Runtime Boundary Checkpoint — M7 complete

---

## M7.5 Checkpoint Note

M7.5 (PR68) completed M7 Pack Runtime Boundary Deepening:

- Alignment remains design-only at M7.5.
- Resolver does not yet consume PackRuntimeContext.
- Future resolver/context consolidation requires RFC.
- M7 boundary state is frozen and documented.
- Next phase: M8 — Pack Runtime RFC / Post-M7 Decision.

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-07-05 | Hermes | Initial Pack Story Resolver / Loader Alignment Design (M7.3) |
