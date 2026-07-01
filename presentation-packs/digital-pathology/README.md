# Digital Pathology Presentation Pack

> **Status**: Experimental skeleton
> **Version**: 0.1.0
> **Created**: 2026-07-01
> **RFC**: RFC-0001, RFC-0003
> **Guide**: [USAGE.md](USAGE.md) — how to inspect, validate, and understand this pack
> **Changelog**: [CHANGELOG.md](CHANGELOG.md) — version history and maintenance policy

---

## Status

**Experimental skeleton.**

This is the first Presentation Pack for the Digital Pathology domain. It currently contains placeholder directories only. No runtime connection has been implemented.

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

---

## RFC Alignment

This pack follows:

- **RFC-0001** (Platform Specification) — Domain knowledge in Packs, not Core
- **RFC-0003** (Pack Specification) — Pack structure, manifest, lifecycle

---

## Known Limitations

1. **Not runtime-connected** — Assets in this pack are not loaded by `run.js`. Runtime still uses originals in `story/`.
2. **No pack loader** — Core does not yet know about `presentation-packs/`.
3. **Validation available** — Use `--validate-pack` to validate pack manifests and asset paths.
4. **Pack inspection available** — Use `--inspect-pack <id>` to view pack metadata, assets, runtime and governance flags.
5. **No SDK integration** — RFC-0002 SDK is not implemented.
6. **No marketplace** — RFC-0004 Marketplace is not implemented.
7. **Experimental** — This pack is a starting point, not a production artifact.
7. **Hero-sequence format** — `digital-pathology-15-hero-sequence.json` uses `slide_type`/`slide_no` instead of `type`/`no`. It is a companion metadata file, not a standalone story. See [HERO_SEQUENCE_FORMAT_AUDIT.md](../docs/HERO_SEQUENCE_FORMAT_AUDIT.md).
