# M4 Pack System Checkpoint

> **Date**: 2026-07-02
> **Author**: Agnes-2.0-Flash (MD Senior Implementation Engineer)
> **Context**: PR47 — checkpoint documentation before M5 Pack Runtime Integration
> **Governance**: RFC-0001, RFC-0003 — documentation only, no code changes

---

## 1. Purpose

This document records the completed state of the **read-only Presentation Pack system** as of M4.5. It serves as a stable baseline before M5 Pack Runtime Integration begins.

The M4 pack system provides:
- Pack manifest structure and validation
- Read-only pack discovery
- Read-only pack inspection
- CLI help for all pack commands
- Unknown CLI argument guard

It does **not** provide:
- Pack-loaded rendering
- Pack-as-source-of-truth
- Planner or adapter extraction
- Pack-to-runtime integration

---

## 2. Completed Milestones

| Milestone | PR | Tag | Description |
|-----------|----|-----|-------------|
| M4 | PR35–37 | `m4-digital-pathology-pack-v0` | Digital Pathology Presentation Pack v0 — skeleton, story/hero copies, terminology and references |
| M4.1 | PR42 | `m4-1-pack-usability-hardening` | Pack changelog and maintenance policy |
| M4.2 | PR43 | `m4-2-read-only-pack-discovery` | `--list-packs` command — discovers all packs under `presentation-packs/` |
| M4.3 | PR44 | `m4-3-cli-unknown-argument-guard` | Unknown CLI flags fail fast with exit code 1 |
| M4.4 | PR45 | `m4-4-read-only-pack-inspection` | `--inspect-pack <id>` — reads pack.json, validates, prints metadata/assets/runtime/governance |
| M4.5 | PR46 | `m4-5-cli-help` | `--help` — lists all supported CLI commands with descriptions |

---

## 3. Current Pack System Capabilities

### What Works

| Capability | Status | CLI Command |
|------------|--------|-------------|
| Pack manifest exists | ✅ | `presentation-packs/digital-pathology/pack.json` |
| Pack assets are copy-owned | ✅ | Stories, hero sequences, terminology, references copied into pack |
| Pack validation | ✅ | `--validate-pack <path>` |
| Pack discovery | ✅ | `--list-packs` |
| Pack inspection | ✅ | `--inspect-pack <id>` |
| CLI help | ✅ | `--help` |
| Unknown option guard | ✅ | Any unrecognized flag → exit 1 |
| Runtime rendering | ✅ | `--story <id>` unchanged |
| Legacy rollback | ✅ | `--story <id> --legacy-renderer` |

### What Does Not Work (By Design)

| Capability | Status | Reason |
|------------|--------|--------|
| Pack-loaded rendering | ❌ | Pack loader not implemented |
| Pack as source of truth | ❌ | Registry story files remain source of truth |
| Planner extraction | ❌ | Deferred to M5+ |
| Adapter extraction | ❌ | Deferred to M5+ |
| Theme extraction | ❌ | Deferred to M5+ |
| Content engine integration | ❌ | Deferred to M5+ |

---

## 4. Current CLI Surface

```
node registry/packages/ppt-factory/bin/run.js --help
```
Lists all supported options with descriptions. Exits 0. No rendering.

```
node registry/packages/ppt-factory/bin/run.js --validate-pack presentation-packs/digital-pathology
```
Validates pack manifest schema, asset paths, and runtime/governance fields. Exits 0 on success.

```
node registry/packages/ppt-factory/bin/run.js --list-packs
```
Scans `presentation-packs/` for directories with `pack.json`, validates each, prints human-readable list. Exits 0.

```
node registry/packages/ppt-factory/bin/run.js --inspect-pack digital-pathology
```
Prints pack metadata, asset paths, runtime flags (`loadedByDefault`, `requiresPackLoader`), and governance flags (`coreChangesAllowed`, `migrationMode`). Exits 0.

```
node registry/packages/ppt-factory/bin/run.js --story digital-pathology-15
```
Renders story from `registry/packages/ppt-factory/story/`. Uses adapter-first layout engine by default. Generates PPTX.

```
node registry/packages/ppt-factory/bin/run.js --story digital-pathology-15 --legacy-renderer
```
Renders story from `registry/packages/ppt-factory/story/` using legacy renderer. Generates identical PPTX for rollback verification.

---

## 5. Hard Boundaries Preserved

The following boundaries are **explicitly maintained** and must not be violated in M5:

1. **Packs are not loaded for rendering.** `--story` continues to read from `registry/packages/ppt-factory/story/`.
2. **Pack assets are not runtime source of truth.** Registry story files remain authoritative.
3. **No planners were extracted.** All planners remain in `src/layout-engine/planners/`.
4. **No adapters were extracted.** All adapters remain in `src/layout-adapters/`.
5. **No Core runtime behavior changed.** Renderer engine, content engine, theme engine, layout engine are untouched.
6. **No pack loader exists.** `pack.json.runtime.requiresPackLoader` remains `true`.
7. **Legacy renderer rollback remains available.** `--legacy-renderer` flag works independently of pack system.
8. **Pack commands are read-only.** `--validate-pack`, `--list-packs`, `--inspect-pack` never generate PPTX.

---

## 6. Digital Pathology Pack Current Contents

| Path | Type | Status |
|------|------|--------|
| `pack.json` | Manifest | ✅ Identity, asset list, runtime config, governance |
| `README.md` | Documentation | ✅ Overview, purpose, migration principles, limitations |
| `USAGE.md` | Documentation | ✅ How to inspect, validate, render, understand the pack |
| `CHANGELOG.md` | Documentation | ✅ Version history and maintenance policy |
| `ASSET_INDEX.md` | Documentation | ✅ Complete asset inventory with migration status |
| `stories/digital-pathology-15.json` | Asset copy | ✅ Copy from registry |
| `hero-sequences/digital-pathology-15-hero-sequence.json` | Asset copy | ✅ Companion metadata |
| `terminology/digital-pathology-story-v1.md` | Asset copy | ✅ Copy from presentation-dna |
| `references/medical-ai-layouts-v1.md` | Asset copy | ✅ Copy from presentation-dna |
| `references/medical-ai-layouts-v2.md` | Asset copy | ✅ Copy from presentation-dna |
| `content/` | Placeholder | `.gitkeep` only |
| `planners/` | Placeholder | `.gitkeep` only |
| `adapters/` | Placeholder | `.gitkeep` only |
| `themes/` | Placeholder | `.gitkeep` only |
| `examples/` | Placeholder | `.gitkeep` only |
| `hero-sequences/.gitkeep` | Placeholder | `.gitkeep` (unused — hero-sequence JSON present) |
| `stories/.gitkeep` | Placeholder | `.gitkeep` (unused — story JSON present) |
| `terminology/.gitkeep` | Placeholder | `.gitkeep` (unused — terminology present) |
| `references/.gitkeep` | Placeholder | `.gitkeep` (unused — references present) |

---

## 7. Validation Baseline

These commands define the expected behavior baseline. M5 changes must not break them.

| Command | Expected Exit | Notes |
|---------|---------------|-------|
| `--help` | 0 | Lists all options, no rendering |
| `--validate-pack presentation-packs/digital-pathology` | 0 | Validates manifest, assets, schema |
| `--list-packs` | 0 | Lists digital-pathology with validation status |
| `--inspect-pack digital-pathology` | 0 | Prints metadata, assets, runtime, governance |
| `--inspect-pack` (no value) | 1 | "Missing value for --inspect-pack" |
| `--inspect-pack not-exist` | 1 | "Presentation Pack not found: not-exist" |
| `--unknown-flag` | 1 | "Unsupported option" + available options list |
| `--story digital-pathology-15` | 0 | Generates PPTX from registry story |
| `--story digital-pathology-15 --legacy-renderer` | 0 | Generates PPTX via legacy renderer |

---

## 8. Risks Avoided

The M4 read-only pack system was designed to avoid these risks:

| Risk | Mitigation |
|------|------------|
| Premature planner extraction | Planners remain in Core; extraction deferred to M5+ after pack story rendering is stable |
| Coupling pack assets to runtime | Pack commands are strictly read-only; no asset loading occurs |
| Changing source of truth | Registry story files remain the only source for `--story` rendering |
| Breaking adapter-first rendering | No changes to layout engine, adapters, or renderer engine |
| Losing legacy rollback | `--legacy-renderer` flag works independently of pack system |
| Silent pack loading | `pack.json.runtime.loadedByDefault` is `false`; pack loader must be explicit |
| Unvalidated pack manifests | `--validate-pack` rejects invalid schemas, absolute paths, and path traversal |

---

## 9. M5 Entry Criteria

Before M5 Pack Runtime Integration begins, the following must be confirmed:

- [ ] **Read-only Pack CLI remains stable.** `--help`, `--validate-pack`, `--list-packs`, `--inspect-pack` continue to work as documented in Section 7.
- [ ] **Pack inspection output is trusted.** `--inspect-pack` accurately reflects `pack.json` contents and disk state.
- [ ] **Runtime source-of-truth decision is explicit.** A design note specifies whether M5 will introduce pack-as-source-of-truth, pack-as-secondary-source, or maintain registry-as-source-of-truth.
- [ ] **Pack loader design is documented before implementation.** An RFC or design note covers: loading strategy, conflict resolution, migration path, and rollback behavior.
- [ ] **Planner extraction has separate RFC or design note.** Planners must not be extracted until pack story rendering is stable and tested.
- [ ] **Compatibility and rollback strategy defined.** M5 changes must not break `--legacy-renderer` rollback or adapter-first default rendering.

---

## 10. Recommended Next Steps

1. **M5.0 Pack Runtime Integration Design Note** — Document the intended runtime integration approach, source-of-truth decision, and migration path.
2. **M5.1 Read-only pack story resolution prototype** — Experiment with `--pack-story` or similar command that resolves stories from pack copies without changing `--story` behavior.
3. **M5.2 Explicit pack story rendering command, not default** — Introduce a new command (e.g., `--pack-story`) that renders from pack copies while keeping `--story` unchanged.
4. **Later: planner extraction only after pack story rendering is stable** — Do not extract planners or adapters until M5.1–M5.2 are validated.

---

## Related Documents

- [README.md](../presentation-packs/digital-pathology/README.md) — Pack overview and migration principles
- [USAGE.md](../presentation-packs/digital-pathology/USAGE.md) — How to inspect, validate, and use the pack
- [CHANGELOG.md](../presentation-packs/digital-pathology/CHANGELOG.md) — Version history and maintenance policy
- [ASSET_INDEX.md](../presentation-packs/digital-pathology/ASSET_INDEX.md) — Complete asset inventory
- [M4_PACK_MANIFEST_VALIDATION_AUDIT.md](M4_PACK_MANIFEST_VALIDATION_AUDIT.md) — Manifest validation audit
- [RFC-0001](../docs/rfc/RFC-0001-platform.md) — Platform specification
- [RFC-0003](../docs/rfc/RFC-0003-pack.md) — Pack specification
