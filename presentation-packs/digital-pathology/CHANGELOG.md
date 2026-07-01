# Digital Pathology Presentation Pack Changelog

> **Pack**: `presentation-packs/digital-pathology/`
> **Current Version**: 0.1.0
> **Status**: Experimental

---

## [0.1.0] — 2026-07-01

### Added

- Created experimental pack skeleton with `pack.json` manifest.
- Added `README.md` with pack overview and migration principles.
- Copied standard story asset: `stories/digital-pathology-15.json`.
- Copied hero-sequence companion metadata: `hero-sequences/digital-pathology-15-hero-sequence.json`.
- Copied terminology asset: `terminology/digital-pathology-story-v1.md`.
- Copied reference layout assets: `references/medical-ai-layouts-v1.md`, `references/medical-ai-layouts-v2.md`.
- Added `ASSET_INDEX.md` — complete asset inventory with migration status.
- Added `USAGE.md` — how to inspect, validate, and use this pack.
- Added read-only pack validation via `--validate-pack` CLI flag.

### Status

- Experimental skeleton.
- Assets are copy-owned, not runtime-connected.
- Pack loader not implemented.
- `loadedByDefault: false`.

---

## Maintenance Policy

### General Principles

1. **This pack is experimental.** It is not yet loaded by the runtime.
2. **Assets are copy-owned.** The runtime still reads from original source locations.
3. **Do not modify Core when updating pack assets.** Pack updates are documentation-only.
4. **If source assets change, re-sync pack copies intentionally.** Do not silently diverge.
5. **Do not edit pack copies and source files differently** unless the divergence is documented and intentional.
6. **Pack version should change when assets or manifest semantics change.** Follow the versioning rules below.

### Who Maintains This Pack

- The pack is maintained by the AWE Presentation OS team.
- Individual domain packs (e.g., digital pathology, medical consulting) are owned by their respective domain teams.
- Core runtime changes (engines, adapters, planners) require separate approval and do not automatically propagate to pack copies.

### Update Process

When source assets change:

1. Identify which source files have changed.
2. Run `cmp` to compare source vs. pack copy.
3. If different, copy the updated source into the pack.
4. Update `CHANGELOG.md` with the change.
5. Update `ASSET_INDEX.md` if migration status changes.
6. Run `--validate-pack` to confirm pack integrity.

---

## Versioning Rules

### Semantic Versioning

This pack follows [semver](https://semver.org/) conventions:

**MAJOR** (0.x.x → 1.0.0):
- Manifest format changes.
- Runtime assumptions change (e.g., `loadedByDefault` semantics change).
- Pack structure changes in a non-backward-compatible way.

**MINOR** (0.1.x → 0.2.0):
- New assets added (stories, hero sequences, terminology, references).
- New sections populated (planners, adapters, themes).
- Significant documentation additions.

**PATCH** (0.1.0 → 0.1.1):
- Documentation-only updates (CHANGELOG, README, USAGE, ASSET_INDEX).
- Typo fixes.
- Version bump for pack.json metadata only.

### Current Version

**0.1.0** — Initial experimental pack with copy-owned assets.

---

## Copy Sync Rules

To verify pack copies match their sources, run:

```bash
# Story
cmp registry/packages/ppt-factory/story/digital-pathology-15.json \
      presentation-packs/digital-pathology/stories/digital-pathology-15.json

# Hero sequence
cmp registry/packages/ppt-factory/story/digital-pathology-15-hero-sequence.json \
      presentation-packs/digital-pathology/hero-sequences/digital-pathology-15-hero-sequence.json

# Terminology
cmp presentation-dna/grammar/digital-pathology-story-v1.md \
    presentation-packs/digital-pathology/terminology/digital-pathology-story-v1.md

# References
cmp presentation-dna/layouts/medical-ai-layouts-v1.md \
    presentation-packs/digital-pathology/references/medical-ai-layouts-v1.md

cmp presentation-dna/layouts/medical-ai-layouts-v2.md \
    presentation-packs/digital-pathology/references/medical-ai-layouts-v2.md
```

If `cmp` reports no differences, the copies are byte-identical.
If `cmp` reports differences, the source has been updated and the pack copy should be re-synced.

---

## Future Releases

| Version | Scope | Status |
|---|---|---|
| **0.2.0** | Additional examples and terminology | Planned |
| **0.3.0** | Pack inspection improvements | Planned |
| **0.4.0** | Optional read-only pack story listing | Planned |
| **1.0.0** | Runtime-connected stable pack | Future |

---

**End of Changelog.**

| Item | Status |
|---|---|
| Version 0.1.0 documented | ✅ |
| Maintenance policy defined | ✅ |
| Versioning rules defined | ✅ |
| Copy sync rules documented | ✅ |
| No runtime changes | ✅ |
