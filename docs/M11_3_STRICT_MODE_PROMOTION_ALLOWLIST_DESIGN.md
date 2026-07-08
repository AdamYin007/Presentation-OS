# M11.3 Strict Mode Validation Promotion Allowlist Design

## 1. Purpose

M11.3 designs the **strict mode validation promotion allowlist** mechanism for PackRuntimeContext validation.

The allowlist defines:
- Which finding codes may be promoted to blocking status in strict mode
- How promotions are governed, reviewed, and audited
- The relationship between allowlist entries and the existing policy module
- Procedures for adding, removing, or suspending promoted codes

M11.3 explicitly does NOT:
- Implement the allowlist
- Modify the policy module
- Change any validator behavior
- Modify snapshots or fixtures
- Add CI integration
- Add environment variable switches
- Modify package.json or branch protection

## 2. Current Baseline

### 2.1 Established Capabilities

| Capability | Status | PR |
|------------|--------|-----|
| Soft validator | ✅ Frozen | PR45 |
| Finding codes | ✅ 5 real codes | PR45 |
| Policy module skeleton | ✅ v1, frozen rules | PR68 |
| Policy versioning | ✅ STRICT_POLICY_VERSION = 1 | PR68 |
| Classification logic | ✅ classifyFindingForMode() | PR68 |
| Unknown finding behavior | ✅ Non-blocking default | PR68 |

### 2.2 Current Policy Rules (from PR68)

| Code | Severity | Soft Blocking | Strict Blocking | Review Required |
|------|----------|---------------|-----------------|-----------------|
| `ERROR_CONTEXT_NOT_OBJECT` | error | false | **true** | true |
| `WARN_CONTRACT_SECTION_MISSING` | warning | false | false | false |
| `INFO_CONTRACT_VERSION_ABSENT` | info | false | false | false |
| `WARN_CONTRACT_VERSION_MALFORMED` | warning | false | false | false |
| `WARN_RESERVED_NAMESPACE_USED` | warning | false | false | false |

### 2.3 Current Report Shapes

**Pass**: `ok: true, severity: "info"`
- 0 errors, 0 warnings (except info)

**Pass-with-info**: `ok: true, severity: "info"`
- 0 errors, ≥1 info/warning findings

**Soft-fail**: `ok: false, severity: "error"`
- ≥1 error finding

## 3. Problem Statement

The current policy module has **hardcoded rules** that mix classification logic with policy decisions. This creates several problems:

1. **No separation between policy and implementation** — Rules are embedded in JS code, making them hard to review, audit, or modify without code changes
2. **No governance process** — There is no documented process for promoting or demoting finding codes
3. **No audit trail** — Changes to blocking decisions are not tracked
4. **No emergency suspension** — There is no mechanism to temporarily suspend specific promotions
5. **No versioning of policy decisions** — Policy changes are tied to code versioning, not policy versioning

The allowlist design must solve these problems while maintaining backward compatibility with the existing policy module.

## 4. Allowlist Definition

An **allowlist** is a structured, version-controlled document that defines which finding codes are promoted to blocking status in strict mode.

### 4.1 Allowlist Properties

- **Immutable entries**: Once published, entries cannot be modified (only added or superseded)
- **Versioned**: Each revision has a unique version number
- **Auditable**: Every change includes author, date, reason, and review status
- **Deterministic**: Given the same version, the allowlist produces identical blocking decisions
- **Separate from code**: Allowlist is a data document, not executable code

### 4.2 Allowlist Entry Structure

```javascript
{
  code: "ERROR_CONTEXT_NOT_OBJECT",      // Finding code
  severity: "error",                      // Original severity
  strictModeBlocking: true,               // Blocking decision
  softModeBlocking: false,                // Soft mode behavior (unchanged)
  reason: "Structural integrity violation",
  introducedIn: "M11.3",                  // Milestone that introduced this rule
  reviewedBy: "validation-team",          // Reviewer/owner
  reviewDate: "2026-07-08",               // YYYY-MM-DD
  reviewRequired: true,                   // Requires formal review before activation
  status: "active",                       // active | suspended | deprecated
  supersededBy: null,                     // Reference to newer entry (if applicable)
  effectiveFrom: "2026-07-08",            // YYYY-MM-DD
  notes: "First strict mode promotion"    // Additional context
}
```

### 4.3 Allowlist Document Structure

```javascript
{
  allowlistVersion: 1,
  policyVersion: 1,                        // Matches STRICT_POLICY_VERSION
  lastUpdated: "2026-07-08",
  entries: [/* array of entry objects */],
  metadata: {
    author: "validation-team",
    reviewStatus: "approved",
    milestone: "M11.3",
    notes: "Initial allowlist design"
  }
}
```

## 5. Promotion Mechanics

### 5.1 Promotion Process

1. **Identification**: A finding code is identified for potential promotion
2. **Assessment**: The impact of promotion is evaluated (false positives, migration burden)
3. **Draft**: An allowlist entry is created with `status: "draft"`
4. **Review**: The entry undergoes formal review (if `reviewRequired: true`)
5. **Approval**: Approved entries are marked `status: "active"`
6. **Publication**: The allowlist version is incremented and published
7. **Activation**: The policy module reads the active allowlist

### 5.2 Promotion Criteria

A finding code may be promoted to strict mode blocking if it meets ALL of the following:

- **Severity is error or warning** (info codes are never promoted)
- **The finding indicates a structural integrity issue** (not data quality)
- **The false positive rate is acceptable** (< 5% in testing)
- **The migration burden is documented** (users have clear remediation paths)
- **The promotion has been reviewed and approved** (per review process)

### 5.3 Demotion Process

Demotion follows the same process in reverse:
1. Entry is marked `status: "suspended"` (temporary) or `status: "deprecated"` (permanent)
2. A new allowlist version is published
3. The policy module respects the updated status

### 5.4 Emergency Suspension

In case of critical false positives or migration blockers:
1. The allowlist entry status is immediately set to `"suspended"`
2. A new allowlist version is published
3. The policy module stops treating the code as blocking
4. A post-mortem review is scheduled

## 6. Governance

### 6.1 Review Process

| Entry Type | Review Required | Reviewers | Turnaround |
|------------|-----------------|-----------|------------|
| Error severity | Yes | 2 reviewers | 48 hours |
| Warning severity | No | 1 reviewer | 24 hours |
| Info severity | No | N/A (never promoted) | N/A |
| Demotion | Yes | 1 reviewer + author | 24 hours |
| Emergency suspension | No | Author only | Immediate |

### 6.2 Version Control

- Allowlist versions are stored in `docs/allowlists/` directory
- Each version is a separate file: `allowlist-v{N}.json`
- The current version is referenced in `docs/ALLOWLIST_CURRENT_VERSION`
- Git history provides the audit trail
- Semantic versioning for allowlist versions (major.minor.patch)

### 6.3 Policy Module Integration

The policy module reads the allowlist at initialization:
```javascript
// Pseudocode — not implemented in this PR
var allowlist = loadAllowlist(ALLOWLIST_PATH);
var currentVersion = allowlist.allowlistVersion;

if (currentVersion !== EXPECTED_VERSION) {
  // Log warning, use cached rules as fallback
}

// Map codes to blocking decisions
function getBlockingDecision(code, mode) {
  var entry = allowlist.entries.find(e => e.code === code);
  if (!entry) return { blocking: false, status: "unknown" };
  if (entry.status !== "active") return { blocking: false, status: "suspended" };
  return {
    blocking: mode === "strict" ? entry.strictModeBlocking : entry.softModeBlocking,
    status: "known"
  };
}
```

## 7. Allowlist Operations

### 7.1 Add Entry

1. Create new entry with `status: "draft"`
2. Fill in all required fields
3. Submit for review (if required)
4. Upon approval, set `status: "active"`
5. Increment allowlist version
6. Publish new version file

### 7.2 Remove Entry

1. Set entry `status: "deprecated"`
2. Set `supersededBy` reference (if applicable)
3. Increment allowlist version
4. Publish new version file

### 7.3 Suspend Entry

1. Set entry `status: "suspended"`
2. Add emergency notes
3. Increment allowlist minor version
4. Publish new version file
5. Schedule review for permanent resolution

### 7.4 Reactivate Entry

1. Set entry `status: "active"`
2. Remove `supersededBy` reference
3. Increment allowlist version
4. Publish new version file

## 8. Audit Requirements

### 8.1 Required Fields

Every allowlist entry MUST include:
- `code`: The finding code
- `severity`: Original severity
- `strictModeBlocking`: Blocking decision
- `softModeBlocking`: Soft mode behavior
- `reason`: Why this promotion/demotion
- `introducedIn`: Milestone reference
- `reviewedBy`: Who reviewed
- `reviewDate`: When reviewed
- `status`: Current status
- `effectiveFrom`: When this took effect

### 8.2 Audit Trail

The allowlist system maintains:
- All historical versions (immutable)
- Change log (who changed what and when)
- Review records (approvals, rejections, comments)
- Emergency suspension records
- Migration impact assessments

### 8.3 Reporting

The allowlist supports generating:
- Current blocking decisions by code
- History of all changes
- Pending reviews
- Suspended entries
- Migration impact summary

## 9. Security and Privacy

### 9.1 Access Control

- Allowlist files are stored in the repository (readable by all)
- Writing requires PR approval (standard git workflow)
- Emergency suspensions can be done by authorized personnel

### 9.2 Data Sensitivity

- Allowlist contains NO patient data, API keys, or secrets
- Contains ONLY finding codes and policy decisions
- All data is public and auditable

## 10. Testing Strategy

### 10.1 Unit Tests

- Allowlist parsing validates all required fields
- Version conflicts are detected
- Suspended entries are excluded from blocking decisions
- Deprecated entries are handled gracefully

### 10.2 Integration Tests

- Policy module reads allowlist correctly
- Classification respects allowlist status
- Emergency suspension takes immediate effect
- Version mismatches are logged but don't crash

### 10.3 Regression Tests

- Existing soft mode behavior unchanged
- Existing snapshot comparisons unchanged
- Existing comparator behavior unchanged

## 11. Relationship to Other Modules

| Module | Relationship |
|--------|-------------|
| Policy Module (M11.1/M11.2) | Reads allowlist for classification |
| Soft Validator | Unchanged — produces findings as before |
| Report Writer | Unchanged — includes policy status in output |
| Snapshot Writer | Unchanged — snapshots remain deterministic |
| Comparator | Unchanged — compares reports, not policy |

## 12. Future Work

### 12.1 M11.4 — Allowlist Implementation

- Create `docs/allowlists/` directory
- Implement initial allowlist JSON file
- Update policy module to read allowlist
- Add allowlist validation script
- Document review process in CONTRIBUTING.md

### 12.2 M11.5 — Allowlist CLI

- `awe validation allowlist list` — show current entries
- `awe validation allowlist history` — show change log
- `awe validation allowlist pending` — show pending reviews

### 12.3 M11.6 — CI Integration

- Add allowlist validation to CI
- Block merges that modify allowlist without review
- Require allowlist version bump on changes

## 13. Notes

- This design is documentation-only
- No code changes are made in this PR
- The allowlist is designed to be compatible with the existing policy module
- The allowlist can be implemented incrementally
- Emergency suspension is the highest priority feature
- Review process should be lightweight to encourage adoption

---

*Created: 2026-07-08*  
*Milestone: M11.3*  
*Status: Design Only*  
*Related PRs: PR66 (M11.0), PR67 (M11.1), PR68 (M11.2)*