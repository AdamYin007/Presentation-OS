# Digital Pathology Presentation Pack

> **Status**: Experimental skeleton
> **Version**: 0.1.0
> **Created**: 2026-07-01
> **RFC**: RFC-0001, RFC-0003
> **Guide**: [USAGE.md](USAGE.md) — how to inspect, validate, and understand this pack
> **Changelog**: [CHANGELOG.md](CHANGELOG.md) — version history and maintenance policy
> **Checkpoint**: [M5 PACK RUNTIME INTEGRATION CHECKPOINT](../../docs/M5_PACK_RUNTIME_INTEGRATION_CHECKPOINT.md) — M5 formal checkpoint

---

## Status

**M5 runtime integration checkpoint completed.** M6.1 added read-only Pack Loader Skeleton per RFC-0007. M6.2 wired loader into `--list-packs` and `--inspect-pack` CLI commands.

This is the first Presentation Pack for the Digital Pathology domain. M5 formalized the pack runtime integration through explicit, opt-in CLI paths. M6.1 added internal pack loading infrastructure. M6.2 made the loader the internal backend for pack inspection commands.

**See**: [M5 Pack Runtime Integration Checkpoint](../../docs/M5_PACK_RUNTIME_INTEGRATION_CHECKPOINT.md) for the full M5 summary, CLI matrix, output path policy, and boundaries.
**See**: [RFC-0007: Pack Loader Design](../../docs/RFC-0007_PACK_LOADER_DESIGN.md) for the M6 pack loader architecture.

**M6**: M6.0 designed Pack Loader architecture. M6.1 implemented read-only skeleton. M6.2 wired loader into CLI. M6.3 hardened error model with standardized codes, details fields, and CLI error mapping. M6.4 formalized Pack Loader validation contract with smoke test script. M6.5 documented Pack Loader contract regression guard (manual, no CI/npm script added). M6.6 completed M6 Pack Loader checkpoint — current capabilities and boundaries frozen. M7.0 selected Pack Runtime Boundary Deepening as the next mainline. The current pack remains explicit opt-in. No automatic source-of-truth migration.

---

## Purpose

This pack is the designated home for digital pathology domain knowledge:

- Story templates
- Hero sequence metadata
- Content planners and adapters
- Themes and terminology
- Reference documentation

Following **RFC-0001**, domain knowledge belongs in Presentation Packs, not in the Core.
Following **RFC-0003**, this pack provides the standard structure for future asset migration.

---

## Current Contents

| Directory | Status | Contents |
|---|---|---|
| `stories/` | ✅ Populated | `digital-pathology-15.json` (copy from `story/`) |
| `hero-sequences/` | ✅ Populated | `digital-pathology-15-hero-sequence.json` (copy from `story/`) |
| `content/` | Placeholder | `.gitkeep` only |
| `planners/` | Placeholder | `.gitkeep` only |
| `adapters/` | Placeholder | `.gitkeep` only |
| `themes/` | Placeholder | `.gitkeep` only |
| `terminology/` | ✅ Populated | `digital-pathology-story-v1.md` (copy from `presentation-dna/grammar/`) |
| `references/` | ✅ Populated | `medical-ai-layouts-v1.md`, `medical-ai-layouts-v2.md` (copies from `presentation-dna/layouts/`) |
| `examples/` | Placeholder | `.gitkeep` only |

**Note:** These are pack-owned copies. The runtime still uses original files under `registry/packages/ppt-factory/story/`. This PR does not change rendering behavior. Future pack loader may read these assets directly.

For a complete asset inventory with migration status, see [ASSET_INDEX.md](ASSET_INDEX.md).

The hero-sequence file is a **companion metadata file** for the Hero Engine — it is not a standalone renderable story.

---

## What Belongs Here

Digital pathology domain knowledge that should eventually live in this pack:

- **Stories**: `digital-pathology-15.json` and variants
- **Hero sequences**: `digital-pathology-15-hero-sequence.json`
- **Planners**: All 14 domain-specific planners (architecture, collaboration, etc.)
- **Adapters**: All 15 domain-specific adapters
- **Themes**: `medical-consulting` theme configuration
- **Terminology**: `digital-pathology-story-v1.md` (story grammar, narrative structure)
- **References**: `medical-ai-layouts-v1.md`, `medical-ai-layouts-v2.md` (layout design patterns)
- **Examples**: Example decks and usage patterns

---

## What Does Not Belong Here

The following should remain in Core:

- `bin/run.js` — CLI entry point
- `src/renderer-engine/` — Core rendering dispatch
- `src/layout-engine/schema.js` — Core validation
- `src/layout-engine/planner.js` — Core planner registry
- `src/content-engine/` — Core content compilation
- `src/theme/index.js`, `helpers.js` — Core theme system
- `src/hero-engine.js` — Core hero enrichment bridge
- `src/layout-adapters/index.js` — Core adapter registry
- `planners/generic.js` — Domain-agnostic fallback planner
- `adapters/cover.js` — Domain-agnostic cover adapter

---

## Migration Principles

1. **Copy before move** — Always copy assets to the pack first, verify they work, then consider moving.
2. **No runtime change** — This PR does not change how `run.js` loads stories.
3. **No Core change** — No modifications to `bin/run.js`, engines, registries, or adapters.
4. **No story deletion** — Original story files remain in `story/` directory.
5. **No adapter deletion** — Original adapter files remain in `layout-adapters/`.
6. **Experimental status** — This pack is not yet production-ready.

---

## Planned Migration Sequence

| PR | Scope | Status |
|---|---|---|
| PR35 | Create pack skeleton (`pack.json`, `README.md`, directory structure) | ✅ Done |
| PR36 | Copy story assets into `stories/` and `hero-sequences/` | ✅ Done |
| PR37 | Copy terminology and reference docs into `terminology/` and `references/` | ✅ Done |
| PR38 | Evaluate pack loader proof of concept | Planned |
| PR39 | Read-only pack manifest validator | ✅ Done |
| PR40 | Digital pathology pack asset index | ✅ Done |
| PR41 | Pack usage documentation | ✅ Done |
| PR42 | Pack changelog and maintenance policy | ✅ Done |
| PR43 | Read-only pack discovery | ✅ Done |
| PR44 | CLI unknown argument guard | ✅ Done |
| PR45 | Read-only pack inspection | ✅ Done |
| PR52 | Explicit pack story rendering prototype | ✅ Done |
| PR53 | Pack story rendering parity validation | ✅ Done |
| PR54 | Pack story rendering hardening | ✅ Done |
| PR55 | Pack runtime integration checkpoint | ✅ Done |
| PR60 | Pack Loader validation contract | ✅ Done |
| PR61 | Pack Loader contract regression guard (M6.5) | ✅ Done |
| PR62 | M6 Pack Loader Checkpoint (M6.6) | ✅ Done |
| PR63 | M7 Post-M6 Direction Decision RFC | ✅ Done |
| PR64 | M7.1 Pack Runtime Boundary Design | ✅ Done |
| PR65 | M7.2 Pack Runtime Context Inspection Hardening | ✅ Done |
| PR66 | M7.3 Pack Story Resolver / Loader Boundary Alignment Design | ✅ Done |
| PR67 | M7.4 Pack Runtime Boundary Smoke Checks | ✅ Done |
| PR68 | M7.5 Pack Runtime Boundary Checkpoint | ✅ Done |
| — | M8 Pack Runtime RFC / Post-M7 Decision | Proposed |

---

## RFC Alignment

This pack follows:

- **RFC-0001** (Platform Specification) — Domain knowledge in Packs, not Core
- **RFC-0003** (Pack Specification) — Pack structure, manifest, lifecycle

---

## Known Limitations

1. **Not fully runtime-connected** — Assets outside of `--pack-story` rendering are not loaded by `run.js`. Runtime still uses originals in `story/` for `--story`.
2. **Pack loader skeleton exists but not auto-discovered** — M6.1–M6.2 added read-only Pack Loader and CLI wiring. Core does not yet auto-discover `presentation-packs/`. Packs remain explicit opt-in via `--pack-story` or `--inspect-pack`.
3. **Validation available** — Use `--validate-pack` to validate pack manifests and asset paths.
4. **Pack inspection available** — Use `--inspect-pack <id>` to view pack metadata, assets, runtime and governance flags.
5. **CLI help available** — Use `--help` to list all supported commands.
6. **Pack story rendering available** — `--pack-story <pack>/<id>` resolves, loads, and renders pack stories. Does not make packs the default source of truth.
7. **Pack story parity validation available** — `--validate-pack-story-parity <pack>/<id>` compares registry and pack slide plans.
8. **Output path isolation** — `--pack-story` outputs under `output/ppt-factory/packs/<pack-id>/` to avoid collision with `--story` outputs.
9. **No global prototype state** — Pack story resolution uses local variables instead of `global._PACK_STORY_*`.
10. **M5 frozen** — M5.7 checkpoint freezes current pack runtime behavior. Future changes (source-of-truth, pack loader) are M6 work.
10a. **M6.5 regression guard manual only** — Pack Loader contract smoke script is documented as a required manual check. No `package.json` script or CI integration added.
11. **No SDK integration** — RFC-0002 SDK is not implemented.
12. **No marketplace** — RFC-0004 Marketplace is not implemented.
13. **Experimental** — This pack is a starting point, not a production artifact.

---

### Additional Notes

11. **Hero-sequence format** — `digital-pathology-15-hero-sequence.json` uses `slide_type`/`slide_no` instead of `type`/`no`. It is a companion metadata file, not a standalone story. See [HERO_SEQUENCE_FORMAT_AUDIT.md](../docs/HERO_SEQUENCE_FORMAT_AUDIT.md).
12. **PPTX binary comparison not performed** — Parity validation compares slide plans (titles, text, structure), not PPTX binary identity. Zip ordering, timestamps, and internal IDs may differ between renders.

---

## M7.0 Planning Status

M7.0 (RFC-0008) selected **Pack Runtime Boundary Deepening** as the next mainline direction.

- **M7.0 selected Pack Runtime Boundary Deepening as the next mainline.**
- **Pack remains explicit opt-in.** No automatic source-of-truth migration.
- **`--story` remains registry-backed.** Default story source unchanged.
- **`--pack-story` remains explicit pack story rendering.** No behavioral change.
- **No planner/adapter extraction selected.** These remain core components.
- **No new public CLI commands.** No `package.json` changes.
- **M7.2 Pack Runtime Context Inspection Hardening** — implemented normalized read-only context sections.
- Pack Runtime Context inspection hardened with normalized sections (governance, runtime, boundaries, sourceOfTruth, outputPolicy).
- Existing successful outputs remain compatible.
- Pack remains explicit opt-in.
- --story remains registry-backed.
- --pack-story remains explicit pack story rendering.
- No planner/adapter/theme extraction.
- **M7.3 Pack Story Resolver / Loader Boundary Alignment Design** — design document only.
- Pack Story Resolver / Loader boundary alignment design documented.
- Existing successful outputs remain compatible.
- Pack remains explicit opt-in.
- --story remains registry-backed.
- --pack-story remains explicit pack story rendering.
- No planner/adapter/theme extraction.
- **M7.4 Pack Runtime Boundary Smoke Checks** — added repeatable manual smoke script.
- Pack Runtime Boundary Smoke Checks added via `scripts/pack-runtime-boundary-smoke.js`.
- Frozen boundary assumptions now have repeatable manual smoke coverage.
- 60/60 checks pass.
- Pack remains explicit opt-in.
- --story remains registry-backed.
- --pack-story remains explicit pack story rendering.
- Successful outputs remain compatible.
- No CLI behavior change.
- No rendering behavior change.
- No source-of-truth change.
- **M7.5 Pack Runtime Boundary Checkpoint** — M7 Pack Runtime Boundary Deepening complete.
- M7 Pack Runtime Boundary checkpoint completed.
- Frozen boundary state is now stable and documented.
- Pack remains explicit opt-in.
- --story remains registry-backed.
- --pack-story remains explicit pack story rendering.
- Manual boundary smoke (60/60) and contract smoke (31/31) guard current behavior.
- Next phase: M8 — Pack Runtime RFC / Post-M7 Platform Direction Decision.
- **M8.0 Post-M7 Platform Direction RFC** — RFC-0009 selects Pack Runtime Contract Hardening.
- M8.0 selects Option A — Pack Runtime Contract Hardening.
- Pack remains explicit opt-in.
- All existing commands remain unchanged.
- Next task: M8.1 Pack Runtime Contract Hardening Design.
- **M8.1 Pack Runtime Contract Hardening Design** — PR70 documents hardened contracts.
- No command behavior changed.
- Pack remains explicit opt-in.
- Boundary smoke / contract smoke / parity remain review guards.
- Next task: M8.2 PackRuntimeContext Contract Schema Documentation.
- **M8.2 PackRuntimeContext Contract Schema Documentation** — PR71 documents conceptual schema.
- PackRuntimeContext schema fully documented (8 sections, 11 required values).
- No executable schema validation. No JSON schema files. No runtime shape change.
- Pack remains explicit opt-in.
- Boundary smoke / contract smoke / parity remain review guards.
- Next task: M8.3 Multi-Pack Discovery Assumptions Design.
