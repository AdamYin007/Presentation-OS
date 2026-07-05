# RFC-0007: Pack Loader Design

**Status:** Proposed  
**Author:** Hermes (MD Senior Implementation Engineer)  
**Date:** 2026-07-03  
**Prerequisite:** M5.7 Pack Runtime Integration Checkpoint (PR55)  
**Category:** Architecture — Pack Runtime Extension  
**Target Phase:** M6.0 (design), M6.1 (skeleton implementation)  

---

## Status

**Proposed.** This RFC defines the future Pack Loader architecture before implementation.

No code is written. No files are added. This is a design document only.

---

## Context

M5 completed explicit pack runtime integration through seven milestones:

- **M5.0** Pack Runtime Integration Design — defined the opt-in strategy.
- **M5.1** Pack Story Resolution Design Validation — validated input contracts.
- **M5.2** Pack Story CLI Contract Guard — enforced safe parsing.
- **M5.3** Read-only Pack Story Resolver — resolved pack stories without rendering.
- **M5.4** Explicit Pack Story Rendering Prototype — rendered pack stories via `--pack-story`.
- **M5.5** Pack Story Rendering Parity Validation — proved pack and registry produce identical slide plans.
- **M5.6** Pack Story Rendering Hardening — removed global state, isolated output paths.
- **M5.7** Pack Runtime Integration Checkpoint — froze M5 behavior as baseline.

Current capabilities:

| Command | Source | Behavior |
|---|---|---|
| `--story <id>` | Registry | Loads `story/<id>.json`, renders PPTX |
| `--pack-story <pack>/<id>` | Pack | Resolves pack, loads `stories/<id>.json`, renders PPTX |
| `--validate-pack <path>` | Read-only | Validates pack manifest and assets |
| `--list-packs` | Read-only | Lists available packs |
| `--inspect-pack <id>` | Read-only | Shows pack metadata, assets, runtime, governance |
| `--validate-pack-story-parity <pack>/<id>` | Both | Compares registry vs pack slide plans |

Current boundaries:

- `--story` uses **registry story source** (default).
- `--pack-story` uses **pack story source** (explicit opt-in).
- Presentation Packs are **NOT** the default source of truth.
- No pack loader exists.
- No automatic pack lookup from `--story`.
- No planner extraction or adapter extraction.

M6.0 addresses the gap: **how packs are discovered, validated, and loaded at runtime without breaking existing behavior.**

---

## Problem Statement

M5 allows explicit pack story rendering via `--pack-story <pack>/<id>`, but the underlying mechanism is ad-hoc:

1. `run.js` manually discovers `presentation-packs/` directories.
2. `pack-story-resolver.js` reads `pack.json` and resolves story paths.
3. No centralized pack registry or loader exists.
4. `--list-packs` and `--inspect-pack` reimplement discovery logic.
5. Parity validation spawns subprocesses to invoke `--story` and `--pack-story`.
6. No abstraction for future pack discovery, validation, or runtime integration.

**Problems to solve:**

- How packs are discovered for runtime use (without making them default).
- How manifests are validated before loading.
- How declared assets are exposed to runtime in a controlled manner.
- How to keep `--story` registry compatibility intact.
- How to avoid uncontrolled source-of-truth migration.
- How to prevent premature planner/adapter extraction.
- How to establish a reusable Pack Loader foundation for future M6+ work.

---

## Goals

1. **Define Pack Loader responsibilities** — what it does and does not do.
2. **Define Pack Loader non-responsibilities** — explicitly exclude planner/adapter extraction, source-of-truth migration, marketplace behavior.
3. **Define load lifecycle** — staged discovery through runtime context construction.
4. **Define validation gates** — manifest validity, asset existence, path safety.
5. **Define source-of-truth behavior** — `--story` remains registry-backed; no automatic migration.
6. **Define compatibility guarantees** — existing `--story`, `--pack-story`, parity, legacy renderer all preserved.
7. **Define rollback behavior** — disable loader path, fall back to `--story` registry.
8. **Define minimum implementation path for M6.1** — read-only skeleton, no rendering changes.
9. **Define test strategy** — comprehensive test matrix before implementation.

---

## Non-goals

The following are **explicitly excluded** from this RFC and from M6.1:

- **This RFC does not implement pack loader.** It is a design document only.
- **This RFC does not make packs default source of truth.** `--story` remains registry-backed.
- **This RFC does not change `--story` behavior.** Registry story loading is untouched.
- **This RFC does not implement planner extraction.** Existing planners remain in the core.
- **This RFC does not implement adapter extraction.** Existing adapters remain in the core.
- **This RFC does not move planners/adapters into packs.** Pack-owned planners/adapters are deferred.
- **This RFC does not introduce marketplace runtime behavior.** No dynamic pack downloads.
- **This RFC does not introduce SDK API.** Pack consumers interact via CLI only.
- **This RFC does not change output paths.** Pack output remains under `output/ppt-factory/packs/<pack-id>/`.
- **This RFC does not implement automatic pack lookup from `--story`.**
- **This RFC does not modify story JSON or hero sequence JSON.**
- **This RFC does not change rendering behavior.** Existing engines are used as-is.

---

## Proposed Architecture

### Components (Design Names Only)

| Component | Responsibility |
|---|---|
| **PackLoader** | Orchestrate the full load lifecycle. Entry point for pack runtime integration. |
| **PackManifestReader** | Read and normalize `pack.json`. Reject malformed manifests. |
| **PackValidator** | Validate manifest fields, required assets, path safety. Reuses existing validation rules. |
| **PackRegistry** | In-memory registry of loaded pack metadata. Lookup by pack ID. |
| **PackAssetResolver** | Resolve declared asset paths. Ensure paths stay inside pack root. |
| **PackRuntimeContext** | Immutable object describing a loaded pack's metadata, assets, and capabilities. |

These are design names only. No files are created in this RFC.

### Component Responsibilities

#### PackLoader

- Discover candidate packs from known directories.
- Read pack manifest via `PackManifestReader`.
- Validate manifest and declared assets via `PackValidator`.
- Construct read-only `PackRuntimeContext` per pack.
- Register pack metadata in `PackRegistry`.
- Expose pack stories for explicit runtime use (`--pack-story`).
- Prepare future extension points (marked `TODO`, not implemented).

#### PackManifestReader

- Read `pack.json` from pack root directory.
- Parse and normalize manifest fields (version, status, assets, runtime, governance).
- Reject malformed or missing manifest with clear error.
- Return normalized manifest object.

#### PackValidator

- Reuse existing validation rules from `--validate-pack` where possible.
- Confirm required assets (stories, hero sequences) exist.
- Confirm no unsafe paths (absolute, traversal, `.json` suffix on pack paths).
- Confirm pack version is supported.
- Return validation result with warnings/errors.

#### PackRegistry

- Hold loaded pack metadata in memory (immutable after load).
- Allow lookup by pack ID.
- Detect duplicate story IDs across packs.
- Does **not** mutate pack files.
- Provides iterator for `--list-packs`.

#### PackAssetResolver

- Resolve declared asset paths relative to pack root.
- Ensure all resolved paths stay inside pack root directory.
- Reject paths with `..` traversal or absolute paths.
- Return resolved paths for `PackRuntimeContext`.

#### PackRuntimeContext

- Immutable object: `{ packId, manifest, assets, validation, governance }`.
- Describes what a loaded pack exposes to runtime.
- Used by `--pack-story` to locate story JSON.
- Not used by `--story` (registry remains independent).

---

## Loader Lifecycle

The Pack Loader follows a staged lifecycle. Each stage gates on the previous:

```
1. Discover    → Scan known directories for pack.json
2. Read        → Parse and normalize manifest
3. Validate    → Check required fields, asset existence, path safety
4. Resolve     → Resolve asset paths, confirm containment
5. Build       → Construct immutable PackRuntimeContext
6. Register    → Add to PackRegistry, check for conflicts
7. Expose      → Make pack metadata available to CLI commands
8. Render      → Only when explicitly requested via --pack-story
```

**Stage 8 (Render)** is gated: the loader never triggers rendering automatically.
Rendering only occurs when `--pack-story <pack>/<id>` is explicitly invoked.

---

## Source-of-truth Policy

**This is the critical boundary for M6.**

M6 Pack Loader must **not** automatically replace registry sources.

### M6.1 Behavior

- `--story <id>` → remains **registry-backed**. No change.
- `--pack-story <pack>/<id>` → remains **explicit pack-backed**. No change.
- Pack Loader may power `--list-packs`, `--inspect-pack`, `--pack-story` internally (refactoring, not behavioral change).
- **No automatic pack lookup from `--story`.**
- **No pack default source-of-truth migration.**
- Future source-of-truth migration requires a **separate RFC**.

### Source-of-truth Migration

Moving from registry to pack as the default source of truth is a strategic decision that requires:

1. A dedicated RFC (e.g., RFC-0008: Source-of-truth Migration).
2. Community/stakeholder review.
3. Backward compatibility guarantee for existing `--story` users.
4. Migration playbook (copy-first, verify, switch).
5. Rollback plan if migration causes issues.

This RFC explicitly defers source-of-truth migration.

---

## CLI Policy

### Current Commands (Preserved)

| Command | Source | Behavior |
|---|---|---|
| `--story <id>` | Registry | Loads registry story, renders PPTX |
| `--story <id> --legacy-renderer` | Registry | Same, legacy renderer |
| `--pack-story <pack>/<id>` | Pack | Resolves pack, loads story, renders PPTX |
| `--pack-story <pack>/<id> --legacy-renderer` | Pack | Same, legacy renderer |
| `--validate-pack-story-parity <pack>/<id>` | Both | Compares registry vs pack slide plans |
| `--validate-pack-story-parity <pack>/<id> --legacy-renderer` | Both | Same, legacy mode |
| `--validate-pack <path>` | Read-only | Validates pack manifest and assets |
| `--list-packs` | Read-only | Lists available packs |
| `--inspect-pack <id>` | Read-only | Shows pack metadata |

### Potential Future Commands (Deferred)

| Command | Status | Notes |
|---|---|---|
| `--load-pack <pack-id>` | Deferred | May be added in M6.2+ if justified |
| `--reload-packs` | Deferred | Hot-reload packs without restart |
| `--pack-story <id>` (implicit) | Deferred | Would require source-of-truth decision |

**No new CLI commands are proposed in M6.1.** The loader is internal plumbing.

---

## Compatibility Guarantees

M6.1 Pack Loader must satisfy all of the following:

1. **`--story` rendering remains unchanged.** Registry story loading is independent.
2. **Legacy renderer rollback remains available.** `--legacy-renderer` works for all commands.
3. **Pack story output path remains unchanged.** `output/ppt-factory/packs/<pack-id>/`.
4. **Parity validation remains unchanged.** Compares registry vs pack slide plans.
5. **Registry story files remain in place.** No deletion or relocation.
6. **Presentation Pack structure remains compatible.** `pack.json` schema unchanged.
7. **Existing engines untouched.** Hero Engine, Layout Engine, Renderer Engine unchanged.
8. **Existing adapters untouched.** 16 adapters remain registry/core components.
9. **Existing planners untouched.** Layout engine planners remain registry/core components.
10. **No breaking changes to existing CLI behavior.**

---

## Error Model

| Error | Condition | Message Pattern | Action |
|---|---|---|---|
| Pack not found | Directory missing or no pack.json | `Presentation Pack not found: <id>` | Exit 1 |
| Manifest missing | pack.json absent | `Manifest not found: <path>/pack.json` | Exit 1 |
| Manifest invalid | JSON parse error or schema violation | `Invalid manifest: <reason>` | Exit 1 |
| Asset path unsafe | Absolute path or `..` traversal | `Unsafe asset path: <path>` | Exit 1 |
| Declared story missing | Story referenced but file absent | `Story not found: <path>` | Exit 1 |
| Duplicate story id | Two packs declare same story id | `Duplicate story id: <id>` | Exit 1 |
| Unsupported version | pack.json version outside supported range | `Unsupported pack version: <ver>` | Exit 1 |
| Runtime context build failed | Internal loader error | `Runtime context build failed: <reason>` | Exit 1 |

All errors are actionable: they identify the condition, the affected path/id, and the exit code.

---

## Security and Path Safety

M6.1 Pack Loader is **read-only** and **local-only**.

### Rules

1. **No absolute paths** in pack asset declarations.
2. **No path traversal** (`..` segments rejected).
3. **Resolved assets must stay inside pack root** — verified at load time.
4. **Pack loader is read-only** — no file modification.
5. **No executing code from packs** — JSON/data only.
6. **No dynamic imports from packs in M6.1** — static asset resolution only.
7. **No remote pack loading** — only local directories scanned.
8. **No pack loader auto-discovery** — only known directories (e.g., `presentation-packs/`).

### Enforcement

- `PackAssetResolver` validates every declared asset path.
- Any path that escapes pack root causes load failure.
- Warnings are logged for non-critical issues (empty optional assets).
- Failures are hard — loader rejects the pack entirely.

---

## Versioning Policy

### pack.json Version

- Current schema version: implicit (no explicit `schemaVersion` field yet).
- Future packs may include `schemaVersion` for explicit compatibility checking.

### Supported Versions

- M6.1 supports current pack schema (as defined by `presentation-packs/digital-pathology/pack.json`).
- Unsupported schema versions produce a hard error (exit 1).
- Version mismatch is **not** a warning — it is a load failure.

### Future Version Handling

- When new pack schema versions are introduced, a deprecation period is required.
- Old schemas remain supported for at least one M-phase cycle.
- Deprecation notices are documented in the pack specification (RFC-0003).

---

## Runtime Boundary

### What Pack Loader Touches

- `pack.json` — read manifest.
- Declared asset paths — resolve and validate.
- `PackRegistry` — in-memory metadata store.
- `--list-packs`, `--inspect-pack`, `--pack-story` — may use loader internally.

### What Pack Loader Does NOT Touch

- **Planners** — remain registry/core components.
- **Adapters** — remain registry/core components.
- **Content Engine** — unchanged.
- **Theme Engine** — unchanged.
- **Renderer Engine** — unchanged.
- **Hero Engine** — unchanged.
- **Story JSON files** — read-only, never mutated.
- **Hero sequence JSON files** — read-only, never mutated.
- **Output paths** — unchanged.
- **Rendering behavior** — unchanged.

---

## Rollback Strategy

If Pack Loader introduces issues:

1. **Disable loader path** — `--pack-story` falls back to M5 resolver (`pack-story-resolver.js`).
2. **Continue using `--story` registry path** — unaffected by loader changes.
3. **Keep `--legacy-renderer`** — available for all commands.
4. **Keep M5 explicit `--pack-story` behavior** — as rollback baseline.
5. **No automatic pack loading** — loader is opt-in via explicit commands.

Rollback is safe because:
- The loader is read-only and additive.
- Existing `--story` and `--pack-story` commands remain functional.
- No state is persisted by the loader.

---

## M6.1 Implementation Plan

### M6.1 — Read-only Pack Loader Skeleton

**Scope:** Minimal loader implementation. No behavioral changes.

#### Allowed Changes

1. **Add `pack-loader.js`** — core loader module.
2. **Load pack metadata** into immutable `PackRuntimeContext`.
3. **Reuse existing validator** (`--validate-pack` logic).
4. **Keep `--story` unchanged** — registry loading independent.
5. **Wire `--list-packs` / `--inspect-pack` through loader** — if low risk, otherwise keep existing implementation.
6. **Do not change rendering path** — `--pack-story` continues using existing resolver + renderer.
7. **Do not implement source-of-truth migration.**

#### Not Allowed

- Changing `--story` behavior.
- Adding new CLI commands.
- Implementing planner/adapter extraction.
- Moving assets into packs.
- Changing output paths.
- Modifying engines or adapters.

#### Deliverables

- `src/pack-loader.js` — loader module with full lifecycle.
- `src/pack-manifest-reader.js` — manifest parser.
- `src/pack-validator.js` — validation logic.
- `src/pack-registry.js` — in-memory registry.
- `src/pack-asset-resolver.js` — path safety enforcement.
- `src/pack-runtime-context.js` — immutable context builder.
- Updated `--list-packs` / `--inspect-pack` to use loader (optional, low-risk).
- Comprehensive test suite (see Test Strategy).

---

## Test Strategy

### Unit Tests

| Test | Input | Expected |
|---|---|---|
| Valid pack loads | `digital-pathology` pack | Registry entry created, metadata accessible |
| Missing pack fails | Non-existent pack ID | Exit 1, "Pack not found" |
| Invalid manifest fails | Malformed `pack.json` | Exit 1, "Invalid manifest" |
| Missing declared story fails | Pack with absent story file | Exit 1, "Story not found" |
| Unsafe path fails | Pack with `..` in asset path | Exit 1, "Unsafe asset path" |
| Duplicate story id fails | Two packs with same story ID | Exit 1, "Duplicate story id" |
| Unsupported version fails | Pack with unknown version | Exit 1, "Unsupported pack version" |
| Runtime context build fails | Internal error during load | Exit 1, "Runtime context build failed" |

### Integration Tests

| Test | Command | Expected |
|---|---|---|
| `--story` still renders | `--story digital-pathology-15` | Exit 0, PPT generated |
| `--pack-story` still renders | `--pack-story digital-pathology/digital-pathology-15` | Exit 0, PPT generated |
| Parity still passes | `--validate-pack-story-parity digital-pathology/digital-pathology-15` | Exit 0, Parity: passed |
| Legacy still passes | `--pack-story ... --legacy-renderer` | Exit 0, PPT generated |
| No forbidden changes | Check adapters, planners, engines | No modifications |

### Regression Tests

| Test | Description |
|---|---|
| Output path unchanged | `--story` → `output/ppt-factory/`, `--pack-story` → `output/ppt-factory/packs/` |
| Help text unchanged | `--help` lists same commands |
| List packs unchanged | `--list-packs` shows same output |
| Inspect pack unchanged | `--inspect-pack` shows same output |
| Validate pack unchanged | `--validate-pack` shows same output |

---

## Open Questions

1. **Should pack loader become the single source for `--list-packs`, `--inspect-pack`, `--pack-story`?**
   - *Current state:* Each command implements its own discovery.
   - *Recommendation:* Migrate in M6.1 if low risk. Otherwise defer to M6.2.

2. **Should `--pack-story` depend on loader in M6.1 or later?**
   - *Current state:* `--pack-story` uses `pack-story-resolver.js` directly.
   - *Recommendation:* Keep existing resolver in M6.1. Migrate to loader in M6.2+.

3. **When should source-of-truth migration be considered?**
   - *Recommendation:* After M6.1 loader skeleton is stable and parity validation passes consistently. Requires separate RFC.

4. **How will pack-owned planners/adapters be introduced safely?**
   - *Recommendation:* Defer to M7+. Introduce via new RFC with full risk assessment.

5. **What is the minimum SDK surface for packs?**
   - *Recommendation:* CLI-only interface for M6. SDK API (RFC-0002) deferred.

6. **How to support multiple packs with overlapping story IDs?**
   - *Recommendation:* Reject duplicate story IDs at load time (hard error). Packs must use unique story IDs or namespace them.

---

## Decision

For this RFC, the following decisions are recommended:

1. **M6.1 implements Read-only Pack Loader Skeleton** — minimal, additive, no behavioral changes.
2. **`--story` must remain registry-backed** — no automatic pack lookup.
3. **`--pack-story` remains explicit** — no change to current behavior.
4. **No planner/adapter extraction** — deferred until after loader skeleton and parity validation are stable.
5. **Source-of-truth migration requires separate RFC** — not in scope for M6.
6. **Pack Loader is read-only and local-only** — no remote loading, no code execution.
7. **Existing M5 CLI commands are preserved** — no new commands in M6.1.

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-07-03 | Hermes | Initial RFC proposal |
| 1.1 | 2026-07-03 | Hermes | M6.1 skeleton implemented: 6 new modules, no behavioral changes |
| 1.2 | 2026-07-03 | Hermes | M6.2 CLI integration: --list-packs and --inspect-pack wired to loader |
| 1.3 | 2026-07-03 | Hermes | M6.3 error model hardening: standardized error codes, details fields, CLI error mapping |
| 1.4 | 2026-07-04 | Hermes | M6.4 validation contract: documented contract spec + smoke validation script |
| 1.5 | 2026-07-04 | Hermes | M6.5 regression guard: documented manual guard process, no CI/npm scripts, no runtime changes |
| 1.6 | 2026-07-04 | Hermes | M6.6 checkpoint: M6 closed, capabilities frozen, M7 entry criteria defined, no runtime changes |

---

## Implementation Note (M6.1)

M6.1 implements this RFC as a read-only skeleton. Six new modules added to `src/`:

- `pack-loader.js` — Central orchestrator (discover → read → validate → resolve → build → register)
- `pack-manifest-reader.js` — Read and parse pack.json
- `pack-asset-resolver.js` — Resolve declared asset paths with safety checks
- `pack-runtime-context.js` — Build immutable PackRuntimeContext
- `pack-registry.js` — In-memory registry for loaded pack contexts
- `pack-discovery.js` — Scan known directories for pack.json files

No rendering path changes. No `--story` behavior change. No planner/adapter extraction.
