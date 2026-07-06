# M9.1 PackRuntimeContext Soft Validator Design

## 1. Purpose

M9.1 defines the design for a future PackRuntimeContext soft validator.

This PR does NOT implement a soft validator. It establishes the conceptual foundation, validation scope, interface design, report format, gate mapping, and migration path so that future milestones (M9.2+) can build on a shared design without ambiguity.

## 2. Non-Goals

M9.1 explicitly does NOT:

- Implement any validator code
- Modify PackRuntimeContext runtime shape
- Add JSON schema files
- Add hard validation gates
- Change CLI output formats
- Change resolver behavior
- Change multi-pack discovery behavior
- Change GitHub Actions workflow

## 3. Background

M8 and M9.0 established the contract foundation:

- M8.2 PackRuntimeContext Contract Schema — documents the contract shape
- M8.5 Validation Gates & Contract Enforcement — defines gate categories
- M8.10 Validation Checkpoint — records current smoke-check level
- M9.0 Contract Version Readiness Design — defines contractVersion goals and placement options

M9.1 builds on this foundation by designing the soft validator concept that bridges smoke checks and future hard gates.

## 4. Problem Statement

PackRuntimeContext contracts are documented and smoke-checked. contractVersion readiness design exists. However, there is no design for a soft validator that can:

- Detect contract drift without blocking CI
- Produce structured warnings about missing or invalid sections
- Report contractVersion issues gracefully
- Serve as the bridge between M8 smoke checks and M10+ hard gates

Without this design, future implementation work lacks a shared vocabulary and scope definition.

## 5. Soft Validator Goals

A future soft validator should:

- **Check required top-level sections**: Verify that all required sections from M8.2 are present
- **Check required values**: Validate that required fields contain expected values (not null/undefined)
- **Check reserved namespaces**: Ensure no reserved identifiers are misused
- **Check contractVersion**: Validate presence, format, compatibility, and deprecation status
- **Output structured warnings**: Produce machine-parseable warnings without hard failures
- **Support CI soft report**: Generate reports consumable by CI pipelines
- **Never hard fail**: Exit with success regardless of validation findings
- **Not change runtime execution**: Validation is observational, not transformative

## 6. Validation Scope

M9.1 soft validator design covers:

- PackRuntimeContext shape validation
- Required sections presence
- Required fields values
- Explicit false/null detection
- Read-only assumption checks
- Reserved namespace conflicts
- contractVersion readiness fields (from M9.0)

M9.1 soft validator design explicitly does NOT cover:

- Multi-pack resolver behavior
- Output path collision enforcement
- Runtime mutation prevention
- Pack loading implementation
- Schema hard gate enforcement

## 7. Proposed Soft Validator Interface

Conceptual interface design only (NOT implemented):

```
validatePackRuntimeContext(context, options)
  returns: {
    ok: boolean,
    severity: "info" | "warning" | "error",
    warnings: [],
    errors: [],
    report: {}
  }
```

Key design notes:

- `ok` indicates structural validity, not contract compliance
- `severity` reflects the highest finding level
- `warnings` contains non-blocking findings
- `errors` is reserved for future hard gate use but currently always empty
- `report` contains full structured validation output

M9.1 does not add this function. It only defines the future shape.

## 8. Report Shape

Future soft validation report fields:

| Field | Type | Description |
|---|---|---|
| `validatorId` | string | Identifier of the validator that produced this report |
| `contractName` | string | Name of the contract being validated |
| `contractVersion` | string | The pack's contractVersion (may be absent) |
| `gateId` | string | Which gate produced this finding |
| `severity` | enum | `info`, `warning`, or `error` |
| `message` | string | Human-readable description |
| `path` | string | Dot-notation path to the problematic field |
| `expected` | any | Expected value or condition |
| `actual` | any | Actual value found |
| `migrationHint` | string | Guidance for resolving the finding |
| `sourceDocument` | string | Reference to the design doc for this gate |

## 9. Gate Mapping

M9.1 maps existing and proposed gates to the soft validator:

| Gate ID | Source | Type |
|---|---|---|
| `CONTEXT_REQUIRED_SECTIONS_GATE` | M8.2 | Sections present |
| `CONTEXT_REQUIRED_VALUES_GATE` | M8.2 | Values non-null |
| `CONTEXT_RESERVED_NAMESPACE_GATE` | M8.2 | Namespace conflicts |
| `CONTEXT_READ_ONLY_FIELDS_GATE` | M8.2 | Mutation attempts |
| `CONTRACT_VERSION_PRESENT_SOFT_GATE` | M9.0 | Version missing |
| `CONTRACT_VERSION_FORMAT_GATE` | M9.0 | Version malformed |
| `CONTRACT_VERSION_SUPPORTED_RANGE_GATE` | M9.0 | Version out of range |
| `CONTRACT_VERSION_DEPRECATION_GATE` | M9.0 | Version deprecated |

These gates define the target state. M9.2+ will progressively implement them.

## 10. Missing contractVersion Behavior

| Condition | Severity | Action |
|---|---|---|
| Missing contractVersion | warning | Log to report, do not fail |
| Malformed contractVersion | warning | Log to report, do not fail |
| Unsupported future version | warning/error in report | No hard fail, flag for review |
| Deprecated version | deprecation warning | Include migrationHint |
| Hard fail scenario | deferred | M10+ readiness gate required |

Missing or invalid contractVersion never causes immediate failure in M9.x.

## 11. CLI and Doctor Behavior

M9.1 soft validator design ensures:

- `awe doctor` output remains unchanged
- Future optional: doctor displays soft validation summary as advisory
- `npm run check:all` continues to pass unless existing smoke checks fail
- Soft validation report does NOT pollute `story`/`list`/`help` output
- Report is available via explicit invocation only, not default behavior

## 12. CI Behavior

M9.1 soft validator design ensures:

- GitHub Actions workflow unchanged
- Future soft validator generates reports in CI
- Initial reports are informational only, do not block PRs
- Hard fail promotion requires a separate PR (M10+)
- CI soft report stored as artifact, not as pass/fail criterion

## 13. Error and Warning Taxonomy

Proposed future finding codes (NOT implemented):

| Code | Severity | Description |
|---|---|---|
| `INFO_CONTRACT_VERSION_ABSENT` | info | contractVersion field not found |
| `WARN_CONTRACT_SECTION_MISSING` | warning | Required section absent |
| `WARN_CONTRACT_VALUE_MISSING` | warning | Required value null/undefined |
| `WARN_RESERVED_NAMESPACE_USED` | warning | Reserved identifier in use |
| `WARN_CONTRACT_VERSION_MALFORMED` | warning | Invalid version format |
| `WARN_CONTRACT_VERSION_DEPRECATED` | warning | Version marked deprecated |
| `WARN_CONTRACT_VERSION_UNSUPPORTED` | warning | Version not understood |
| `ERROR_VALIDATOR_INTERNAL` | error | Validator implementation error |

These codes define the future taxonomy. M9.1 does not emit any of them.

## 14. Migration Sequence

Recommended progression from design to implementation:

1. **M9.1 PackRuntimeContext Soft Validator Design** (this PR)
   - Define scope, interface, report shape, gate mapping
   - Establish design baseline

2. **M9.2 Soft Validator Skeleton**
   - Implement placeholder validator structure
   - Wire into `npm run check:m8-docs` or new entrypoint

3. **M9.3 Soft Report Format**
   - Implement structured report generation
   - Add to `awe doctor` advisory output

4. **M9.4 Doctor Optional Summary**
   - Display soft validation summary in doctor
   - Opt-in via flag or always-visible advisory

5. **M9.5 CI Soft Report**
   - Generate soft validation reports in CI
   - Store as artifacts, do not block

6. **M10.0 Hard Gate Candidate**
   - Evaluate readiness for hard gate promotion
   - Define migration criteria

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Soft validator mistaken for hard gate | Users expect blocking behavior | Clear documentation: soft = advisory only |
| Warning noise overwhelms users | Valid findings buried in noise | Severity filtering, opt-in display |
| CLI output breaking | Existing consumers fail to parse | Never modify existing output format |
| Downstream consumer misreads `ok` field | Incorrect trust assumptions | Document `ok` semantics clearly |
| contractVersion semantics unstable | Validators chase moving targets | Freeze version semantics in M9.2+ |
| Reserved namespace false positives | Legitimate fields flagged | Conservative defaults, configurable exclusions |

## 16. Open Questions

The following remain open for future milestones:

1. Should the validator live in `scripts/` or `packages/cli/src/`?
2. Should the report be written to a JSON file, printed to stdout, or both?
3. Should `ok=false` still result in exit code 0 during soft validation?
4. Will contractVersion missing always be a warning, or escalate to error in M10+?
5. Are fixtures needed to drive validator unit tests?
6. Should the validator be pluggable (custom gate definitions)?
7. How should deprecated contractVersions communicate migration paths?

## 17. Checkpoint

PR44 (M9.1) is a design readiness milestone. After completion:

- No validator code has been written.
- No CLI behavior has changed.
- No CI workflow has changed.
- No JSON schema files have been added.
- The soft validator design baseline is established.

Future milestones (M9.2+) will implement the validator based on this design.