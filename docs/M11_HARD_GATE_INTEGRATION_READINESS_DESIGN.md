# M11.0 Hard Gate Integration Readiness Design

## 1. Purpose

M11.0 defines the preconditions and integration boundaries for safely upgrading AWE PackRuntimeContext soft validation from "observation and comparison capability" to "controllable hard gate".

M11.0 explicitly does NOT:
- Implement strict mode
- Change any existing runtime behavior
- Wire anything into CI
- Modify branch protection
- Add bypass tokens or environment variables
- Modify validator, report writer, snapshot writer, comparator, or comparator CLI
- Modify fixtures, snapshots, or package.json
- Modify check:all, doctor, or GitHub Actions
- Enable hard gate or strict mode
- Add JSON schema files

## 2. Current Frozen Baseline

The following capabilities are established and frozen as the baseline for M11.0:

### 2.1 Canonical Infrastructure

| Capability | Status | PR |
|------------|--------|-----|
| Deterministic fixtures | ✅ 3 canonical | PR58 |
| Deterministic reports | ✅ fixed `generatedAt` | PR58 |
| Deterministic snapshots | ✅ 3 committed | PR61 |
| Explicit snapshot update | ✅ `--update` only | PR61 |
| Read-only comparator module | ✅ single-fixture | PR63 |
| Comparator CLI | ✅ `--all` + `--fixture` | PR64 |
| Semantic comparison | ✅ JSON object equality | PR63 |
| Byte comparison | ✅ serialized byte equality | PR63 |
| Orphan detection | ✅ `--detect-orphans` | PR64 |
| Deterministic output | ✅ repeated byte-identical | PR64 |
| CLI exit code baseline | ✅ match=0, drift=1 | PR64 |
| Comparator validation checkpoint | ✅ M10.10 | PR65 |

### 2.2 Three Canonical Fixtures

| Fixture | Path | Report Status | Comparator Status |
|---------|------|--------------|-------------------|
| valid | `test/fixtures/pack-runtime-context/valid/minimal-valid.json` | `pass` | `match` |
| invalid | `test/fixtures/pack-runtime-context/invalid/context-not-object.json` | `soft-fail` | `match` |
| edge | `test/fixtures/pack-runtime-context/edge/missing-contract-version.json` | `pass-with-info` | `match` |

### 2.3 Current Semantics

- `report soft-fail` matching snapshot → comparator status is `match`
- `comparator failure` does NOT equal hard validation failure
- Hard gate is NOT enabled
- Strict mode is NOT implemented
- CI required check is NOT enabled

## 3. Problem Statement

The current baseline provides strong observation and comparison capabilities, but lacks:

- **Finding blocking policy** — no mechanism to elevate specific findings to blocking
- **Strict mode entrypoint** — no CLI flag, function option, or dedicated command
- **Validation failure promotion rules** — no allowlist for which findings may block
- **Hard gate exit code contract** — no documented contract for strict mode exit codes
- **CI rollout plan** — no phased approach for integrating into CI
- **Branch protection plan** — no strategy for required check integration
- **Bypass and rollback governance** — no emergency procedures
- **Snapshot approval workflow** — no process for reviewing snapshot drift
- **False positive handling** — no documented process for misclassified findings
- **Emergency disable strategy** — no safe way to temporarily suspend strict mode

These gaps must be addressed before any hard gate can be safely implemented.

## 4. Hard Gate Definition

A **hard gate** is an explicitly enabled validation mode that can prevent a command, build, or merge from succeeding when approved blocking validation conditions are met.

Hard gate must NOT:
- Automatically block on every soft finding
- Treat snapshot comparator failure as hard validation failure
- Block on any info or warning by default
- Activate implicitly through environment or configuration drift

Hard gate MUST:
- Be explicitly enabled (opt-in)
- Have stable, documented rules
- Support rollback procedures
- Have auditable approval workflows

## 5. Strict Mode Definition

**Strict mode** is the future implementation mechanism for hard gate enforcement. It must:

- Be **disabled by default**
- Require **explicit activation** (flag, option, or dedicated command)
- Promote **specific approved finding codes** to blocking status
- **Not change** the finding's code, message, or source — only its blocking classification
- Be **independently testable** from soft mode
- **Never** be triggered accidentally by environment state
- **Never** be implicitly enabled through configuration drift

## 6. Proposed Future Entry Points

Design only — no implementation.

### 6.1 Candidate Entry Points

| Entry Point | Pros | Cons |
|-------------|------|------|
| CLI flag `--strict` | Discoverable, explicit | Risk of accidental invocation in scripts |
| Function option `strict: true` | Precise control, type-safe | Requires code changes to call sites |
| Dedicated command `pack-context:validate-strict` | Clear separation | Adds complexity, duplicates logic |
| CI-specific compare/validate command | Isolated from local use | Requires CI integration PR |

### 6.2 Evaluation Criteria

| Criterion | CLI flag | Function option | Dedicated command | CI-specific |
|-----------|----------|----------------|-------------------|-------------|
| Discoverability | High | Medium | High | High |
| Accidental activation | Medium | Low | Low | Low |
| Scripting stability | Medium | High | High | High |
| Backwards compatibility | High | High | High | High |
| CI suitability | Medium | Medium | High | High |
| Local developer UX | High | Low | High | Low |

### 6.3 Recommended Initial Direction

Library option + dedicated CLI flag:
- Default: `false`
- Package script and CI integration deferred to separate PRs
- No environment variable auto-enable

## 7. Finding Promotion Policy

### 7.1 Severity Levels

| Level | Meaning | Default Blocking |
|-------|---------|-----------------|
| `info` | Informational observation | No |
| `warning` | Advisory concern | No |
| `error` | Validation violation | No (in soft mode) |
| `blocking error` | Approved violation | Yes (in strict mode only) |

### 7.2 Promotion Principles

- Severity does NOT automatically equal blocking
- Blocking requires explicit allowlist approval
- Promotion is based on `finding code`, NOT message text
- Unknown finding codes are default non-blocking
- Additive findings are default non-blocking
- Promotion requires design review and testing
- Promotion must NOT modify existing soft-mode semantics

### 7.3 Example Allowlist Structure (Design Only)

```json
{
  "ERROR_CONTEXT_NOT_OBJECT": {
    "softModeBlocking": false,
    "strictModeBlocking": true,
    "reason": "Context root must be an object"
  }
}
```

This is a design example. M11.0 does NOT create any configuration file or policy module.

## 8. Initial Candidate Blocking Findings

Based on existing real finding codes:

### 8.1 ERROR_CONTEXT_NOT_OBJECT

| Property | Value |
|----------|-------|
| Soft mode | non-blocking (exit 0, report soft-fail) |
| Strict mode candidate | blocking (exit 1, report hard-fail) |
| Rationale | Structural integrity — context must be an object |
| Risk | Low — clearly a validation error |

### 8.2 INFO_CONTRACT_VERSION_ABSENT

| Property | Value |
|----------|-------|
| Soft mode | non-blocking (exit 0, report pass-with-info) |
| Strict mode | non-blocking (remain pass-with-info) |
| Rationale | Advisory only — version tracking is optional |

### 8.3 Snapshot Mismatch

- Comparator failure (drift/missing/invalid) is a **separate failure domain**
- Snapshot mismatch does NOT automatically become PackRuntimeContext hard validation failure
- Snapshot update requires explicit `--update` and separate approval

**Note:** This section documents readiness recommendations only. No promotion is executed in M11.0.

## 9. Validation Outcome Model

Three independent outcome categories must remain separate:

### 9.1 Soft Validation Outcome

| Outcome | Exit Code | Blocking |
|---------|-----------|----------|
| `pass` | 0 | No |
| `pass-with-info` | 0 | No |
| `soft-fail` | 0 | No |

### 9.2 Strict Validation Outcome (Future)

| Outcome | Exit Code | Blocking |
|---------|-----------|----------|
| `pass` | 0 | No |
| `pass-with-info` | 0 | No |
| `hard-fail` | 1 | Yes |

### 9.3 Snapshot Verification Outcome

| Outcome | Exit Code | Blocking |
|---------|-----------|----------|
| `match` | 0 | No |
| `missing-snapshot` | 1 | Yes |
| `invalid-snapshot-json` | 1 | Yes |
| `content-drift` | 1 | Yes |
| `format-drift` | 1 | Yes |
| `orphan-snapshot` | 1 | Yes |
| `internal errors` | 1 | Yes |

**Critical:** These three outcome categories must NEVER be conflated. A `soft-fail` in soft mode is NOT a `hard-fail`. A `content-drift` in snapshot verification is NOT a validation failure.

## 10. Exit Code Strategy

Frozen suggestions — not implemented.

### 10.1 Soft Mode

| Outcome | Exit Code |
|---------|-----------|
| pass | 0 |
| pass-with-info | 0 |
| soft-fail | 0 |

### 10.2 Strict Mode (Future)

| Outcome | Exit Code |
|---------|-----------|
| pass | 0 |
| pass-with-info | 0 |
| approved blocking finding present | 1 |
| internal/parse/read failure | 1 |

### 10.3 Snapshot Comparator

| Outcome | Exit Code |
|---------|-----------|
| all match | 0 |
| drift/missing/invalid/orphan | 1 |

**Emphasis:** strict validation exit 1 and snapshot comparator exit 1 are **different failure domains**. Human output and JSON output must identify the failure domain. CI must not confuse the two.

## 11. Failure Domain Separation

Design future unified result field:

```json
{
  "domain": "validation" | "snapshot-verification" | "internal",
  "mode": "soft" | "strict" | "compare",
  "status": "...",
  "blocking": true | false
}
```

Rules:
- Comparator does NOT return `hard-fail`
- Validator does NOT return `content-drift`
- Internal error is its own category
- Future CI summary must display `domain`

## 12. Hard Gate Preconditions

Before enabling hard gate, ALL of the following must be satisfied:

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Finding code registry stable | ✅ (M8) |
| 2 | Blocking allowlist frozen | ❌ (future) |
| 3 | Strict mode module independently tested | ❌ (future) |
| 4 | Soft mode regression fully stable | ✅ (M9.10) |
| 5 | Strict vs soft mode difference explainable | ❌ (future) |
| 6 | JSON output contract frozen | ❌ (future) |
| 7 | Developer documentation complete | ❌ (future) |
| 8 | CI dry-run observation period complete | ❌ (future) |
| 9 | False positive rate acceptable | ❌ (future) |
| 10 | Rollback procedure verified | ❌ (future) |
| 11 | Emergency bypass governance defined | ❌ (future) |
| 12 | Branch protection change has independent approval | ❌ (future) |
| 13 | Snapshot workflow separated from validation gate | ❌ (future) |

## 13. CI Rollout Phases

Phased approach — M11.0 implements NONE of these phases.

### Phase 0 — Local Only

- Strict mode runs only locally with explicit flag
- No package script integration
- No CI integration

### Phase 1 — CI Informational

- Non-required check
- Allowed to fail
- Generates summary/artifact
- Does NOT block merge

### Phase 2 — CI Advisory

- Failure clearly visible
- Still not required
- Observe false positive rate

### Phase 3 — Required on Selected Branches

- Only `develop` or pilot branches
- Separate branch protection PR
- Has rollback switch

### Phase 4 — Required Broadly

- Expand only after stability proven

## 14. Required Check Naming Strategy

Design only — no implementation.

### 14.1 Candidate Names

| Name | Purpose |
|------|---------|
| `pack-runtime-context-strict-validation` | Strict mode validation check |
| `pack-runtime-context-snapshot-verification` | Snapshot comparator check |

### 14.2 Separation Principle

Must be TWO SEPARATE checks:
- Validation gate → `strict-validation`
- Snapshot verification → `snapshot-verification`

Never merge into a single vague `validation` check.

## 15. Branch Protection Risks

Potential risks when eventually integrating hard gate into branch protection:

| Risk | Impact | Mitigation |
|------|--------|------------|
| Required check name change prevents merge | High | Versioned check names |
| Workflow rename causes deadlock | High | Migration plan with overlap period |
| Fork PR permission differences | Medium | Document fork behavior |
| Skipped job treated as missing | Medium | Use `allow-failure` for non-required |
| Path-filter causes missing required check | High | Validate path-filter logic |
| Emergency hotfix cannot enter | Critical | Rollback procedure + documented bypass |
| Draft PR behavior | Low | Document draft PR expectations |
| Merge queue compatibility | Medium | Test with merge queues |
| Flaky check blocks merges | High | Retry logic + timeout |
| Branch protection + squash merge interaction | Medium | Document squash behavior |

## 16. Rollback Strategy

Rollback principles:

- Strict mode defaults to **off** — rollback is simply disabling the flag
- CI required check can be independently reverted
- Promotion allowlist can be rolled back without changing code
- Workflow changes use separate PRs with independent review
- Branch protection change records owner and timestamp
- Rollback does NOT require modifying fixtures or snapshots
- Rollback does NOT delete historical reports

## 17. Emergency Bypass Governance

Emergency bypass must follow these rules:

- NO permanent bypass in code
- NO hidden environment variables
- NO silent skipping
- Emergency bypass requires:
  - Named approver
  - Ticket or incident reference
  - Time-limited (with expiry)
  - Audit log entry
  - Follow-up validation补回

M11.0 only defines governance — no bypass implementation.

## 18. Snapshot Update Approval Workflow

Snapshot update rules:

- Update must be explicit `--update`
- Comparator failure does NOT auto-update
- Snapshot PR must show diff
- Must explain drift reason
- Validator/report writer changes vs fixture changes must be distinguished
- Snapshot update PR requires at least one reviewer
- CI NEVER executes update
- Required check NEVER modifies snapshot
- Orphan deletion must be independent and explicit
- Emergency situations do NOT permit silent snapshot refresh

## 19. False Positive Management

False positive handling:

- Track at finding code level
- Label as `strict-mode false positive`
- Collect triggering samples
- Can temporarily remove from blocking allowlist
- Preserve soft finding
- Do NOT hide issues by modifying message text
- Requires regression fixture
- Requires explanation of root cause

## 20. False Negative Management

False negative handling:

- Supplement with new fixtures
- New findings launch as non-blocking first
- Observe before promotion to blocking
- Never block on first implementation
- Requires explicit test case and expected outcome

## 21. Backwards Compatibility

Guarantees:

- Soft mode default behavior unchanged
- Current CLI default exit codes unchanged
- Comparator current behavior unchanged
- Snapshot writer current behavior unchanged
- Strict mode is opt-in only
- Existing automation must NOT fail automatically after upgrade
- Package script changes require separate PR

## 22. Configuration Strategy

Future blocking allowlist placement options:

| Option | Pros | Cons |
|--------|------|------|
| Hardcoded constant | Simple, reviewable | Hard to change |
| JS configuration module | Extensible | More code to maintain |
| JSON/YAML config | Human-readable | Schema stability risk |
| Package metadata | Centralized | Discovery risk |
| Registry | Dynamic | Runtime risk |

Evaluation:

| Criterion | Hardcoded | JS module | JSON/YAML | Metadata | Registry |
|-----------|-----------|-----------|-----------|----------|----------|
| Discoverability | High | High | Medium | Medium | Low |
| Schema stability | High | High | Medium | Medium | High |
| Reviewability | High | High | High | Medium | Low |
| Runtime risk | None | Low | Medium | Medium | High |
| Accidental mutation | None | Low | Medium | Medium | High |

**Recommended initial approach:** Version-controlled JS constant/module, no dynamic remote config, no environment variable override, no runtime download, independent tests.

M11.0 does NOT create any configuration module.

## 23. Strict Mode Result Shape (Design Only)

Proposed future strict mode result structure:

```json
{
  "domain": "validation",
  "mode": "strict",
  "status": "hard-fail",
  "blocking": true,
  "summary": {
    "total": 1,
    "blocking": 1,
    "errors": 1,
    "warnings": 0,
    "info": 0
  },
  "results": [
    {
      "code": "ERROR_CONTEXT_NOT_OBJECT",
      "severity": "error",
      "blocking": true
    }
  ]
}
```

Requirements:
- Deterministic output
- No current time unless existing fixed contract requires it
- Repo-relative source paths
- No machine metadata
- Stable finding order

## 24. CLI UX Design

Future strict CLI human output must clearly identify:

```
PackRuntimeContext strict validation failed
Domain: validation
Mode: strict
Blocking findings: 1
  - ERROR_CONTEXT_NOT_OBJECT
```

Must NOT be confused with:
- Snapshot drift
- Comparator failure
- Generic build failure

Soft mode output continues to clearly indicate:
- Non-blocking
- Exit code 0

## 25. Observability and Reporting

Future CI summary must include:
- Domain
- Mode
- Status
- Blocking count
- Non-blocking count
- Finding codes
- Snapshot compare status (separately)
- Remediation hint
- No secret values
- No absolute paths

## 26. Security and Privacy

Prohibited in ALL modes (including strict failure output):
- Absolute paths
- Usernames
- Hostname
- HOME
- CWD
- Tokens
- Environment secrets
- Private fixture payload
- Full sensitive field values

Strict mode failure must NOT print more sensitive information than soft mode.

## 27. Determinism Requirements

Future strict mode must guarantee:
- Same input → same result
- Stable finding order
- Stable blocking classification
- Stable JSON serialization
- No random IDs
- No current timestamps
- No environment-dependent behavior
- No filesystem enumeration dependence

## 28. Test Strategy (Future)

Future strict mode skeleton must include at minimum:

| Test | Expectation |
|------|-------------|
| Soft mode unchanged | ✅ |
| Strict mode disabled by default | ✅ |
| Strict mode explicit enable | ✅ |
| ERROR_CONTEXT_NOT_OBJECT strict blocking | ✅ |
| Info finding remains non-blocking | ✅ |
| Unknown finding remains non-blocking | ✅ |
| Result order deterministic | ✅ |
| Repeated output byte-identical | ✅ |
| No file writes | ✅ |
| No snapshot changes | ✅ |
| Exit code split verified | ✅ |
| Domain field verified | ✅ |
| No absolute path leakage | ✅ |
| Malformed fixture error | ✅ |
| Internal error handling | ✅ |
| Package script absent until later phase | ✅ |

## 29. Migration Plan

Recommended M11 series progression:

| Milestone | Scope | Type |
|-----------|-------|------|
| M11.0 | Hard Gate Integration Readiness Design | Documentation-only |
| M11.1 | Strict Mode Policy Module Design | Documentation-only |
| M11.2 | Strict Mode Skeleton | Library-only, explicit option, no CLI |
| M11.3 | Strict Mode CLI | Local-only, no package script |
| M11.4 | Strict Mode Validation Matrix | Regression and checkpoint |
| M11.5 | CI Informational Design | Documentation-only |
| M11.6 | CI Informational Check | Allowed-to-fail, no branch protection |
| M11.7 | Hard Gate Readiness Checkpoint | Decide if required check is safe |

M11.0 does NOT implement any of the above stages.

## 30. Decision Log

Recommended initial decisions for M11+:

| Decision | Recommendation |
|----------|---------------|
| Strict mode default | Off |
| Blocking mechanism | Finding-code allowlist only |
| First blocking candidate | ERROR_CONTEXT_NOT_OBJECT |
| INFO_CONTRACT_VERSION_ABSENT | Remain non-blocking |
| Unknown findings | Remain non-blocking |
| Comparator drift | Separate failure domain |
| Environment variable auto-enable | No |
| Permanent bypass | No |
| CI rollout start | Informational |
| Branch protection changes | Separate PR |
| Snapshot update | Explicit and manual |

## 31. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Accidental strict activation | Medium | Default off, explicit flag |
| All errors becoming blocking | High | Allowlist-based promotion |
| Comparator drift confused with validation failure | High | Failure domain separation |
| Branch protection deadlock | Critical | Staged rollout + rollback |
| Required check rename | High | Versioned names + migration |
| Flaky validation | Medium | Retry logic + timeout |
| False positives | Medium | FP management process |
| False negatives | Medium | FN management process |
| Bypass abuse | High | Governance + audit |
| Snapshot auto-update | High | Explicit --update only |
| Hidden environment behavior | Medium | No env var auto-enable |
| Absolute path leakage | Medium | Security review |
| Non-deterministic ordering | High | Determinism requirements |
| Soft mode compatibility regression | High | Backwards compatibility guarantees |
| CI rollout too early | Medium | Phased approach |
| Undocumented blocking promotion | High | Decision log + design review |
| Config drift | Medium | Version-controlled config |

## 32. Non-Goals

M11.0 explicitly does NOT:

- Implement strict mode
- Implement blocking allowlist
- Add CLI flag
- Add package script
- Add CI workflow
- Add required check
- Modify branch protection
- Implement bypass
- Change snapshots
- Change fixtures
- Add JSON schema files
- Modify runtime, resolver, or pack loader behavior

## 33. Recommended Next Step

**M11.1 — Strict Mode Policy Module Design**

Scope:
- Documentation-only
- Finding promotion allowlist design
- Policy module interface
- Versioning strategy
- Unknown finding behavior
- No validator runtime change

## 34. Checkpoint Conclusion

M11.0 establishes the governance, separation of failure domains, rollout phases, and safety preconditions required before any PackRuntimeContext hard gate can be implemented. Soft validation and snapshot comparison remain unchanged and non-blocking by default.
