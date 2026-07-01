# Digital Pathology Pack Asset Index

> **Date**: 2026-07-01
> **Pack**: presentation-packs/digital-pathology/
> **Version**: 0.1.0
> **Status**: Experimental
> **Governance**: RFC-0001, RFC-0003 — documentation only, no runtime changes

---

## 1 Summary

This index documents all assets currently owned by the Digital Pathology Presentation Pack.

**Key facts:**

- Assets are **copied**, not moved. Original files in `registry/packages/ppt-factory/` remain untouched.
- Runtime still uses existing project paths for all rendering.
- Pack loader is **not active**. `loadedByDefault: false`.
- `--validate-pack` can validate the pack structure but does not load assets into rendering.
- This index documents pack-owned assets, their sources, current runtime status, and future migration intent.

---

## 2 Asset Inventory

| Asset | Path | Type | Source | Runtime Used Now? | Pack Role | Migration Status | Notes |
|---|---|---|---|---|---|---|---|
| Story | `stories/digital-pathology-15.json` | Story JSON | `registry/packages/ppt-factory/story/digital-pathology-15.json` | ✅ Yes (original) | Pack copy, not yet loaded | **Copy-first** — original is source of truth |
| Hero Sequence | `hero-sequences/digital-pathology-15-hero-sequence.json` | Hero metadata | `registry/packages/ppt-factory/story/digital-pathology-15-hero-sequence.json` | ❌ No (original only) | Pack copy, companion to story | **Copy-first** — not standalone renderable |
| Story Grammar | `terminology/digital-pathology-story-v1.md` | Terminology | `presentation-dna/grammar/digital-pathology-story-v1.md` | ❌ No | Pack domain knowledge | **Copy-first** — future planner input |
| Layout Ref v1 | `references/medical-ai-layouts-v1.md` | Reference | `presentation-dna/layouts/medical-ai-layouts-v1.md` | ❌ No | Pack design reference | **Copy-first** — future theme/adapter input |
| Layout Ref v2 | `references/medical-ai-layouts-v2.md` | Reference | `presentation-dna/layouts/medical-ai-layouts-v2.md` | ❌ No | Pack design reference | **Copy-first** — future theme/adapter input |
| Pack Manifest | `pack.json` | Manifest | N/A (pack-owned) | ❌ No | Pack identity + loader config | **Pack-owned** — source of truth for pack structure |
| Pack README | `README.md` | Documentation | N/A (pack-owned) | ❌ No | Pack documentation | **Pack-owned** — links to ASSET_INDEX.md |
| Asset Index | `ASSET_INDEX.md` | Documentation | N/A (pack-owned) | ❌ No | Asset inventory + migration plan | **Pack-owned** — this document |
| Stories placeholder | `stories/.gitkeep` | Git placeholder | N/A | ❌ No | Directory marker | **Pack-owned** |
| Hero placeholder | `hero-sequences/.gitkeep` | Git placeholder | N/A | ❌ No | Directory marker | **Pack-owned** |
| Content placeholder | `content/.gitkeep` | Git placeholder | N/A | ❌ No | Future content engine input | **Pack-owned** |
| Planners placeholder | `planners/.gitkeep` | Git placeholder | N/A | ❌ No | Future planner definitions | **Pack-owned** |
| Adapters placeholder | `adapters/.gitkeep` | Git placeholder | N/A | ❌ No | Future adapter definitions | **Pack-owned** |
| Themes placeholder | `themes/.gitkeep` | Git placeholder | N/A | ❌ No | Future theme definitions | **Pack-owned** |
| Examples placeholder | `examples/.gitkeep` | Git placeholder | N/A | ❌ No | Future example decks | **Pack-owned** |
| Terminology placeholder | `terminology/.gitkeep` | Git placeholder | N/A | ❌ No | Directory marker | **Pack-owned** |
| References placeholder | `references/.gitkeep` | Git placeholder | N/A | ❌ No | Directory marker | **Pack-owned** |

---

## 3 Story Assets

### `stories/digital-pathology-15.json`

- **Role**: Renderable story definition. Defines 15 slides for a digital pathology proposal.
- **Current runtime**: The original file at `registry/packages/ppt-factory/story/digital-pathology-15.json` is the sole source of truth for rendering.
- **Pack copy**: Identical byte-for-byte copy. Not loaded by runtime yet.
- **Future**: Pack loader will expose this story to the resolver alongside or replacing the registry copy.
- **Migration**: Copy-first → Pack-first (future).

---

## 4 Hero Sequence Assets

### `hero-sequences/digital-pathology-15-hero-sequence.json`

- **Role**: Companion metadata describing hero animation for slide 1 of digital-pathology-15.
- **Current runtime**: Not loaded. Hero Engine reads from `registry/packages/ppt-factory/story/`.
- **Pack copy**: Identical byte-for-byte copy.
- **Binding**: Implicitly bound to story `digital-pathology-15` via filename convention.
- **Future**: Pack loader should bind hero sequences to stories by name/id matching.
- **Migration**: Copy-first → Pack-first (future).

---

## 5 Knowledge Assets

### Terminology

#### `terminology/digital-pathology-story-v1.md`

- **Role**: Story grammar definition for digital pathology domain.
- **Current runtime**: Not loaded.
- **Source**: Copied from `presentation-dna/grammar/digital-pathology-story-v1.md`.
- **Future**: Input for content planning, terminology-aware slide generation.

### References

#### `references/medical-ai-layouts-v1.md`

- **Role**: Layout design reference for medical AI proposal slides.
- **Current runtime**: Not loaded.
- **Source**: Copied from `presentation-dna/layouts/medical-ai-layouts-v1.md`.
- **Future**: Input for theme generation, adapter layout selection.

#### `references/medical-ai-layouts-v2.md`

- **Role**: Extended layout design reference with additional patterns.
- **Current runtime**: Not loaded.
- **Source**: Copied from `presentation-dna/layouts/medical-ai-layouts-v2.md`.
- **Future**: Input for theme generation, adapter layout selection.

---

## 6 Runtime Status

| Setting | Value | Meaning |
|---|---|---|
| `loadedByDefault` | `false` | Pack is NOT auto-loaded at startup |
| `requiresPackLoader` | `true` | Pack needs a loader to become functional |
| `--validate-pack` | Available | Can validate pack structure without loading |
| Normal rendering | Unchanged | `--story digital-pathology-15` uses registry paths |
| Legacy rollback | Unchanged | `--legacy-renderer` still works |
| Default path | Unchanged | Adapter-first rendering still uses registry |

---

## 7 Future Migration Candidates

### Phase 1 — Validation (Done)
- [x] Pack manifest validator (`--validate-pack`) — **PR39**

### Phase 2 — Documentation (Done)
- [x] Asset index — **PR40** (this PR)

### Phase 3 — Read-Only Inspection (Future)
- [ ] Pack story listing command
- [ ] Pack hero-sequence binding inspection
- [ ] Pack terminology/reference metadata exposure

### Phase 4 — Copy Expansion (Future)
- [ ] Copy additional stories into pack
- [ ] Copy additional hero sequences into pack
- [ ] Copy terminology and reference docs for other domains

### Phase 5 — Planner Extraction (Future, not yet)
- [ ] Extract hardcoded content from legacy renderers into pack planners
- [ ] Map planner zones to adapter rendering primitives
- [ ] Verify planner output matches legacy renderer output

### Phase 6 — Pack Loader Integration (Future, not yet)
- [ ] Implement pack loader that reads pack stories
- [ ] Bind pack stories to resolver alongside registry stories
- [ ] Gradually shift rendering from registry to pack

### Phase 7 — Theme/Adapter Extraction (Future, not yet)
- [ ] Extract domain-specific theme variants into pack
- [ ] Extract domain-specific adapter definitions into pack
- [ ] Register pack adapters alongside Core adapters

---

## 8 Do Not Move Yet

The following remain in their current locations and must NOT be moved:

| Asset | Current Location | Reason |
|---|---|---|
| Story files | `registry/packages/ppt-factory/story/` | Runtime source of truth |
| Planners | `registry/packages/ppt-factory/src/layout-engine/planners/` | Core functionality |
| Adapters | `registry/packages/ppt-factory/src/layout-adapters/` | Core functionality |
| Content Engine | `registry/packages/ppt-factory/src/content-engine/` | Core API |
| Theme Engine | `registry/packages/ppt-factory/src/theme-engine/` | Core API |
| Renderer Engine | `registry/packages/ppt-factory/src/renderer-engine/` | Core API |
| Hero Engine | `registry/packages/ppt-factory/src/hero-engine.js` | Core API |
| run.js | `registry/packages/ppt-factory/bin/run.js` | CLI entry point |
| presentation-dna/ | `presentation-dna/` | Source of truth for domain knowledge |

---

## 9 Recommendation

### Next Safe Steps

The next safe step after this index is one of:

**A. Pack validation hardening** — Improve error messages, add semantic validation for story/hero relationships.

**B. Pack asset copy expansion** — Copy additional domain packs (e.g., medical consulting, surgical planning) into the same pattern.

**C. Read-only pack inspection** — Add a `--inspect-pack` CLI command that lists pack assets without loading them into rendering.

### Not Recommended Yet

- ❌ Pack loader implementation (too risky, not yet validated)
- ❌ Planner extraction (requires careful content verification)
- ❌ Moving files out of registry (breaks current rendering)
- ❌ Changing `loadedByDefault` to `true` (unsafe)

---

**End of Asset Index.**

| Item | Status |
|---|---|
| All pack assets documented | ✅ |
| Runtime status clarified | ✅ |
| Migration intent defined | ✅ |
| No runtime changes made | ✅ |
| No files moved | ✅ |
