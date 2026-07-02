# Digital Pathology Pack Usage Guide

> **Date**: 2026-07-01
> **Pack**: `presentation-packs/digital-pathology/`
> **Version**: 0.1.0
> **Status**: Experimental — not runtime-connected

---

## 1 Status

This pack is an **experimental** Presentation Pack for the Digital Pathology domain.

**Current state:**

- Assets are **copy-owned** and inert. They are not loaded by the runtime.
- Current rendering still reads from `registry/packages/ppt-factory/story/`.
- Pack validation is available via `--validate-pack`.
- Pack loader is **not implemented**.

---

## 2 How to Inspect the Pack

### List all files

```bash
find presentation-packs/digital-pathology -maxdepth 3 -type f | sort
```

### Key files

| File | Purpose |
|---|---|
| `pack.json` | Pack manifest — identity, asset list, runtime config |
| `README.md` | Pack overview, purpose, migration principles |
| `ASSET_INDEX.md` | Complete asset inventory with migration status |
| `USAGE.md` | This file — how to inspect, validate, and understand the pack |
| `stories/digital-pathology-15.json` | Story copy (identical to registry version) |
| `hero-sequences/digital-pathology-15-hero-sequence.json` | Hero metadata copy (companion to story) |
| `terminology/digital-pathology-story-v1.md` | Story grammar definition |
| `references/medical-ai-layouts-v1.md` | Layout design reference |
| `references/medical-ai-layouts-v2.md` | Extended layout design reference |

### Placeholder directories

These directories exist but contain only `.gitkeep`:

- `content/` — Future content engine input
- `planners/` — Future domain-specific planners
- `adapters/` — Future domain-specific adapters
- `themes/` — Future domain-specific themes
- `examples/` — Future example decks

---

## 3 How to Validate the Pack

### Run validation

```bash
node registry/packages/ppt-factory/bin/run.js --validate-pack presentation-packs/digital-pathology
```

### Expected output (success)

```
Pack validation passed
Pack: digital-pathology
Version: 0.1.0
Status: experimental
Stories: 1
Hero sequences: 1
Terminology: 1
References: 2
```

### What validation checks

1. **Manifest fields** — All required fields present (`name`, `version`, `type`, `contents`, `runtime`, `governance`)
2. **Asset paths** — Every path listed in `contents.*` arrays exists on disk
3. **Path safety** — Rejects absolute paths (`/etc/passwd`) and path traversal (`../some-file`)
4. **Schema compliance** — Validates semver, type values, runtime/governance sub-fields

### What validation does NOT do

- ❌ Does not load assets into runtime
- ❌ Does not generate PPTX
- ❌ Does not modify rendering behavior
- ❌ Does not register pack stories

### Validate a missing pack

```bash
node registry/packages/ppt-factory/bin/run.js --validate-pack presentation-packs/does-not-exist
```

Expected: exit code 1 with error message.

---

## 4 How to Render the Current Story

### Normal rendering (adapter-first)

```bash
node registry/packages/ppt-factory/bin/run.js --story digital-pathology-15
```

Generates `output/ppt-factory/digital-pathology-15.pptx`.

### Legacy rendering (rollback)

```bash
node registry/packages/ppt-factory/bin/run.js --story digital-pathology-15 --legacy-renderer
```

Generates identical PPTX for rollback verification.

### Important

- These commands read from `registry/packages/ppt-factory/story/`, **NOT** from `presentation-packs/`.
- The pack copy of `digital-pathology-15.json` is not yet loaded by runtime.
- Pack loader integration is future work.

## CLI Help

### Show help

```bash
node registry/packages/ppt-factory/bin/run.js --help
```

This command:
- Shows all supported CLI options with descriptions.
- Does **not** render PPTX.
- Does **not** load pack assets.
- Is a safe, read-only command.
- Exits with code 0.

### Usage

```
node registry/packages/ppt-factory/bin/run.js [options]
```

All options are listed by `--help`. Unknown options fail fast with exit code 1.

---

## 5 Read-only Pack Discovery

### List all packs

```bash
node registry/packages/ppt-factory/bin/run.js --list-packs
```

### Expected output

```
Available Presentation Packs:
- digital-pathology
  name: Digital Pathology Presentation Pack
  version: 0.1.0
  status: experimental
  path: presentation-packs/digital-pathology
  validation: passed
```

### What discovery does

1. Scans `presentation-packs/` for directories containing `pack.json`.
2. Validates each pack manifest using the existing validator.
3. Prints human-readable pack list with validation status.

### What discovery does NOT do

- ❌ Does not load pack assets into runtime
- ❌ Does not generate PPTX
- ❌ Does not modify rendering behavior
- ❌ Does not register pack stories

---

## 6 Read-only Pack Inspection

### Inspect a specific pack

```bash
node registry/packages/ppt-factory/bin/run.js --inspect-pack digital-pathology
```

### Expected output

```
Presentation Pack: digital-pathology
name: Digital Pathology Presentation Pack
version: 0.1.0
status: experimental
path: presentation-packs/digital-pathology
validation: passed
assets:
  stories:
    - stories/digital-pathology-15.json
  heroSequences:
    - hero-sequences/digital-pathology-15-hero-sequence.json
  terminology:
    - terminology/digital-pathology-story-v1.md
  references:
    - references/medical-ai-layouts-v1.md
    - references/medical-ai-layouts-v2.md
runtime:
  loadedByDefault: false
  requiresPackLoader: true
governance:
  coreChangesAllowed: false
  migrationMode: copy-first
```

### What inspection does

1. Looks up pack by directory name under `presentation-packs/`.
2. Validates the pack manifest using existing validator.
3. Prints metadata, asset paths, runtime flags, and governance flags.

### What inspection does NOT do

- ❌ Does not load pack assets into runtime
- ❌ Does not generate PPTX
- ❌ Does not modify rendering behavior

### Error cases

- `--inspect-pack` without value → exits 1: "Missing value for --inspect-pack"
- `--inspect-pack not-exist` → exits 1: "Presentation Pack not found: not-exist"

---

## 7 CLI Safety

### Unsupported options fail fast

Any CLI flag not recognized by `run.js` will cause an immediate exit with error code 1. No PPTX is generated. No rendering pipeline is invoked.

Example of a supported option (no error):

```bash
node registry/packages/ppt-factory/bin/run.js --inspect-pack digital-pathology
```

This **works** — `--inspect-pack` is now a supported option.

If a truly unknown flag is used:

```bash
node registry/packages/ppt-factory/bin/run.js --unknown-flag
```

Expected output:

```
Unsupported option: --unknown-flag
Available options:
  --story <id>
  --validate-pack <path>
  --list-packs
  --legacy-renderer
  --layout-engine
```

---

## 8 What This Pack Contains

### Populated sections

| Section | Files | Status |
|---|---|---|
| `stories/` | `digital-pathology-15.json` | ✅ Copy from registry |
| `hero-sequences/` | `digital-pathology-15-hero-sequence.json` | ✅ Copy from registry |
| `terminology/` | `digital-pathology-story-v1.md` | ✅ Copy from presentation-dna |
| `references/` | `medical-ai-layouts-v1.md`, `medical-ai-layouts-v2.md` | ✅ Copies from presentation-dna |

### Placeholder sections

| Section | Files | Purpose |
|---|---|---|
| `content/` | `.gitkeep` | Future content engine input |
| `planners/` | `.gitkeep` | Future domain-specific planners |
| `adapters/` | `.gitkeep` | Future domain-specific adapters |
| `themes/` | `.gitkeep` | Future domain-specific themes |
| `examples/` | `.gitkeep` | Future example decks |

---

## 9 What This Pack Does NOT Do Yet

| Capability | Status | Notes |
|---|---|---|
| Register itself | ❌ | Pack loader not implemented |
| Load at runtime | ❌ | Core does not know about `presentation-packs/` |
| Override Core planners | ❌ | Planners remain in `src/layout-engine/planners/` |
| Override adapters | ❌ | Adapters remain in `src/layout-adapters/` |
| Provide SDK APIs | ❌ | RFC-0002 SDK not implemented |
| Generate PPTX directly | ❌ | PPTX generated by `run.js` from story files |
| Replace existing story directory | ❌ | Original `story/` directory remains source of truth |

---

## 10 Developer Workflow

### Current recommended workflow

1. Inspect pack assets with `find` or `--list-packs`.
2. Validate pack with `--validate-pack` or `--inspect-pack`.
3. Render current standard story from existing runtime (`--story`).
4. Compare pack story copy with runtime version if needed.
5. **Do not edit** runtime files when updating pack documentation.

### Do not

- ❌ Do not modify `registry/packages/ppt-factory/story/*.json` from within the pack.
- ❌ Do not assume pack assets are loaded by `--story`.
- ❌ Do not implement pack loader in this PR.

---

## 11 Future Workflow

When pack loader is implemented, the workflow may evolve to:

1. `--pack-story <pack>/<story-id>` → render from pack (future)
2. Pack-driven content planning via terminology and references

---

## 12 Troubleshooting

### Problem: Pack validation fails

**Cause**: Missing asset path in pack.json.
**Fix**: Run `--inspect-pack` to see errors, then check `pack.json` contents.

### Problem: Invalid pack.json

**Cause**: Malformed JSON or missing required fields.
**Fix**: Validate with `node -e "JSON.parse(require('fs').readFileSync('presentation-packs/digital-pathology/pack.json','utf8'))"`.

### Problem: Hero-sequence cannot render standalone

**Cause**: Hero-sequence is companion metadata, not a renderable story.
**Fix**: Use `--story digital-pathology-15` with `--hero` flag (future).

### Problem: Normal rendering does not use pack assets yet

**Cause**: Pack loader not implemented.
**Fix**: Runtime still reads from `registry/packages/ppt-factory/story/`.

### Problem: `--validate-pack` does not generate PPTX

**Cause**: Validator is read-only by design.
**Fix**: Use `--story <id>` for rendering.

---

## Related Documents

- [README.md](README.md) — Pack overview and migration principles
- [ASSET_INDEX.md](ASSET_INDEX.md) — Complete asset inventory with migration status
- [CHANGELOG.md](CHANGELOG.md) — Version history and maintenance policy
- [pack.json](pack.json) — Pack manifest and configuration
- [M4_PACK_MANIFEST_VALIDATION_AUDIT.md](../../docs/M4_PACK_MANIFEST_VALIDATION_AUDIT.md) — Manifest validation audit
- [RFC-0001](../../docs/rfc/RFC-0001-platform.md) — Platform specification
- [RFC-0003](../../docs/rfc/RFC-0003-pack.md) — Pack specification
