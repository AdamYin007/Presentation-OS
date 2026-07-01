# Digital Pathology Presentation Pack

> **Status**: Experimental skeleton
> **Version**: 0.1.0
> **Created**: 2026-07-01
> **RFC**: RFC-0001, RFC-0003

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
| `stories/` | Placeholder | `.gitkeep` only |
| `hero-sequences/` | Placeholder | `.gitkeep` only |
| `content/` | Placeholder | `.gitkeep` only |
| `planners/` | Placeholder | `.gitkeep` only |
| `adapters/` | Placeholder | `.gitkeep` only |
| `themes/` | Placeholder | `.gitkeep` only |
| `terminology/` | Placeholder | `.gitkeep` only |
| `references/` | Placeholder | `.gitkeep` only |
| `examples/` | Placeholder | `.gitkeep` only |

All directories contain only `.gitkeep` files to preserve the structure in version control.

---

## What Belongs Here

Digital pathology domain knowledge that should eventually live in this pack:

- **Stories**: `digital-pathology-15.json` and variants
- **Hero sequences**: `digital-pathology-15-hero-sequence.json`
- **Planners**: All 14 domain-specific planners (architecture, collaboration, etc.)
- **Adapters**: All 15 domain-specific adapters
- **Themes**: `medical-consulting` theme configuration
- **Terminology**: Domain-specific terms (数字病理, 质控, CAP, ISO 15189, etc.)
- **References**: `digital-pathology-story-v1.md`, `medical-ai-layouts-v*.md`
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

| PR | Scope | Risk |
|---|---|---|
| **PR36** | Copy standard story assets into `stories/` | Low |
| **PR37** | Copy hero-sequence metadata into `hero-sequences/` | Low |
| **PR38** | Copy terminology and reference docs into `terminology/` and `references/` | None |
| **PR39** | Evaluate pack loader proof of concept | Medium |
| **PR40** | Begin data-driven planner extraction | Medium |

---

## RFC Alignment

This pack follows:

- **RFC-0001** (Platform Specification) — Domain knowledge in Packs, not Core
- **RFC-0003** (Pack Specification) — Pack structure, manifest, lifecycle

---

## Known Limitations

1. **Not runtime-connected** — Assets in this pack are not loaded by `run.js`.
2. **No pack loader** — Core does not yet know about `presentation-packs/`.
3. **No validation** — Pack contents are not validated against RFC-0003 schema.
4. **No SDK integration** — RFC-0002 SDK is not implemented.
5. **No marketplace** — RFC-0004 Marketplace is not implemented.
6. **Experimental** — This pack is a starting point, not a production artifact.
