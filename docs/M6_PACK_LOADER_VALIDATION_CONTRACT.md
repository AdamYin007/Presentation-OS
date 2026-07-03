# Pack Loader Validation Contract

> **Version**: 1.0.0  
> **Date**: 2026-07-04  
> **Status**: Implemented (M6.4)  
> **Related**: RFC-0007 Pack Loader Design, PR60

---

## Purpose

This document formalizes the Pack Loader validation and error contract. It serves as:

1. A **specification** for expected input/output shapes of loader functions.
2. A **verification checklist** for the smoke test script.
3. A **boundary definition** for what the loader does and does not do.

## Scope

The Pack Loader consists of these modules:

| Module | File | Responsibility |
|---|---|---|
| Discovery | `src/pack-discovery.js` | Locate packs in known directories |
| Manifest Reader | `src/pack-manifest-reader.js` | Read and parse pack.json |
| Validator | `src/pack-validator.js` | Schema + asset existence validation |
| Asset Resolver | `src/pack-asset-resolver.js` | Resolve declared asset paths safely |
| Runtime Context | `src/pack-runtime-context.js` | Build immutable context object |
| Registry | `src/pack-registry.js` | In-memory pack context registry |
| Loader | `src/pack-loader.js` | Orchestrates the full lifecycle |
| Inspection | `src/pack-inspection.js` | Public API for pack inspection |
| CLI | `bin/run.js` | Maps loader errors to user-friendly messages |

## Non-goals

- **No rendering**: The loader does not import or invoke any rendering engine.
- **No source-of-truth migration**: Packs remain explicit opt-in.
- **No planner/adapter extraction**: Existing runtime components are untouched.
- **No new public CLI commands**: The smoke script is internal only.
- **No SDK API**: No public programmatic API beyond the loader functions.
- **No marketplace behavior**: No download, install, or update logic.

---

## Success Result Shapes

### loadPack() success

```javascript
{
  ok: true,
  context: {
    packId: string,           // from manifest.name
    packRoot: string,         // absolute path
    manifestPath: string|null,
    manifest: object,         // frozen
    assets: object,           // frozen, grouped by asset type
    validation: object,       // frozen, from pack-validator
    governance: object|null,  // frozen, from manifest
    runtime: object|null,     // frozen, from manifest
  }
}
```

### loadAllPacks() success

```javascript
{
  ok: true,
  contexts: [PackRuntimeContext, ...]
}
```

Partial success: `ok: true` if at least one pack loaded successfully.

### inspectPack() success

```javascript
{
  ok: true,
  result: {
    packId: string,
    name: string,
    displayName: string,
    version: string,
    status: string,
    path: string,
    validation: "passed"|"failed"|"unknown",
    assets: { stories: [...], heroSequences: [...], ... },
    runtime: object,
    governance: object,
  }
}
```

## Failure Result Shape

All loader functions return structured errors:

```javascript
{
  ok: false,
  errorCode: "ERROR_CODE",
  error: "Human-readable message",
  details: {
    // Fields vary by error code (see table below)
  }
}
```

**Guarantees:**

1. `ok` is always a boolean.
2. `errorCode` is always a string from the canonical list below.
3. `error` is always a non-empty string.
4. `details` is always an object or `null` (never undefined).

---

## Error Code Table

| Code | Module | Trigger Condition | Required details fields |
|---|---|---|---|
| `PACK_NOT_FOUND` | loader, inspection | Target not found in any scan directory or by path | `target: string` |
| `PACKS_DIR_NOT_FOUND` | discovery | `presentation-packs/` directory does not exist | `scanDir: string` |
| `MANIFEST_MISSING` | loader, manifest-reader | Directory exists but `pack.json` is absent/unreadable | `target`, `packRoot`, `manifestPath` |
| `MANIFEST_INVALID_JSON` | manifest-reader | `pack.json` contains parse errors | `target`, `manifestPath` |
| `VALIDATION_FAILED` | loader, runtime-context | Schema validation or context construction fails | `packRoot`, `warnings` |
| `ASSET_UNSAFE_PATH` | loader, asset-resolver | Absolute path, path traversal, or escaped pack root | `group`, `entry`, `entryIndex`, `packRoot`, `resolvedPath` |
| `ASSET_MISSING` | loader, asset-resolver | Declared asset file does not exist | `group`, `entry`, `entryIndex`, `packRoot`, `resolvedPath` |
| `DUPLICATE_PACK_ID` | registry | Same packId registered twice | `packId: string` |
| `PACK_LOAD_FAILED` | loader | Generic loader failure (fallback) | `failedPacks: string[]` |
| `PACK_DISCOVERY_FAILED` | discovery | Discovery-level failure (reserved) | — |
| `PACK_INSPECTION_FAILED` | inspection | Inspection-level failure (fallback) | — |

**Note**: The validator runs before the asset resolver in the loader pipeline. If the validator catches an unsafe path or missing asset, the loader maps the validator error to `ASSET_UNSAFE_PATH` or `ASSET_MISSING` respectively via regex matching on the validator error message.

---

## loadPack Contract

### Input

- `target` (string): Pack id (e.g., `"digital-pathology"`) or absolute directory path.
- `options` (object, optional): `{ packRoot: string }` to override discovery.

### Lifecycle Steps

1. **Discover** — Find pack by id or path. If not found, check if directory exists:
   - Directory exists → `MANIFEST_MISSING`
   - Directory missing → `PACK_NOT_FOUND`
2. **Read manifest** — Parse `pack.json`. Errors: `MANIFEST_MISSING` or `MANIFEST_INVALID_JSON`.
3. **Validate** — Run `pack-validator.validatePack()`. Errors mapped to `VALIDATION_FAILED`, `ASSET_UNSAFE_PATH`, or `ASSET_MISSING`.
4. **Resolve assets** — Run `pack-asset-resolver.resolveAssets()`. Errors: `ASSET_UNSAFE_PATH` or `ASSET_MISSING`.
5. **Build context** — Run `pack-runtime-context.buildRuntimeContext()`. Errors: `VALIDATION_FAILED`.
6. **Register** — Run `pack-registry.register()`. Errors: `DUPLICATE_PACK_ID`.

### Boundary Guarantees

- Returns `{ ok: true, context: frozenObject }` on success.
- Never throws exceptions for expected pack errors.
- Never mutates pack files.
- Never imports rendering engines, adapters, or planners.

---

## loadAllPacks Contract

### Input

- `options` (object, optional): Passed through to individual `loadPack()` calls.

### Behavior

1. Clears the in-memory registry.
2. Discovers all packs via `discoverPacksWithError()`.
3. Loads each pack individually.
4. Returns `{ ok: true, contexts: [...] }` if at least one pack loaded.
5. Returns `{ ok: false, errorCode: "PACK_LOAD_FAILED" }` only if zero packs loaded.

### Boundary Guarantees

- Partial success is acceptable.
- If all packs fail, returns a single aggregated error.

---

## inspectPack Contract

### Input

- `target` (string): Pack id or absolute directory path.

### Behavior

1. Discovers the pack (same as `loadPack`).
2. Calls `loadPack()` internally.
3. If loader succeeds, transforms the context into an inspection result.
4. Preserves error codes from the loader.

### Boundary Guarantees

- `inspectPack` result shape differs from `loadPack` — it returns `result` not `context`.
- Error codes and messages are preserved from the loader.

---

## CLI Error Mapping Contract

### --list-packs error mapping

| errorCode | CLI stderr message |
|---|---|
| `PACKS_DIR_NOT_FOUND` | `Packs directory not found: <scanDir>` |
| `PACK_LOAD_FAILED` | `<error message>` |
| default | `Pack loader error: <message>` |

### --inspect-pack error mapping

| errorCode | CLI stderr message |
|---|---|
| `PACK_NOT_FOUND` | `Presentation Pack not found: <target>` |
| `PACKS_DIR_NOT_FOUND` | `Packs directory not found: <scanDir>` |
| `MANIFEST_MISSING` | `No pack.json found in: <target>` |
| `MANIFEST_INVALID_JSON` | `Invalid pack.json: <manifestPath>` |
| `VALIDATION_FAILED` | `Pack validation failed: <message>` |
| `ASSET_UNSAFE_PATH` | `Unsafe asset path in pack: <entry>` |
| `ASSET_MISSING` | `Pack asset missing: <path>` |
| `DUPLICATE_PACK_ID` | `Duplicate Presentation Pack id: <id>` |
| default | `Pack loader error: <message>` |

---

## Successful Output Compatibility Guarantees

The following successful outputs must remain **byte-compatible** with pre-M6.4 behavior:

### --list-packs

```
Available Presentation Packs:
- <packId>
  name: <displayName>
  version: <version>
  status: <status>
  path: <packRoot>
  validation: passed|warning
```

### --inspect-pack <id>

```
Presentation Pack: <name>
name: <displayName>
version: <version>
status: <status>
path: <packRoot>
validation: passed
assets:
  stories: [...]
  heroSequences: [...]
  terminology: [...]
  references: [...]
runtime:
  loadedByDefault: <bool>
  requiresPackLoader: <bool>
governance:
  coreChangesAllowed: <bool>
  migrationMode: <mode>
```

**Guarantee**: No new fields, no reordered fields, no debug output in successful paths.

---

## Negative-path Smoke Cases

The smoke script (`scripts/pack-loader-contract-smoke.js`) verifies these cases using temporary directories:

| Case | Setup | Expected errorCode | Required details |
|---|---|---|---|
| Missing manifest | Empty temp directory | `MANIFEST_MISSING` | `packRoot`, `manifestPath` |
| Invalid JSON | Temp dir with `{ invalid` in pack.json | `MANIFEST_INVALID_JSON` | `manifestPath` |
| Unsafe asset path | Temp dir with `../escape.json` in manifest | `ASSET_UNSAFE_PATH` | `validationError` |
| Missing asset | Temp dir with `stories/missing.json` (dir exists, file absent) | `ASSET_MISSING` | `validationError` |
| Nonexistent path | Path that does not exist | `PACK_NOT_FOUND` | `target` |

---

## Boundary Guarantees

1. **No rendering**: The loader never imports or invokes Content Engine, Theme Engine, or Renderer Engine.
2. **No adapter/planner extraction**: The loader reads manifest metadata only.
3. **No source-of-truth migration**: `--story` remains registry-backed. `--pack-story` remains explicit opt-in.
4. **No mutable state**: PackRuntimeContext is deep-frozen. Registry is in-memory only.
5. **No network access**: The loader only reads local files.
6. **No code execution**: Assets are resolved as paths, never imported or evaluated.

---

## Test Isolation Requirement

The contract smoke script (`scripts/pack-loader-contract-smoke.js`) runs multiple loader and inspection checks within a single Node process. Because `pack-registry` is a module-level singleton, calling `loadPack()` or `loadAllPacks()` registers a pack context that persists across subsequent calls. If `inspectPack()` calls `loadPack()` after `loadAllPacks()` has already registered the same pack, the registry returns `DUPLICATE_PACK_ID`.

**Test isolation requirement**: When running multiple loader/inspection checks in the same process, the smoke script must call `packRegistry.clear()` between isolated checks. This is a **test isolation requirement**, not a public runtime behavior. Production CLI commands run in separate Node processes (each `node run.js` invocation is a fresh process), so this is not a concern for normal CLI usage.

**Never remove the registry clear from the smoke script.** It is required for correct test execution.

---

## Future Work

### M6.5 — Pack Loader Contract Regression Guard

- Add the smoke script to CI/CD pipeline.
- Run before every merge to the `registry/packages/ppt-factory` package.
- Add contract test fixtures for edge cases (nested packs, symlinks, permissions).

### M7 — Pack Loader Validation Enhancement (optional)

- Formalize schema validation rules in a separate contract document.
- Add structured error recovery suggestions (e.g., "add pack.json", "fix path traversal").
- Consider adding a `--dry-run` CLI flag for diagnostic purposes.

---

## Version History

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-07-04 | Initial contract formalization (M6.4) |
