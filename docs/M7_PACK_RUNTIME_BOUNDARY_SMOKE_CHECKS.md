# M7.4 Pack Runtime Boundary Smoke Checks

> **Version**: 1.0.0  
> **Date**: 2026-07-05  
> **Status**: Implementation — Manual Smoke Script  
> **Related**: M7.1 Pack Runtime Boundary Design, M7.2 Pack Runtime Context Inspection Hardening, M7.3 Pack Story Resolver / Loader Alignment Design, PR67  
> **Category**: Testing — Manual Regression Guard  
> **Target Phase**: M7.4 (smoke script + documentation)

---

## Purpose

Create a repeatable, manual smoke-check script that validates the frozen Pack Runtime Boundary assumptions established in M7.0–M7.3.

This smoke serves as a **manual regression guard** to catch unintended behavioral drift before future M7 milestones implement within the boundary.

## Scope

This document covers:

- The smoke script `scripts/pack-runtime-boundary-smoke.js`
- What the smoke checks (boundary assumptions, CLI compatibility, rendering isolation)
- What the smoke intentionally does NOT check
- How to run the smoke
- Relationship to M7.1, M7.2, M7.3
- Future M7.5 checkpoint note

## Non-goals

The following are **explicitly excluded**:

- **This smoke does NOT replace unit tests.** Unit tests cover individual module behavior; this smoke covers end-to-end boundary integrity.
- **This smoke does NOT implement CI.** It is a manual script invoked via `node scripts/pack-runtime-boundary-smoke.js`. No `package.json` scripts, no CI config changes.
- **This smoke does NOT make packs default.** It verifies packs remain opt-in.
- **This smoke does NOT change CLI behavior.** It only observes existing CLI output.
- **This smoke does NOT change rendering behavior.** It only observes existing rendering output.
- **This smoke does NOT implement resolver/loader consolidation.** M7.3 explicitly deferred that to a future RFC.
- **This smoke is a manual regression guard only.** It is not automated in CI.

## What the Smoke Script Checks

The smoke script (`scripts/pack-runtime-boundary-smoke.js`) validates six categories of assumptions:

### A. Pack Loader/Context Boundary

Uses existing `pack-loader` module directly. Checks:

- `loadPack("digital-pathology")` returns `{ ok: true, context: ... }`
- Context exists and is deep-frozen (`Object.isFrozen(ctx) === true`)
- All normalized sections exist: `governance`, `runtime`, `boundaries`, `sourceOfTruth`, `outputPolicy`, `validation`
- Required boundary values are correct:
  - `boundaries.storyRegistryDefault === true`
  - `boundaries.packStoryExplicit === true`
  - `boundaries.automaticPackLookup === false`
  - `boundaries.plannerExtraction === false`
  - `boundaries.adapterExtraction === false`
  - `boundaries.themeExtraction === false`
  - `boundaries.sourceOfTruthMigration === false`
  - `sourceOfTruth.packsAreDefault === false`
  - `runtime.loadedByDefault === false`
  - `runtime.requiresPackLoader === true`
  - `governance.coreChangesAllowed === false`

### B. CLI Output Compatibility

Uses `child_process.spawnSync` to run CLI commands and assert output format.

**`--list-packs`:**
- Exit code 0
- Includes "Available Presentation Packs:"
- Includes "- digital-pathology"
- Includes "validation: passed"
- Does NOT include "boundaries:", "sourceOfTruth:", "outputPolicy:" (internal sections must not leak)

**`--inspect-pack digital-pathology`:**
- Exit code 0
- Includes "Presentation Pack: digital-pathology"
- Includes "validation: passed"
- Includes "runtime:" and "governance:"
- Does NOT include "boundaries:", "sourceOfTruth:", "outputPolicy:"

### C. `--story` Boundary

**`--story digital-pathology-15`:**
- Exit code 0
- Includes "PPT generated" (registry story renders)
- Does NOT include "Pack Story Resolution:" (not using pack resolver)
- Does NOT include "Loaded pack story from:" (not loading pack story JSON)
- Does NOT include "presentation-packs/digital-pathology/stories" (not accessing pack paths)

This confirms `--story` remains purely registry-backed and has not started using pack story resolution.

### D. `--pack-story` Boundary

**`--pack-story digital-pathology/digital-pathology-15`:**
- Exit code 0
- Includes "Pack Story Resolution:" (resolver active)
- Includes "pack: digital-pathology" and "story: digital-pathology-15"
- Includes "Loaded pack story from:" (loading pack story JSON)
- Includes "presentation-packs/digital-pathology/stories/digital-pathology-15.json" (correct pack path)
- Includes "output/ppt-factory/packs/digital-pathology/digital-pathology-15.pptx" (output isolated under packs/)

This confirms pack story remains explicit opt-in with isolated output path.

### E. Parity Validation

**`--validate-pack-story-parity digital-pathology/digital-pathology-15`:**
- Exit code 0
- Includes "Parity: passed"
- Includes "Registry and pack story rendering produce identical slide plans."

This confirms registry and pack stories remain parity-equivalent.

### F. Help / Unknown Flag

**`--help`:**
- Exit code 0
- Includes "--story <id>"
- Includes "--pack-story <pack-id>/<story-id>"
- Includes "Default --story still uses registry story sources."
- Includes "does not make packs the default source of truth."

**`--unknown-flag`:**
- Exit code non-zero
- Includes "Unsupported option: --unknown-flag"

### G. Source File Boundary

- `bin/run.js` contains "--pack-story" flag
- `bin/run.js` contains "--story" flag
- `bin/run.js` contains registry story source help text

## What It Intentionally Does NOT Check

| Category | Reason |
|---|---|
| Unit test coverage | Smoke is end-to-end; unit tests cover module internals |
| Performance benchmarks | Smoke measures correctness, not speed |
| Binary PPTX identity | Smoke checks output text, not PPTX binary |
| All error codes | Smoke only checks happy-path CLI output |
| All pack combinations | Smoke uses `digital-pathology` as representative |
| Internal module behavior | Smoke only checks observable behavior (CLI output, context shape) |
| CI integration | Smoke is manual only, no CI config changes |

## CLI Commands Covered

| Command | Category | Checks |
|---|---|---|
| `--list-packs` | B | Exit code, output format, no internal fields leaked |
| `--inspect-pack <id>` | B | Exit code, output format, no internal fields leaked |
| `--story <id>` | C | Exit code, registry-only rendering, no pack path access |
| `--pack-story <pack>/<id>` | D | Exit code, explicit resolver, pack path, isolated output |
| `--validate-pack-story-parity <pack>/<id>` | E | Exit code, parity passed, identical slide plans |
| `--help` | F | Exit code, flag docs, source-of-truth notes |
| `--unknown-flag` | F | Exit code non-zero, unsupported message |

## Boundary Assumptions Covered

| Assumption | Source | Check |
|---|---|---|
| `--story` is registry-backed | M7.0 RFC | C: no pack path in --story output |
| `--pack-story` is explicit opt-in | M7.0 RFC | D: resolver active, isolated output |
| Packs are NOT default source of truth | M7.0 RFC, M7.1 design | A: `sourceOfTruth.packsAreDefault === false` |
| No automatic pack lookup | M7.1 design | A: `boundaries.automaticPackLookup === false` |
| No planner extraction | M7.1 design | A: `boundaries.plannerExtraction === false` |
| No adapter extraction | M7.1 design | A: `boundaries.adapterExtraction === false` |
| No theme extraction | M7.1 design | A: `boundaries.themeExtraction === false` |
| No source-of-truth migration | M7.0 RFC | A: `boundaries.sourceOfTruthMigration === false` |
| PackRuntimeContext is frozen | M7.2 hardening | A: `Object.isFrozen(ctx) === true` |
| Normalized sections exist | M7.2 hardening | A: governance, runtime, boundaries, sourceOfTruth, outputPolicy, validation |
| CLI output is compatible | M7.2 hardening | B: no internal fields leaked to CLI |
| Parity holds | M7.0 RFC | E: registry and pack produce identical slide plans |
| Help text includes boundary notes | M7.0 RFC | F: source-of-truth notes present |

## Output Compatibility Policy

The smoke script enforces that **internal context sections do not leak into CLI output**:

- `--list-packs` must NOT include "boundaries:", "sourceOfTruth:", "outputPolicy:"
- `--inspect-pack` must NOT include "boundaries:", "sourceOfTruth:", "outputPolicy:"

These internal sections exist on the `PackRuntimeContext` object (M7.2 hardening) but are deliberately not formatted in CLI output. The smoke ensures this policy holds.

## Source-of-Truth Policy

The smoke verifies:

1. **`--story` remains registry-backed.** `--story` output does not reference pack paths or pack story resolution.
2. **Packs are NOT default.** `--help` includes "does not make packs the default source of truth."
3. **`sourceOfTruth.packsAreDefault === false`.** Context boundary check confirms this.
4. **No migration in progress.** `boundaries.sourceOfTruthMigration === false`.

## Pack Story Explicitness Policy

The smoke verifies:

1. **`--pack-story` is explicit.** Requires full `<pack-id>/<story-id>` argument.
2. **Resolver is active.** Output includes "Pack Story Resolution:" and "Loaded pack story from:".
3. **Output is isolated.** PPTX written under `output/ppt-factory/packs/<pack-id>/`.

## Runtime Isolation Policy

The smoke verifies:

1. **Loader is read-only.** Context is frozen; no mutations observed.
2. **Resolver is separate from loader.** `--pack-story` uses its own path; does not call `loadPack()`.
3. **Rendering is core-owned.** Both `--story` and `--pack-story` use the same rendering pipeline.
4. **No cross-contamination.** `--story` does not use pack paths; `--pack-story` does not use registry.

## Failure Interpretation

| Symptom | Likely Cause | Action |
|---|---|---|
| Context not frozen | Accidental mutation in `pack-runtime-context.js` | Restore deep-freeze, check M7.2 changes |
| `boundaries.automaticPackLookup === true` | Hardcoded constant changed | Restore to `false` |
| `--list-packs` includes "boundaries:" | Inspection printing internal fields | Remove internal fields from CLI formatter |
| `--story` includes "Pack Story Resolution:" | `--story` started using pack resolver | Check `bin/run.js` for accidental changes |
| `--pack-story` output path not isolated | Output path policy violated | Check pack story resolver output path |
| Parity failed | Registry and pack stories diverged | Compare story JSON files |

## When to Run

Run this smoke:

1. **Before any merge to `src/` or `bin/`** that touches pack/loader/inspector code.
2. **After M7 milestone changes** to verify boundary assumptions still hold.
3. **Before M7.5 checkpoint** to confirm all M7.0–M7.4 boundaries are intact.
4. **When investigating unexpected CLI output changes.**

This smoke is **manual only** — no CI integration. Run before merges and before M7.5.

## Relationship to M7.1 / M7.2 / M7.3

| Milestone | Contribution to Smoke |
|---|---|
| **M7.1** (PR64) | Defined boundary principles, responsibility tables, and frozen assumptions that this smoke validates. |
| **M7.2** (PR65) | Added normalized read-only context sections (governance, runtime, boundaries, sourceOfTruth, outputPolicy, validation). Smoke checks all six sections exist and have correct values. |
| **M7.3** (PR66) | Documented resolver/loader boundary mismatch and proposed future alignment. Smoke verifies the current separation still holds (resolver does not consume context, loader does not render). |

## Future M7.5 Checkpoint Note

M7.5 (PR68) will be a **documentation-only checkpoint** that:

- Reviews smoke results from M7.4.
- Freezes M7 boundary definitions formally.
- Documents what is and is not allowed in future M7 milestones.
- May add additional smoke checks if M7.4 revealed gaps.

M7.5 does **not** implement:
- Source-of-truth migration.
- Planner/adapter/theme extraction.
- Automatic pack lookup.
- Resolver/loader consolidation.

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-07-05 | Hermes | Initial Pack Runtime Boundary Smoke Checks (M7.4) |
