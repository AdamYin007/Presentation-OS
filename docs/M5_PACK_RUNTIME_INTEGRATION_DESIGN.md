# M5 Pack Runtime Integration Design Note

> **Date**: 2026-07-02
> **Author**: Agnes-2.0-Flash (MD Senior Implementation Engineer)
> **Context**: PR48 — design note before any M5 code implementation
> **Governance**: RFC-0001, RFC-0003 — design documentation only, no code changes
> **Preceded by**: M4.6 Pack System Checkpoint (`m4-6-pack-system-checkpoint`)

---

## 1. Purpose

This document defines the design for **M5 Pack Runtime Integration**. It establishes boundaries, entry points, source-of-truth policy, compatibility guarantees, and rollback strategy before any implementation begins.

Key principles:
- M5 does **not** start with planner extraction.
- M5 must **preserve** existing `--story` rendering behavior.
- Pack runtime integration must be **explicit** and **opt-in**.
- All existing CLI commands remain unchanged unless explicitly extended.
- Legacy renderer rollback remains available and unaffected.

This is a design note only. No code is implemented in this PR.

---

## 2. Current Baseline

As of `m4-6-pack-system-checkpoint`, the project has completed:

| Milestone | Tag | State |
|-----------|-----|-------|
| M3 Adapter-first Rendering | `m3-adapter-migration-complete` | Adapter-first is default; legacy rollback available |
| M4 Pack Foundation | `m4-digital-pathology-pack-v0` | Digital Pathology Pack skeleton with copy-owned assets |
| M4.1 Pack Usability | `m4-1-pack-usability-hardening` | Changelog and maintenance policy |
| M4.2 Pack Discovery | `m4-2-read-only-pack-discovery` | `--list-packs` discovers all packs |
| M4.3 Unknown Argument Guard | `m4-3-cli-unknown-argument-guard` | Unknown flags fail fast, exit 1 |
| M4.4 Pack Inspection | `m4-4-read-only-pack-inspection` | `--inspect-pack` reads pack.json metadata |
| M4.5 CLI Help | `m4-5-cli-help` | `--help` lists all supported commands |
| M4.6 Checkpoint | `m4-6-pack-system-checkpoint` | Full read-only pack system documented |

### Current Runtime State

- `--story <id>` reads from `registry/packages/ppt-factory/story/*.json`
- Adapter-first layout engine is default
- `--legacy-renderer` flag provides rollback path
- Pack commands (`--validate-pack`, `--list-packs`, `--inspect-pack`) are read-only
- Pack assets are copy-owned, not runtime source of truth
- No pack loader exists
- No pack story resolution exists

---

## 3. Design Goals

1. **Explicit pack-based story resolution** — Users must opt in to pack rendering via a dedicated command.
2. **Preserve existing `--story` behavior** — `--story <id>` continues to read from registry story files. No ambiguity.
3. **Avoid default source-of-truth change** — Registry story files remain default source of truth during M5.
4. **Keep pack integration opt-in** — Packs are not loaded automatically. No silent behavior changes.
5. **Preserve legacy rollback** — `--legacy-renderer` flag works independently of pack system.
6. **Defer planner extraction** — Planners remain in Core until pack story rendering is stable.
7. **Clear and reversible failure modes** — If pack rendering fails, users can fall back to `--story`.

---

## 4. Non-Goals

The following are explicitly **out of scope** for M5:

- Making packs the default source of truth
- Removing registry story files
- Migrating planners into packs
- Migrating adapters into packs
- Changing adapter-first rendering behavior
- Removing legacy renderer
- Implementing marketplace behavior
- Implementing SDK APIs
- Changing `--story` resolution logic
- Changing `--validate-pack` behavior
- Changing `--list-packs` behavior
- Changing `--inspect-pack` behavior
- Adding pack-to-runtime loading without explicit user command

---

## 5. Proposed Runtime Entry Point

### Recommended: Explicit `--pack-story` Command

```bash
node registry/packages/ppt-factory/bin/run.js --pack-story digital-pathology/digital-pathology-15
```

**Behavior:**
- Separate from `--story`. Does not interfere with registry story resolution.
- Resolves story from `presentation-packs/<pack-id>/stories/<story-id>.json`.
- Requires explicit pack ID and story ID in `<pack-id>/<story-id>` format.
- Preserves adapter-first rendering as default.
- `--legacy-renderer` flag can be combined: `--pack-story digital-pathology/digital-pathology-15 --legacy-renderer`.
- Does not update or overwrite registry story files.
- Does not change default rendering behavior.

### Rejected Alternative A: Automatic Pack Lookup for `--story`

```bash
# REJECTED: --story digital-pathology-15 automatically searches packs
```

**Rejection reasons:**
- Ambiguous source of truth — user cannot tell if `--story` reads registry or pack.
- Risky default behavior change — existing scripts and workflows may break.
- Harder rollback — no clear separation between registry and pack rendering.
- Violates design goal #2 (preserve `--story` behavior).

### Rejected Alternative B: Replace Registry with Pack Stories

```bash
# REJECTED: Replace registry story files with pack stories
```

**Rejection reasons:**
- Too large a migration — conflates asset packaging with runtime source migration.
- Breaks compatibility — existing `--story` usage assumes registry source.
- No gradual rollout path — all-or-nothing approach is risky.

---

## 6. Pack Story Resolution Model

### Input Format

```
--pack-story <pack-id>/<story-id>
```

- `pack-id`: directory name under `presentation-packs/`
- `story-id`: filename stem under `<pack-id>/stories/`

### Resolution Steps

1. **Locate pack** — Scan `presentation-packs/` for directory matching `pack-id`.
2. **Validate pack manifest** — Use existing `--validate-pack` logic to verify `pack.json`.
3. **Confirm validation passes** — If validation fails, abort with error.
4. **Resolve story path** — Look up `story-id` in `pack.json.contents.stories` array.
5. **Match story to declared asset** — If `story-id` not in declared stories, abort.
6. **Load story JSON** — Read `<pack-path>/stories/<story-id>.json` from disk.
7. **Validate story JSON** — If file missing or invalid JSON, abort with clear error.
8. **Pass to rendering pipeline** — Feed resolved story into existing renderer.
9. **Preserve adapter-first default** — Same layout engine behavior as `--story`.
10. **Preserve `--legacy-renderer`** — If flag present, use legacy renderer.

### Error Cases

| Error | Cause | Message |
|-------|-------|---------|
| Missing pack ID | `--pack-story` without value | "Missing value for --pack-story" |
| Missing story ID | `--pack-story digital-pathology/` | "Missing story ID in --pack-story" |
| Pack not found | No directory matching pack ID | "Presentation Pack not found: <id>" |
| Pack validation failed | Invalid pack.json | "Pack validation failed: <errors>" |
| Story not declared | Story ID not in pack.json.contents.stories | "Story not declared in pack manifest: <id>" |
| Story file missing | File not on disk | "Story file not found: <path>" |
| Story JSON invalid | Malformed JSON | "Invalid story JSON: <error>" |
| Multiple matches | Ambiguous resolution | "Multiple story matches for: <id>" |

---

## 7. Source-of-Truth Policy

During M5:

| Aspect | Policy |
|--------|--------|
| Default `--story` source | Registry story files (`registry/packages/ppt-factory/story/`) |
| Explicit pack source | Pack story files (`presentation-packs/<pack>/stories/`) |
| Relationship | Pack copies are copy-owned; divergence is intentional and documented |
| Write-back | Pack story rendering must **never** update or overwrite registry files |
| Sync responsibility | External to runtime; documented in pack maintenance policy |
| Authority | Registry story files remain authoritative until M6+ migration |

**Principle:** Pack stories are an **explicit opt-in source**, not a replacement. Users who want pack rendering must use `--pack-story`. Users who want registry rendering use `--story`. There is no ambiguity.

---

## 8. Compatibility Strategy

### Existing Commands — Unchanged

| Command | Behavior |
|---------|----------|
| `--story <id>` | Reads from registry story files. No change. |
| `--legacy-renderer` | Falls back to legacy renderer. No change. |
| `--validate-pack <path>` | Validates pack manifest. No change. |
| `--list-packs` | Discovers packs. No change. |
| `--inspect-pack <id>` | Inspects pack metadata. No change. |
| `--help` | Updated only when `--pack-story` is implemented. |
| `--layout-engine` | Compatibility flag. No change. |
| Unknown flags | Fail fast with exit 1. No change. |

### Output Paths

- Initial M5 implementation: output paths remain in `output/ppt-factory/`
- Later consideration: pack-specific output paths (e.g., `output/packs/<pack-id>/`)
- No change to existing `--story` output location.

---

## 9. Rollback Strategy

| Scenario | Recovery Path |
|----------|---------------|
| Pack story rendering fails | Use `--story <id>` as fallback. Registry rendering unaffected. |
| Pack story rendering produces incorrect output | Use `--story <id> --legacy-renderer` for comparison. |
| Pack validation fails | `--pack-story` aborts before rendering. No side effects. |
| Registry story files corrupted | Registry files are never modified by pack rendering. |
| Pack loader needs removal | `--pack-story` command can be removed without affecting `--story`. |
| Adapter-first rendering breaks | `--legacy-renderer` remains available independently. |

**Guarantee:** No registry story files should be deleted during M5. No adapter/planner migration is required for rollback. The pack runtime path must be removable without breaking default rendering.

---

## 10. Validation Strategy

### Future Validation Commands (Post-Implementation)

```bash
# Explicit pack story rendering
node registry/packages/ppt-factory/bin/run.js --pack-story digital-pathology/digital-pathology-15

# Pack story with legacy renderer
node registry/packages/ppt-factory/bin/run.js --pack-story digital-pathology/digital-pathology-15 --legacy-renderer

# Default story rendering (unchanged)
node registry/packages/ppt-factory/bin/run.js --story digital-pathology-15

# Pack validation (unchanged)
node registry/packages/ppt-factory/bin/run.js --validate-pack presentation-packs/digital-pathology

# Pack inspection (unchanged)
node registry/packages/ppt-factory/bin/run.js --inspect-pack digital-pathology
```

### Expected Results

| Command | Expected Exit | Notes |
|---------|---------------|-------|
| `--pack-story digital-pathology/digital-pathology-15` | 0 | Generates PPTX from pack story |
| `--pack-story digital-pathology/digital-pathology-15 --legacy-renderer` | 0 | Generates PPTX via legacy renderer |
| `--story digital-pathology-15` | 0 | Generates PPTX from registry story (unchanged) |
| `--validate-pack presentation-packs/digital-pathology` | 0 | Pack validation passed (unchanged) |
| `--inspect-pack digital-pathology` | 0 | Pack inspection output (unchanged) |
| `--pack-story missing-pack/story` | 1 | "Presentation Pack not found: missing-pack" |
| `--pack-story digital-pathology/missing-story` | 1 | "Story not declared in pack manifest" |

---

## 11. Implementation Phases

### M5.1 — Pack Story Resolution Design Validation

Documentation or tests-only. Validate the resolution model defined in Section 6 against actual pack structure. No rendering code.

### M5.2 — Add `--pack-story` CLI Guard and Help Entry

Recognize `--pack-story` flag. Add to `KNOWN_FLAGS` and `--help` output. May fail with "not implemented" or "design-staged" message initially.

### M5.3 — Implement Read-Only Pack Story Resolver

Resolve `<pack-id>/<story-id>` to pack story file path. Validate pack, validate story declaration, validate file existence. Do **not** render yet.

### M5.4 — Implement Explicit `--pack-story` Rendering

Feed resolved pack story JSON into existing rendering pipeline. Preserve adapter-first default. Support `--legacy-renderer` combination.

### M5.5 — Pack Story Rendering Parity Validation

Compare output of `--pack-story` vs `--story` for the same story. Verify slide plan, slide count, and content match. Document any divergence.

### M5.6 — Source-of-Truth Decision

Design decision only. Evaluate whether pack story can become preferred source based on M5.1–M5.5 results.

### Planner Extraction — Deferred Until After M5.5

Planner extraction must wait until:
- `--pack-story` rendering is stable (M5.4+)
- Parity validation passes (M5.5)
- Rollback is proven (Section 9)
- Source-of-truth policy is updated (M5.6)

---

## 12. Open Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | Should pack story ID be filename-based or manifest id-based? | Resolution model (Section 6) |
| 2 | Should output path include pack ID? | Compatibility strategy (Section 8) |
| 3 | Should pack story allow hero sequence binding? | Feature scope |
| 4 | Should pack story rendering require pack validation every time? | Performance vs safety tradeoff |
| 5 | How should warnings be handled? (e.g., pack story diverges from registry) | UX and logging |
| 6 | Should pack-specific themes be allowed later? | Future scope, not M5 |
| 7 | How will multiple packs with same story ID be handled? | Resolution disambiguation |

These questions should be addressed during M5.1–M5.3 implementation.

---

## 13. Decision

**Recommended decision:** Proceed with explicit `--pack-story` path in future M5 implementation.

- Do **not** alter `--story` behavior.
- Do **not** begin planner extraction.
- Use Pack Story Resolution as the first runtime integration step.
- Maintain registry story files as default source of truth throughout M5.
- Defer source-of-truth migration decision to M5.6.

---

## References

- [M4 Pack System Checkpoint](M4_PACK_SYSTEM_CHECKPOINT.md) — Baseline state documentation
- [RFC-0001](../docs/rfc/RFC-0001-platform.md) — Platform specification
- [RFC-0003](../docs/rfc/RFC-0003-pack.md) — Pack specification
- `m4-6-pack-system-checkpoint` — Most recent checkpoint tag
- `m4-5-cli-help` — CLI help implementation
- `m4-4-read-only-pack-inspection` — Pack inspection implementation
- `m4-2-read-only-pack-discovery` — Pack discovery implementation
- `m3-adapter-migration-complete` — Adapter-first rendering baseline
