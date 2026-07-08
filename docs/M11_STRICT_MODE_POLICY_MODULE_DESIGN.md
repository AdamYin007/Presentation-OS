# M11.1 Strict Mode Policy Module Design

## 1. Purpose

M11.1 designs the future strict mode policy module for PackRuntimeContext validation.

The policy module is responsible exclusively for **classification policy**: mapping existing finding codes to mode-specific blocking decisions. It does NOT:
- Execute validation
- Write files
- Update snapshots
- Decide comparator status
- Re-run the validator
- Modify any finding

M11.1 explicitly does NOT:
- Implement strict mode
- Implement hard gate
- Create any JS module
- Create any configuration file
- Modify the validator
- Modify the report writer
- Modify the snapshot writer
- Modify the comparator
- Modify the comparator CLI
- Modify package.json
- Modify check:all, doctor, or CI
- Modify branch protection
- Modify fixtures or snapshots
- Add environment variable switches
- Add bypass logic
- Add JSON schema files
- Change runtime, resolver, registry, or pack loader behavior
- Create .validation/

Soft mode current behavior remains unchanged.

## 2. Current Baseline

### 2.1 Established Capabilities

| Capability | Status | PR |
|------------|--------|-----|
| Soft validator | ✅ Exists | PR45 |
| Finding codes | ✅ 5 real codes | PR45 |
| Report writer | ✅ Deterministic | PR47 |
| Snapshot writer/update | ✅ Deterministic | PR61 |
| Comparator | ✅ Frozen | PR63/PR64 |
| Failure domain separation | ✅ Defined | PR66 |
| Soft mode exit 0 | ✅ All fixtures | PR65 |
| Comparator mismatch exit 1 | ✅ By design | PR64 |
| Strict mode | ❌ Not implemented | — |
| Blocking classification | ❌ Not implemented | — |

### 2.2 Current Real Finding Codes

From `packages/cli/src/validation/pack-runtime-context-soft-validator.js`:

| Code | Severity | Trigger |
|------|----------|---------|
| `ERROR_CONTEXT_NOT_OBJECT` | error | Context is null, array, or non-object |
| `WARN_CONTRACT_SECTION_MISSING` | warning | Required top-level section absent |
| `INFO_CONTRACT_VERSION_ABSENT` | info | `contractVersion` field not present |
| `WARN_CONTRACT_VERSION_MALFORMED` | warning | `contractVersion` exists but not a string |
| `WARN_RESERVED_NAMESPACE_USED` | warning | Reserved namespace used as top-level key |

All findings include: `code`, `severity`, `message`, `path`, `expected`, `actual`, `migrationHint`, `sourceDocument`.

### 2.3 Current Report Shape

```javascript
{
  ok: boolean,
  severity: "info" | "warning" | "error",
  warnings: Array<{code, severity, message, path, expected, actual, migrationHint, sourceDocument}>,
  errors: Array<{code, severity, message, path, expected, actual, migrationHint, sourceDocument}>,
  report: {
    validatorId: "pack-runtime-context-soft-validator",
    contractName: "PackRuntimeContext",
    contractVersion: null,
    checkedAt: string | null,
    gates: []
  }
}
```

### 2.4 Current Fixture States

| Fixture | Errors | Warnings | Report Status |
|---------|--------|----------|--------------|
| `valid/minimal-valid.json` | 0 | 1 (`INFO_CONTRACT_VERSION_ABSENT`) | `pass` |
| `invalid/context-not-object.json` | 1 (`ERROR_CONTEXT_NOT_OBJECT`) | 0 | `soft-fail` |
| `edge/missing-contract-version.json` | 0 | 2 (`INFO_CONTRACT_VERSION_ABSENT`, `WARN_CONTRACT_VERSION_MALFORMED`) | `pass-with-info` |

## 3. Problem Statement

The policy module must solve:

1. **Which findings may block in strict mode?** — Not all errors should block; severity ≠ blocking
2. **Shared finding codes between soft/strict** — Same code, different blocking classification per mode
3. **Avoid severity-auto-blocking** — `error` severity must NOT automatically equal blocking
4. **Unknown finding handling** — New findings must not break strict mode by default
5. **Policy versioning** — Changes must be auditable and versioned independently of package version
6. **Promotion audit trail** — Every blocking state change requires documented rationale
7. **Default-off guarantee** — Strict mode must never activate accidentally
8. **Configuration drift prevention** — Policy must be frozen plain data, not mutable at runtime
9. **Policy determinism testing** — Same input must always yield same classification result

## 4. Policy Module Definition

A **strict mode policy module** is a version-controlled, deterministic, read-only classification layer that maps existing finding codes to mode-specific blocking decisions without changing the underlying finding code, severity, message, source, or evidence.

Contract:
- **Input**: finding object or finding code + mode
- **Output**: blocking decision + policy metadata
- Does NOT re-run validator
- Does NOT rewrite findings
- Does NOT create new finding codes
- Does NOT handle snapshot drift
- Does NOT read network
- Does NOT read remote configuration
- Does NOT depend on environment variables
- Does NOT write files

## 5. Proposed Future Module Location

Design only — no implementation.

### 5.1 Candidates

| Path | Pros | Cons |
|------|------|------|
| `packages/cli/src/validation/pack-runtime-context-strict-policy.js` | Narrow scope, matches validator naming, no global implication | Adds to validation/ directory |
| `packages/cli/src/validation/strict-validation-policy.js` | Shorter name | Less scoped, could imply global policy |

### 5.2 Recommendation

**`packages/cli/src/validation/pack-runtime-context-strict-policy.js`**

Reasons:
- Scope is explicit: PackRuntimeContext only
- Does NOT imply global or universal policy
- Matches current validator naming convention (`pack-runtime-context-soft-validator.js`)
- Reduces future multi-contract collision risk
- Clear ownership boundary

## 6. Proposed Exports

Design only — no implementation.

### 6.1 Exports

| Export | Type | Responsibility |
|--------|------|---------------|
| `STRICT_POLICY_VERSION` | number | Frozen policy version constant |
| `STRICT_POLICY_RULES` | object | Frozen plain-data rules map |
| `getStrictPolicyRule` | function | Lookup rule by finding code |
| `classifyFindingForMode` | function | Classify single finding for given mode |
| `applyStrictPolicy` | function | Apply policy to full report results |
| `validateStrictPolicy` | function | Self-validate policy integrity |
| `getStrictPolicySummary` | function | Return policy summary metadata |

### 6.2 Responsibilities

- **`STRICT_POLICY_VERSION`**: Immutable version number, incremented only on classification contract changes
- **`STRICT_POLICY_RULES`**: Frozen plain object mapping finding codes to blocking decisions
- **`getStrictPolicyRule(code)`**: Return rule for code, or `null` if unknown
- **`classifyFindingForMode(finding, options)`**: Return classification result for single finding
- **`applyStrictPolicy(report, options)`**: Transform report results with policy classifications
- **`validateStrictPolicy()`**: Self-check policy integrity, throw on structural violation
- **`getStrictPolicySummary()`**: Return `{version, ruleCount, blockingCount, nonBlockingCount}`

## 7. Policy Versioning

Design only — no implementation.

### 7.1 Versioning Rules

- Independent policy version, starting at `1`
- Version increments only when the **classification contract** changes
- Text-only changes (comments, documentation) do NOT increment version
- Adding a new non-blocking finding: MAY increment or NOT, at discretion
- Promotion (non-blocking → blocking): MUST increment
- Demotion (blocking → non-blocking): MUST increment
- Version is defined as a source-code constant, NOT derived from package version
- Version does NOT include timestamps
- Version is embedded in structured strict result output
- Runtime remote override is NOT permitted

### 7.2 Recommended Declaration

```javascript
const STRICT_POLICY_VERSION = 1;
```

M11.1 does NOT create this constant. This is a design recommendation for M11.2+.

## 8. Proposed Rule Shape

Design only — no implementation.

### 8.1 Rule Structure

```javascript
{
  "ERROR_CONTEXT_NOT_OBJECT": {
    "softModeBlocking": false,
    "strictModeBlocking": true,
    "severity": "error",
    "reason": "The PackRuntimeContext root must be an object.",
    "introducedInPolicyVersion": 1,
    "owner": "validation",
    "reviewRequired": true
  },
  "INFO_CONTRACT_VERSION_ABSENT": {
    "softModeBlocking": false,
    "strictModeBlocking": false,
    "severity": "info",
    "reason": "Missing contract version is informational at this stage.",
    "introducedInPolicyVersion": 1,
    "owner": "validation",
    "reviewRequired": false
  }
}
```

### 8.2 Field Definitions

| Field | Type | Constraint |
|-------|------|------------|
| `softModeBlocking` | boolean | Must match current soft mode behavior (always `false` in frozen baseline) |
| `strictModeBlocking` | boolean | Classification decision for strict mode |
| `severity` | string | Must match validator severity for consistency check |
| `reason` | string | Stable, concise, auditable; no user data |
| `introducedInPolicyVersion` | number | Policy version when this rule was created/changed |
| `owner` | string | Code responsibility domain (e.g., `"validation"`) |
| `reviewRequired` | boolean | `true` for blocking state changes |

### 8.3 Prohibited Fields

- No `current date`
- No `username`
- No `free-form executable logic`
- No `function` values
- No `getter/setter`
- No `environment variable references`
- No `absolute paths`

## 9. Initial Policy Recommendations

Design only — these are recommendations, not code implementation. Current runtime behavior is NOT changed.

### 9.1 ERROR_CONTEXT_NOT_OBJECT

| Property | Value |
|----------|-------|
| `softModeBlocking` | `false` |
| `strictModeBlocking` | `true` |
| `severity` | `error` |
| Role | First blocking candidate |
| Rationale | Context root must be object; without it, contract interpretation is unreliable |
| `reviewRequired` | `true` |

### 9.2 WARN_CONTRACT_SECTION_MISSING

| Property | Value |
|----------|-------|
| `softModeBlocking` | `false` |
| `strictModeBlocking` | `false` |
| `severity` | `warning` |
| Role | Advisory — section presence varies by contract maturity |
| Rationale | Not all sections required at every maturity level |
| `reviewRequired` | `false` |

### 9.3 INFO_CONTRACT_VERSION_ABSENT

| Property | Value |
|----------|-------|
| `softModeBlocking` | `false` |
| `strictModeBlocking` | `false` |
| `severity` | `info` |
| Role | Informational only |
| Rationale | Version tracking is optional at this stage |
| `reviewRequired` | `false` |

### 9.4 WARN_CONTRACT_VERSION_MALFORMED

| Property | Value |
|----------|-------|
| `softModeBlocking` | `false` |
| `strictModeBlocking` | `false` |
| `severity` | `warning` |
| Role | Advisory — malformed version is a data quality concern |
| Rationale | Does not break contract interpretation |
| `reviewRequired` | `false` |

### 9.5 WARN_RESERVED_NAMESPACE_USED

| Property | Value |
|----------|-------|
| `softModeBlocking` | `false` |
| `strictModeBlocking` | `false` |
| `severity` | `warning` |
| Role | Advisory — reserved namespace collision risk |
| Rationale | Preventive warning, not a structural failure |
| `reviewRequired` | `false` |

### 9.6 All Unknown Findings

| Property | Value |
|----------|-------|
| `softModeBlocking` | `false` |
| `strictModeBlocking` | `false` |
| `policyStatus` | `"unknown-policy-rule"` |
| Rationale | New findings must not break strict mode by default |
| Action | Requires separate promotion PR |

**Note:** These are policy recommendations only. No promotion is executed in M11.1. Current runtime behavior is unchanged.

## 10. Severity vs Blocking

Critical distinction:

| Concept | Determines | Controlled By |
|---------|-----------|---------------|
| `severity` | How serious the finding is | Validator |
| `blocking` | Whether the finding stops execution | Policy module |

Rules:
- `error` severity does NOT automatically equal blocking
- `info` is typically non-blocking
- `warning` does NOT automatically block
- Blocking is determined SOLELY by policy rule
- String matching on `message` is NOT permitted for blocking decisions
- `severity === "error"` does NOT auto-hard-fail
- Policy module receives finding from validator; it classifies, does not re-evaluate

## 11. Unknown Finding Policy

Design for findings not present in `STRICT_POLICY_RULES`:

### 11.1 Default Behavior

```javascript
{
  "known": false,
  "blocking": false,
  "policyStatus": "unknown-policy-rule"
}
```

### 11.2 Handling Rules

- Unknown finding code → `strictModeBlocking: false`
- Structured result includes `unknown` count in summary
- Human output includes review suggestion
- Does NOT auto-fail
- Can be observed in CI informational phase
- Requires separate promotion PR for blocking
- Unknown findings are tracked separately from known findings

### 11.3 Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Default non-blocking → false negatives | Medium | CI informational observation phase |
| Default blocking → compatibility break | High | Default non-blocking protects existing contracts |

**Recommendation:** Default non-blocking for unknown findings to preserve backwards compatibility.

## 12. Policy Status Values

Design only — not implemented.

| Status | Meaning | Used When |
|--------|---------|-----------|
| `known-blocking` | Rule exists, strictModeBlocking=true | Known code, blocking in strict |
| `known-non-blocking` | Rule exists, strictModeBlocking=false | Known code, non-blocking |
| `unknown-policy-rule` | No rule for this finding code | New or unexpected code |
| `invalid-policy-rule` | Rule exists but fails validation | Policy integrity check failed |
| `policy-version-mismatch` | Policy version differs from expected | Version drift detected |
| `internal-policy-error` | Policy module internal error | Unexpected state |

**Important:** These are policy classification statuses, NOT validation outcomes, NOT comparator statuses. They must NOT reuse `match`, `content-drift`, or snapshot-related state names.

## 13. Mode Model

Design only — not implemented.

### 13.1 Supported Modes

| Mode | Description |
|------|-------------|
| `soft` | Default, non-blocking, current behavior |
| `strict` | Opt-in, policy-driven blocking |

### 13.2 Mode Resolution Rules

- Mode MUST be explicitly passed to policy API
- Default mode (when not specified) is `soft`
- Mode is NOT inferred from environment variables
- Mode is NOT switched automatically by CI
- Mode is NOT switched by branch name
- Mode is NOT switched by package script name
- Mode is NOT determined by process.env or similar

## 14. Proposed Classification Result

Design only — not implemented.

### 14.1 Known Finding Result

```javascript
{
  "policyVersion": 1,
  "mode": "strict",
  "code": "ERROR_CONTEXT_NOT_OBJECT",
  "known": true,
  "severity": "error",
  "blocking": true,
  "policyStatus": "known-blocking",
  "reason": "The PackRuntimeContext root must be an object."
}
```

### 14.2 Unknown Finding Result

```javascript
{
  "policyVersion": 1,
  "mode": "strict",
  "code": "WARNING_NEW_FIELD",
  "known": false,
  "severity": "warning",
  "blocking": false,
  "policyStatus": "unknown-policy-rule",
  "reason": "No strict policy rule is defined."
}
```

### 14.3 Requirements

- Deterministic output
- No current time
- No random ID
- No machine information
- No complete fixture payload
- No absolute paths

## 15. Proposed classifyFindingForMode

Design only — not implemented.

### 15.1 Interface

```javascript
classifyFindingForMode(finding, options = {})
```

### 15.2 Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `"soft"` or `"strict"` | `"soft"` | Operating mode |
| `policyVersion` | number | from constant | Policy version to use |

### 15.3 Behavior

1. Validate finding code exists
2. Look up policy rule
3. Return classification result
4. Do NOT modify original finding
5. Do NOT mutate options
6. Do NOT leak absolute paths
7. Invalid mode → return structured error or throw stable error

## 16. Proposed applyStrictPolicy

Design only — not implemented.

### 16.1 Interface

```javascript
applyStrictPolicy(report, options = {})
```

### 16.2 Responsibilities

1. Read `report.warnings` and `report.errors`
2. Apply policy classification to each finding
3. Preserve original finding order
4. Return new strict result object
5. Do NOT modify input report
6. Count blocking/non-blocking/unknown
7. Do NOT re-run validator
8. Do NOT perform snapshot compare

### 16.3 Return Shape

```javascript
{
  "domain": "validation",
  "mode": "strict",
  "policyVersion": 1,
  "status": "hard-fail",
  "blocking": true,
  "summary": {
    "total": 1,
    "blocking": 1,
    "nonBlocking": 0,
    "unknown": 0,
    "errors": 1,
    "warnings": 0,
    "info": 0
  },
  "results": [/* classified findings */]
}
```

## 17. Input Immutability

Future implementation MUST guarantee:

- Input report is NOT modified
- Input findings are NOT modified
- No `blocking` field is added to original objects
- Returns new objects
- May use shallow or deep clone, but result must be deterministic
- `deepEqual(input, input)` holds before and after call
- Does NOT depend on object identity

## 18. Policy Validation

Design `validateStrictPolicy()` — not implemented.

### 18.1 Checks

| Check | Description |
|-------|-------------|
| Policy version valid | Number, positive integer |
| Rule key non-empty | Each key is a valid finding code string |
| Required fields present | `softModeBlocking`, `strictModeBlocking`, `severity`, `reason`, `introducedInPolicyVersion`, `owner` |
| `softModeBlocking` is boolean | Consistent with frozen baseline |
| `strictModeBlocking` is boolean | Classification decision |
| `severity` is valid | One of `"error"`, `"warning"`, `"info"` |
| `reason` is non-empty | Auditable explanation |
| `introducedInPolicyVersion` is valid | Matches or exceeds current policy version |
| No duplicate rules | Each code appears once |
| No function values | Plain data only |
| No dynamic getter | Frozen object |
| No absolute paths | Security |
| No environment references | Determinism |
| Policy can be frozen | `Object.freeze` succeeds |

## 19. Policy Immutability

Recommended future implementation:

- `Object.freeze` on rules object
- Deep freeze all rule values
- Export read-only object
- No mutate API
- No runtime registration
- No plugin injection
- No remote fetch

## 20. Policy Auditability

Every promotion/demotion PR MUST document:

- Finding code
- Previous blocking state
- New blocking state
- Reason for change
- Regression fixture
- Soft mode impact
- Strict mode impact
- Expected exit code change
- Rollback plan
- Reviewer

Single boolean changes without explanation are NOT accepted.

## 21. Promotion Workflow

Design only — not implemented.

1. Finding enters soft mode as non-blocking
2. Add regression fixture
3. Stabilize finding code
4. Observe false positive rate
5. Submit policy promotion PR
6. Independent verification
7. Strict mode checkpoint
8. Future CI informational observation
9. Consider required check only after stability

## 22. Demotion Workflow

When blocking finding causes false positives:

- Policy demotion via independent PR
- `strictModeBlocking: true → false`
- Preserve the finding
- Do NOT delete the fixture
- Record false positive evidence
- Add regression fixture
- Do NOT hide issue via message change
- Policy version increments
- Provide rollback rationale

## 23. Policy Version Upgrade Rules

### 23.1 Must Upgrade Version

| Change | Action |
|--------|--------|
| Promotion (non-blocking → blocking) | Increment |
| Demotion (blocking → non-blocking) | Increment |
| Unknown behavior change | Increment |
| Mode semantics change | Increment |
| Result shape breaking change | Increment |
| Policy status definition change | Increment |

### 23.2 Do NOT Upgrade Version

| Change | Action |
|--------|--------|
| Comment changes | No |
| Spelling fixes in docs | No |
| Non-behavioral doc links | No |
| Test enhancements | No |

## 24. Backwards Compatibility

Future implementation MUST guarantee:

- Soft mode is unaffected by policy promotion
- Current soft report shape unchanged
- Current soft validator exit code unchanged
- Comparator behavior unchanged
- Snapshot writer behavior unchanged
- Strict mode must be explicitly called
- Unknown findings do NOT auto-block
- Policy version upgrade does NOT implicitly enable strict mode
- Existing automation must NOT fail after upgrade

## 25. Failure Domain Separation

Policy module belongs to:

- `domain: validation`
- `layer: classification-policy`

Policy module does NOT handle:

- `snapshot-verification`
- `file IO`
- `CI status`
- `branch protection`
- `network errors`
- `package installation`

## 26. Error Handling

Design only — not implemented.

### 26.1 Error Categories

| Category | Example | Handling |
|----------|---------|----------|
| Invalid mode | `mode: "hard"` | Return structured error |
| Malformed finding | Missing `code` | Return structured error |
| Missing code | Empty string | Return structured error |
| Invalid policy rule | Fails validation | Throw typed error |
| Unsupported policy version | Future version | Return structured error |
| Internal error | Unexpected state | Throw typed error |

### 26.2 Error Output Requirements

- Stable error code
- Concise message
- No stack trace by default
- No absolute path
- No environment dump
- Library API may throw typed error or return structured error (decided in M11.2)

**Recommendation for M11.2:** Typed error + stable error code.

## 27. Security and Privacy

Prohibited in policy result output:

- Absolute paths
- Fixture payload
- Usernames
- HOME
- Hostname
- CWD
- Environment variables
- Secrets
- Tokens
- Git branch

Policy `reason` field must NOT contain user data.

## 28. Determinism

Future policy module MUST guarantee:

- Same finding + same mode + same policy version → same result
- Stable rule lookup order
- Stable result field order
- Stable summary field order
- No current time
- No random ID
- No locale-dependent sort
- No environment-dependent behavior
- No filesystem dependency

## 29. Test Strategy

Future policy module skeleton (M11.2+) must include at minimum:

| Test | Expectation |
|------|-------------|
| Policy version constant exists | ✅ |
| Known error in soft mode non-blocking | ✅ |
| Known error in strict mode blocking | ✅ |
| Info finding both modes non-blocking | ✅ |
| Unknown finding strict mode non-blocking | ✅ |
| Unknown count correct | ✅ |
| Severity does NOT auto-block | ✅ |
| Input finding not mutated | ✅ |
| Input report not mutated | ✅ |
| Repeated output deepEqual | ✅ |
| Repeated serialized output byteEqual | ✅ |
| Rules frozen | ✅ |
| Invalid mode error | ✅ |
| Malformed finding error | ✅ |
| Unsupported policy version error | ✅ |
| No write API | ✅ |
| No environment reads | ✅ |
| No absolute path leakage | ✅ |
| No snapshot changes | ✅ |
| No fixture changes | ✅ |
| Soft validator behavior unchanged | ✅ |

## 30. Proposed Validation Script

Design only — not implemented.

Future script name:

```
scripts/check-strict-mode-policy-module-skeleton.cjs
```

Expected success output:

```
Strict mode policy module skeleton check passed
```

M11.1 does NOT create this script.

## 31. Configuration Alternatives

### 31.1 Options Comparison

| Option | Pros | Cons |
|--------|------|------|
| Hardcoded inline rules | Simple, reviewable | Hard to change |
| Dedicated JS module | Extensible, importable | More code to maintain |
| JSON config | Human-readable | Schema stability risk |
| YAML config | Human-readable | Parser dependency |
| package.json metadata | Centralized | Discovery risk |
| Remote config | Dynamic | Runtime risk, security |

### 31.2 Recommendation

- Dedicated version-controlled JS module
- Frozen plain data
- No executable callbacks
- No remote config
- No package.json storage
- No YAML parser dependency
- No runtime mutation

## 32. Ownership Model

Rule `owner` field uses stable responsibility domains:

- `validation`
- `runtime-contract`
- `snapshot-foundation`

Do NOT use personal names or email addresses.

**Initial recommendation:** All rules use `"validation"` as owner.

## 33. Review Requirements

Blocking state changes require at minimum:

- Validation owner review
- Regression test review
- Backwards compatibility review
- CI impact review
- Rollback plan review

M11.1 does NOT modify CODEOWNERS or branch protection.

## 34. Relationship to Strict Mode Skeleton (M11.2)

When M11.2 implements the skeleton:

- Policy module is library-only
- No CLI integration
- No package script
- No CI wiring
- No validator default behavior change
- Strict mode option is explicit
- First candidate: `ERROR_CONTEXT_NOT_OBJECT` only
- Info findings remain non-blocking
- Unknown findings remain non-blocking

## 35. Relationship to Snapshot Comparator

Explicit separation:

- Comparator does NOT call strict policy
- Policy module does NOT call comparator
- Snapshot drift does NOT go through policy promotion
- Orphan snapshots are NOT validation findings
- Both exit 1 belongs to different failure domains
- Future CI must use different check names

## 36. Relationship to Report Writer

Recommendations:

- Do NOT modify existing soft report
- Strict result should be generated by future independent writer or adapter
- Do NOT add blocking to existing report in-place
- Do NOT change committed snapshots
- If strict snapshots are needed in future, design separately; do NOT reuse current soft snapshots

## 37. Relationship to Package Scripts and CI

M11.1 does NOT:

- Add package script
- Add CLI flag
- Add CI workflow
- Add required check

All of these require separate future PRs.

## 38. Decision Log

### 38.1 Frozen Initial Decisions

| Decision | Recommendation |
|----------|---------------|
| Module path | `packages/cli/src/validation/pack-runtime-context-strict-policy.js` |
| Policy version | Start at 1 |
| Rules format | Frozen plain object |
| Strict mode default | Off |
| Mode determination | Explicit parameter only |
| ERROR_CONTEXT_NOT_OBJECT | Strict mode blocking |
| INFO_CONTRACT_VERSION_ABSENT | Non-blocking |
| WARN_CONTRACT_SECTION_MISSING | Non-blocking |
| WARN_CONTRACT_VERSION_MALFORMED | Non-blocking |
| WARN_RESERVED_NAMESPACE_USED | Non-blocking |
| Unknown findings | Non-blocking |
| Severity auto-blocking | No |
| Policy changes | Version-controlled |
| Promotion/demotion | Upgrade policy version |
| Comparator isolation | Complete separation |
| Remote config | No |
| Runtime mutation | No |

## 39. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Severity auto-blocks | High | Medium | Policy enforces explicit classification |
| Unknown finding auto-blocks | High | Medium | Default non-blocking |
| Config mutation | Medium | Low | Frozen plain data + Object.freeze |
| Environment-dependent mode | High | Low | Explicit parameter only |
| Policy version drift | Medium | Low | Self-validation on import |
| Duplicate rules | Medium | Low | validateStrictPolicy catches |
| Message-based classification | High | Low | Code-based lookup only |
| Remote config compromise | Critical | Low | No remote config |
| package.json pollution | Low | Low | Dedicated JS module |
| Snapshot drift confusion | Medium | Low | Failure domain separation |
| Input mutation | Medium | Low | Immutability requirement |
| Unstable ordering | Medium | Low | Determinism requirements |
| Breaking soft mode | Critical | Low | Soft mode unchanged guarantee |
| Promotion without fixture | Medium | Low | Workflow requirement |
| Demotion without audit | Medium | Low | Auditability requirement |
| Owner uses personal info | Low | Low | Domain-based owner |
| Policy reason leaks data | Medium | Low | Security requirements |
| Strict mode accidental enable | High | Medium | Default off + explicit flag |

## 40. Non-Goals

M11.1 explicitly does NOT:

- Implement policy module
- Implement strict mode
- Modify validator
- Modify report writer
- Modify snapshot writer
- Modify comparator
- Add CLI flag
- Add package script
- Add CI workflow
- Add required check
- Modify branch protection
- Modify CODEOWNERS
- Add environment variable
- Implement bypass
- Change fixtures
- Change snapshots
- Add JSON schema files
- Modify runtime/resolver behavior

## 41. Recommended Next Step

**M11.2 — Strict Mode Policy Module Skeleton**

Scope:
- Library-only
- Frozen policy rules
- Policy version constant
- Classification function (`classifyFindingForMode`)
- Apply policy to existing report (`applyStrictPolicy`)
- No CLI
- No package script
- No CI
- No validator default behavior change
- No snapshot changes

## 42. Checkpoint Conclusion

M11.1 defines a deterministic, auditable, version-controlled strict mode classification policy that preserves current soft validation behavior. Only explicitly approved finding codes may become blocking in strict mode, unknown findings remain non-blocking, and snapshot verification remains a separate failure domain.


