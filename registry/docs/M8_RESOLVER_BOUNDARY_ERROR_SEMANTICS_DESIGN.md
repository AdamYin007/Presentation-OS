# M8.4 Resolver Boundary & Error Semantics Design

> **Version**: 1.0.0
> **Date**: 2026-07-06
> **Status**: Design — Documentation Only
> **Related**: M8.1 Contract Hardening Design (PR70), M8.2 PackRuntimeContext Schema (PR71), M8.3 Multi-Pack Discovery (PR72)
> **Category**: Architecture — Resolver Boundary & Error Taxonomy
> **Target Phase**: M8.4 (error semantics design only)

---

## Purpose

Define the **Pack Story Resolver** boundary contract, input/output shapes, error taxonomy, and errorCode naming rules. This document establishes what the resolver assumes, guarantees, and returns — and how its error semantics relate to the Pack Loader, Pack Registry, and CLI.

This is **documentation-only**. No resolver implementation is changed. No CLI behavior is altered.

## Scope

This document covers:

1. **Resolver boundary** — what the resolver owns vs. what it delegates
2. **Input/output contract** — function signatures, return shapes, field semantics
3. **Error taxonomy** — categorized errorCode values and their meanings
4. **errorCode naming rules** — conventions for existing and future error codes
5. **Compatibility implications** — how error semantics affect CLI output and downstream consumers
6. **Multi-pack implications** — how resolver errors interact with multi-pack discovery (M8.3)
7. **Migration considerations** — safe evolution of error semantics across M8 milestones

## Non-goals

- **No resolver implementation changes.** M8.4 does not modify `pack-story-resolver.js`.
- **No CLI behavior changes.** `bin/run.js` error handling remains unchanged.
- **No new errorCode values.** Existing codes are documented, not replaced.
- **No schema validation.** No JSON schema files, no TypeScript types.
- **No PackRuntimeContext consumption.** Resolver does not read PackRuntimeContext sections.
- **No resolver/loader consolidation.** Resolver and loader remain separate modules.
- **No source-of-truth migration.** Registry remains default.
- **No CI integration.** Manual guards remain manual.
- **No SDK API.** No public API changes.
## Baseline: Current Resolver Behavior

### Current Implementation (as of M8.3)

The Pack Story Resolver (`pack-story-resolver.js`) provides three exported functions:

| Function | Input | Output | Purpose |
|---|---|---|---|
| `parsePackStoryInput(value)` | `string` (e.g. `"digital-pathology/digital-pathology-15"`) | `{ok, packId, storyId, error?, errorCode?}` | Validate format, reject unsafe paths |
| `resolvePackStory(value, options?)` | `string`, `{packsRoot?}` | `{ok, packId, storyId, packPath, storyPath, storyAbsolutePath, validation, manifest}` or `{ok: false, error, errorCode, packId, storyId, ...details}` | Resolve pack story path with 10 validation steps |
| `printPackStoryResolution(result)` | `object` (from resolvePackStory) | `number` (0 = success, 1 = error) | Console output for CLI |

### Current Error Codes in Resolver

| errorCode | Condition | Step |
|---|---|---|
| `MISSING_VALUE` | Empty or whitespace input | Parse (Step 0) |
| `INVALID_FORMAT` | Wrong slash count, absolute path, `.json` suffix | Parse (Steps 1-4) |
| `UNSAFE_PATH` | `..` in packId/storyId, or resolved path escapes pack root | Parse / Resolve (Steps 5, 8) |
| `PACK_NOT_FOUND` | Pack directory doesn't exist or no `pack.json` | Locate (Step 2-3) |
| `VALIDATION_FAILED` | `validatePack()` returns errors | Validate (Step 4) |
| `INVALID_JSON` | Cannot `JSON.parse` pack.json | Read (Step 5) |
| `STORY_NOT_DECLARED` | Story ID not in `manifest.contents.stories` | Match (Step 5-6) |
| `MULTIPLE_MATCHES` | More than one declared story matches the ID | Match (Step 7) |
| `FILE_MISSING` | Declared story file doesn't exist on disk | Exist (Step 9) |

### Current Input/Output Shape

**Input**: Single string `<pack-id>/<story-id>`, optionally with `{packsRoot}` override.

**Success output**:
```javascript
{
  ok: true,
  packId: "digital-pathology",
  storyId: "digital-pathology-15",
  packPath: "/path/to/presentation-packs/digital-pathology",
  storyPath: "digital-pathology/stories/digital-pathology-15.json",
  storyAbsolutePath: "/path/to/presentation-packs/digital-pathology/stories/digital-pathology-15.json",
  validation: "passed",
  manifest: { name, version, status }
}
```

**Error output**:
```javascript
{
  ok: false,
  error: "human-readable message",
  errorCode: "PACK_NOT_FOUND",
  packId: "nonexistent",
  storyId: "some-story",
  // optional details vary by errorCode
}
```

### Current Caller (bin/run.js)

`bin/run.js` calls `resolvePackStory()` and `printPackStoryResolution()`. The print function converts `ok:false` to exit code 1 and prints the error to stderr. The CLI does **not** use `errorCode` for routing — it just prints the error message.
## 1. Resolver Boundary Definition

### B1. Resolver Ownership

The Pack Story Resolver **owns** the following responsibilities:

| Responsibility | Owned By | Delegates To |
|---|---|---|
| Input format validation (`<pack-id>/<story-id>`) | Resolver | — |
| Path safety checks (`..`, absolute paths) | Resolver | — |
| Pack directory existence | Resolver | `fs.existsSync()` |
| `pack.json` existence | Resolver | `fs.existsSync()` |
| Manifest JSON parsing | Resolver | `JSON.parse()` |
| Story ID matching against declared assets | Resolver | — |
| Story file existence on disk | Resolver | `fs.existsSync()` |
| Absolute path resolution | Resolver | `path.resolve()` |
| Path containment verification | Resolver | `startsWith()` |

The Resolver **does NOT own**:

| Responsibility | Owned By | Reason |
|---|---|---|
| Pack discovery | `pack-discovery.js` | Discovery finds packs; resolver resolves stories |
| Pack loading (context building) | `pack-loader.js` | Loader builds PackRuntimeContext; resolver reads manifest |
| Pack validation (asset safety) | `pack-validator.js` | Validator checks asset paths; resolver re-validates manifest |
| Registry management | `pack-registry.js` | Registry stores contexts; resolver is read-only |
| Rendering | `bin/run.js` | Caller loads story JSON and renders; resolver only resolves paths |
| CLI output formatting | `bin/run.js` | CLI formats error messages; resolver returns structured data |

### B2. Resolver Contract with Pack Loader

**Assumption**: The resolver and loader operate on **different layers** of the pack lifecycle:

```
CLI (run.js)
  ├── --pack-story → Resolver (resolvePackStory)
  │                     → loads story JSON → renders
  └── --inspect-pack → Loader (loadPack)
                        → builds PackRuntimeContext → inspects
```

The resolver does **not** call the loader. The loader does **not** call the resolver. They are independent code paths.

**Risk**: If the resolver and loader use different validation logic (e.g., resolver calls `validatePack()` but loader uses `pack-validator.js`), inconsistencies may arise. M8.4 documents the desired state; M8.5+ may consolidate validation.

### B3. Resolver Contract with Pack Registry

**Assumption**: The resolver operates **without** the registry.

- `resolvePackStory()` finds packs via `packsRoot` directory, not via registry lookup.
- The registry is populated by the loader (`pack-loader.js`), which is a separate code path.
- If a pack is in the registry but the resolver can't find it on disk, the resolver returns `PACK_NOT_FOUND`.
- If a pack is on disk but not in the registry, the resolver succeeds but the registry doesn't know about it.

**Implication**: Resolver success does **not** imply registry consistency. Registry consistency is a loader concern.

### B4. Resolver Contract with CLI

**Assumption**: The resolver returns structured data; the CLI formats it.

- `printPackStoryResolution()` is the bridge between resolver output and CLI output.
- On error: prints `result.error` to stderr, returns exit code 1.
- On success: prints resolution details to stdout, returns exit code 0.
- The CLI does **not** inspect `result.errorCode` for routing — it only checks `result.ok`.

**Risk**: If future CLI changes start routing on `errorCode`, the current contract must be preserved. M8.4 documents this as a stability guarantee.
## 2. Input/Output Contract

### C1. Input Contract

**Function**: `resolvePackStory(value, options?)`

| Parameter | Type | Required | Constraints |
|---|---|---|---|
| `value` | `string` | Yes | Must match `<pack-id>/<story-id>` format |
| `options.packsRoot` | `string` | No | Default: `"presentation-packs"`; must be relative path |

**Input validation rules** (enforced by `parsePackStoryInput`):
1. Value must be non-empty
2. Value must contain exactly one `/` separator
3. `packId` and `storyId` must be non-empty after trim
4. `packId` must not start with `/` (no absolute paths)
5. Neither `packId` nor `storyId` may contain `..` (no path traversal)
6. `storyId` must not end with `.json` (stem-only format)

**Precondition**: The caller must ensure `value` is a string. Null/undefined is treated as empty string → `MISSING_VALUE`.

### C2. Output Contract — Success

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | Always `true` on success |
| `packId` | `string` | The pack identifier (from input) |
| `storyId` | `string` | The story identifier (from input) |
| `packPath` | `string` | Relative pack directory path from `packsRoot` |
| `storyPath` | `string` | Relative story path from `packsRoot` (e.g., `digital-pathology/stories/...`) |
| `storyAbsolutePath` | `string` | Absolute filesystem path to the story JSON |
| `validation` | `string` | Always `"passed"` on success |
| `manifest` | `object` | `{name, version, status}` from `pack.json` |

**Guarantees**:
- `storyAbsolutePath` always starts with `packPath` (or `packsRoot`).
- `manifest` always contains `name`, `version`, `status` (may be empty strings if missing from pack.json).
- `storyPath` uses forward slashes (POSIX convention, consistent with `path.relative()`).

### C3. Output Contract — Error

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | Always `false` on error |
| `error` | `string` | Human-readable error message |
| `errorCode` | `string` | Machine-readable error classification |
| `packId` | `string` | The pack identifier (from input, always present) |
| `storyId` | `string` | The story identifier (from input, always present) |
| `details` | `object\|null` | Additional context (varies by errorCode) |

**Guarantees**:
- `errorCode` is always one of the documented values (Section 3).
- `packId` and `storyId` are always included in error results for caller context.
- `error` message is stable across implementations (same errorCode → same message pattern).

### C4. Stability Contract

**Principle**: Once an `errorCode` is documented, its meaning is **frozen**.

| Change Type | Allowed? | Example |
|---|---|---|
| Add new errorCode | Yes | `NEW_CODE` for a new scenario |
| Rename existing errorCode | No | `PACK_NOT_FOUND` → `PACK_MISSING` breaks callers |
| Change errorCode meaning | No | `INVALID_FORMAT` no longer means "bad slash count" |
| Add fields to success output | Yes | New optional fields are additive |
| Remove fields from success output | No | Breaking change |
| Change error message text | Yes (cosmetic) | As long as errorCode is stable |
| Change error message structure | No | Callers may parse error messages |
## 3. Error Taxonomy

### E1. Error Category Framework

All resolver errors fall into one of four categories:

| Category | Prefix | Description | Examples |
|---|---|---|---|
| **Input Errors** | `INPUT_*` | Malformed or unsafe input from caller | `MISSING_VALUE`, `INVALID_FORMAT`, `UNSAFE_PATH` |
| **Discovery Errors** | `PACK_*` | Pack not found or inaccessible | `PACK_NOT_FOUND`, `PACKS_DIR_NOT_FOUND` |
| **Validation Errors** | `VALIDATION_*` | Pack or story fails validation | `VALIDATION_FAILED`, `STORY_NOT_DECLARED`, `MULTIPLE_MATCHES` |
| **File Errors** | `FILE_*` | Filesystem-level issues | `FILE_MISSING`, `INVALID_JSON` |

### E2. Current Error Code Inventory

The following table documents all errorCode values used by the resolver and related modules:

#### Resolver Error Codes

| errorCode | Category | Condition | Severity | Caller Action |
|---|---|---|---|---|
| `MISSING_VALUE` | Input | Empty `--pack-story` value | Low | Fix CLI invocation |
| `INVALID_FORMAT` | Input | Bad `<pack>/<story>` format | Low | Fix CLI invocation |
| `UNSAFE_PATH` | Input | Path traversal attempt (`..`) | **High** | Log and reject |
| `PACK_NOT_FOUND` | Discovery | Pack directory or manifest missing | Medium | Check pack id / packsRoot |
| `VALIDATION_FAILED` | Validation | `validatePack()` errors | Medium | Fix pack manifest/assets |
| `INVALID_JSON` | File | Cannot parse `pack.json` | Medium | Fix pack.json |
| `STORY_NOT_DECLARED` | Validation | Story not in `manifest.contents.stories` | Medium | Check story id / pack contents |
| `MULTIPLE_MATCHES` | Validation | Multiple declared stories match ID | Medium | Use more specific story id |
| `FILE_MISSING` | File | Declared story file not on disk | Medium | Rebuild pack or fix path |

#### Pack Loader Error Codes

| errorCode | Category | Condition | Severity | Caller Action |
|---|---|---|---|---|
| `PACKS_DIR_NOT_FOUND` | Discovery | Scan directory doesn't exist | Medium | Create directory or fix path |
| `MANIFEST_MISSING` | Discovery | `pack.json` not in directory | Medium | Add pack.json |
| `MANIFEST_INVALID_JSON` | File | Invalid `pack.json` | Medium | Fix pack.json |
| `VALIDATION_FAILED` | Validation | Asset/path validation errors | Medium | Fix pack assets |
| `ASSET_UNSAFE_PATH` | Validation | Path traversal in asset path | **High** | Fix pack manifest |
| `ASSET_MISSING` | Validation | Declared asset file missing | Medium | Rebuild pack |
| `DUPLICATE_PACK_ID` | Registry | Pack already in registry | Low | Expected in multi-pack |
| `PACK_NOT_FOUND` | Discovery | Pack id not in scan directories | Medium | Check pack id |
| `PACK_LOAD_FAILED` | General | Generic load failure | Medium | Check individual errors |

#### Pack Registry Error Codes

| errorCode | Category | Condition | Severity |
|---|---|---|---|
| `VALIDATION_FAILED` | Validation | Context missing packId | Medium |
| `DUPLICATE_PACK_ID` | Registry | Pack already registered | Low |

### E3. Error Code Naming Rules

**Rule 1: UPPERCASE_WITH_UNDERSCORES** — All error codes use uppercase letters and underscores.

**Rule 2: Descriptive noun phrase** — Error codes describe **what** went wrong, not **where**.
- Good: `PACK_NOT_FOUND` (describes the condition)
- Bad: `RESOLVER_PACK_NOT_FOUND` (describes the module)
- Bad: `Step2Failure` (describes the implementation)

**Rule 3: Category prefix for new codes** — New error codes must use the category prefix:
- Input errors: `INPUT_*` (e.g., `INPUT_TOO_LONG`)
- Discovery errors: `PACK_*` (e.g., `PACK_VERSION_CONFLICT`)
- Validation errors: `VALIDATION_*` (e.g., `VALIDATION_SCHEMA_MISMATCH`)
- File errors: `FILE_*` (e.g., `FILE_PERMISSION_DENIED`)

**Rule 4: No module-specific codes** — Error codes are shared across the pack system. A code defined in the resolver may be reused by the loader or inspector.

**Rule 5: Severity annotation** — Every error code has an implicit severity:
- **Low**: User can fix by changing input (typos, format errors)
- **Medium**: User or pack author must fix (missing files, validation errors)
- **High**: Security concern (path traversal, unsafe paths) — must be logged

**Rule 6: Stability guarantee** — Once documented, an error code's meaning is frozen. See Section C4.
## 4. errorCode Naming Rules

### N1. Naming Convention

All errorCode values follow this grammar:

```
errorCode ::= CATEGORY_PREFIX "_" DESCRIPTION
CATEGORY_PREFIX ::= "INPUT" | "PACK" | "VALIDATION" | "FILE" | "REGISTRY" | "GENERAL"
DESCRIPTION ::= WORD ("_" WORD)*
WORD ::= [A-Z][A-Z0-9]*
```

Examples:
- `PACK_NOT_FOUND` ✅
- `STORY_NOT_DECLARED` ✅ (validation category, no prefix needed — legacy)
- `INPUT_FORMAT_INVALID` ✅ (new code follows prefix rule)
- `resolver_error_1` ❌ (lowercase)
- `PackNotFound` ❌ (camelCase)
- `ERR0R` ❌ (contains digit)

### N2. Prefix Assignment Rules

| When to Use | Prefix | Examples |
|---|---|---|
| Input parsing/validation fails | `INPUT` | `INPUT_MISSING_VALUE`, `INPUT_INVALID_FORMAT`, `INPUT_UNSAFE_PATH` |
| Pack discovery fails | `PACK` | `PACK_NOT_FOUND`, `PACK_VERSION_CONFLICT`, `PACK_ID_DUPLICATE`, `PACK_DISCOVERY_FAILED` |
| Manifest/asset validation fails | `VALIDATION` | `VALIDATION_FAILED`, `STORY_NOT_DECLARED`, `MULTIPLE_MATCHES` |
| Filesystem operations fail | `FILE` | `FILE_MISSING`, `INVALID_JSON`, `FILE_PERMISSION_DENIED` |
| Registry operations fail | `REGISTRY` | `DUPLICATE_PACK_ID`, `REGISTRY_FULL` |
| Generic/unexpected failures | `GENERAL` | `PACK_LOAD_FAILED`, `RESOLVER_INTERNAL_ERROR` |

### N3. Legacy Code Handling

Some existing error codes don't follow the prefix convention. These are **grandfathered** — they remain stable but new codes should follow the prefix rules.

| Legacy Code | Category | Follows Prefix Rule? |
|---|---|---|
| `MISSING_VALUE` | Input | No → should be `INPUT_MISSING_VALUE` |
| `INVALID_FORMAT` | Input | No → should be `INPUT_INVALID_FORMAT` |
| `UNSAFE_PATH` | Input | No → should be `INPUT_UNSAFE_PATH` |
| `PACK_NOT_FOUND` | Discovery | ✅ (has PACK prefix) |
| `VALIDATION_FAILED` | Validation | ✅ (has VALIDATION prefix) |
| `INVALID_JSON` | File | No → should be `FILE_INVALID_JSON` |
| `STORY_NOT_DECLARED` | Validation | No → should be `VALIDATION_STORY_NOT_DECLARED` |
| `MULTIPLE_MATCHES` | Validation | No → should be `VALIDATION_MULTIPLE_MATCHES` |
| `FILE_MISSING` | File | ✅ (has FILE prefix) |
| `DUPLICATE_PACK_ID` | Registry | ✅ (has PACK prefix, acts as REGISTRY) |
| `PACK_LOAD_FAILED` | General | ✅ (has PACK prefix, acts as GENERAL) |
| `PACKS_DIR_NOT_FOUND` | Discovery | ✅ (has PACK prefix) |
| `MANIFEST_MISSING` | Discovery | No → should be `PACK_MANIFEST_MISSING` |
| `MANIFEST_INVALID_JSON` | File | No → should be `FILE_MANIFEST_INVALID_JSON` |
| `ASSET_UNSAFE_PATH` | Validation | No → should be `VALIDATION_ASSET_UNSAFE_PATH` |
| `ASSET_MISSING` | Validation | No → should be `VALIDATION_ASSET_MISSING` |

**Policy**: Legacy codes remain stable. Renaming is a **breaking change** that requires M9+ and a deprecation period. M8.4 documents the desired naming convention; M8.5+ may introduce prefixed aliases.

### N4. Future Code Reservation

Reserved errorCode prefixes for future use:

| Prefix | Reserved For |
|---|---|
| `INPUT_*` | All input parsing/format errors |
| `PACK_VERSION_CONFLICT` | Same pack ID, different versions (M8.3 → M8.4) |
| `PACK_ID_DUPLICATE` | Duplicate pack ID in registry (already exists as DUPLICATE_PACK_ID) |
| `PACK_DISCOVERY_FAILED` | Discovery scan fails (e.g., permission denied) |
| `PACK_CONTEXT_INCOMPLETE` | Pack loaded but context missing required sections |
| `PACK_OUTPUT_COLLISION` | Output path would overwrite another pack's output |
| `PACK_RESOLVER_INTERNAL_ERROR` | Unexpected internal error in resolver |
| `VALIDATION_SCHEMA_MISMATCH` | Pack manifest doesn't match documented schema |
| `FILE_PERMISSION_DENIED` | Cannot read file due to permissions |
| `REGISTRY_FULL` | Registry capacity exceeded |
| `GENERAL_TIMEOUT` | Operation timed out |
## 5. Compatibility Implications

### COMP1. CLI Error Mapping

**Current behavior**: `bin/run.js` maps errorCode to user-friendly messages via a switch statement.

```javascript
switch (inspectCode) {
  case "PACK_NOT_FOUND": console.error("Presentation Pack not found: " + inspectPackArg); break;
  case "MANIFEST_INVALID_JSON": console.error("Invalid pack.json: ..."); break;
  // ... etc
}
```

**Impact of M8.4**: The error code mapping in `bin/run.js` must remain stable. New error codes added in M8.4+ documentation don't require immediate CLI handling — they are documented for future implementation.

**Guarantee**: Existing errorCode values in the switch statement are not renamed or removed.

### COMP2. Error Message Stability

**Current behavior**: Error messages are printed to stderr via `console.error(result.error)`.

**Impact of M8.4**: Error message text may change (cosmetic updates), but the errorCode must remain stable. Callers should not parse error message text — they should use errorCode for routing.

**Recommendation**: Future implementations should route on `errorCode`, not on error message content.

### COMP3. Structured Error Details

**Current behavior**: Error results include `packId` and `storyId` for context, but `details` field is optional and varies by errorCode.

**Impact of M8.4**: Standardize the `details` field across all error codes:

| errorCode | details fields |
|---|---|
| `PACK_NOT_FOUND` | `{target}` |
| `PACK_VERSION_CONFLICT` | `{packId, versions: [{path, version}], policy}` |
| `PACK_ID_DUPLICATE` | `{packId, existingPath, newPath}` |
| `PACK_DISCOVERY_FAILED` | `{scanDir, reason}` |
| `PACK_CONTEXT_INCOMPLETE` | `{packId, missingSections: [...]}` |
| `PACK_OUTPUT_COLLISION` | `{packId, outputPath, existingPack}` |
| `PACK_RESOLVER_INTERNAL_ERROR` | `{operation, cause}` |

**Risk**: Adding `details` fields is additive and non-breaking. Removing or renaming them requires a deprecation period.

### COMP4. Exit Code Stability

**Current behavior**: 
- `printPackStoryResolution()` returns 0 on success, 1 on error.
- `bin/run.js` uses `process.exit(1)` on error, `process.exit(0)` on success.

**Impact of M8.4**: Exit codes remain stable. No new exit code values are introduced. The distinction between "input error" (exit 1) and "system error" (exit 1) is not encoded in exit codes — only in errorCode.

### COMP5. Downstream Consumer Contract

**Assumption**: The resolver error contract is consumed by:
1. `bin/run.js` CLI (primary consumer)
2. Future SDK/API (hypothetical, not implemented)
3. CI/CD scripts (secondary consumer, may parse stderr)

**Guarantee**: The structured error shape `{ok, error, errorCode, packId, storyId, details?}` is the stable contract. All consumers rely on this shape, not on message text.
## 6. Multi-Pack Implications

### MP1. Resolver + Multi-Pack Discovery Interaction

**Assumption**: The resolver operates on a **single pack at a time**, even in multi-pack scenarios.

- `resolvePackStory("<pack-id>/<story-id>")` looks up `<pack-id>` in the filesystem, not in the registry.
- In multi-pack scenarios, the same `<pack-id>` may exist in multiple directories.
- The resolver uses `packsRoot` to find the pack — it does **not** consider directory precedence.

**M8.3 connection**: M8.3 defines directory precedence for discovery. The resolver does not implement precedence — it only resolves paths. Precedence is a discovery/loader concern.

### MP2. Multi-Pack Error Scenarios

| Scenario | errorCode | Resolution |
|---|---|---|
| Same pack ID in 2 dirs, same version | `PACK_NOT_FOUND` (ambiguous) or first-match | M8.4 documents; M8.5 implements disambiguation |
| Same pack ID in 2 dirs, different versions | `PACK_VERSION_CONFLICT` (proposed) | M8.3 recommends error; M8.4 documents; M8.5 implements |
| Pack ID exists in registry but not on disk | `PACK_NOT_FOUND` | Resolver doesn't consult registry |
| Story exists in multiple packs | `MULTIPLE_MATCHES` (already exists) | Resolver returns first match; M8.5 may improve |
| Output path collision between packs | `PACK_OUTPUT_COLLISION` (proposed) | M8.3 defines isolation; M8.4 documents error |

### MP3. Resolver Registry Independence

**Assumption**: Resolver independence from registry is a **feature, not a bug**.

- The resolver can resolve pack stories without the loader running first.
- This enables `--pack-story` to work even when `loadAllPacks()` hasn't been called.
- In multi-pack scenarios, the resolver finds packs by filesystem path, not by registry state.

**Risk**: If the loader and resolver use different pack locations (e.g., loader scans `presentation-packs` but resolver uses `external-packs`), they may disagree on pack availability. M8.4 documents that both must use the same `packsRoot`.

### MP4. Version Conflict Resolution in Multi-Pack

**Assumption**: When the same pack ID exists in multiple directories with different versions:

1. Discovery (M8.3) detects the conflict and returns `VERSION_CONFLICT`.
2. Loader (M8.4 error semantics) propagates the conflict as `PACK_VERSION_CONFLICT`.
3. CLI (`bin/run.js`) reports the conflict to the user.
4. User must disambiguate by specifying which pack to use, or by removing the duplicate.

**M8.3 policy**: Error on version conflicts (Option C). M8.4 documents the errorCode for this scenario.
## 7. Migration Considerations

### MIG1. Safe Evolution Across M8 Milestones

| Milestone | Scope | Error Code Changes | Breaking? |
|---|---|---|---|
| M8.1 (PR70) | Contract hardening | None | No |
| M8.2 (PR71) | Schema documentation | None | No |
| M8.3 (PR72) | Discovery assumptions | None | No |
| **M8.4 (PR72)** | **Error semantics design** | **None** | **No** |
| M8.5 (future) | Error implementation | Add new codes, deprecate legacy names | No (additive) |
| M8.5 (PR74) | Validation gates | Document enforcement framework | No (documentation) |
| M9.0 (future) | Error code renaming | Rename legacy codes to prefixed versions | Yes (requires deprecation period) |

### MIG2. Deprecation Strategy

**Phase 1 (M8.4)**: Document desired naming convention. Keep all existing codes stable.

**Phase 2 (M8.5)**: Introduce prefixed aliases alongside legacy codes. M8.5 (PR74) defines validation gates that enforce error semantics. Both resolve to the same error.
- Example: `INVALID_FORMAT` continues to work; `INPUT_INVALID_FORMAT` is also accepted.
- CLI switch statements handle both legacy and prefixed codes.

**Phase 3 (M9.0)**: Remove legacy codes. Only prefixed codes remain.
- Requires a deprecation period (at least one full release cycle).
- CLI help text updated to show prefixed codes.

### MIG3. Backward Compatibility Guarantee

**Principle**: M8.4 maintains full backward compatibility.

- No existing errorCode is renamed.
- No existing errorCode meaning is changed.
- No existing input/output field is removed.
- No existing CLI behavior is altered.
- No existing exit code is changed.

**Risk**: The only risk is documentation drift — if the documented behavior doesn't match the actual implementation. M8.4 ensures the documentation matches the current implementation exactly.

### MIG4. Implementation Readiness Checklist

Before M8.5 implements error semantics changes, verify:

- [ ] M8.4 document reviewed and approved
- [ ] All existing errorCode values documented and verified against source
- [ ] Legacy code mapping in `bin/run.js` reviewed
- [ ] Error details structure standardized
- [ ] Multi-pack error scenarios tested (manually)
- [ ] CLI help text updated with new errorCode descriptions
- [ ] No breaking changes introduced
## 8. Cross-Reference: Requirements Traceability

The following table maps the 7 required errorCode topics to their document sections:

| Requirement | Section | Covered? |
|---|---|---|
| Resolver boundary definition | Section 1 (B1-B4) | ✅ |
| Input/output contract | Section 2 (C1-C4) | ✅ |
| Error taxonomy | Section 3 (E1-E3) | ✅ |
| errorCode naming rules | Section 4 (N1-N4) | ✅ |
| Compatibility implications | Section 5 (COMP1-COMP5) | ✅ |
| Multi-pack implications | Section 6 (MP1-MP4) | ✅ |
| Migration considerations | Section 7 (MIG1-MIG4) | ✅ |

### Required errorCode coverage:

| errorCode | Section | Description |
|---|---|---|
| `PACK_NOT_FOUND` | E2, E3, COMP1, MP2 | Pack directory or manifest missing |
| `PACK_ID_DUPLICATE` | E2, E3, N4 | Duplicate pack ID in registry (maps to existing `DUPLICATE_PACK_ID`) |
| `PACK_VERSION_CONFLICT` | E3, N4, MP2 | Same pack ID, different versions across directories |
| `PACK_DISCOVERY_FAILED` | E3, N4, MP2 | Discovery scan fails (permission denied, etc.) |
| `PACK_CONTEXT_INCOMPLETE` | E3, N4 | Pack loaded but context missing required sections |
| `PACK_OUTPUT_COLLISION` | E3, N4, MP2 | Output path would overwrite another pack's output |
| `PACK_RESOLVER_INTERNAL_ERROR` | E3, N4 | Unexpected internal error in resolver |

## Open Questions

1. **Should `INVALID_FORMAT` be renamed to `INPUT_INVALID_FORMAT` in M8.5?**
   - Pro: Consistent with naming convention.
   - Con: Breaking change for any external consumers parsing errorCode.
   - **Recommendation**: Add alias in M8.5, rename in M9.0.

2. **Should the resolver return `details` on all error codes?**
   - Pro: Consistent structured error reporting.
   - Con: Some errors (e.g., `MISSING_VALUE`) have no additional context.
   - **Recommendation**: `details` is always present but may be `{}` for simple errors.

3. **Should errorCode values be namespaced by module?** (`resolver.PACK_NOT_FOUND` vs `loader.PACK_NOT_FOUND`)
   - Pro: Clear ownership.
   - Con: Breaks the principle of shared error taxonomy.
   - **Recommendation**: No namespace. Error codes are global within the pack system.

4. **Should `printPackStoryResolution` be replaced with a structured logger?**
   - Pro: Better CI/CD integration, machine-readable output.
   - Con: Adds dependency, changes CLI output format.
   - **Recommendation**: Defer to M9+.

5. **Should error codes include severity levels?** (`errorCode: {code, severity}`)
   - Pro: Enables automated risk classification.
   - Con: Adds complexity to error shape.
   - **Recommendation**: Severity is implicit in errorCode category (Section E3). No separate field needed.

## Review Checklist

- [x] M8_RESOLVER_BOUNDARY_ERROR_SEMANTICS_DESIGN.md created
- [x] Documentation-only (no code changes)
- [x] No package.json changes
- [x] No bin/run.js changes
- [x] No src/ changes
- [x] No scripts/ change
- [x] No story JSON changes
- [x] No adapters/planners changes
- [x] Resolver boundary defined (4 sections: ownership, loader, registry, CLI)
- [x] Input/output contract defined (success + error shapes, stability guarantees)
- [x] Error taxonomy defined (4 categories, 16+ codes documented)
- [x] errorCode naming rules defined (grammar, prefix assignment, legacy handling)
- [x] All 7 required errorCode values covered
- [x] Compatibility implications analyzed (CLI, messages, details, exit codes, consumers)
- [x] Multi-pack implications defined (resolver independence, conflict scenarios)
- [x] Migration considerations defined (deprecation strategy, backward compat)
- [x] No runtime behavior changes
- [x] No schema validation code
- [x] No JSON schema files
- [x] No PackRuntimeContext implementation changes
- [x] No resolver implementation changes
- [x] No CLI behavior changes

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-07-06 | Hermes | Initial Resolver Boundary & Error Semantics Design (M8.4) |
