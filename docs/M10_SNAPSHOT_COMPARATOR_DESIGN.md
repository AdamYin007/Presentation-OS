# M10.7 Snapshot Comparator Design

## 1. Purpose

M10.7 designs a developer-facing, compare-only PackRuntimeContext snapshot comparator.

The comparator regenerates deterministic candidate reports from canonical fixtures and compares them against committed snapshots **without modifying any files**.

M10.7 explicitly does NOT:
- Implement a comparator module
- Add a compare script
- Modify the snapshot writer or `--update`
- Add or change snapshots
- Change fixtures
- Modify `package.json`
- Wire anything into `check:all`, `doctor`, or CI
- Implement strict mode or hard gate
- Add JSON schema files
- Change runtime or resolver behavior

## 2. Non-Goals

M10.7 explicitly does NOT:

- Implement comparator module in this PR
- Add `check-pack-runtime-context-snapshots.cjs`
- Modify `soft-validation-snapshot-writer.js`
- Modify `write-pack-runtime-context-snapshots.cjs`
- Add new snapshot files
- Change existing fixtures
- Modify `package.json`
- Wire comparator into `check:all`
- Wire comparator into `doctor`
- Modify `.github/workflows/check.yml`
- Implement strict mode
- Implement hard gate
- Add JSON schema files
- Change runtime behavior
- Change resolver behavior

## 3. Background

M10.7 builds on the following milestones:

- **M10.1 Fixtures and Snapshot Test Design** — defines fixture/snapshot directory layout and rules
- **M10.4 Snapshot Writer Design** — defines normalization pipeline, timestamp strategy, result ordering, and comparison semantics
- **M10.5 Snapshot Writer Skeleton** — implements `createNormalizedSnapshotReport()` and `serializeSnapshotReport()`
- **M10.6 Initial Snapshot Generation** — generates 3 deterministic committed snapshots

Current state:
- 3 canonical fixtures in `test/fixtures/pack-runtime-context/`
- 3 deterministic committed snapshots in `test/snapshots/pack-runtime-context-soft-report/`
- Fixed `generatedAt: "1970-01-01T00:00:00.000Z"`
- Repo-relative `source` paths
- Stable metadata (no absolute paths)
- Stable result ordering (warnings before errors)
- Stable finding IDs (`${code}:${path}:${index}`)
- Explicit `--update` only; repeated updates return `unchanged`

## 4. Comparator Definition

A snapshot comparator is a developer-facing utility that regenerates deterministic candidate reports from canonical fixtures and compares them against committed snapshots **without modifying any files**.

The comparator is:
- **compare-only** — never writes, creates, or deletes files
- **read-only** — only reads fixtures and committed snapshots
- **deterministic** — same repo state always produces same result
- **never calls update mode** — explicitly rejects `--update` or `update: true`
- **never rewrites snapshots** — comparison is purely informational
- **never deletes orphan snapshots** — reports them for manual review
- **never changes fixtures** — fixtures are immutable input
- **does not reinterpret report status as process failure** — `soft-fail` in a report is not a comparator failure if the snapshot matches

## 5. Comparator Inputs

**Fixture root:**
`test/fixtures/pack-runtime-context`

**Snapshot root:**
`test/snapshots/pack-runtime-context-soft-report`

**Current fixture-to-snapshot mappings (reused, not reimplemented):**

```
test/fixtures/pack-runtime-context/valid/minimal-valid.json
→ test/snapshots/pack-runtime-context-soft-report/valid/minimal-valid.report.json

test/fixtures/pack-runtime-context/invalid/context-not-object.json
→ test/snapshots/pack-runtime-context-soft-report/invalid/context-not-object.report.json

test/fixtures/pack-runtime-context/edge/missing-contract-version.json
→ test/snapshots/pack-runtime-context-soft-report/edge/missing-contract-version.report.json
```

The comparator must reuse the existing fixture-to-snapshot mapping defined in M10.4 Section 8. It must not implement different mapping rules.

## 6. Proposed Future Comparator Interface

Design only — no implementation.

**Candidate module path:**
`packages/cli/src/validation/soft-validation-snapshot-comparator.js`

**Candidate exports:**

| Export | Purpose |
|---|---|
| `compareSnapshotForFixture` | Compare one fixture against its snapshot |
| `compareAllSnapshots` | Discover all fixtures, compare each |
| `compareSnapshotObjects` | Low-level: compare two parsed JSON objects |
| `classifySnapshotDifference` | Classify difference as match/content-drift/format-drift |
| `formatSnapshotDifference` | Human-readable diff summary |
| `findOrphanSnapshots` | Detect snapshots without matching fixtures |
| `SNAPSHOT_COMPARE_STATUS` | Enum of comparator status values |

**Candidate function signatures:**

```javascript
function compareSnapshotForFixture(fixturePath, options = {})
function compareAllSnapshots(options = {})
```

**Options (compare-only, no write):**

| Option | Type | Default | Description |
|---|---|---|---|
| `cwd` | string | `process.cwd()` | Working directory |
| `fixtureRoot` | string | `test/fixtures/` | Fixture base |
| `snapshotRoot` | string | `test/snapshots/` | Snapshot base |
| `comparisonMode` | string | `"both"` | `"semantic"`, `"byte"`, or `"both"` |
| `includeDiff` | boolean | `true` | Include human-readable diff |
| `maxDiffLines` | number | `10` | Max diff lines in output |
| `detectOrphans` | boolean | `false` | Scan for orphan snapshots |

**Must enforce:**
- No `update` option exists in comparator API
- If `update: true` is accidentally passed, comparator must reject it with a clear error and `exit 1`

## 7. Comparison Modes

Two comparison modes, both recommended in the first implementation:

### Byte Comparison

Regenerates candidate via `serializeSnapshotReport()`, then compares raw bytes against committed snapshot file.

**Pros:**
- Detects formatting, newline, field-order changes
- Aligns with current deterministic guarantee
- Audit-friendly: byte-for-byte reproducible

**Cons:**
- Format changes trigger diffs even when semantics are identical
- Requires serialization to be fully stable

### Semantic JSON Comparison

Parses both candidate and committed snapshot as JSON, then compares normalized objects.

**Pros:**
- Ignores meaningless whitespace differences
- Focuses on semantic content changes

**Cons:**
- May mask serialization contract drift
- Requires stable deep-comparison rules (object key order, array order, type coercion)

### Recommended Dual Mode

First implementation should run both:
1. Semantic comparison
2. Byte comparison

**Classification rules:**

| semanticEqual | byteEqual | Status |
|---|---|---|
| true | true | `match` |
| true | false | `format-drift` |
| false | false | `content-drift` |

## 8. Proposed Compare Status Values

| Status | Meaning | Exit Code |
|---|---|---|
| `match` | semantic equal + byte equal | 0 |
| `missing-snapshot` | fixture exists, snapshot file does not | 1 |
| `invalid-snapshot-json` | snapshot file exists but is not valid JSON | 1 |
| `content-drift` | semantic JSON differs | 1 |
| `format-drift` | semantic equal, bytes differ | 1 |
| `orphan-snapshot` | snapshot without matching fixture | 1 |
| `fixture-read-error` | cannot read fixture file | 1 |
| `fixture-json-error` | fixture is not valid JSON | 1 |
| `candidate-generation-error` | snapshot writer failed | 1 |
| `internal-error` | comparator implementation error | 1 |

**Important:** `soft-fail` is a report status, not a comparator status. If a fixture produces a `soft-fail` report and the snapshot matches, comparator status is `match`.

## 9. Missing Snapshot Semantics

When a fixture exists but its target snapshot file does not:
- Comparator returns `missing-snapshot`
- Exit code: `1`
- **Never auto-creates the snapshot**
- Outputs suggested explicit update command:
  ```
  node scripts/write-pack-runtime-context-snapshots.cjs --fixture <path> --update
  ```
- Does NOT call writer update internally

## 10. Invalid Snapshot JSON Semantics

When a snapshot file exists but is not valid JSON:
- Comparator returns `invalid-snapshot-json`
- Exit code: `1`
- **Never overwrites the file**
- Outputs parse error message and snapshot repo-relative path
- Does NOT print sensitive machine paths

## 11. Content Drift Semantics

When candidate and committed snapshot have different semantic content:
- Comparator returns `content-drift`
- Exit code: `1`
- Shows concise diff summary
- **Never auto-updates**
- **Never describes drift as PackRuntimeContext contract invalid**

Possible causes to document in output:
- validator behavior changed
- report writer behavior changed
- normalization rules changed
- fixture changed
- committed snapshot is stale
- unintended regression

## 12. Format Drift Semantics

When semantic JSON is identical but byte serialization differs:
- Comparator returns `format-drift`
- Exit code: `1` (recommended for first version)
- **Never auto-formats or overwrites snapshots**
- `format-drift` ≠ `contract-invalid`
- Update still requires an explicit PR

## 13. Match Semantics

When semantic equal AND byte equal:
- Comparator returns `match`
- Exit code: `0`

Example output:
```
Snapshot match
Fixture: test/fixtures/pack-runtime-context/valid/minimal-valid.json
Snapshot: test/snapshots/pack-runtime-context-soft-report/valid/minimal-valid.report.json
Status: pass
Bytes: 605
```

## 14. Orphan Snapshot Semantics

An orphan snapshot is a `.report.json` file in the snapshot root that has no matching fixture.

Requirements:
- Comparator can detect and report orphans
- Initial implementation does NOT auto-delete
- Orphans default to `exit 1` to avoid stale contract artifacts persisting
- Cleanup requires an intentional PR
- Category/path renames may produce orphans
- `.gitkeep` and `README.md` are NOT orphans

**Recommendation:** First version returns `orphan-snapshot` and `exit 1`.

## 15. Fixture Without Snapshot vs Snapshot Without Fixture

| Scenario | Comparator Status | Action |
|---|---|---|
| Fixture exists, snapshot missing | `missing-snapshot` | Suggest explicit `--update` |
| Snapshot exists, no matching fixture | `orphan-snapshot` | Report for manual review |

Both scenarios require human review. Neither should be auto-fixed.

## 16. Proposed Comparison Result Shape

Design only — no implementation.

**Match example:**
```json
{
  "status": "match",
  "fixturePath": "test/fixtures/...",
  "snapshotPath": "test/snapshots/...",
  "reportStatus": "pass",
  "semanticEqual": true,
  "byteEqual": true,
  "expectedBytes": 605,
  "actualBytes": 605,
  "differences": [],
  "migrationHint": null
}
```

**Content-drift example:**
```json
{
  "status": "content-drift",
  "semanticEqual": false,
  "byteEqual": false,
  "differences": [
    {
      "path": "summary.info",
      "expected": 1,
      "actual": 0
    }
  ]
}
```

**Rules:**
- All paths must be repo-relative
- No absolute path leakage
- `differences` array uses JSON-style logical paths (Section 18)

## 17. Diff Output Strategy

Human-readable output must include:
- Fixture path
- Snapshot path
- Comparator status
- Report status
- `semanticEqual` / `byteEqual` booleans
- Changed field count
- Top N differences (default 10)
- Explicit update guidance

Formatting rules:
- Long strings truncated
- No full JSON dump
- No secrets
- No absolute paths

`--json` mode outputs full structured comparison result but still excludes machine-specific data.

## 18. Difference Path Semantics

Diff paths use JSON-style logical notation:
- `status`
- `summary.info`
- `results[0].code`
- `metadata.fixturePath`

Must NOT use filesystem absolute paths. Array indices must be deterministic (results already normalized/sorted before comparison).

## 19. Exit Code Strategy

| Condition | Exit Code |
|---|---|
| All snapshots match | 0 |
| Missing snapshot | 1 |
| Invalid snapshot JSON | 1 |
| Content drift | 1 |
| Format drift | 1 |
| Orphan snapshot | 1 |
| Fixture read/parse error | 1 |
| Candidate generation error | 1 |
| Internal error | 1 |

**Critical distinction:** If a fixture generates a `soft-fail` report and the snapshot matches, comparator exits `0`. Comparator `exit 1` means snapshot verification failed, not that a hard validation gate is enabled. Comparator is not yet wired into CI or check:all.

## 20. Proposed Future CLI

Design only — no implementation.

**Candidate script path:**
`scripts/check-pack-runtime-context-snapshots.cjs`

**Candidate commands:**

```bash
# Single fixture compare
node scripts/check-pack-runtime-context-snapshots.cjs --fixture <path>

# Compare all fixtures
node scripts/check-pack-runtime-context-snapshots.cjs --all

# Single fixture with JSON output
node scripts/check-pack-runtime-context-snapshots.cjs --fixture <path> --json

# Compare all with JSON output
node scripts/check-pack-runtime-context-snapshots.cjs --all --json

# Detect orphan snapshots
node scripts/check-pack-runtime-context-snapshots.cjs --all --detect-orphans
```

**Supported flags:**
- `--fixture <path>`
- `--all`
- `--json`
- `--compact`
- `--detect-orphans`
- `--help`

**Explicitly forbidden flags (exit 1 if provided):**
- `--update`
- `--write`
- `--fix`
- `--delete-orphans`

## 21. Single Fixture Compare Behavior

```bash
node scripts/check-pack-runtime-context-snapshots.cjs --fixture test/fixtures/.../minimal-valid.json
```

- Compares only the specified fixture
- Does NOT scan other fixtures
- Does NOT report global orphans by default
- Optional `--detect-orphans` flag enables global scan
- Outputs `match` or drift status
- Never writes files

## 22. Compare-All Behavior

```bash
node scripts/check-pack-runtime-context-snapshots.cjs --all
```

- Recursively discovers canonical fixture JSON files
- Ignores `README.md` and `.gitkeep`
- Generates candidate for each fixture
- Maps to target snapshot
- Compares all
- Summarizes: total, matched, missing, content-drift, format-drift, invalid-snapshot, errors
- Defaults to suggesting orphan detection
- Sorting must be deterministic: category → fixture path → snapshot path

## 23. Discovery Rules

- Only discover `.json` files under fixture root
- Only discover `.report.json` files under snapshot root
- Ignore hidden files (starting with `.`)
- Ignore `README.md`
- Do NOT follow symlinks unless explicitly supported in future
- Do NOT read files outside `fixtureRoot`
- Paths must be normalized to repo-relative form

## 24. Comparator and Update Isolation

**Comparator (read-only):**
- Compare-only, never writes
- No write API
- No `update` flag
- No directory creation
- No file deletion

**Writer (explicit update only):**
- Dry-run by default
- Explicit `--update` to write
- Create/update one mapped snapshot
- No compare-all responsibility

**Must NOT merge comparator and writer into a single implicit dual-mode tool.**

## 25. Relationship to Existing Snapshot Writer

Comparator should **reuse** from the snapshot writer:
- `createNormalizedSnapshotReport()`
- `serializeSnapshotReport()`
- `mapFixturePathToSnapshotPath()`

But must **never call**:
- `writeSnapshotReport(..., { update: true })`

This prevents compare path from accidentally writing files.

## 26. Relationship to check:all

- M10.7 does NOT modify `check:all`
- Comparator implementation must be standalone initially
- Integration with `check:all` discussed only after comparator stabilizes
- `update` mode must NEVER be wired into `check:all`

## 27. Relationship to CI

- M10.7 does NOT modify GitHub Actions
- Comparator can be run locally first
- Future CI can be non-required check or artifact summary only
- CI runs compare only, never update
- Required check status requires separate PR and branch protection assessment

## 28. Relationship to Hard Gate

- Comparator failure = output contract drift, NOT hard validation failure
- Hard gate enforcement requires separate `strict-mode` and finding promotion design
- Snapshot stability is a hard gate prerequisite, not the hard gate itself

## 29. Security and Privacy Rules

Comparator output must NEVER contain:
- Absolute paths
- Usernames
- Hostnames
- CWD
- Environment variables
- Tokens
- API keys
- Private fixture payloads
- Full secrets

Diff output for sensitive values must truncate or redact, not print in full.

## 30. Comparator Determinism Requirements

Future comparator must guarantee:
- Same repo state → same result
- Compare-all iteration order is stable
- Diff path order is stable
- Structured JSON field order is stable
- No current timestamp
- No random IDs
- No machine paths
- No filesystem enumeration randomness

## 31. Proposed Future Validation Script

Future comparator validation script (not created in M10.7):
`scripts/check-snapshot-comparator-skeleton.cjs`

Must cover:
- 3 committed snapshots all match
- soft-fail snapshot match → comparator exit 0
- Temporary missing snapshot → exit 1
- Temporary content drift → exit 1
- Temporary format drift → exit 1
- Invalid snapshot JSON → exit 1
- Orphan snapshot detection
- `--update` rejected
- Pre/post compare file hashes unchanged
- No `.validation/` created
- No absolute path leakage

M10.7 does NOT create this script.

## 32. Minimal Implementation Sequence

- **Phase 1 — M10.7 Comparator Design**: documentation-only
- **Phase 2 — M10.8 Comparator Module Skeleton**: single fixture compare, read-only
- **Phase 3 — M10.9 Comparator CLI**: `--fixture`, `--all`, no CI
- **Phase 4 — M10.10 Comparator Validation**: drift/missing/orphan tests
- **Phase 5 — Comparator Checkpoint**: freeze semantics
- **Phase 6 — optional CI dry-run**: separate PR, non-required initially

## 33. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Comparator accidentally writing files | Data corruption | No write API, no update flag |
| Comparator calling update mode | Silent snapshot overwrite | Explicit rejection with error |
| Semantic and byte comparison disagreement | Ambiguous status | Both reported, classified by rules |
| Noisy diff output | Hard to review | Max N differences, truncation |
| Absolute path leakage | Machine-specific output | Repo-relative paths enforced |
| False orphan detection | Unnecessary alerts | Exclude README, .gitkeep |
| Fixture discovery instability | Non-deterministic results | Sorted, deterministic enumeration |
| Snapshots over-constrained | CI brittleness | Compare-only, no auto-fix |
| Format-only changes blocking work | Friction | Document format-drift ≠ contract-invalid |
| Comparator failure confused with hard gate | Misinterpretation | Clear documentation: not hard gate |
| CI integration too early | Premature blocking | Standalone first, CI later |
| Branch protection deadlock | PR stuck | Non-required check initially |
| Stale snapshots | False positives | Orphan detection, periodic review |
| Incomplete diff paths | Hard to diagnose | Logical JSON paths, stable ordering |

## 34. Decision Points

Questions requiring future decisions:

1. **Format drift exit code?** → Recommend `exit 1` for first version
2. **Orphan snapshot default exit?** → Recommend `exit 1`
3. **Compare-all default orphan detection?** → Recommend enabled
4. **Object key order in semantic comparison?** → Ignore (order-independent)
5. **JSON number/string type change?** → Always content drift
6. **Unknown metadata additive fields?** → Consider drift
7. **Default max diff items?** → Recommend `10`
8. **Need `--quiet` flag?** → Not in first version
9. **Structured JSON output include full expected/actual?** → Yes, but truncate long values

## 35. Recommended Next Step

**M10.8 Snapshot Comparator Skeleton**

Scope:
- Comparator module (`soft-validation-snapshot-comparator.js`)
- Single fixture compare only
- Semantic + byte comparison
- No CLI `--all`
- No orphan scan
- No CI
- No `check:all`
- No writes

Do NOT implement full comparator and CI in one step.

## 36. Checkpoint Conclusion

M10.7 defines a deterministic, read-only snapshot comparator strategy. Comparator failures represent snapshot verification problems, not automatic PackRuntimeContext hard validation failures. The next safe step is a single-fixture comparator module skeleton with no file-writing capability.
