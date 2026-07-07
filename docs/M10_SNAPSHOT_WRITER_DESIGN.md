# M10.4 Snapshot Writer Design

## 1. Purpose

M10.4 defines the design for a PackRuntimeContext soft validation report snapshot writer.

This PR is **documentation-only**. It does NOT:

- Create any snapshot JSON files
- Implement a snapshot writer
- Implement a snapshot comparator
- Modify the existing report writer (`soft-validation-report-writer.js`)
- Wire anything into `check:all`, CI, or `doctor`
- Implement hard gate or strict mode

## 2. Non-Goals

M10.4 explicitly does NOT:

- Add snapshot JSON files
- Add a test script
- Add an `update-snapshots` command
- Modify any existing fixtures
- Modify the validator (`pack-runtime-context-soft-validator.js`)
- Modify the report writer (`soft-validation-report-writer.js`)
- Modify the standalone generator (`generate-pack-runtime-context-soft-report.cjs`)
- Modify `package.json`
- Modify `.github/workflows/check.yml`
- Add JSON schema files
- Implement strict mode
- Implement hard gate
- Change runtime behavior
- Change resolver behavior

## 3. Background

M10.4 builds on the following milestones:

- **M9.3 Soft Validation Report Format Design** — defines report shape, status/severity enums, summary, results, versioning policy
- **M9.4 Soft Validation Report Writer Skeleton** — implements `createSoftValidationReport()` and `serializeSoftValidationReport()`
- **M9.10 Soft Validation Package Entrypoint Checkpoint** — standalone script `npm run pack-context:soft-report` confirmed working
- **M10.1 Fixtures and Snapshot Test Design** — defines fixture/snapshot directory layout and rules
- **M10.3 Minimal Fixture Set** — adds 3 canonical fixtures:
  - `valid/minimal-valid.json` → `pass`, 0 findings, exit 0
  - `invalid/context-not-object.json` → `soft-fail`, `ERROR_CONTEXT_NOT_OBJECT`, exit 0
  - `edge/missing-contract-version.json` → `pass-with-info`, `INFO_CONTRACT_VERSION_ABSENT`, exit 0

## 4. Current Snapshot Inputs

A future snapshot writer should consume:

**Fixture JSON:**
- `test/fixtures/pack-runtime-context/valid/minimal-valid.json`
- `test/fixtures/pack-runtime-context/invalid/context-not-object.json`
- `test/fixtures/pack-runtime-context/edge/missing-contract-version.json`

**Processing pipeline (already exists):**
1. `validatePackRuntimeContext()` — produces `{ ok, severity, warnings[], errors[], report }`
2. `createSoftValidationReport()` — produces report object per M9.3
3. `serializeSoftValidationReport()` — produces pretty-printed JSON string

**Target snapshot directory:**
- `test/snapshots/pack-runtime-context-soft-report/`

## 5. Snapshot Writer Definition

A snapshot writer is a **developer-facing utility** that generates normalized, deterministic expected soft validation report JSON from canonical fixtures.

It is NOT:
- A user-facing report command
- A validator
- A hard gate
- An exit-code policy controller
- A replacement for the standalone report script

It IS:
- A tool for generating expected artifacts for future snapshot comparison
- A normalization layer that ensures determinism across environments

## 6. Proposed Future Writer Interface

Design only — no implementation.

**Candidate functions:**

```javascript
createNormalizedSnapshotReport(fixturePath, options = {})
writeSnapshotForFixture(fixturePath, snapshotPath, options = {})
writeAllSnapshots(options = {})
```

**Candidate options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `fixedGeneratedAt` | string | `null` | Override generatedAt with fixed value |
| `includeTimestamp` | boolean | `false` | Disable timestamp in snapshots |
| `pretty` | boolean | `true` | Pretty-print JSON output |
| `update` | boolean | `false` | Allow writing (never default) |
| `dryRun` | boolean | `true` | Prefer dry-run over write |
| `fixtureRoot` | string | `test/fixtures/` | Base directory for fixtures |
| `snapshotRoot` | string | `test/snapshots/` | Base directory for snapshots |

**Rules:**
- `update` defaults to `false`; snapshots are never overwritten without explicit `--update`
- `dryRun` should be preferred over write by default
- No file written without explicit user action

## 7. Proposed Future Script

Design only — no implementation.

**Candidate path:** `scripts/write-pack-runtime-context-snapshots.cjs`

**Candidate commands:**

```bash
# Dry-run: show what would happen without writing
node scripts/write-pack-runtime-context-snapshots.cjs --dry-run

# Single fixture dry-run
node scripts/write-pack-runtime-context-snapshots.cjs --fixture test/fixtures/pack-runtime-context/valid/minimal-valid.json --dry-run

# Explicit update (only with flag)
node scripts/write-pack-runtime-context-snapshots.cjs --fixture <path> --update

# Update all fixtures
node scripts/write-pack-runtime-context-snapshots.cjs --all --update
```

**Exit code rules:**
- `exit 0` for successful generation (including soft-fail reports)
- `exit 1` for malformed fixture JSON, missing file, or writer internal error
- CI must never invoke with `--update`
- Unknown flags or paths → `exit 1`

## 8. Fixture-to-Snapshot Mapping

Stable mapping rules:

```
test/fixtures/pack-runtime-context/valid/minimal-valid.json
→ test/snapshots/pack-runtime-context-soft-report/valid/minimal-valid.report.json

test/fixtures/pack-runtime-context/invalid/context-not-object.json
→ test/snapshots/pack-runtime-context-soft-report/invalid/context-not-object.report.json

test/fixtures/pack-runtime-context/edge/missing-contract-version.json
→ test/snapshots/pack-runtime-context-soft-report/edge/missing-contract-version.report.json
```

**Mapping rules:**
- Relative category preserved (`valid/`, `invalid/`, `edge/`)
- Fixture basename preserved (`minimal-valid`, `context-not-object`, `missing-contract-version`)
- Suffix changed from `.json` to `.report.json`
- No timestamp in filename
- No random IDs in filename

## 9. Snapshot Normalization Pipeline

Future pipeline order:

1. Read fixture JSON
2. Validate fixture input (parse success)
3. Call `validatePackRuntimeContext(fixture)` → result
4. Call `createSoftValidationReport(result, options)` → report
5. Apply snapshot normalization (timestamp, ordering, metadata sanitization)
6. Sort deterministic arrays
7. Serialize pretty JSON
8. Compare against existing or write only when explicitly allowed

## 10. Timestamp Normalization

**Problem:** `generatedAt` varies per run, making snapshots non-deterministic.

**Current behavior:** `createSoftValidationReport()` accepts `options.generatedAt` (defaults to `new Date().toISOString()` when `includeTimestamp: true`).

**Recommendation:** Freeze timestamp to a fixed value:

```
fixedGeneratedAt: "1970-01-01T00:00:00.000Z"
```

Or alternatively set `includeTimestamp: false` to produce `null`.

**Must enforce:**
- No real wall-clock time enters snapshot
- Timezone fixed to UTC
- Timestamp normalization is snapshot writer responsibility, not reporter responsibility

## 11. Top-Level Field Normalization

JSON object property order has no business semantics, but stable serialization aids diff review.

**Recommended order:**

1. `reportVersion`
2. `reportType`
3. `validatorId`
4. `contractName`
5. `contractVersion`
6. `status`
7. `severity`
8. `generatedAt`
9. `source`
10. `summary`
11. `results`
12. `metadata`

**Note:** The current `createSoftValidationReport()` already produces fields in this approximate order. The snapshot writer should not reorder — it should verify consistency.

## 12. Summary Normalization

**Must guarantee:**

| Field | Type | Rule |
|---|---|---|
| `total` | number | Always present, never undefined |
| `info` | number | Always present |
| `warnings` | number | Always present |
| `errors` | number | Always present |
| `gatesChecked` | number | Always present |
| `gatesWithFindings` | number | Always present |

**Rules:**
- Zero values must not be omitted
- `summary` must be recomputed from `results` or cross-validated for consistency
- No `undefined` or `null` allowed in summary fields

**Current behavior verification:** The existing `computeSummary()` in `soft-validation-report-writer.js` always produces all 6 fields. No discrepancy found.

## 13. Results Ordering

**Current ordering in `normalizeResults()`:** warnings first (index 0..N-1), then errors (index N..N+M-1).

**Risk:** If validator internal loop order changes (e.g., section iteration order), results array order changes → snapshot churn.

**Recommendation:** Use explicit stable sort on results:

Sort priority:
1. `severity` rank: `error` > `warning` > `info`
2. `gateId`
3. `code`
4. `path`
5. `id`

Or adopt the original validator order but document **why** it is stable (e.g., `REQUIRED_TOP_LEVEL_SECTIONS` array order is fixed, iteration is sequential).

**Must define:** Sorting strategy in M10.4; implementation deferred to M10.5+.

## 14. Finding ID Stability

**Current ID format:** `${code}:${path}:${index}` (from `normalizeFinding()`).

**Analysis:**
- Index depends on position in warnings/errors arrays
- If sorting changes, index changes → ID changes → snapshot churn
- If `path` changes (e.g., `$` vs `context`), ID changes

**Recommendation:** Regenerate finding IDs **after** normalization sort:

```
${code}:${normalizedPath}:${postSortOccurrenceIndex}
```

**Must ensure:**
- Snapshots never depend on random IDs
- ID strategy change is a snapshot contract change — requires explicit migration
- M10.4 does NOT modify existing writer; only documents the risk

## 15. Path Normalization

**Must define:**
- Root path convention: `$` or `context` — pick one and document
- Top-level path format must be consistent
- Absolute file paths must NOT appear in report `path`
- Platform-specific path separators must NOT leak
- JSON semantic path and filesystem path must be separated
- Missing section should point to expected section path (e.g., `identity`, `metadata`)
- `contractVersion` path must be fixed (`contractVersion` not `$.contractVersion`)

**Current behavior:** The validator uses bare section names (`identity`, `contractVersion`) and `$` for context-not-object.

**Must clarify:** Path convention before entering hard gate. Path spec is a pre-condition for hard gate, not part of M10.4 implementation.

## 16. Gate ID and Finding Code Stability

**Current finding codes (from `CODE_TO_GATE` mapping):**

| Code | Gate ID |
|---|---|
| `ERROR_CONTEXT_NOT_OBJECT` | `CONTEXT_REQUIRED_SECTIONS_GATE` |
| `WARN_CONTRACT_SECTION_MISSING` | `CONTEXT_REQUIRED_SECTIONS_GATE` |
| `INFO_CONTRACT_VERSION_ABSENT` | `CONTRACT_VERSION_PRESENT_SOFT_GATE` |
| `WARN_CONTRACT_VERSION_MALFORMED` | `CONTRACT_VERSION_FORMAT_GATE` |
| `WARN_RESERVED_NAMESPACE_USED` | `CONTEXT_RESERVED_NAMESPACE_GATE` |

**Future codes (from M9.3 taxonomy):**

| Code | Severity | Description |
|---|---|---|
| `INFO_CONTRACT_VERSION_ABSENT` | info | contractVersion field not found |
| `WARN_CONTRACT_SECTION_MISSING` | warning | Required section absent |
| `WARN_CONTRACT_VALUE_MISSING` | warning | Required value null/undefined |
| `WARN_RESERVED_NAMESPACE_USED` | warning | Reserved identifier in use |
| `WARN_CONTRACT_VERSION_MALFORMED` | warning | Invalid version format |
| `WARN_CONTRACT_VERSION_DEPRECATED` | warning | Version marked deprecated |
| `WARN_CONTRACT_VERSION_UNSUPPORTED` | warning | Version not understood |
| `ERROR_CONTEXT_NOT_OBJECT` | error | Context is not a valid object |
| `ERROR_VALIDATOR_INTERNAL` | error | Validator implementation error |

**Current gate IDs in use:**

| Gate ID | Description |
|---|---|
| `CONTEXT_REQUIRED_SECTIONS_GATE` | Sections presence check |
| `CONTRACT_VERSION_PRESENT_SOFT_GATE` | contractVersion present check |
| `CONTRACT_VERSION_FORMAT_GATE` | contractVersion format check |
| `CONTEXT_RESERVED_NAMESPACE_GATE` | Reserved namespace check |

**Must enforce:**
- Code/gateId once in snapshots becomes a stable contract
- Renames require intentional migration PR
- Additive new codes allowed
- Removal requires `reportVersion` consideration

## 17. Metadata Normalization

**Must guarantee:**
- `metadata` is always an object
- No machine-specific values (hostname, username, cwd)
- No absolute filesystem paths unless fixture intentionally requires them
- No environment variables
- No private runtime payloads

**Current behavior:** The standalone script passes `metadata: { inputFile: path.resolve(inputPath) }` which includes an absolute path. This is acceptable for user-facing reports but **must be sanitized** for snapshots.

**Recommendation:** Snapshot writer should strip or replace `inputFile` with a repo-relative path.

## 18. Source Field Strategy

**Current behavior:** `source` defaults to `"standalone-script"` from the standalone generator.

**Options for snapshot `source`:**
1. Fixture relative path: `test/fixtures/pack-runtime-context/valid/minimal-valid.json`
2. Fixture basename: `minimal-valid.json`
3. Fixed logical name: `fixture-validation`
4. Omit source entirely

**Recommendation:** Use repo-relative fixture path for traceability, but never absolute path.

## 19. Pretty Serialization Rules

**Must enforce:**
- 2-space indentation (current `JSON.stringify(report, null, 2)` already does this)
- Trailing newline
- UTF-8 encoding, no BOM
- Stable property insertion order (verify `JSON.stringify` preserves `createSoftValidationReport()` order)
- No compact snapshots
- No comments
- LF line endings preferred

**Current behavior:** `serializeSoftValidationReport()` uses `JSON.stringify(report, null, space)` with `space = 2`. No trailing newline is added. This should be noted as a potential improvement for M10.5+.

## 20. Expected Initial Snapshots

Design only — no files created in M10.4.

### minimal-valid.report.json
- `status`: `pass`
- `summary.total`: 0
- `results`: `[]`
- `errors`: 0

### context-not-object.report.json
- `status`: `soft-fail`
- `summary.errors`: 1
- `results[0].code`: `ERROR_CONTEXT_NOT_OBJECT`
- `results[0].blocking`: `false`

### missing-contract-version.report.json
- `status`: `pass-with-info`
- `summary.info`: 1
- `results[0].code`: `INFO_CONTRACT_VERSION_ABSENT`
- `results[0].blocking`: `false`

**Note:** Exact `severity` and `source` values must match the current writer implementation. M10.4 documents expected values but does not create files.

## 21. Dry-Run Behavior

**Must implement:**
- Generate normalized candidate report
- Do NOT write any files
- Output target snapshot path
- Output classification: `would-create` / `would-change` / `unchanged`
- `exit 0` when generation succeeds
- `soft-fail` report still `exit 0`
- Malformed fixture JSON → `exit 1`
- Writer internal error → `exit 1`

**Recommendation:** First implementation should only support `--dry-run`. Introduce `--update` in a later phase.

## 22. Update Behavior

**Must implement:**
- Only with explicit `--update` flag
- Create missing snapshot parent directories
- Write normalized report
- Print `created` / `updated` / `unchanged` summary
- Never auto-delete unrelated snapshots
- Warn about orphan snapshots but do not auto-delete initially
- `update` is a developer-local action, never a CI default

## 23. Snapshot Comparison Semantics

**Future comparator rules (design only):**
- Semantic JSON comparison preferred (parse both, deep-equal after normalization)
- Serialized diff should remain stable
- Missing snapshot is a failure in compare mode
- Extra unexpected fields are a diff
- Ordering differences after normalization should not occur
- `generatedAt` differences must not occur (fixed timestamp)
- Comparator must never auto-update

## 24. Orphan Snapshot Policy

- Snapshot without matching fixture is orphan
- Initial implementation should report orphan
- Do not auto-delete orphan snapshots
- Cleanup requires intentional PR
- Category moves must be reviewed

## 25. Security and Privacy Rules

Snapshots must NEVER contain:
- Secrets, tokens, API keys
- Local filesystem absolute paths
- Usernames, hostnames
- Emails (unless fixture intentionally requires them)
- Environment variables
- Private runtime payloads

## 26. Relationship to Existing Standalone Script

`npm run pack-context:soft-report`:
- User-facing
- stdout / explicit `--out`
- Preserves real runtime parameters
- Does NOT manage snapshot lifecycle

Future snapshot writer:
- Developer-facing
- Deterministic normalization
- Fixed timestamp
- Explicit `update`
- Fixture-to-snapshot mapping

The two must NOT be conflated.

## 27. Relationship to check:all

- M10.4 does NOT modify `check:all`
- Snapshot writer implementation must be standalone initially
- Compare script future integration with `check:all` requires separate approval
- `update` mode must NEVER be wired into `check:all`

## 28. Relationship to CI

- M10.4 does NOT modify CI
- CI can only run compare/dry-run, never update
- First CI integration can be artifact/report-only
- Required check status requires separate review
- Branch protection impact must be assessed

## 29. Relationship to Hard Gate

- Snapshot stability is a pre-condition for hard gate, NOT hard gate itself
- Snapshot diff ≠ contract invalid
- Strict mode / hard gate must be designed separately
- Report output stability and contract enforcement are two different dimensions

## 30. Proposed Future Implementation Files

Design only — no files created in M10.4.

- `packages/cli/src/validation/soft-validation-snapshot-writer.js` — normalization + write
- `scripts/write-pack-runtime-context-snapshots.cjs` — explicit update/dry-run CLI
- `scripts/check-pack-runtime-context-snapshots.cjs` — compare only

## 31. Minimal Implementation Sequence

- **Phase 1 — M10.4 Design**: documentation-only
- **Phase 2 — M10.5 Snapshot Writer Skeleton**: normalization + dry-run only
- **Phase 3 — M10.6 Initial Snapshot Generation**: generate 3 snapshots explicitly
- **Phase 4 — M10.7 Snapshot Comparator**: standalone compare script
- **Phase 5 — M10.8 Snapshot Checkpoint**: freeze behavior
- **Phase 6 — optional CI dry-run**: no hard gate

## 32. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Timestamps causing churn | Snapshots unstable every run | Fixed timestamp or disabled |
| Unstable result ordering | Diff noise | Explicit stable sort |
| Finding ID churn | ID changes on re-sort | Regenerate IDs after sort |
| Path instability | Platform-dependent paths | Normalize to semantic path |
| Absolute path leakage | Machine-specific snapshots | Strip or replace in metadata |
| Snapshot overfitting | Tests brittle to irrelevant changes | Compare only essential fields |
| Accidental update in CI | CI modifies snapshots | `--update` never default |
| Large unreadable diffs | Hard to review | One fixture per PR initially |
| Stale/orphan snapshots | Confusing state | Report orphan, do not auto-delete |
| reportVersion changes | Breaking for consumers | Bump only on intentional changes |
| Fixture/snapshot mismatch | Silent regressions | Comparator must fail on missing snapshot |
| Conflating snapshot failures with hard gate | Over-blocking | Separate snapshot check from hard gate |
| Local environment leakage | Non-deterministic output | Sanitize metadata, source, path |

## 33. Recommended Next Steps

- **Option A — M10.5 Snapshot Writer Skeleton**: normalization + dry-run only (recommended)
- **Option B — M10.5 Path Semantics Policy**: documentation-only if path behavior remains ambiguous
- **Option C — M10.5 Finding ID Stability Design**: documentation-only before implementation

If current path and ID behavior is sufficiently clear, proceed to M10.5 Snapshot Writer Skeleton.

## 34. Checkpoint Conclusion

M10.4 defines a deterministic, explicit, developer-facing snapshot writer strategy. No snapshots or writer implementation are added. The next safe step is a dry-run-only snapshot writer skeleton.


