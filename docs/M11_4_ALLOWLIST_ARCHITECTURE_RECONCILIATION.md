# M11.4 Allowlist Architecture Reconciliation

## 1. Purpose

M11.4 reconciles the architectural conflict between M11.1/M11.2 (strict policy module) and PR69 (promotion allowlist).

It freezes:
- The JS strict policy module as the **only runtime source of truth**
- The promotion allowlist as **governance documentation only**
- No JSON/YAML runtime allowlist
- No dual configuration
- Policy version rules for promotion and demotion
- Audited PR-based emergency suspension
- Unknown findings as non-blocking
- Future strict library dependency on the JS policy module only

This PR explicitly does NOT:
- Modify the policy module
- Create JSON/YAML allowlist
- Modify validator, report writer, snapshot, comparator
- Modify package.json, check:all, doctor, CI, branch protection
- Modify fixtures, snapshots, or runtime layers
- Implement strict mode library, CLI, or hard gate

## 2. Conflict Analysis

### 2.1 M11.1 / M11.2 Position

M11.1 designed a version-controlled frozen JS policy module at:
`packages/cli/src/validation/pack-runtime-context-strict-policy.js`

M11.2 implemented this as a skeleton with:
- `STRICT_POLICY_VERSION = 1`
- `STRICT_POLICY_RULES` — frozen plain data for 5 finding codes
- `classifyFindingForMode()`, `applyStrictPolicy()`, `validateStrictPolicy()`, `getStrictPolicySummary()`
- Deep freeze of all rules
- Deterministic, read-only, no file I/O, no environment variables

### 2.2 PR69 Position

PR69 designed a promotion allowlist as a structured document defining:
- Which finding codes may be promoted to blocking status
- Governance, review, audit procedures
- Versioned entries with status (active/suspended/deprecated)

### 2.3 The Conflict

M11.1/M11.2 proposes a **JS runtime module** as the source of truth.
PR69 proposes a **future JSON allowlist** as a second runtime configuration.

These create a dual-source-of-truth problem:
- JS module defines blocking classification
- JSON allowlist could override or supplement JS rules
- No clear precedence when they disagree
- Maintenance burden of keeping both in sync
- Risk of configuration drift

## 3. Decision: Single Source of Truth

### 3.1 Frozen Decision

**`packages/cli/src/validation/pack-runtime-context-strict-policy.js`** is the **only runtime authoritative source** for strict mode blocking classification.

### 3.2 Rationale

| Criterion | JS Policy Module | JSON Allowlist |
|-----------|------------------|----------------|
| Already implemented | ✅ Yes (M11.2) | ❌ No |
| Already validated | ✅ 46/46 assertions pass | ❌ N/A |
| Frozen plain data | ✅ Object.freeze | ❌ Requires parser |
| No schema drift risk | ✅ Hard-coded structure | ❌ Schema evolution |
| Reviewable diff | ✅ Clear JS diff | ❌ JSON drift hard to review |
| No runtime file loading | ✅ Import-time only | ❌ Requires file I/O |
| Deterministic | ✅ Pure function | ⚠ Depends on parser |
| No dependency risk | ✅ Zero deps | ❌ JSON parser edge cases |
| Test coverage | ✅ 46 assertions | ❌ None |

**Conclusion:** The JS policy module is the superior runtime source. Creating a second JSON allowlist would introduce unnecessary complexity, maintenance burden, and dual-source risk without clear benefit.

## 4. Promotion Allowlist: Governance Only

### 4.1 Revised Position

PR69's promotion allowlist is **not a second runtime configuration**. It is a **governance model** that defines:

- **Promotion criteria**: What makes a finding eligible for blocking
- **Review process**: Who reviews, turnaround times
- **Audit requirements**: What must be recorded
- **Emergency procedures**: How to handle false positives
- **Demotion process**: How to revert promotions

### 4.2 What It Is NOT

- ❌ Not a runtime JSON config file
- ❌ Not dynamically loaded data
- ❌ Not a second source of truth
- ❌ Not something the policy module reads at runtime
- ❌ Not something the strict library imports

### 4.3 What It IS

- ✅ Governance documentation
- ✅ Review checklist
- ✅ Process description
- ✅ Audit requirements specification
- ✅ Reference for PR reviewers

## 5. JSON Allowlist Decision

### 5.1 Frozen Decision

**No JSON allowlist is created in this project.**

Specifically:
- Runtime does NOT read JSON allowlist
- No JS/JSON dual-sync maintenance
- No JSON mirror of policy rules
- No JSON can override JS rules
- Future machine-readable manifest requires separate design proving no dual-source risk

### 5.2 Why This Is Safe

1. **Policy module is extensible**: New findings can be added via JS PR
2. **Governance document covers process**: The allowlist design doc describes the promotion workflow
3. **Git history is the audit trail**: Commits, PRs, version bumps provide full traceability
4. **No parser dependency**: Eliminating JSON removes a runtime dependency
5. **Review clarity**: JS diffs are easier to review than JSON schema drift

## 6. Policy vs Governance Boundary

| Aspect | Policy Module (JS) | Governance (Docs) |
|--------|--------------------|--------------------|
| Defines | Actual blocking classification | Promotion criteria |
| Runtime read | ✅ Yes | ❌ No |
| Versioned | ✅ `STRICT_POLICY_VERSION` | ✅ Document revision |
| Frozen | ✅ `Object.freeze` | ✅ N/A (docs evolve) |
| Tested | ✅ 46 assertions | ✅ N/A |
| Auditable | ✅ Git history | ✅ Git history |
| Emergency override | ❌ Forbidden | ✅ Expedited PR process |

## 7. Versioning Rules

### 7.1 Policy Version

- `STRICT_POLICY_VERSION` is the **behavior version**
- Increments on classification contract changes only
- Text-only changes (comments, docs) do NOT increment
- Governance document changes are independent
- No second allowlist runtime version

### 7.2 Promotion Triggers Version Bump

| Change | Version Bump |
|--------|-------------|
| Promotion (non-blocking → blocking) | ✅ Yes |
| Demotion (blocking → non-blocking) | ✅ Yes |
| New non-blocking finding | ⚠ Optional |
| Comment/doc change | ❌ No |
| Governance doc update | ❌ No |
| Emergency suspension | ✅ Yes |

## 8. Promotion Workflow

### 8.1 Standard Promotion Flow

1. Finding code exists and is stable in soft mode
2. Regression fixture exists demonstrating the finding
3. False positive rate assessed (< 5% target)
4. Modify JS policy rule (`strictModeBlocking: false → true`)
5. Increment `STRICT_POLICY_VERSION`
6. Update test expectations
7. Submit PR for review
8. Merge, then enter strict mode rollout phase

### 8.2 Demotion / Emergency Suspension

**Corrected from PR69:**

PR69 stated "author can directly suspend." This is **incorrect** for a version-controlled repository.

**Recommended approach:**

- ❌ No silent runtime suspension
- ❌ No environment variable bypass
- ❌ No user-local config override of CI classification
- ✅ Emergency demotion still via Git PR
- ✅ Expedited review process (shortened turnaround)
- ✅ Must preserve audit record
- ✅ PR must document rationale and evidence

**Emergency suspension is NOT a local configuration change.** It is a PR that:
1. Modifies `STRICT_POLICY_VERSION`
2. Changes `strictModeBlocking` back to `false`
3. Documents the false positive evidence
4. Gets expedited review (same day)
5. Is merged with clear rollback plan

## 9. Single-Maintainer Repository Governance

### 9.1 Context

The repository may be managed by a single primary maintainer. Therefore:

- ❌ Do NOT require "two reviewers" as a technical prerequisite
- ✅ Use "at least one authorized reviewer, or repository owner self-review with documented rationale"
- ✅ Required reviewer count is **repository governance**, not a **runtime contract**
- ❌ Do NOT modify CODEOWNERS or branch protection

### 9.2 Implications

The promotion workflow described in Section 8 applies regardless of team size. The reviewer requirement is a policy decision, not a technical constraint.

## 10. Unknown Finding Behavior

### 10.1 Frozen Decision

- Unknown findings remain **non-blocking** in strict mode
- Unknown findings are NOT automatically added to allowlist
- Unknown findings do NOT auto-hard-fail
- Must have explicit policy PR to promote

This matches the current implementation in `pack-runtime-context-strict-policy.js`:
```javascript
// classifyFindingForMode: unknown code → blocking: false, policyStatus: "unknown-policy-rule"
```

## 11. Initial Runtime Policy

### 11.1 Current Rules (Frozen)

| Finding Code | Severity | Soft Blocking | Strict Blocking |
|-------------|----------|---------------|-----------------|
| `ERROR_CONTEXT_NOT_OBJECT` | error | false | **true** |
| `WARN_CONTRACT_SECTION_MISSING` | warning | false | false |
| `INFO_CONTRACT_VERSION_ABSENT` | info | false | false |
| `WARN_CONTRACT_VERSION_MALFORMED` | warning | false | false |
| `WARN_RESERVED_NAMESPACE_USED` | warning | false | false |
| Any unknown | — | false | false |

## 12. No Dual Configuration

### 12.1 Forbidden Patterns

The following are explicitly prohibited:

- ❌ JS + JSON dual source of truth
- ❌ Runtime merge of two rule sets
- ❌ Environment variable override of policy
- ❌ Remote policy fetching
- ❌ User-local configuration override
- ❌ CI-specific hidden rules

### 12.2 Allowed Patterns

- ✅ Single JS policy module import
- ✅ Governance documents describe process
- ✅ Git history provides audit trail
- ✅ Policy version bumps track changes

## 13. Audit Model

### 13.1 Git History as Audit Mechanism

The initial audit mechanism is Git itself:

- **Commit**: Every change is recorded
- **PR**: Review process is documented
- **Policy version**: Bumped on classification changes
- **Test diff**: Shows behavioral impact
- **Rationale**: Documented in PR description

### 13.2 No Separate Audit Database

No additional audit infrastructure is needed at this stage. Git provides sufficient traceability.

## 14. Relationship to Future Strict Library

### 14.1 Dependency Contract

The future strict mode library (M11.5+) MUST:

- ✅ Import ONLY the JS policy module
- ❌ NOT read allowlist JSON
- ❌ NOT read governance documents
- ❌ NOT interpret severity independently
- ❌ NOT implement emergency override

### 14.2 Library Interface

```javascript
// Future strict library pseudocode
const { classifyFindingForMode, applyStrictPolicy } = require('./pack-runtime-context-strict-policy');
// That's it. Nothing else to import.
```

## 15. Decision Summary Table

| Topic | Decision |
|-------|----------|
| Runtime source of truth | JS strict policy module |
| JSON allowlist | Not implemented |
| Governance allowlist | Documentation/process only |
| Runtime override | Forbidden |
| Unknown finding | Non-blocking |
| Promotion | JS policy PR + version bump |
| Demotion | JS policy PR + version bump |
| Emergency suspension | Expedited audited PR |
| Dual source | Forbidden |

## 16. Recommended Next Step

**M11.5 — Strict Mode Library Skeleton**

Scope:
- Library-only
- Based on soft validator + strict policy module
- No CLI
- No package script
- No CI
- No JSON allowlist
- Deterministic classification output

## 17. Related Document Updates

### 17.1 M11.1 Policy Module Design

Add reconciliation note linking to this document. The M11.1 design remains valid — it proposed the JS module which is now confirmed as the single source of truth.

### 17.2 M11.3 Promotion Allowlist Design

Add reconciliation note clarifying that the allowlist is governance documentation, not a runtime JSON config. The promotion workflow in this document supersedes PR69's original description.

## 18. Notes

- This is a documentation-only reconciliation PR
- No behavioral changes to any existing component
- The JS policy module from M11.2 remains unchanged
- The promotion allowlist design from PR69 remains valid as governance documentation
- All future M11 work builds on this single-source-of-truth decision

---

*Created: 2026-07-08*
*Milestone: M11.4*
*Status: Design Reconciliation*
*Related PRs: PR66 (M11.0), PR67 (M11.1), PR68 (M11.2), PR69 (M11.3)*
