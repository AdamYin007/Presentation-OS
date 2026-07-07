# M10.1 Fixtures and Snapshot Test Design

## 1. Purpose

M10.1 designs the fixtures and snapshot testing baseline for PackRuntimeContext soft validation, preparing the ground for future strict mode and hard gate implementation.

This is a **design-only** PR. It does NOT:

- Add fixtures
- Add snapshots
- Add tests
- Implement strict mode
- Implement hard gate

## 2. Non-Goals

The following are explicitly NOT in scope for M10.1:

- Add fixture files
- Add snapshot files
- Add test scripts
- Modify validator
- Modify report writer
- Modify standalone report script
- Modify package.json
- Wire into check:all
- Wire into doctor
- Wire into GitHub Actions
- Add JSON schema
- Change runtime behavior
- Change resolver behavior

## 3. Background

This design builds on:

- **M9.10 Soft Validation Package Entrypoint Checkpoint** — froze M9.0–M9.9 capability boundary
- **M10.0 Hard Gate Readiness Design** — identified prerequisites for hard gate promotion

M10.0 explicitly listed the following as prerequisites before hard gate:

- Canonical PackRuntimeContext fixtures
- Positive and negative fixture set
- Snapshot tests or equivalent stable output checks
- Stable path conventions
- Stable gate IDs
- Explicit contractVersion policy
- Reserved namespace policy
- Migration documentation

M10.1 addresses the **fixtures**, **snapshots**, **path conventions**, and **stable codes/gate IDs** prerequisites through design only.

## 4. Current Soft Validation Inputs and Outputs

### Input

- PackRuntimeContext JSON

### Processor

```
validatePackRuntimeContext()
  -> createSoftValidationReport()
  -> serializeSoftValidationReport()
```

### Output

- Soft validation report JSON
- stdout by default
- Explicit `--out` file only when requested

### Current package script

```bash
npm run pack-context:soft-report -- --input <path>
```

## 5. Why Fixtures Are Required Before Hard Gates

Fixtures serve as the stable contract between validator behavior and test expectations:

1. **Stabilize validator expectations** — canonical examples prevent accidental behavior drift
2. **Prevent report shape drift** — snapshots catch unintended changes to report structure
3. **Reduce false positives** — known-good fixtures validate the happy path before hardening
4. **Document valid and invalid shapes** — fixtures are living documentation of contract expectations
5. **Create upgrade path from advisory to hard gate** — each finding can be mapped to fixture + expected code
6. **Support future CI dry-run** — snapshot comparison is the foundation for non-blocking CI checks
7. **Support future snapshot comparison** — deterministic output enables reliable diff-based testing
8. **Support migration documentation** — fixtures serve as reference for pack authors migrating between versions

## 6. Proposed Fixture Directory Layout

Design only — no directories are created in this PR.

```
test/fixtures/pack-runtime-context/
├── valid/
│   ├── minimal-valid.json
│   ├── full-valid.json
│   └── versioned-valid.json
├── invalid/
│   ├── context-not-object.json
│   ├── missing-required-section.json
│   ├── missing-required-value.json
│   ├── reserved-namespace-used.json
│   ├── contract-version-malformed.json
│   ├── contract-version-unsupported.json
│   └── contract-version-deprecated.json
├── edge/
│   ├── empty-object.json
│   ├── unknown-extra-fields.json
│   ├── null-values.json
│   ├── optional-fields-omitted.json
│   └── future-compatible-metadata.json
└── README.md
```

**Notes:**

- M10.1 does NOT create these files or directories
- Future PRs must add fixtures progressively, not in one large commit
- Fixture names must be stable and descriptive
- Each fixture should have a clear intent documented in README.md

## 7. Proposed Snapshot Directory Layout

Design only — no directories are created in this PR.

```
test/snapshots/pack-runtime-context-soft-report/
├── valid/
│   ├── minimal-valid.report.json
│   ├── full-valid.report.json
│   └── versioned-valid.report.json
├── invalid/
│   ├── context-not-object.report.json
│   ├── missing-required-section.report.json
│   ├── reserved-namespace-used.report.json
│   └── contract-version-malformed.report.json
└── edge/
    ├── empty-object.report.json
    └── unknown-extra-fields.report.json
```

**Notes:**

- Snapshots are normalized report output
- `generatedAt` must be disabled or fixed during snapshot generation
- Ordering must be deterministic
- `path`, `code`, `gateId` must be stable across snapshot runs

## 8. Fixture Categories

### 8.1 Valid Fixtures

#### minimal-valid.json

**Intent:** Smallest valid PackRuntimeContext that passes all soft checks.

**Expected behavior:**
- `status`: `pass` or `pass-with-info`
- No `error` severities
- May have `info` for advisory findings (e.g., `INFO_CONTRACT_VERSION_ABSENT`)

#### full-valid.json

**Intent:** Comprehensive valid PackRuntimeContext with all known sections and values.

**Expected behavior:**
- `status`: `pass`
- No warnings, no errors, no infos (unless versioned)

#### versioned-valid.json

**Intent:** Valid PackRuntimeContext with `contractVersion` set to a known supported version.

**Expected behavior:**
- `status`: `pass`
- No version-related findings

### 8.2 Invalid Fixtures

#### context-not-object.json

**Intent:** Input where `context` is not an object (string, array, null, etc.).

**Expected behavior:**
- `status`: `soft-fail` or `internal-error`
- Finding code: `ERROR_CONTEXT_NOT_OBJECT`
- Severity: `error`

#### missing-required-section.json

**Intent:** Valid object context but missing a section that the contract defines as required.

**Expected behavior:**
- `status`: `pass-with-warnings` (currently)
- Finding code: `WARN_CONTRACT_SECTION_MISSING`
- Severity: `warning`

#### missing-required-value.json

**Intent:** Required section present but a required value within it is missing.

**Expected behavior:**
- `status`: `pass-with-warnings` (currently)
- Finding code: `WARN_CONTRACT_VALUE_MISSING`
- Severity: `warning`

#### reserved-namespace-used.json

**Intent:** Context uses a key that conflicts with a reserved namespace.

**Expected behavior:**
- `status`: `pass-with-warnings` (currently)
- Finding code: `WARN_RESERVED_NAMESPACE_USED`
- Severity: `warning`

#### contract-version-malformed.json

**Intent:** `contractVersion` present but does not conform to expected format.

**Expected behavior:**
- `status`: `pass-with-warnings` (currently)
- Finding code: `WARN_CONTRACT_VERSION_MALFORMED`
- Severity: `warning`

#### contract-version-unsupported.json

**Intent:** `contractVersion` present and well-formed but outside the supported range.

**Expected behavior:**
- `status`: `pass-with-warnings` (currently)
- Finding code: `WARN_CONTRACT_VERSION_UNSUPPORTED`
- Severity: `warning`

#### contract-version-deprecated.json

**Intent:** `contractVersion` present, well-formed, within supported range, but marked deprecated.

**Expected behavior:**
- `status`: `pass-with-warnings` (currently)
- Finding code: `WARN_CONTRACT_VERSION_DEPRECATED`
- Severity: `warning`

### 8.3 Edge Fixtures

#### empty-object.json

**Intent:** `{}` — minimal object, no sections, no values.

**Expected behavior:** Multiple `WARN_CONTRACT_SECTION_MISSING` findings.

#### unknown-extra-fields.json

**Intent:** Valid sections plus undocumented extra keys.

**Expected behavior:** Should not trigger errors; extra fields are informational.

#### null-values.json

**Intent:** Sections present but some values are `null`.

**Expected behavior:** Depends on null-handling policy; may trigger `WARN_CONTRACT_VALUE_MISSING`.

#### optional-fields-omitted.json

**Intent:** All optional fields absent, only required fields present.

**Expected behavior:** `pass` or `pass-with-info`.

#### future-compatible-metadata.json

**Intent:** Contains a `metadata` or `extensions` field with forward-compatible keys.

**Expected behavior:** Should not trigger warnings; demonstrates forward compatibility.

## 9. Expected Report Snapshot Rules

Snapshots must be deterministic and comparable across runs. Rules:

1. `reportVersion` must be stable (not regenerated per run)
2. `reportType` must be stable
3. `validatorId` must be stable
4. `contractName` must be stable
5. `status` must be deterministic (same fixture → same status)
6. `severity` must be deterministic
7. `generatedAt` must be **omitted, fixed, or disabled** during snapshot generation
8. `summary` counts must be deterministic
9. `results` ordering must be deterministic (sorted by `code` or `path`)
10. `result.id` must be deterministic
11. `gateId` must be stable
12. `code` must be stable (renaming is a breaking change)
13. `path` must be stable (see Section 11)
14. `blocking` must remain `false` unless strict mode explicitly changes it

## 10. Timestamp Strategy

Current report supports `includeTimestamp` / `generatedAt` related options.

Future snapshot tests should:

- **Disable timestamp**, or
- **Inject a fixed `generatedAt`**

**Recommended approach:** Use a fixed timestamp during snapshot generation, e.g.:

```
1970-01-01T00:00:00.000Z
```

Or use `includeTimestamp=false` if the report writer supports it. This ensures no snapshot churn due to time-based fields.

## 11. Path Semantics

Path conventions define how each finding's `path` field is formatted. Paths must be stable and deterministic.

**Requirements:**

- Root path should be `"context"` or `"$"`
- Top-level section path should be stable (e.g., `"sections.hero"`)
- Missing section path should point to the expected section (e.g., `"sections.layout"`)
- Reserved namespace path should point to the offending key (e.g., `"sections.metadata._reserved"`)
- contractVersion path should be `"contractVersion"` or the agreed equivalent
- Path format must NOT depend on object key iteration randomness

**Explicit requirement:**

> Path conventions must be finalized before any hard gate is implemented.

## 12. Finding Code Stability

Finding codes are part of the public contract once snapshots depend on them.

**Rules:**

- Code renaming is a **breaking change**
- New codes are allowed if purely additive
- Deprecated codes require a migration note
- Hard gate promotion must NOT silently rename codes

**Current finding codes:**

| Code | Category |
|---|---|
| `INFO_CONTRACT_VERSION_ABSENT` | Advisory |
| `WARN_CONTRACT_SECTION_MISSING` | Warning |
| `WARN_CONTRACT_VALUE_MISSING` | Warning |
| `WARN_RESERVED_NAMESPACE_USED` | Warning |
| `WARN_CONTRACT_VERSION_MALFORMED` | Warning |
| `WARN_CONTRACT_VERSION_DEPRECATED` | Warning |
| `WARN_CONTRACT_VERSION_UNSUPPORTED` | Warning |
| `ERROR_CONTEXT_NOT_OBJECT` | Error |
| `ERROR_VALIDATOR_INTERNAL` | Error (tool failure) |

## 13. Gate ID Stability

Gate IDs group related findings. They must remain stable across snapshot runs.

**Rules:**

- Gate ID changes require snapshot update + migration note
- Gate IDs should be human-readable and machine-parseable

**Candidate gate IDs:**

| Gate ID | Description |
|---|---|
| `CONTEXT_REQUIRED_SECTIONS_GATE` | Required section presence |
| `CONTEXT_REQUIRED_VALUES_GATE` | Required value presence |
| `CONTEXT_RESERVED_NAMESPACE_GATE` | Reserved namespace conflicts |
| `CONTEXT_READ_ONLY_FIELDS_GATE` | Read-only field enforcement |
| `CONTRACT_VERSION_PRESENT_SOFT_GATE` | contractVersion presence (advisory) |
| `CONTRACT_VERSION_FORMAT_GATE` | contractVersion format validation |
| `CONTRACT_VERSION_SUPPORTED_RANGE_GATE` | contractVersion compatibility |
| `CONTRACT_VERSION_DEPRECATION_GATE` | contractVersion deprecation notice |

## 14. Snapshot Update Policy

When snapshots are eventually implemented, updates must follow this policy:

1. **Snapshot updates require an intentional PR** — no silent regeneration
2. **PR must explain why output changed** — link to design rationale
3. **Accidental output drift should fail** — once implemented, mismatched snapshots fail the check
4. **`generatedAt` changes should never cause snapshot churn** — see Section 10
5. **`reportVersion` changes may require broad snapshot update** — coordinate across all affected fixtures
6. **Finding code/path changes require migration note** — document breaking changes
7. **Reviewers must inspect diff for semantic changes** — not just format changes

## 15. Proposed Future Test Script

Design only — no script is implemented in this PR.

**Proposed location:** `scripts/check-pack-runtime-context-fixtures.cjs`

**Responsibilities:**

- Discover fixtures from `test/fixtures/pack-runtime-context/`
- Run validator on each fixture
- Run report writer on each fixture's output
- Normalize report (fix timestamp, sort results, etc.)
- Compare to corresponding snapshot
- Fail on unexpected diff
- Provide `--update-snapshots` mode only if explicitly passed

**Proposed commands:**

```bash
# Run snapshot comparison (read-only)
node scripts/check-pack-runtime-context-fixtures.cjs

# Intentional snapshot update (must be used carefully)
node scripts/check-pack-runtime-context-fixtures.cjs --update-snapshots
```

**Important:**

- `--update-snapshots` must NEVER be the default behavior
- Update mode should be local-only
- CI should NOT auto-update snapshots
- This script is separate from `npm run pack-context:soft-report`

## 16. Relationship to Package Script

- `npm run pack-context:soft-report` remains the **user-facing** manual report generator
- `scripts/check-pack-runtime-context-fixtures.cjs` would be a **developer-facing** validation tool
- The package script should NOT be used as the snapshot test directly unless output normalization is stable
- No `check:all` coupling until explicitly approved in a future PR

## 17. Relationship to check:all

- M10.1 does NOT modify `check:all`
- Future fixture snapshot check should initially remain standalone
- `check:all` integration requires a separate PR
- Hard gate integration requires separate M10 readiness approval

## 18. Relationship to CI

- M10.1 does NOT modify GitHub Actions
- Future CI should first run snapshot checks as non-blocking or regular tests only after stability
- Artifact dry-run can come before required gate
- Branch protection implications must be reviewed before any required CI gate

## 19. Relationship to JSON Schema

- M10.1 does NOT add JSON schema
- Fixtures can inform future schema design
- Schema should NOT be generated blindly from fixtures
- Fixtures and schema should cross-validate future hard gate assumptions

## 20. Fixture Ownership and Review

Fixtures are contract examples and must be treated with the same rigor as code:

- Every fixture should include a **clear intent** (documented in README.md)
- Invalid fixtures should **map to expected finding codes**
- Owner/reviewer must verify fixture semantics before merge
- Fixtures should **avoid unrelated fields** — keep them minimal and focused
- Fixtures should **remain small and readable** — not monolithic examples

## 21. Minimal Future Implementation Plan

| Phase | Description | Scope |
|---|---|---|
| Phase 1 — Design | M10.1 documentation-only | This PR |
| Phase 2 — Fixture Skeleton | Create directories and README, add 2–3 minimal fixtures | Future PR |
| Phase 3 — Snapshot Writer | Generate normalized expected reports, fixed timestamp | Future PR |
| Phase 4 — Standalone Fixture Check | Compare reports to snapshots, not in check:all | Future PR |
| Phase 5 — CI Dry Run | Optional / artifact-only | Future PR |
| Phase 6 — check:all Candidate | Only after stability confirmed | Future PR |
| Phase 7 — Strict Mode / Hard Gate Candidate | Only after fixture confidence | Future PR |

## 22. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Snapshots too brittle — fail on formatting changes | Normalize output (sort, fix timestamp) before comparison |
| `generatedAt` causing churn | Fixed timestamp or disabled (Section 10) |
| Fixture overfitting — tests pass but validator is weak | Review fixtures for semantic coverage, not just formatting |
| Incomplete invalid cases — miss edge scenarios | Start with minimal invalid set, expand iteratively |
| Path semantics unstable | Finalize path conventions before hard gate (Section 11) |
| Finding code churn | Treat codes as public contract; renaming is breaking (Section 12) |
| Large noisy diffs on snapshot update | Use `--update-snapshots` intentionally, review diffs |
| Accidental `check:all` coupling | Keep fixture check standalone until explicitly approved |
| Premature CI gating | CI dry-run only, never required check until stable |
| False confidence from too few fixtures | Expand fixture set progressively with reviewer sign-off |
| Schema and fixtures diverging | Cross-validate schema against fixtures before hard gate |
| `--update-snapshots` misuse | Never default in CI; local-only by design |

## 23. Recommended Next Steps

| Option | Description | Type | Recommendation |
|---|---|---|---|
| **A** — M10.2 Fixture Directory Skeleton | Create directories and README only, no snapshots yet | documentation-only | **Recommended next** |
| B — M10.2 Minimal Fixture Set | Add 2–3 minimal fixtures, no snapshot comparison yet | code | Good follow-up |
| C — M10.2 Snapshot Writer Design | Documentation-only, define normalization before implementation | documentation-only | Useful but after skeleton |
| D — M10.2 Reserved Namespace Policy | Documentation-only, needed before hardening namespace finding | documentation-only | Parallel track |

**Recommendation:** Prioritize **M10.2 Fixture Directory Skeleton** first. Keep it small: create directories, add README, add 2–3 minimal fixtures. No snapshot comparison, no CI coupling, no strict mode.

## 24. Checkpoint Conclusion

M10.1 defines the fixture and snapshot testing strategy required before any strict mode or hard gate implementation. The safest next step is to create fixture directories and README only, without adding CI, hard validation, or behavioral changes.


