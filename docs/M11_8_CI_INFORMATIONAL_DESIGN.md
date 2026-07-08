# M11.8 CI Informational Design

## 1. Purpose

Design future CI informational checks for PackRuntimeContext strict validation
and snapshot verification. **M11.8 is documentation-only.**

This PR:
- Defines two independent CI domains
- Freezes stable job names
- Recommends non-required advisory behavior
- Documents trigger, path-filter, fork, and draft PR strategies
- Defines summary output contracts
- Establishes observation period and promotion criteria

This PR does NOT:
- Modify `.github/workflows/*`
- Enable required checks
- Change branch protection
- Modify any JS/CSS/JSON code
- Change package.json
- Add CI artifacts
- Implement any workflow

## 2. Two Independent CI Domains

Strict validation and snapshot verification must remain **separate CI checks**.
They represent fundamentally different failure domains and must never be merged
into a single ambiguous `validation` check.

### 2A. pack-runtime-context-strict-validation

- **Source**: `validate-pack-runtime-context.cjs` CLI or `check-strict-mode-cli.cjs`
- **Domain**: `validation`
- **Status**: `pass`, `pass-with-info`, `hard-fail`, `internal-error`
- **Blocking**: Only `hard-fail` with blocking findings

### 2B. pack-runtime-context-snapshot-verification

- **Source**: `check-pack-runtime-context-snapshots.cjs` CLI
- **Domain**: `snapshot-verification`
- **Status**: `match`, `missing`, `invalid`, `drift`, `orphan`
- **Blocking**: Comparator failure ≠ validation hard-fail

## 3. Initial Rollout Mode

### Recommendation: Advisory Informational

Both jobs should run as **non-required, advisory** checks during the initial
phase. This allows teams to observe behavior without merge disruption.

### Strategy: Step-Level Exit Code Capture

Recommended approach for informational phase:

1. Run validation/comparator commands
2. Capture exit code into a shell variable
3. Write GitHub Step Summary showing PASS / ADVISORY FAILURE
4. Job succeeds regardless (avoid false blocking)
5. Original exit code recorded in summary

Alternative (job-level `continue-on-error`) is acceptable but **must preserve
real exit codes in the summary** — never silently swallow failures.

### Prohibited

- Never describe an ADVISORY FAILURE as PASS
- Never suppress original exit codes
- Never merge validation and snapshot domains

## 4. Proposed Job Names (Frozen)

These names are frozen for the informational phase. Future required-phase
names must be designed separately and should not reuse these identifiers
without explicit semantic review.

| Phase | Job Name | Domain |
|-------|----------|--------|
| Informational | `pack-runtime-context-strict-validation-informational` | validation |
| Informational | `pack-runtime-context-snapshot-verification-informational` | snapshot-verification |
| Required (future) | TBD | TBD |

## 5. Commands

### 5A. Strict Validation Informational

Recommended commands:

```bash
# Policy module integrity
node scripts/check-strict-mode-policy-module-skeleton.cjs

# Library skeleton
node scripts/check-strict-mode-library-skeleton.cjs

# CLI validation
node scripts/check-strict-mode-cli.cjs
```

Optional for future expansion:

```bash
# Single-fixture smoke test (canonical fixture only)
node scripts/validate-pack-runtime-context.cjs \
  --fixture test/fixtures/pack-runtime-context/invalid/context-not-object.json \
  --strict --json
```

### 5B. Snapshot Verification Informational

Recommended commands:

```bash
# Comparator module skeleton
node scripts/check-snapshot-comparator-module-skeleton.cjs

# Comparator CLI
node scripts/check-snapshot-comparator-cli.cjs

# Full comparison
node scripts/check-pack-runtime-context-snapshots.cjs --all --json
```

### 5C. No-Write Guarantee

CI must NEVER run:
- `--update`
- `--write`
- `--fix`
- `--delete`
- `--repair`
- Any directory mutation

CI only compares and validates.

## 6. Recommended Initial CI Scope

### Strict Validation Job

| Command | Purpose |
|---------|---------|
| `check-strict-mode-policy-module-skeleton.cjs` | Policy integrity |
| `check-strict-mode-library-skeleton.cjs` | Library integrity |
| `check-strict-mode-cli.cjs` | CLI contract |

### Snapshot Verification Job

| Command | Purpose |
|---------|---------|
| `check-snapshot-comparator-module-skeleton.cjs` | Comparator integrity |
| `check-snapshot-comparator-cli.cjs` | CLI contract |
| `check-pack-runtime-context-snapshots.cjs --all --json` | Full comparison |

Both jobs run in parallel. No sequential dependency.

## 7. Trigger Strategy

### Recommended

| Trigger | Purpose |
|---------|---------|
| `pull_request` (branches: develop) | Review validation on PRs |
| `push` (branches: develop) | Post-merge verification |
| `workflow_dispatch` (optional) | Manual runs |

### Not Recommended

| Trigger | Reason |
|---------|--------|
| `schedule` | Unnecessary noise, no action item |
| `merge_group` | M11.8 does not address merge queues |
| `pull_request_target` | Security risk, unnecessary privilege |

## 8. Path Filter Strategy

### Recommendation: Avoid Initially

Path filters in informational phase add complexity without benefit:
- Risk of check absence if filter is wrong
- Required checks + path filter = potential deadlock
- Informational checks should run consistently for observability

### Future

Path filters may be evaluated separately for required checks if CI runtime
becomes a concern.

## 9. Fork PR Behavior

### Design

Informational checks must support fork PRs safely:
- Uses only `checkout@v4` + Node.js
- No secrets required
- No write operations
- No privileged tokens
- No `pull_request_target`

### Implementation

Standard `pull_request` trigger with `actions/checkout@v4` is sufficient.
No special fork handling needed because:
- No secrets used
- No repository writes
- Read-only commands only

## 10. Draft PR Behavior

### Recommendation

Informational checks SHOULD run on draft PRs:
- Enables early detection of drift
- Does not block draft status
- Does not auto-update snapshots
- Provides developer feedback before final PR

## 11. Merge Queue

M11.8 does NOT address merge queues. Future required-rollout PRs must
independently evaluate:
- `merge_group` trigger
- Required check name stability
- Queue deadlock risk

## 12. Summary Output Contract

### 12A. Strict Validation Summary

Must include:

```
Domain: validation
Mode: strict
Status: <pass | pass-with-info | hard-fail | internal-error>
Blocking Count: <N>
Finding Codes: <comma-separated or "none">
Original Exit Code: <N>
Informational Result: <PASS | ADVISORY FAILURE | ADVISORY ERROR>
```

Must NOT include:
- Absolute paths
- HOME / username / hostname
- Secrets
- Full fixture payloads

### 12B. Snapshot Verification Summary

Must include:

```
Domain: snapshot-verification
Total: <N>
Matched: <N>
Missing: <N>
Invalid: <N>
Content Drift: <N>
Format Drift: <N>
Orphan: <N>
Original Exit Code: <N>
Informational Result: <PASS | ADVISORY FAILURE>
```

## 13. Artifact Policy

### Recommendation

- Do NOT upload full fixtures or snapshots
- May upload sanitized JSON summary (no sensitive data)
- Short retention period (3-7 days)
- No sensitive data in artifacts
- M11.8 does NOT implement artifact upload

## 14. Failure Semantics

### Informational Phase

| Condition | Severity | Summary Label | Job Result |
|-----------|----------|---------------|------------|
| strict `pass` | — | PASS | success |
| strict `pass-with-info` | — | PASS | success |
| strict `hard-fail` | Advisory | ADVISORY FAILURE | success |
| strict `internal-error` | Advisory | ADVISORY ERROR | success |
| snapshot `match` | — | PASS | success |
| snapshot `drift/missing/orphan` | Advisory | ADVISORY FAILURE | success |
| snapshot `internal-error` | Advisory | ADVISORY ERROR | success |

**Key Rule**: Never describe an ADVISORY FAILURE as PASS.

## 15. Observation Period

### Recommendation

Minimum observation before considering required rollout:
- **10–20 PRs** OR **2 weeks**, whichever is longer

### Metrics to Record

| Metric | Target |
|--------|--------|
| False positive rate | < 5% |
| Flaky behavior | 0 |
| Average runtime | < 60s per job |
| Output clarity | Developer understandable |
| Developer remediation success | > 80% |
| Fork PR compatibility | 100% |

## 16. Promotion to Required — Preconditions

All of the following must be satisfied before promoting informational checks
to required status:

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Observation period complete | ❌ Future |
| 2 | False positive rate acceptable (< 5%) | ❌ Future |
| 3 | No flaky failures | ❌ Future |
| 4 | Check names frozen | ✅ (this PR) |
| 5 | Rollback procedure verified | ❌ Future |
| 6 | Branch protection方案 reviewed | ❌ Future |
| 7 | Fork/draft/merge queue behavior defined | ✅ (this PR) |
| 8 | Soft/strict/comparator semantics stable | ✅ (M11.7) |
| 9 | Owner明确 | ❌ Future |
| 10 | Emergency disable流程明确 | ❌ Future |

## 17. Rollback Strategy

### Informational Phase

- Workflow file can be independently deleted or disabled
- No validator/policy/snapshot changes needed
- Required checks not yet enabled → no branch protection deadlock
- Rollback via independent PR
- Historical summaries retained in GitHub Actions logs

### Required Phase (Future)

Must be handled in a separate PR with:
- Emergency disable procedure
- Branch protection modification
- Stakeholder notification

## 18. Security

### Prohibited in CI

| Item | Reason |
|------|--------|
| secrets | Not needed for read-only checks |
| write token | CI is compare-only |
| `pull_request_target` | Security risk, unnecessary |
| shell `eval` | Injection risk |
| dynamic remote scripts | Supply chain risk |
| environment override strict policy | Policy must be immutable |
| snapshot update | CI must never modify snapshots |

### Recommended

- `actions/checkout@v4` (read-only)
- `actions/setup-node@v4` (Node.js runtime)
- No custom actions or third-party scripts

## 19. Cost and Runtime

### Recommendations

| Parameter | Target |
|-----------|--------|
| Jobs | 2 (strict validation + snapshot verification) |
| Concurrency | Parallel |
| Dependencies | None (Node.js builtin only) |
| Total runtime per job | < 60 seconds |
| Timeout | Explicitly set (e.g., 300s) |

### Monitoring

If runtime exceeds 60s consistently, investigate:
- Unnecessary file enumeration
- Duplicate computation
- Missing caching

## 20. Proposed Future Workflow (Example Only)

**M11.8 does NOT create this file.** This is a documentation example for
future reference.

```yaml
# .github/workflows/pack-runtime-context-informational.yml (future)
name: Pack Runtime Context Informational

on:
  pull_request:
    branches: [develop]
  push:
    branches: [develop]

jobs:
  strict-validation-informational:
    name: pack-runtime-context-strict-validation-informational
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Run strict validation checks
        id: strict
        run: |
          set -euo pipefail
          EXIT_CODE=0
          node scripts/check-strict-mode-policy-module-skeleton.cjs || true
          node scripts/check-strict-mode-library-skeleton.cjs || true
          node scripts/check-strict-mode-cli.cjs || true
          echo "exit_code=$EXIT_CODE" >> "$GITHUB_OUTPUT"
      - name: Write summary
        if: always()
        run: |
          echo "## Strict Validation" >> "$GITHUB_STEP_SUMMARY"
          echo "- Domain: validation" >> "$GITHUB_STEP_SUMMARY"
          echo "- Status: ${{ steps.strict.outputs.exit_code == '0' && 'PASS' || 'ADVISORY FAILURE' }}" >> "$GITHUB_STEP_SUMMARY"

  snapshot-verification-informational:
    name: pack-runtime-context-snapshot-verification-informational
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Run snapshot verification
        id: snapshot
        run: |
          set -euo pipefail
          node scripts/check-pack-runtime-context-snapshots.cjs --all --json
          echo "exit_code=$?" >> "$GITHUB_OUTPUT"
      - name: Write summary
        if: always()
        run: |
          echo "## Snapshot Verification" >> "$GITHUB_STEP_SUMMARY"
          echo "- Domain: snapshot-verification" >> "$GITHUB_STEP_SUMMARY"
```

## 21. Decision Table

| Topic | Decision |
|-------|----------|
| Required | No |
| Branch protection | No change |
| Strict and snapshot jobs | Separate |
| Snapshot update in CI | Forbidden |
| Secrets | None |
| Fork PR | Supported |
| Path filters | Avoid initially |
| Summary | Required |
| Job result | Advisory/non-blocking |
| Observation period | 10–20 PRs or 2 weeks |
| Required rollout | Separate future PR |

## 22. Recommended Next Step

### M11.9 — CI Informational Check

Scope:
- New independent workflow file
- Two non-required jobs
- No package.json changes
- No branch protection changes
- No write/update operations
- Clear summaries
- Rollback-ready

## 23. Known Non-Goals

| Item | Status |
|------|--------|
| Create `.github/workflows/*.yml` | Not in scope |
| Enable required checks | Not in scope |
| Modify branch protection | Not in scope |
| Implement artifact upload | Not in scope |
| Add merge queue support | Not in scope |
| Implement bypass mechanism | Not in scope |
| Add secrets or privileged tokens | Not in scope |
