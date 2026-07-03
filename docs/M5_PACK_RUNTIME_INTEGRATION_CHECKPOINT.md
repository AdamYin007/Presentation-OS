# M5 Pack Runtime Integration Checkpoint

**Version:** 1.0  
**Date:** 2026-07-03  
**Author:** Hermes (MD Senior Implementation Engineer)  
**Status:** Complete  

---

## Status

M5 Pack Runtime Integration is **complete**.

All seven milestones (M5.0–M5.6) have been implemented and validated.
M5.7 freezes the current behavior as a formal checkpoint.

---

## Scope

M5 integrated Presentation Packs into the AWE Presentation OS runtime through
**explicit, opt-in CLI paths only**.

No automatic loading, no default source-of-truth migration, no pack loader.
Packs remain controlled migration assets with copy ownership.

---

## Completed Milestones

### M5.0 — Pack Runtime Integration Design

- Defined the M5 integration strategy: explicit CLI paths, no default loading.
- Established source-of-truth boundary: `--story` uses registry, `--pack-story` uses pack.
- Documented pack structure, governance, and migration policy.
- Outlined the seven-milestone progression from design to hardening.

### M5.1 — Pack Story Resolution Design Validation

- Validated the `--pack-story <pack>/<id>` input contract.
- Confirmed pack discovery, manifest parsing, and asset matching design.
- Established error taxonomy: missing value, invalid format, pack not found,
  story not declared, unsafe path.
- Documented the design in `docs/M5_PACK_STORY_RESOLUTION_DESIGN_VALIDATION.md`.

### M5.2 — Pack Story CLI Contract Guard

- Added `--pack-story` to `KNOWN_FLAGS` and `takesValue` list in `run.js`.
- Implemented input validation: format check, path traversal rejection,
  absolute path rejection, `.json` suffix rejection.
- Ensured unknown flag detection blocks malformed inputs.
- Documented in `docs/M5_PACK_STORY_CLI_CONTRACT_GUARD.md`.

### M5.3 — Read-only Pack Story Resolver

- Created `src/pack-story-resolver.js` with `resolvePackStory()` and
  `printPackStoryResolution()`.
- Resolver is read-only: resolves paths and validates packs without rendering.
- Supports `--pack-story digital-pathology/digital-pathology-15` with full
  resolution output (pack, story, validation, storyPath).
- Documented in `docs/M5_PACK_STORY_RESOLVER.md`.

### M5.4 — Explicit Pack Story Rendering Prototype

- Extended `--pack-story` to resolve, load story JSON, and render via the
  existing rendering pipeline.
- Pack story rendering uses the same Hero Engine / Layout Engine / Renderer
  Engine as registry rendering.
- Output path isolated under `output/ppt-factory/packs/<pack-id>/` to avoid
  collision with `--story` outputs.
- `--pack-story` + `--legacy-renderer` works.
- Documented in `docs/M5_PACK_STORY_RENDERING_PROTOTYPE.md`.

### M5.5 — Pack Story Rendering Parity Validation

- Created `src/pack-story-parity-validator.js` for formal parity checking.
- Compares registry and pack story slide plans across four dimensions:
  slide count, slide titles, slide text content, slide plan structure.
- Does NOT compare PPTX binary identity (zip ordering, timestamps, IDs may differ).
- Temp outputs isolated under `output/ppt-factory/.parity-temp/` with
  auto-cleanup before each run.
- `--validate-pack-story-parity` + `--legacy-renderer` works.
- Documented in `docs/M5_PACK_STORY_PARITY_VALIDATION.md`.

### M5.6 — Pack Story Rendering Hardening

- Removed `global._PACK_STORY_RESOLVED` prototype state. Replaced with local
  variables (`packStoryResolved`, `packStoryResolvedPath`).
- Pack output path isolation finalized: `--pack-story` outputs to
  `output/ppt-factory/packs/<pack-id>/` by default.
- Parity validator improved: always cleans temp dir before each run, includes
  temp dir path in error messages.
- `--out` flag respected: parity validator can override pack output path.
- Documented in `docs/M5_PACK_STORY_RENDERING_HARDENING.md`.

---

## Current CLI Matrix

| Command | Source | Behavior | Output Path | Source-of-Truth |
|---|---|---|---|---|
| `--story <id>` | Registry | Loads `story/<id>.json`, renders PPTX | `output/ppt-factory/<id>.pptx` | **Default** |
| `--story <id> --legacy-renderer` | Registry | Same as above, uses legacy renderer | `output/ppt-factory/<id>.pptx` | **Default** |
| `--pack-story <pack>/<id>` | Pack | Resolves pack, loads `stories/<id>.json`, renders PPTX | `output/ppt-factory/packs/<pack>/<id>.pptx` | Explicit opt-in |
| `--pack-story <pack>/<id> --legacy-renderer` | Pack | Same as above, uses legacy renderer | `output/ppt-factory/packs/<pack>/<id>.pptx` | Explicit opt-in |
| `--validate-pack-story-parity <pack>/<id>` | Both | Renders both sides, compares slide plans | `.parity-temp/registry/` + `.parity-temp/pack/` | Validation only |
| `--validate-pack-story-parity <pack>/<id> --legacy-renderer` | Both | Same as above, legacy mode | `.parity-temp/registry/` + `.parity-temp/pack/` | Validation only |
| `--validate-pack <path>` | Read-only | Validates pack manifest and assets | N/A (stdout) | Inspection |
| `--list-packs` | Read-only | Lists available packs | N/A (stdout) | Inspection |
| `--inspect-pack <id>` | Read-only | Shows pack metadata, assets, runtime, governance | N/A (stdout) | Inspection |

---

## Output Path Policy

### Registry Story (`--story`)

```
output/ppt-factory/<story-id>.pptx
output/ppt-factory/<story-id>-slide-plan.json
```

### Pack Story (`--pack-story`)

```
output/ppt-factory/packs/<pack-id>/<story-id>.pptx
output/ppt-factory/packs/<pack-id>/<story-id>-slide-plan.json
```

### Parity Validation (internal)

```
output/ppt-factory/.parity-temp/registry/<story-id>.pptx
output/ppt-factory/.parity-temp/registry/<story-id>-slide-plan.json
output/ppt-factory/.parity-temp/pack/<story-id>.pptx
output/ppt-factory/.parity-temp/pack/<story-id>-slide-plan.json
```

Temp directory is cleaned before each parity validation run.

### Custom Output (`--out`)

```
--out <custom-path>
```

Overrides default output path. Used internally by parity validation.

---

## Source-of-Truth Boundary

- **`--story`** continues to use **registry story source** (`registry/packages/ppt-factory/story/`).
- **`--pack-story`** explicitly uses **Presentation Pack story source**.
- Presentation Packs are **NOT** the default source of truth.
- No automatic pack lookup from `--story`.
- No pack loader exists.
- Pack copies are still **controlled migration assets**.
- Source-of-truth migration decision is deferred to M6.

---

## Runtime Boundary

- Existing **Hero Engine** / **Layout Engine** / **Renderer Engine** are still used.
- Existing **adapters** are still used (16 adapters, unchanged).
- Existing **planners** are still used (layout engine plans, unchanged).
- Presentation Packs do **NOT** own planners or adapters.
- No planner extraction has happened.
- No adapter extraction has happened.
- No story JSON mutation occurs during pack rendering.
- No visual design changes between registry and pack rendering.

---

## Validation Baseline

All commands below are expected to pass (exit 0):

```bash
# Registry story
node registry/packages/ppt-factory/bin/run.js --story digital-pathology-15
node registry/packages/ppt-factory/bin/run.js --story digital-pathology-15 --legacy-renderer

# Pack story
node registry/packages/ppt-factory/bin/run.js --pack-story digital-pathology/digital-pathology-15
node registry/packages/ppt-factory/bin/run.js --pack-story digital-pathology/digital-pathology-15 --legacy-renderer

# Parity validation
node registry/packages/ppt-factory/bin/run.js --validate-pack-story-parity digital-pathology/digital-pathology-15
node registry/packages/ppt-factory/bin/run.js --validate-pack-story-parity digital-pathology/digital-pathology-15 --legacy-renderer

# Pack inspection
node registry/packages/ppt-factory/bin/run.js --validate-pack presentation-packs/digital-pathology
node registry/packages/ppt-factory/bin/run.js --list-packs
node registry/packages/ppt-factory/bin/run.js --inspect-pack digital-pathology

# Help
node registry/packages/ppt-factory/bin/run.js --help
```

---

## Known Non-goals

The following are **explicitly out of scope** for M5:

- No default pack runtime loading.
- No `--story` pack auto-resolution.
- No pack loader implementation.
- No marketplace runtime behavior.
- No SDK API.
- No planner extraction.
- No adapter extraction.
- No story JSON mutation.
- No visual design changes.
- No pack ownership of runtime components.
- No automatic pack discovery from story IDs.

---

## Remaining Technical Debt

- `run.js` CLI flow is functional but not a dedicated command router.
  Pack story, parity validation, and registry story branches coexist in
  a single file.
- Pack story mapping currently assumes simple story ID derivation
  (`<pack>/<story-id>` → `<story-id>`). Generic mapping is deferred.
- Parity validation compares slide plans (text/structure), not PPTX binary
  or pixel-level visual output.
- Pack-owned planners/adapters are deferred until source-of-truth decision.
- Source-of-truth migration remains unresolved until M6 decision.

---

## M6 Entry Criteria

M6 should **not** begin until:

1. M5.7 checkpoint is merged and tagged.
2. Current CLI matrix passes (all commands in Validation Baseline).
3. Source-of-truth strategy is decided by RFC or checkpoint update.
4. Pack loader design is written before implementation.
5. Planner/adapters extraction remains explicitly blocked until
   pack story rendering is stable.

---

## Recommended M6 Track

M6 should begin with design, not implementation:

**M6.0 — Pack Loader Design RFC**

A formal RFC defining:
- Pack loader architecture
- Runtime integration points
- Source-of-truth migration strategy
- Backward compatibility guarantees

No code changes until the RFC is reviewed and approved.

---

## Post-Checkpoint Note

**M6.0 began with Pack Loader Design RFC (RFC-0007).** M6.1 implemented the read-only skeleton.

M5 behavior remains the baseline and rollback reference for all future pack runtime work.

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-07-03 | Hermes | Initial checkpoint |
