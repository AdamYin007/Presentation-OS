# M9.3 Soft Validation Report Format Design

## 1. Purpose

M9.3 defines the stable format for PackRuntimeContext soft validation reports.

This PR does NOT implement a report writer. It establishes the report shape, field semantics, status/severity conventions, versioning policy, and migration path so that future milestones (M9.4+) can build on a shared contract without ambiguity.

## 2. Non-Goals

M9.3 explicitly does NOT:

- Implement any report writer
- Modify the PackRuntimeContext soft validator
- Modify `awe doctor` output
- Change CLI output formats
- Change GitHub Actions workflow
- Add JSON schema files
- Add hard validation gates
- Change runtime behavior
- Change resolver behavior

## 3. Background

M8 and M9 milestones established the foundation:

- M8.5 Validation Gates & Contract Enforcement — defines gate categories
- M8.10 Validation Checkpoint — records current smoke-check level
- M9.0 Contract Version Readiness Design — defines contractVersion goals
- M9.1 PackRuntimeContext Soft Validator Design — defines validator scope and interface
- M9.2 PackRuntimeContext Soft Validator Skeleton — implements the first validator module

M9.3 builds on this by defining the report contract that future writer implementations will produce.

## 4. Problem Statement

The PackRuntimeContext soft validator skeleton exists (M9.2). However, the report shape has not been formalized as an independent contract. Without a stable report format:

- Future report writers may produce inconsistent fields
- CI consumers cannot reliably parse validation output
- Doctor output may be polluted with verbose JSON
- Breaking changes in report shape go undetected
- Downstream tools cannot plan for migration

This gap prevents safe progression from soft validation to CI reports and eventually hard gates.

## 5. Report Format Goals

A future soft validation report should:

- **Stable machine-readable shape**: Fields are predictable and documented
- **Human-readable message support**: Each finding includes a clear message
- **Gate-level traceability**: Every finding references its gateId
- **ContractVersion traceability**: Report includes the pack's contractVersion
- **Source document traceability**: Findings reference design documents
- **Soft warning semantics**: Reports never cause process exit 1
- **Future CI summary compatibility**: Reports can feed CI dashboards
- **Future hard gate promotion compatibility**: Report structure supports hard gate findings

## 6. Top-Level Report Shape

Conceptual format design only (NOT implemented):

```json
{
  "reportVersion": "0.1",
  "reportType": "soft-validation",
  "validatorId": "pack-runtime-context-soft-validator",
  "contractName": "PackRuntimeContext",
  "contractVersion": null,
  "status": "pass-with-warnings",
  "severity": "warning",
  "generatedAt": "ISO-8601 timestamp",
  "source": "optional source name",
  "summary": {},
  "results": [],
  "metadata": {}
}
```

M9.3 does not generate this JSON. It only defines the contract.

## 7. Required Top-Level Fields

| Field | Type | Description |
|---|---|---|
| `reportVersion` | string | Report format version (e.g., "0.1") |
| `reportType` | string | Fixed: "soft-validation" |
| `validatorId` | string | Identifier of the validator that produced this report |
| `contractName` | string | Name of the contract being validated |
| `contractVersion` | string/null | The pack's contractVersion, or null if absent |
| `status` | enum | Overall report status (see Section 8) |
| `severity` | enum | Highest severity level (see Section 9) |
| `generatedAt` | string | ISO-8601 timestamp of report generation |
| `summary` | object | Aggregate counts (see Section 10) |
| `results` | array[] | Individual findings (see Section 11) |
| `metadata` | object | Optional extensible metadata |

## 8. Status Semantics

Allowed status values:

| Status | Meaning |
|---|---|
| `pass` | All checks passed, no findings |
| `pass-with-info` | Only INFO-level findings |
| `pass-with-warnings` | WARNING-level findings present |
| `soft-fail` | Structural issues detected but no hard gate |
| `internal-error` | Validator encountered an implementation error |

Key rules:

- `soft-fail` does NOT mean process exit 1
- `hard fail` is outside M9.3 scope
- CI should NOT block on `soft-fail` in initial phases

## 9. Severity Semantics

Allowed severity values:

| Severity | Meaning |
|---|---|
| `info` | Informational, no action required |
| `warning` | Advisory finding, review recommended |
| `error` | Serious structural issue detected |

Key rules:

- `error` in a soft report indicates a severe structural problem
- `error` does NOT automatically trigger a hard gate
- Process exit behavior must be controlled separately from report severity

## 10. Summary Shape

```json
{
  "total": 0,
  "info": 0,
  "warnings": 0,
  "errors": 0,
  "gatesChecked": 0,
  "gatesWithFindings": 0
}
```

Fields:

| Field | Type | Description |
|---|---|---|
| `total` | number | Total number of findings |
| `info` | number | Count of INFO-level findings |
| `warnings` | number | Count of WARNING-level findings |
| `errors` | number | Count of ERROR-level findings |
| `gatesChecked` | number | Number of gates evaluated |
| `gatesWithFindings` | number | Number of gates that produced findings |

## 11. Result Item Shape

```json
{
  "id": "stable finding id",
  "gateId": "CONTEXT_REQUIRED_SECTIONS_GATE",
  "code": "WARN_CONTRACT_SECTION_MISSING",
  "severity": "warning",
  "message": "Human-readable message",
  "path": "context.identity",
  "expected": "expected value or description",
  "actual": "actual value or description",
  "migrationHint": "how to fix or migrate",
  "sourceDocument": "docs/...",
  "introducedIn": "M9.2",
  "blocking": false
}
```

Key fields:

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable unique identifier for this finding |
| `gateId` | string | Which gate produced this finding |
| `code` | string | Machine-readable warning/error code |
| `severity` | enum | Severity of this specific finding |
| `message` | string | Human-readable description |
| `path` | string | Dot-notation path to the problematic field |
| `expected` | any | Expected value or condition |
| `actual` | any | Actual value found |
| `migrationHint` | string | Guidance for resolving the finding |
| `sourceDocument` | string | Reference to the design document |
| `introducedIn` | string | Milestone where this gate was introduced |
| `blocking` | boolean | Whether this finding should block hard gate promotion |

## 12. Gate Mapping

Report findings map to the following gates:

| Gate ID | Report Code Pattern |
|---|---|
| `CONTEXT_REQUIRED_SECTIONS_GATE` | `WARN_CONTRACT_SECTION_MISSING` |
| `CONTEXT_REQUIRED_VALUES_GATE` | `WARN_CONTRACT_VALUE_MISSING` |
| `CONTEXT_RESERVED_NAMESPACE_GATE` | `WARN_RESERVED_NAMESPACE_USED` |
| `CONTEXT_READ_ONLY_FIELDS_GATE` | `WARN_CONTRACT_SECTION_MISSING` |
| `CONTRACT_VERSION_PRESENT_SOFT_GATE` | `INFO_CONTRACT_VERSION_ABSENT` |
| `CONTRACT_VERSION_FORMAT_GATE` | `WARN_CONTRACT_VERSION_MALFORMED` |
| `CONTRACT_VERSION_SUPPORTED_RANGE_GATE` | `WARN_CONTRACT_VERSION_UNSUPPORTED` |
| `CONTRACT_VERSION_DEPRECATION_GATE` | `WARN_CONTRACT_VERSION_DEPRECATED` |

## 13. Warning and Error Codes

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

These codes define the future taxonomy. M9.3 does not emit any of them.

## 14. File Output Strategy

Future optional output strategies (NOT implemented in M9.3):

- **stdout summary**: Print summary line only, not full JSON
- **JSON file report**: Write full report to disk
- **CI artifact**: Upload report as CI artifact
- **Local debug report**: Developer-local report for diagnostics

Suggested default path for future implementation:
`.validation/pack-runtime-context-soft-validation-report.json`

M9.3 does not create this file or any output mechanism.

## 15. CI Compatibility

- CI continues to run `npm run check:all` unchanged
- Report generation can be added as a separate script later
- Report-only phase does NOT block PRs
- Hard gate promotion requires a separate PR

## 16. Doctor and CLI Compatibility

- M9.3 does NOT change `awe doctor` output
- Future doctor MAY display report summary (not full JSON)
- `story`/`list`/`help`/`pack-story` output is NOT affected
- Report is an advisory artifact, not a user-facing output

## 17. Versioning Policy

- `reportVersion` starts at "0.1"
- Breaking changes require bumping `reportVersion`
- Field removal is prohibited unless accompanied by a major version bump
- New optional fields are allowed without version bump
- Downstream consumers MUST ignore unknown optional fields

## 18. Example Reports

### Example 1: Pass Report

```json
{
  "reportVersion": "0.1",
  "reportType": "soft-validation",
  "validatorId": "pack-runtime-context-soft-validator",
  "contractName": "PackRuntimeContext",
  "contractVersion": "1.0.0",
  "status": "pass",
  "severity": "info",
  "generatedAt": "2026-07-06T00:00:00.000Z",
  "source": "local",
  "summary": {
    "total": 0,
    "info": 0,
    "warnings": 0,
    "errors": 0,
    "gatesChecked": 8,
    "gatesWithFindings": 0
  },
  "results": [],
  "metadata": {}
}
```

### Example 2: Pass-with-Warnings (Missing contractVersion)

```json
{
  "reportVersion": "0.1",
  "reportType": "soft-validation",
  "validatorId": "pack-runtime-context-soft-validator",
  "contractName": "PackRuntimeContext",
  "contractVersion": null,
  "status": "pass-with-warnings",
  "severity": "warning",
  "generatedAt": "2026-07-06T00:00:00.000Z",
  "source": "local",
  "summary": {
    "total": 1,
    "info": 0,
    "warnings": 1,
    "errors": 0,
    "gatesChecked": 8,
    "gatesWithFindings": 1
  },
  "results": [
    {
      "id": "finding-cv-absent-001",
      "gateId": "CONTRACT_VERSION_PRESENT_SOFT_GATE",
      "code": "INFO_CONTRACT_VERSION_ABSENT",
      "severity": "warning",
      "message": "PackRuntimeContext is missing contractVersion",
      "path": null,
      "expected": "contractVersion field present",
      "actual": "contractVersion absent",
      "migrationHint": "Add contractVersion to PackRuntimeContext metadata",
      "sourceDocument": "docs/M9_CONTRACT_VERSION_READINESS_DESIGN.md",
      "introducedIn": "M9.0",
      "blocking": false
    }
  ],
  "metadata": {}
}
```

## 19. Migration Sequence

Recommended progression from design to implementation:

1. **M9.3 Soft Validation Report Format Design** (this PR)
   - Define report shape, fields, semantics, versioning
   - Establish report contract

2. **M9.4 Report Writer Skeleton**
   - Implement basic report generation
   - Wire into validator skeleton

3. **M9.5 Standalone Report Script**
   - Create standalone script for report generation
   - Support file output strategy

4. **M9.6 Optional CI Artifact**
   - Add report upload to CI
   - Keep non-blocking

5. **M10.0 Hard Gate Candidate**
   - Evaluate readiness for hard gate promotion

## 20. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Report shape churn | Consumers cannot rely on output | Freeze format before writer implementation |
| Warning noise | Users overwhelmed by findings | Severity filtering, opt-in display |
| Consumers treating soft-fail as hard-fail | Unnecessary CI blocks | Clear documentation: soft != blocking |
| Leaking runtime internals | Report exposes sensitive data | Sanitize report output, exclude secrets |
| Unstable field names | Breaking changes for parsers | Document field stability, version policy |
| Large report output | Slow CI, bloated artifacts | Limit results array, provide summary-only mode |

## 21. Open Questions

The following remain open for future milestones:

1. Should `reportVersion` use semantic versioning?
2. Should `generatedAt` be optional to support snapshot tests?
3. Is a JSON schema for the report format desirable?
4. Should reports be written to `.validation/` by default?
5. Should `awe doctor` read and summarize the report file?
6. Should CI artifacts be uploaded by default?
7. Should report include pack identification metadata (packName, packVersion)?

## 22. Checkpoint

PR46 (M9.3) is a report format design milestone. After completion:

- No report writer has been implemented.
- No validator code has changed.
- No doctor output has changed.
- No CLI output has changed.
- No CI workflow has changed.
- No JSON schema files have been added.
- The report format contract is established.

Future milestones (M9.4+) will implement the report writer based on this design.