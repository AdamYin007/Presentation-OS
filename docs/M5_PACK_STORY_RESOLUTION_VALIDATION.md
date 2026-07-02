# M5 Pack Story Resolution Validation

> **Date**: 2026-07-02
> **Author**: Agnes-2.0-Flash (MD Senior Implementation Engineer)
> **Context**: PR49 — pre-implementation design validation for future --pack-story
> **Governance**: RFC-0001, RFC-0003 — design documentation only, no code changes
> **Preceded by**: M5.0 Pack Runtime Integration Design Note (`docs/M5_PACK_RUNTIME_INTEGRATION_DESIGN.md`)

---

## 1. Purpose

This document validates the future **Pack Story Resolution** model before any code is written. It is a pre-implementation design checkpoint.

**Scope of this PR:**
- Design validation only. No runtime behavior changes.
- No code is implemented. No CLI command is added.
- The goal is to make M5.2 (CLI guard) and M5.3 (resolver implementation) safer by agreeing on input format, resolution rules, error model, and test matrix upfront.

**Out of scope:**
- Implementing `--pack-story`
- Implementing a pack story resolver
- Changing `--story` behavior
- Planner or adapter extraction

---

## 2. Baseline

Current state as of `m4-6-pack-system-checkpoint`:

| Component | State |
|-----------|-------|
| `--help` | Lists all supported CLI commands |
| `--validate-pack` | Validates pack manifest and assets |
| `--list-packs` | Discovers all packs under `presentation-packs/` |
| `--inspect-pack` | Reads pack.json metadata, assets, runtime, governance |
| `--story <id>` | Renders from `registry/packages/ppt-factory/story/*.json` |
| `--legacy-renderer` | Falls back to legacy renderer |
| `--layout-engine` | Compatibility flag |
| `--pack-story` | **Not implemented** |

### Digital Pathology Pack Current State

- Pack path: `presentation-packs/digital-pathology/`
- Manifest: `pack.json` declares `contents.stories: ["stories/digital-pathology-15.json"]`
- Story file exists: `presentation-packs/digital-pathology/stories/digital-pathology-15.json`
- Pack status: `experimental`, `loadedByDefault: false`, `requiresPackLoader: true`

### Referenced Design Documents

- [M5 Pack Runtime Integration Design Note](M5_PACK_RUNTIME_INTEGRATION_DESIGN.md) — Section 5 (entry point), Section 6 (resolution model), Section 7 (source-of-truth)
- [M4 Pack System Checkpoint](M4_PACK_SYSTEM_CHECKPOINT.md) — Section 3 (capabilities), Section 6 (pack contents)

---

## 3. Proposed Future Input Format

### Canonical Format

```
--pack-story <pack-id>/<story-id>
```

### Example

```bash
node registry/packages/ppt-factory/bin/run.js --pack-story digital-pathology/digital-pathology-15
```

### Valid Format Rules

| Rule | Description |
|------|-------------|
| Separator | Exactly one `/` separating pack-id from story-id |
| Pack ID | Directory name under `presentation-packs/` (non-empty, no path separators) |
| Story ID | Filename stem without `.json` extension |
| No absolute paths | Must not start with `/` |
| No path traversal | Must not contain `..` |
| No empty segments | Both pack-id and story-id must be non-empty |

### Rejected Examples

| Input | Rejected Because |
|-------|-----------------|
| `--pack-story digital-pathology` | No slash — missing story-id |
| `--pack-story digital-pathology/` | Empty story-id |
| `--pack-story /digital-pathology/digital-pathology-15` | Absolute path in pack-id |
| `--pack-story digital-pathology/../secret` | Path traversal |
| `--pack-story digital-pathology/stories/digital-pathology-15.json` | Nested path + `.json` extension |
| `--pack-story digital-pathology/digital-pathology-15.json` | `.json` extension on story-id |
| `--pack-story //double-slash` | Empty pack-id |
| `--pack-story pack//story` | Multiple slashes |

---

## 4. Pack Resolution Rules

Future resolution order for `--pack-story <pack-id>/<story-id>`:

| Step | Action | Failure |
|------|--------|---------|
| 1 | Locate `presentation-packs/` root directory | Abort if root not found |
| 2 | Match pack by directory name (pack-id) | "Presentation Pack not found: \<pack-id\>" |
| 3 | Require `pack.json` exists in matched pack directory | "Presentation Pack not found: \<pack-id\>" |
| 4 | Validate pack manifest using existing validator | "Presentation Pack validation failed: \<pack-id\>" |
| 5 | Require validation passes before proceeding | Abort with validation errors |
| 6 | Read `pack.json.contents.stories` array | "Story not declared in pack: \<story-id\>" |
| 7 | Match story-id against declared story assets | "Story not declared in pack: \<story-id\>" |
| 8 | Resolve actual story path: `<pack-root>/stories/<story-id>.json` | "Declared story file missing: \<path\>" |
| 9 | Confirm resolved path stays inside pack root | "Unsafe pack story path: \<path\>" |
| 10 | Return resolved story path to caller | — |

**Key principle:** Steps 4–5 (validation) occur **before** any story resolution. A pack that fails validation cannot be used for story resolution, regardless of whether the story file exists on disk.

---

## 5. Story Matching Rules

### Story ID Mapping

| Input story-id | Mapped to |
|----------------|-----------|
| `digital-pathology-15` | `stories/digital-pathology-15.json` |
| `any-story` | `stories/any-story.json` |

### Matching Rules

1. **Strip `.json`** — Story ID is treated as filename stem. The resolver appends `.json` when constructing the path.
2. **Declared only** — Story ID must appear in `pack.json.contents.stories` as a path containing the story ID stem.
3. **Direct filename match** — By default, story ID maps to `<pack>/stories/<story-id>.json`.
4. **Nested paths** — If `pack.json.contents.stories` declares a nested path (e.g., `subdir/story.json`), the resolver accepts story IDs that match the filename stem. Undeclared paths are never resolved.
5. **No `.json` suffix in input** — `--pack-story pack/story.json` is rejected as invalid format (Section 3).
6. **Multiple matches** — If multiple declared stories match the same ID stem, this is an error: "Multiple stories matched: \<id\>".

### Example: Digital Pathology Pack

```
pack.json.contents.stories = ["stories/digital-pathology-15.json"]

Input: --pack-story digital-pathology/digital-pathology-15
  → Declared story "stories/digital-pathology-15.json" contains stem "digital-pathology-15"
  → Match found
  → Resolved path: presentation-packs/digital-pathology/stories/digital-pathology-15.json
  → Path stays inside pack root: YES
  → Result: OK
```

---

## 6. Security Rules

The future resolver must enforce these security constraints:

| Rule | Enforcement |
|------|-------------|
| No absolute paths | Reject input containing `/` at start of pack-id |
| No path traversal | Reject input containing `..` anywhere |
| No resolving outside `presentation-packs/` | All resolved paths must be under `presentation-packs/` root |
| No resolving outside selected pack root | All resolved paths must be under `<pack-root>/` |
| No reading undeclared assets | Only files listed in `pack.json.contents.stories` are resolvable |
| No implicit fallback to registry | Failure to resolve pack story must NOT fall back to `--story` behavior |
| No write-back | Resolver is read-only; never modifies pack or registry files |
| No mutation of `pack.json` | Manifest is read-only during resolution |
| No execution of pack content | Story JSON is loaded as data, not executed |

---

## 7. Error Model

### Error Classes and Messages

| Error Class | Trigger | Message Template |
|-------------|---------|-----------------|
| MISSING_VALUE | `--pack-story` with no argument | `Missing value for --pack-story` |
| INVALID_FORMAT | Input does not match `<pack-id>/<story-id>` | `Invalid --pack-story value. Expected <pack-id>/<story-id>` |
| PACK_NOT_FOUND | Directory not found under `presentation-packs/` | `Presentation Pack not found: <pack-id>` |
| VALIDATION_FAILED | Pack manifest validation fails | `Presentation Pack validation failed: <pack-id>` |
| STORY_NOT_DECLARED | Story ID not in `pack.json.contents.stories` | `Story not declared in pack: <story-id>` |
| FILE_MISSING | Declared story file not on disk | `Declared story file missing: <path>` |
| UNSAFE_PATH | Resolved path escapes pack root | `Unsafe pack story path: <path>` |
| MULTIPLE_MATCHES | Multiple declared stories match story ID | `Multiple stories matched: <story-id>` |
| INVALID_JSON | Story file contains malformed JSON | `Invalid story JSON: <error>` |

### Error Handling Principle

- Errors are reported to stderr, not stdout.
- Exit code is 1 for all errors.
- No partial output is produced on error.
- Error messages include the specific failing value for debugging.
- No stack traces or internal paths are exposed in error messages.

---

## 8. Compatibility Rules

The following compatibility guarantees must hold:

| Rule | Detail |
|------|--------|
| `--story` unchanged | `--story <id>` continues to read from registry story files only |
| `--story` does not search packs | Registry story resolution is not affected by pack system |
| `--pack-story` is explicit opt-in | Users must explicitly use `--pack-story`; no automatic pack resolution |
| `--legacy-renderer` combinable | Future: `--pack-story <id> --legacy-renderer` should work |
| `--validate-pack` unchanged | Existing validation behavior preserved |
| `--list-packs` unchanged | Existing discovery behavior preserved |
| `--inspect-pack` unchanged | Existing inspection behavior preserved |
| Pack resolution failure does not affect registry | If `--pack-story` fails, `--story` still works independently |
| No breaking changes to existing CLI output | All existing commands produce identical output |

---

## 9. Future Resolver Contract

### Conceptual Function Shape

```
resolvePackStory(input, options)
```

### Input

```json
{
  "value": "digital-pathology/digital-pathology-15",
  "packsRoot": "presentation-packs"
}
```

### Success Output

```json
{
  "ok": true,
  "packId": "digital-pathology",
  "storyId": "digital-pathology-15",
  "packPath": "presentation-packs/digital-pathology",
  "storyPath": "presentation-packs/digital-pathology/stories/digital-pathology-15.json",
  "validation": "passed"
}
```

### Failure Output

```json
{
  "ok": false,
  "error": {
    "code": "STORY_NOT_DECLARED",
    "message": "Story not declared in pack: example"
  }
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| `MISSING_VALUE` | No input provided |
| `INVALID_FORMAT` | Input does not match `<pack-id>/<story-id>` |
| `PACK_NOT_FOUND` | Pack directory not found |
| `VALIDATION_FAILED` | Pack manifest validation failed |
| `STORY_NOT_DECLARED` | Story ID not in pack manifest |
| `FILE_MISSING` | Story file not on disk |
| `UNSAFE_PATH` | Resolved path escapes pack root |
| `MULTIPLE_MATCHES` | Multiple declared stories match |
| `INVALID_JSON` | Story file is not valid JSON |

### Clarification

- This contract is **design only**. No code is added in PR49.
- The function shape is agreed upon as the target interface for M5.3 implementation.
- The resolver is a pure function: given input, returns resolved path or error. It does not load or render the story.
- Story loading and rendering are handled by separate components (M5.4).

---

## 10. Test Matrix for Future Implementation

### Valid Input Tests

| Test | Input | Expected |
|------|-------|----------|
| T01 | `digital-pathology/digital-pathology-15` | OK — resolved path matches declared story |
| T02 | `digital-pathology/digital-pathology-15` (with `--legacy-renderer`) | OK — same resolution, different renderer |

### Invalid Input Tests

| Test | Input | Expected Error |
|------|-------|----------------|
| E01 | `--pack-story` (no value) | MISSING_VALUE |
| E02 | `--pack-story digital-pathology` (no slash) | INVALID_FORMAT |
| E03 | `--pack-story digital-pathology/` (empty story) | INVALID_FORMAT |
| E04 | `--pack-story /absolute/path` (absolute pack-id) | INVALID_FORMAT |
| E05 | `--pack-story pack/../secret` (traversal) | UNSAFE_PATH |
| E06 | `--pack-story pack/story.json` (.json suffix) | INVALID_FORMAT |
| E07 | `--pack-story missing-pack/story` (pack not found) | PACK_NOT_FOUND |
| E08 | `--pack-story digital-pathology/undeclared-story` | STORY_NOT_DECLARED |
| E09 | `--pack-story digital-pathology/stories/digital-pathology-15` (nested path) | INVALID_FORMAT |
| E10 | `--pack-story //double-slash` (empty pack) | INVALID_FORMAT |

### Compatibility Tests

| Test | Command | Expected |
|------|---------|----------|
| C01 | `--story digital-pathology-15` | Registry rendering works (unchanged) |
| C02 | `--story digital-pathology-15 --legacy-renderer` | Legacy rollback works (unchanged) |
| C03 | `--list-packs` | Pack discovery works (unchanged) |
| C04 | `--inspect-pack digital-pathology` | Pack inspection works (unchanged) |
| C05 | `--validate-pack presentation-packs/digital-pathology` | Pack validation works (unchanged) |
| C06 | `--help` | Help output works (unchanged, until --pack-story added) |
| C07 | `--unknown-flag` | Unknown flag fails fast (unchanged) |

---

## 11. M5.2 Readiness Criteria

M5.2 (Pack Story CLI Contract Guard) should only begin when all of the following are confirmed:

- [ ] Input format (Section 3) is accepted
- [ ] Pack resolution rules (Section 4) are accepted
- [ ] Story matching rules (Section 5) are accepted
- [ ] Security rules (Section 6) are accepted
- [ ] Error model (Section 7) is accepted
- [ ] Compatibility rules (Section 8) are accepted
- [ ] Resolver contract (Section 9) is accepted
- [ ] Test matrix (Section 10) is accepted
- [ ] No runtime source-of-truth change is planned for M5.2
- [ ] No planner extraction is included in M5.2
- [ ] Rollback strategy from M5.0 design note remains valid

M5.2 should add:
- CLI guard for `--pack-story` (recognize flag, reject with "not implemented" or design-staged message)
- Add `--pack-story` to `KNOWN_FLAGS` and `--help` output
- Optional: unit tests for the resolver contract (pure function, no rendering)

---

## 12. Decision

- **Proceed to M5.2** only after this validation document is approved.
- **M5.2 scope:** Add CLI guard and help entry for `--pack-story` without rendering. Optionally create tests for the resolver contract.
- **Do not implement rendering in M5.2.**
- **Do not start planner extraction.**
- **Do not change `--story` behavior.**

---

## References

- [M5 Pack Runtime Integration Design Note](M5_PACK_RUNTIME_INTEGRATION_DESIGN.md) — Sections 5, 6, 7, 9, 11
- [M4 Pack System Checkpoint](M4_PACK_SYSTEM_CHECKPOINT.md) — Sections 3, 6, 7
- `presentation-packs/digital-pathology/pack.json` — Current manifest declaring `stories/digital-pathology-15.json`
- `presentation-packs/digital-pathology/stories/digital-pathology-15.json` — Actual story file for validation
