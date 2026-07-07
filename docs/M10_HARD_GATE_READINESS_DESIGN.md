# M10.0 Hard Gate Readiness Design

## 1. Purpose

M10.0 evaluates the conditions under which PackRuntimeContext soft validation findings may be promoted from advisory / report-only status to hard validation gates.

This is a **readiness design only**. It does not implement hard gates, does not change exit codes, does not modify doctor, CI, check:all, validators, report writers, standalone scripts, package.json, or runtime behavior.

## 2. Non-Goals

The following are explicitly NOT in scope for M10.0:

- Implementing hard validation
- Modifying validator code
- Modifying report writer code
- Modifying standalone report script
- Modifying package.json
- Wiring into check:all
- Wiring into doctor
- Wiring into GitHub Actions
- Adding JSON schema
- Adding fixtures
- Adding snapshot tests
- Changing runtime behavior
- Changing resolver behavior

## 3. Background

This design builds on the following completed milestones:

- **M8.10 Validation Checkpoint** — established the overall validation framework and hard gate principles
- **M9.6 Soft Validation Checkpoint** — recorded the initial soft validation foundation (M9.0–M9.5)
- **M9.9 Package Script Entrypoint Implementation** — added `pack-context:soft-report` npm script
- **M9.10 Soft Validation Package Entrypoint Checkpoint** — froze M9.0–M9.9 capability boundary

Current soft validation capabilities:

- Manual soft validator skeleton
- Soft validation report writer
- Standalone report generator script
- npm package script entrypoint (`npm run pack-context:soft-report`)
- Non-blocking report semantics (report status never controls exit code)

Current gaps:

- No hard gate
- Not wired into check:all / doctor / CI
- No JSON schema
- No fixtures
- No snapshot tests

## 4. Current Soft Validation Pipeline

```
PackRuntimeContext JSON input
  -> validatePackRuntimeContext()
  -> createSoftValidationReport()
  -> serializeSoftValidationReport()
  -> stdout JSON or explicit --out file
```

Current user entry point:

```bash
npm run pack-context:soft-report -- --input <path>
```

Current validation entry points:

```bash
npm run check:all
node scripts/check-pack-runtime-context-soft-validator.cjs
node scripts/check-soft-validation-report-writer.cjs
node scripts/check-standalone-soft-validation-report-script.cjs
node scripts/check-package-script-entrypoint.cjs
```

## 5. Hard Gate Definition

A **hard gate** is a validation rule that can block a command, CI job, release, or merge by producing a non-zero exit code or a failed check.

Key distinctions:

- Hard gate != report severity `error`
- Hard gate != report status `soft-fail`
- Hard gate requires an explicit wiring point
- Hard gate requires: owner, scope, exit behavior, rollback plan

## 6. Candidate Findings for Promotion

| Finding | Current Soft Code | Current Behavior | Hard Gate Candidate? | Rationale |
|---|---|---|---|---|
| context not object | `ERROR_CONTEXT_NOT_OBJECT` | Error in report, exits 0 | **Strong candidate** | Invalid input cannot be interpreted as PackRuntimeContext |
| required section missing | `WARN_CONTRACT_SECTION_MISSING` | Warning in report, exits 0 | Candidate | Needs stable required-section list + fixtures |
| required value missing | `WARN_CONTRACT_VALUE_MISSING` | Warning in report, exits 0 | Candidate | Needs stable path semantics + fixtures |
| reserved namespace used | `WARN_RESERVED_NAMESPACE_USED` | Warning in report, exits 0 | Candidate | Needs documented namespace policy |
| contractVersion absent | `INFO_CONTRACT_VERSION_ABSENT` | Info in report, exits 0 | Not immediate | M9 introduced readiness, not mandatory versioning |
| contractVersion malformed | `WARN_CONTRACT_VERSION_MALFORMED` | Warning in report, exits 0 | Candidate | Needs version format policy |
| contractVersion unsupported | `WARN_CONTRACT_VERSION_UNSUPPORTED` | Warning in report, exits 0 | Candidate | Needs supported range policy |
| contractVersion deprecated | `WARN_CONTRACT_VERSION_DEPRECATED` | Warning in report, exits 0 | Advisory first | Needs deprecation window policy |
| validator internal error | `ERROR_VALIDATOR_INTERNAL` | Error in report, exits 0 | Not a contract gate | Tool failure, separate handling |

## 7. Promotion Criteria

Any finding must satisfy ALL of the following before promotion to hard gate:

1. Documented contract rule
2. Stable report code (no renaming, no semantic drift)
3. Stable path semantics (input path conventions defined)
4. Fixture coverage (canonical input examples)
5. Negative test coverage (known-bad inputs)
6. Clear migration hint (user-facing message)
7. Clear owner (who maintains this rule)
8. Clear exit-code behavior (what exit code, where)
9. Rollback strategy (how to revert if false positive)
10. No false positives on existing examples
11. CI impact understood (branch protection, required checks)
12. Doctor impact understood (summary preview, noise)
13. Package script impact understood (strict mode, non-breaking)

## 8. Required Pre-Hardening Infrastructure

Before any hard gate is implemented, at minimum:

- Canonical PackRuntimeContext fixtures (positive set)
- Negative fixture set (known-invalid inputs)
- Snapshot tests or equivalent stable output checks
- Versioned report schema or report contract
- Stable path conventions (where inputs/outputs live)
- Stable gate IDs (machine-readable identifiers)
- Explicit supported contractVersion policy
- Reserved namespace policy
- Migration documentation
- Failure message review (human-readable errors)
- CI dry-run period (artifact-only, non-blocking)

## 9. Possible Wiring Points

| Wiring Point | Pros | Cons | Recommendation |
|---|---|---|---|
| Standalone package script only | No impact on existing flows | Limited reach | **First step** |
| check:all | Broad visibility | Couples soft validation to general checks | Delay |
| Doctor | Integrated discovery | May add noise to doctor output | Delay |
| GitHub Actions artifact-only | Non-blocking CI signal | No blocking power | **Second step** |
| GitHub Actions required check | Strongest signal | Blocks merges, high risk of false positives | Last step |
| Pre-release script | Release-time safety | Not visible to developers early | Separate concern |
| Runtime / resolver path | Automatic enforcement | Breaks existing workflows | **Not recommended** |

**Recommendation:** Start with standalone package script optional strict mode, then CI artifact dry-run. Do NOT wire directly into runtime/resolver.

## 10. Exit Code Strategy

### Current M9 behavior

| Scenario | Exit Code |
|---|---|
| report status `pass` | 0 |
| report status `pass-with-info` | 0 |
| report status `pass-with-warnings` | 0 |
| report status `soft-fail` | 0 |
| argument error | 1 |
| missing input file | 1 |
| JSON parse error | 1 |
| writer/internal script error | 1 |

### Future M10 possible behavior

- `--strict` mode may exit 1 on selected hard-gate findings
- Non-strict mode remains exit 0 for report findings
- Doctor preview must remain non-blocking unless separate PR changes it
- CI required check must be explicitly introduced

### Proposed future command shape (design only, NOT implemented in M10.0)

```bash
npm run pack-context:soft-report -- --input <path> --strict
# or
npm run pack-context:soft-report:strict -- --input <path>
```

M10.0 does NOT add these commands.

## 11. Migration Strategy

| Phase | Description | Scope |
|---|---|---|
| Phase 1 — Readiness Design | M10.0 documentation-only | This PR |
| Phase 2 — Fixtures and Snapshot Design | Define canonical inputs and expected outputs | M10.1 candidate |
| Phase 3 — Strict Mode Design | Design selected hard-fail conditions | M10.2 candidate |
| Phase 4 — Strict Mode Implementation | Standalone only, not CI | M10.3 candidate |
| Phase 5 — CI Dry Run | Artifact/report-only, non-blocking | M10.4 candidate |
| Phase 6 — Required CI Gate Candidate | Only after low-noise dry run | M10.5 candidate |
| Phase 7 — Doctor / Release Gate Candidate | Only after CI confidence | M10.6+ candidate |

## 12. Finding-by-Finding Recommendation

### ERROR_CONTEXT_NOT_OBJECT

- **Likelihood:** First hard gate candidate
- **Reason:** Invalid input cannot be meaningfully interpreted as PackRuntimeContext
- **Prerequisite:** Fixture coverage (valid and invalid contexts)
- **Exit code:** 1 (invalid input)
- **Risk:** Very low — no false positive potential

### WARN_CONTRACT_SECTION_MISSING

- **Likelihood:** Candidate after required section list stabilizes
- **Reason:** Missing sections indicate incomplete pack definition
- **Prerequisite:** Schema/fixture confirmation
- **Exit code:** 1 (strict mode only)
- **Risk:** Medium — depends on whether all sections are truly required

### WARN_CONTRACT_VALUE_MISSING

- **Likelihood:** Candidate after required value semantics stabilize
- **Reason:** Missing values may indicate incomplete configuration
- **Prerequisite:** Path conventions and fixtures
- **Exit code:** 1 (strict mode only)
- **Risk:** Medium — depends on required vs optional value definitions

### WARN_RESERVED_NAMESPACE_USED

- **Likelihood:** Candidate only after namespace policy is documented
- **Reason:** Namespace conflicts can break future features
- **Prerequisite:** Reserved namespace policy
- **Exit code:** 1 (strict mode only)
- **Risk:** Low-medium — depends on namespace overlap reality

### INFO_CONTRACT_VERSION_ABSENT

- **Likelihood:** Should remain advisory initially
- **Reason:** M9 introduced readiness but not mandatory versioning
- **Prerequisite:** contractVersion policy decision
- **Exit code:** 0 (always advisory for now)
- **Risk:** Low — informational only

### WARN_CONTRACT_VERSION_MALFORMED

- **Likelihood:** Candidate after version format policy is defined
- **Reason:** Malformed versions cannot be compared or validated
- **Prerequisite:** Version parser / policy
- **Exit code:** 1 (strict mode only)
- **Risk:** Low — malformed is objectively bad

### WARN_CONTRACT_VERSION_UNSUPPORTED

- **Likelihood:** Candidate after supported range policy is defined
- **Reason:** Unsupported versions may lack expected features
- **Prerequisite:** Compatibility matrix
- **Exit code:** 1 (strict mode only)
- **Risk:** Medium — depends on supported range definition

### WARN_CONTRACT_VERSION_DEPRECATED

- **Likelihood:** Advisory first, hard gate only after deprecation window policy
- **Reason:** Deprecation needs a grace period
- **Prerequisite:** Deprecation window policy
- **Exit code:** 0 (advisory) → 1 (after grace period)
- **Risk:** Medium — timing matters

### ERROR_VALIDATOR_INTERNAL

- **Likelihood:** Separate handling, not a contract hard gate
- **Reason:** This is a tool/framework failure, not a pack author error
- **Prerequisite:** Separate error taxonomy
- **Exit code:** 1 (tool failure, not gate)
- **Risk:** N/A — not a contract finding

## 13. CI Readiness

Before hard gate enters CI:

- Dry-run period with artifact-only output
- Artifact history reviewed for false positives
- Clear failure messages (human-readable, actionable)
- Stable fixtures in place
- Owner approval from M8/M9 maintainers
- Branch protection implications reviewed
- Rollback plan documented

## 14. Doctor Readiness

Before hard gate affects doctor:

- M9.7 summary design implemented or updated
- No full JSON dump in doctor output
- No exit code changes unless explicit separate PR
- Concise non-blocking preview first
- Hard doctor failure only after separate design

## 15. Runtime / Resolver Readiness

**Hard validation should NOT be introduced directly into runtime/resolver path.**

- Runtime validation may break existing workflows unexpectedly
- Resolver integration requires a compatibility strategy
- Offline validation (CI, pre-release) is safer than runtime blocking
- Prefer validating at the lowest-risk point in the pipeline first

## 16. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| False positives blocking development | Medium | High | Dry-run period, owner approval |
| Hard gate introduced too early | Medium | High | Follow migration strategy phases |
| contractVersion policy not mature | High | Medium | Keep advisory until policy defined |
| Required sections not stable | Medium | Medium | Fixtures before hardening |
| Report shape drift | Medium | Medium | Versioned report schema |
| CI noise overwhelming developers | High | High | Artifact-only first, strict thresholds |
| Doctor output confusion | Medium | Medium | Non-blocking preview first |
| Runtime regression | Low | Critical | Never wire hard gate into runtime |
| Users bypassing validation | Low | Medium | Clear error messages, not just exit codes |
| Migration burden for existing packs | Medium | High | Deprecation window, migration docs |
| Branch protection deadlocks | Low | High | Careful required check design |

## 17. Decision Matrix

| Finding | Readiness | Recommended M10 Action |
|---|---|---|
| ERROR_CONTEXT_NOT_OBJECT | High | Design strict behavior next |
| WARN_CONTRACT_SECTION_MISSING | Medium | Needs fixtures/schema |
| WARN_CONTRACT_VALUE_MISSING | Medium-Low | Needs path policy |
| WARN_RESERVED_NAMESPACE_USED | Medium | Needs namespace policy |
| INFO_CONTRACT_VERSION_ABSENT | Low (for hard gate) | Keep advisory |
| WARN_CONTRACT_VERSION_MALFORMED | Medium | Needs version policy |
| WARN_CONTRACT_VERSION_UNSUPPORTED | Low-Medium | Needs compatibility matrix |
| WARN_CONTRACT_VERSION_DEPRECATED | Low | Advisory with deprecation window |
| ERROR_VALIDATOR_INTERNAL | N/A | Tool failure, separate handling |

## 18. Recommended Next Steps

| Option | Description | Type | Recommendation |
|---|---|---|---|
| **A** — M10.1 Fixtures and Snapshot Test Design | Define canonical inputs and expected outputs | documentation-only | **Recommended** |
| B — M10.1 Strict Mode Design | Design selected hard-fail conditions | documentation-only | Premature without fixtures |
| C — M10.1 Reserved Namespace Policy | Document reserved namespace rules | documentation-only | Useful before hardening namespace finding |
| D — M10.1 Contract Version Policy | Document version format/support policy | documentation-only | Useful before hardening version findings |

**Recommendation:** Proceed to **M10.1 Fixtures and Snapshot Test Design** first. Do NOT implement strict mode before fixtures are planned.

## 19. Checkpoint Conclusion

M10.0 concludes that AWE is ready to design hard gate prerequisites, but not yet ready to implement hard gates. The safest next step is fixture and snapshot design (M10.1), followed by targeted strict-mode design. No hard gate should be implemented until Phase 2–4 prerequisites are satisfied.
