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
- Current rendering still reads from `registry/packages/ppt-factory/story/` for `--story`.
- Pack validation is available via `--validate-pack`.
- **Pack story rendering is now available via `--pack-story` (M5.4).**
- Pack loader is **implemented** (M6.1–M6.2). M6.6 completed Pack Loader checkpoint — current capabilities frozen.

## 1.1 M6.6 Checkpoint Note

M6.6 (PR62) completed the M6 Pack Loader checkpoint:

- M6 Pack Loader checkpoint completed.
- Regression guard remains manual (`node registry/packages/ppt-factory/scripts/pack-loader-contract-smoke.js`).
- No new public CLI command added.
- No npm script added.
- Existing successful commands remain unchanged.

## 1.2 M7.0 Planning Note

M7.0 (PR63, RFC-0008) is a **planning-only** milestone:

- **M7.0 is planning-only.** No runtime changes, no CLI changes, no package.json modifications.
- **No new public CLI command.** All existing commands remain unchanged.
- **Existing successful commands remain unchanged.** `--story`, `--pack-story`, `--list-packs`, `--inspect-pack` all behave identically.
- **Pack remains explicit opt-in.** No automatic source-of-truth migration.
- **M7.1 is Pack Runtime Boundary Design** — design document only.

## 1.3 M7.1 Design Note

M7.1 (PR64) is a **design-only** milestone:

- **M7.1 is design-only.** No runtime changes, no CLI changes, no package.json modifications.
- **No new public CLI command.** All existing commands remain unchanged.
- **Existing successful commands remain unchanged.** `--story`, `--pack-story`, `--list-packs`, `--inspect-pack` all behave identically.
- **Pack remains explicit opt-in.** No automatic source-of-truth migration.
- **M7.2 is Pack Runtime Context Inspection Hardening** — first implementation milestone after the boundary design.
- **17 runtime boundary participants defined** across loader-owned, bridge-owned, and core-owned layers.
- **Data ownership model documented** — pack-owned, registry-owned, core-owned, bridge-owned.

## 1.4 M7.2 Implementation Note

M7.2 (PR65) is the first **implementation** milestone of M7:

- **Pack Runtime Context inspection hardened.** Normalized read-only context sections added (governance, runtime, boundaries, sourceOfTruth, outputPolicy, validation).
- **No new public CLI command.** All existing commands remain unchanged.
- **Existing successful commands remain unchanged.** `--story`, `--pack-story`, `--list-packs`, `--inspect-pack` all behave identically.
- **Pack remains explicit opt-in.** No automatic source-of-truth migration.
- **Contract smoke extended from 17 to 31 checks.** All checks pass.
- **M7.3 is Pack Story Resolver / Loader Boundary Alignment Design** — design document only.

## 1.5 M7.3 Design Note

M7.3 (PR66) is a **design-only** milestone:

- **M7.3 is design-only.** No runtime changes, no CLI changes, no package.json modifications.
- **No new public CLI command.** All existing commands remain unchanged.
- **Existing successful commands remain unchanged.** `--story`, `--pack-story`, `--list-packs`, `--inspect-pack` all behave identically.
- **Pack remains explicit opt-in.** No automatic source-of-truth migration.
- **M7.4 is Pack Runtime Boundary Smoke Checks** — design document for boundary verification.
- **Pack Story Resolver / Loader alignment design documented** — proposes future alignment without implementing it.
- **Responsibility split defined** — loader owns metadata, resolver owns story path, context owns immutable sections.
- **Future resolver contract defined as proposed only** — no implementation.

## 1.6 M7.4 Smoke Check Note

M7.4 (PR67) adds a **manual smoke check** for frozen M7 boundaries:

- **Manual boundary smoke check command:**
  ```bash
  node registry/packages/ppt-factory/scripts/pack-runtime-boundary-smoke.js
  ```
- **60/60 checks pass.** All frozen boundary assumptions validated.
- **Existing public CLI commands remain unchanged.** No new commands added.
- **No npm script added.** Script is invoked directly via `node`.
- **Pack remains explicit opt-in.** No automatic source-of-truth migration.
- **M7.5 is Pack Runtime Boundary Checkpoint** — M7 Pack Runtime Boundary Deepening complete.
- M7 boundary state is now frozen and documented.
- Use boundary smoke / contract smoke / parity validation before future pack runtime changes.
- Existing public CLI commands remain unchanged.
- No new command added.
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
  --help
  --story <id>
  --validate-pack <path>
  --list-packs
  --inspect-pack <id>
  --pack-story <pack>/<id>
  --legacy-renderer
  --layout-engine
```

---

## 7.1 Pack Story Rendering Prototype

### Explicit pack story rendering

```bash
node registry/packages/ppt-factory/bin/run.js --pack-story digital-pathology/digital-pathology-15
```

This command:
- **Resolves** the pack story path using the read-only resolver.
- **Validates** the pack manifest via existing `pack-validator`.
- **Confirms** the story is declared in `pack.json.contents.stories`.
- **Loads** the resolved story JSON from the pack.
- **Renders** the story into a PPTX using the existing rendering pipeline.
- **Generates** a slide plan alongside the PPTX.
- **Does not** affect `--story` rendering.
- **Does not** make packs the default source of truth.
- Exits 0 on success, 1 on error.

#### Output example

```
Pack Story Resolution:
pack: digital-pathology
story: digital-pathology-15
validation: passed
storyPath: stories/digital-pathology-15.json

Rendering pack story...

Loaded pack story from: /path/to/presentation-packs/digital-pathology/stories/digital-pathology-15.json
✅ PPT generated:
.../digital-pathology-15.pptx
✅ slide plan:
.../digital-pathology-15-slide-plan.json
```

#### Error cases

```bash
# Missing value
node registry/packages/ppt-factory/bin/run.js --pack-story
# → Missing value for --pack-story (exit 1)

# Invalid format (no slash)
node registry/packages/ppt-factory/bin/run.js --pack-story digital-pathology
# → Invalid --pack-story value. Expected <pack-id>/<story-id> (exit 1)

# Pack not found
node registry/packages/ppt-factory/bin/run.js --pack-story not-exist/story
# → Presentation Pack not found: not-exist (exit 1)

# Story not declared
node registry/packages/ppt-factory/bin/run.js --pack-story digital-pathology/not-exist
# → Story not declared in pack: not-exist (exit 1)
```

#### Notes

- Pack story rendering is **explicit opt-in**. It only activates when `--pack-story` is used.
- Default `--story` still uses registry story sources (`registry/packages/ppt-factory/story/`).
- Pack story rendering does **not** make packs the default source of truth.
- `--pack-story` + `--legacy-renderer` works when the existing legacy renderer is available.
- Planners and adapters remain existing runtime components — no extraction or modification.

#### Output path isolation (M5.6 hardening)

- `--story` outputs to `output/ppt-factory/<story-name>.pptx`.
- `--pack-story` outputs to `output/ppt-factory/packs/<pack-id>/<story-name>.pptx`.
- This prevents accidental overwrite between registry and pack renders.
- `--validate-pack-story-parity` uses isolated temp dirs under `output/ppt-factory/.parity-temp/`.

---

## 7.2 Pack Story Parity Validation (M5.5)

### Purpose

Compare slide plans between registry story rendering and pack story rendering to prove parity.

### Command

```bash
node registry/packages/ppt-factory/bin/run.js --validate-pack-story-parity digital-pathology/digital-pathology-15
```

### What is compared

- **Slide count** — number of slides in each plan
- **Slide order** — slide types in sequence
- **Slide titles** — `title` field of each slide
- **Slide text** — `title`, `message`, `pattern` fields of each slide
- **Slide plan structure** — top-level keys and slide array structure

### What is NOT compared

- **PPTX binary identity** — zip ordering, timestamps, internal IDs may differ between renders. Byte-for-byte PPTX equality is not required.

### Legacy mode

```bash
node registry/packages/ppt-factory/bin/run.js --validate-pack-story-parity digital-pathology/digital-pathology-15 --legacy-renderer
```

Renders both sides using legacy renderer and compares slide plans.

### Expected pass/fail behavior

- **Pass**: All comparison dimensions match. Exit code 0.
- **Fail**: At least one dimension mismatches. Exit code 1. Failure output includes specific slide index, field name, expected vs actual values.
- **Temp isolation**: Registry and pack renders happen in separate temp directories. Failure output includes the temp directory path for inspection.
- **Auto-cleanup**: Temp directory is cleaned before each parity validation run. Old outputs are removed.

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
| Replace existing story directory | ❌ | Original `story/` directory remains source of truth |
| Auto-search packs from `--story` | ❌ | `--story` still uses registry only |

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

1. `--pack-story <pack>/<story-id>` → render from pack (✅ now implemented)
2. `--validate-pack-story-parity <pack>/<story-id>` → validate parity (✅ now implemented)
3. `--story <id>` → future source-of-truth decision, not implemented in M5.6
4. Pack-driven content planning via terminology and references

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

## 12 Checkpoint Notes (M5.7)

**M5.7 freezes current pack runtime behavior as a formal checkpoint.**

- All M5 commands remain explicit opt-in. No automatic pack loading.
- Output path policy is frozen: `--story` → `output/ppt-factory/`, `--pack-story` → `output/ppt-factory/packs/<pack-id>/`.
- Future source-of-truth and pack loader decisions are M6 work.
- See [M5 PACK RUNTIME INTEGRATION CHECKPOINT](../../docs/M5_PACK_RUNTIME_INTEGRATION_CHECKPOINT.md) for the full M5 summary.

## 13 M6 Progression

- **M6.0** — Pack Loader Design RFC (RFC-0007). Documentation-only.
- **M6.1** — Read-only Pack Loader Skeleton. Six new modules in `src/`. No behavioral changes.
- **M6.2** — Pack Loader CLI Integration. `--list-packs` and `--inspect-pack` now loader-backed.
- **M6.3** — Pack Loader Error Model Hardening. Standardized error codes, structured `details` fields, enhanced CLI error mapping.
- **M6.4** — Pack Loader Validation Contract. Formalized error contract + executable smoke validation script.
- **M6.5** — Pack Loader Contract Regression Guard. Documented manual guard process, no CI/npm scripts added.
- `--list-packs` and `--inspect-pack` are now loader-backed internally.
- Error model standardized across all loader modules.
- CLI maps structured errors to user-friendly messages (no stack traces).
- Output format remains compatible with M6.1 baseline.
- No new user-facing command required.
- Existing commands remain unchanged.
- Pack loader is read-only: it loads metadata, does not render.
- No automatic source-of-truth migration.

---

## Related Documents

- [README.md](README.md) — Pack overview and migration principles
- [ASSET_INDEX.md](ASSET_INDEX.md) — Complete asset inventory with migration status
- [CHANGELOG.md](CHANGELOG.md) — Version history and maintenance policy
- [pack.json](pack.json) — Pack manifest and configuration
- [M4_PACK_MANIFEST_VALIDATION_AUDIT.md](../../docs/M4_PACK_MANIFEST_VALIDATION_AUDIT.md) — Manifest validation audit
- [M5 PACK RUNTIME INTEGRATION CHECKPOINT](../../docs/M5_PACK_RUNTIME_INTEGRATION_CHECKPOINT.md) — M5 formal checkpoint
- [RFC-0001](../../docs/rfc/RFC-0001-platform.md) — Platform specification
- [RFC-0003](../../docs/rfc/RFC-0003-pack.md) — Pack specification
