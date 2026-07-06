# M9.7 Doctor Summary Preview Design

## 1. Purpose

This design defines how future `awe doctor` output may preview PackRuntimeContext soft validation summary information.

The goal is visible, concise, understandable — without blocking, without polluting the doctor main output, and without changing any exit code behavior.

No code is implemented in this PR. This is documentation-only.

## 2. Non-Goals

M9.7 explicitly does NOT:

- Implement doctor integration
- Modify `packages/cli/src/index.js`
- Modify the validator
- Modify the report writer
- Modify the standalone report script
- Modify `package.json`
- Modify GitHub Actions workflow
- Add JSON schema files
- Add hard validation gates
- Change runtime behavior
- Change resolver behavior

## 3. Background

M8 and M9 milestones established the soft validation foundation:

- M8.10 Validation Checkpoint — recorded current smoke-check level
- M9.1 PackRuntimeContext Soft Validator Design — defined validator scope and interface
- M9.3 Soft Validation Report Format Design — defined report shape, status, severity
- M9.5 Standalone Soft Validation Report Script — implemented manual report generation
- M9.6 Soft Validation Checkpoint — confirmed manual/standalone/report-only stage

Currently, soft validation exists as a standalone, manual pipeline. It has NOT been wired into `awe doctor`, CLI main commands, CI, or `package.json`.

## 4. Problem Statement

If the full soft validation report were directly exposed in `awe doctor`, several problems could arise:

- Doctor output becomes too long and noisy
- Warning fatigue obscures real health issues
- Users mistake `soft-fail` for hard failure
- CI pipelines might incorrectly gate on preview warnings
- Full report JSON leaks into human-facing output
- Doctor loses its fast health-check focus

M9.7 addresses these by designing a constrained preview mechanism.

## 5. Design Goals

A future doctor summary preview should:

- **Be concise**: Show only essential summary fields, not full results
- **Be human-readable**: Plain text, not JSON
- **Never block**: No process exit code changes
- **Never hard-fail**: Preview warnings do not equal CI failures
- **Include clear labeling**: Always show "preview" or "non-blocking" wording
- **Have stable summary fields**: No unexpected field additions
- **Support future opt-in expansion**: Users can run standalone script for details
- **Not replace standalone script**: Summary is complementary, not substitutive

## 6. Proposed Doctor Summary Shape

Conceptual output format (NOT implemented):

```
PackRuntimeContext soft validation: preview only
status: pass-with-warnings
severity: warning
findings: 3 total, 1 info, 2 warnings, 0 errors
gates: 2 with findings
report: standalone/manual only
```

Key rules:

- Only summary fields shown; no full `results` array
- No full JSON dump
- No individual warning details
- Maximum 3 top finding codes displayed (if any)
- Always includes "preview only" or "non-blocking" text
- Directs users to standalone script for full report

## 7. Output Placement

### Option A: Append after existing doctor checks

Place preview at end of current doctor output. Simple but risks confusion with required checks.

### Option B: Separate "Preview checks" section (RECOMMENDED)

Create a distinct `== Preview Checks ==` section, visually separated from required checks. This avoids confusion about blocking status.

### Option C: Hidden by default, opt-in via flag

Show preview only with `--soft-validation` or similar flag. Minimal noise but less discoverability.

**Recommendation: Option B.** A separate "Preview checks" section makes the non-blocking nature visually obvious while keeping it visible by default.

## 8. Status Mapping

| Report Status | Doctor Display | Doctor Exit Code |
|---|---|---|
| `pass` | preview: pass | unchanged |
| `pass-with-info` | preview: info | unchanged |
| `pass-with-warnings` | preview: warnings | unchanged |
| `soft-fail` | preview: soft-fail (non-blocking) | unchanged |
| `internal-error` | preview: unavailable | unchanged unless doctor itself crashes |

Critical rules:

- `soft-fail` does NOT change doctor exit code
- Report `error` severity does NOT become doctor failure
- Hard gate promotion requires a separate PR

## 9. Severity Display Rules

| Severity | Doctor Display |
|---|---|
| `info` | Informational preview only |
| `warning` | Non-blocking warnings detected |
| `error` | Soft validation errors detected, non-blocking |
| `internal-error` | Preview unavailable — do not display as doctor failure |

## 10. Finding Code Display Rules

- By default, only finding counts are shown
- Maximum 3 finding codes displayed (most frequent first)
- Full `path`, `expected`, `actual` fields are NOT shown
- `migrationHint` text is NOT printed
- If users need details, guide them to the standalone script

Example:

```
Top findings:
  - WARN_CONTRACT_SECTION_MISSING (1)
  - INFO_CONTRACT_VERSION_ABSENT (1)
  - WARN_CONTRACT_VALUE_MISSING (1)

Run for full report:
node scripts/generate-pack-runtime-context-soft-report.cjs --input <path>
```

## 11. Doctor UX Examples

### Example 1: Clean Preview

```
== AWE Doctor ==
✅ package.json
✅ packages/cli/src/index.js
✅ registry
✅ skills
✅ workflows
✅ factories
✅ prompts
✅ docs
✅ tests
✅ M8 docs smoke

== Preview Checks ==
PackRuntimeContext soft validation: preview only
status: pass
findings: 0 total
report: standalone/manual only
```

### Example 2: Missing contractVersion Warning Preview

```
== AWE Doctor ==
✅ package.json
✅ packages/cli/src/index.js
✅ registry
✅ skills
✅ workflows
✅ factories
✅ prompts
✅ docs
✅ tests
✅ M8 docs smoke

== Preview Checks ==
PackRuntimeContext soft validation: preview only (non-blocking)
status: pass-with-warnings
severity: warning
findings: 1 total, 0 info, 1 warning, 0 errors
gates: 1 with findings
Top findings:
  - INFO_CONTRACT_VERSION_ABSENT (1)

Run for full report:
node scripts/generate-pack-runtime-context-soft-report.cjs --input <path>
```

### Example 3: Soft-Fail Preview for Invalid Context

```
== AWE Doctor ==
✅ package.json
✅ packages/cli/src/index.js
✅ registry
✅ skills
✅ workflows
✅ factories
✅ prompts
✅ docs
✅ tests
✅ M8 docs smoke

== Preview Checks ==
PackRuntimeContext soft validation: preview only (non-blocking)
status: soft-fail
severity: error
findings: 5 total, 0 info, 3 warnings, 2 errors
gates: 3 with findings

Top findings:
  - WARN_CONTRACT_SECTION_MISSING (2)
  - ERROR_CONTEXT_NOT_OBJECT (1)
  - WARN_CONTRACT_VALUE_MISSING (1)

Note: This is a soft validation preview. It does not block CI or affect doctor exit code.
Run for full report:
node scripts/generate-pack-runtime-context-soft-report.cjs --input <path>
```

## 12. Configuration Strategy

Future configuration options (NOT implemented):

| Option | Description |
|---|---|
| No config | Always show preview once wired |
| Env flag | `AWE_DOCTOR_PREVIEW=1` |
| Doctor flag | `awe doctor --soft-validation` |
| Package script opt-in | Separate npm script for preview |
| Config file opt-in | `.awerc` preview section |

**Recommendation:** First implementation should prefer opt-in or hidden preview. Never default to blocking.

## 13. Relationship to Standalone Script

Doctor summary and standalone script serve different purposes:

### Doctor summary
- Short human-readable overview
- No file output
- No full result details
- Always non-blocking
- Integrated into existing doctor flow

### Standalone script
- Full JSON report
- Optional `--out` file writing
- Supports detailed investigation
- Can be run independently
- Contains all `results` array entries

They are complementary. Doctor summary guides users to the standalone script for depth.

## 14. CI Compatibility

- M9.7 does NOT modify CI workflow
- Future doctor summary must NOT break `npm run check:all`
- CI should NOT treat preview warnings as failures
- If CI artifact upload is desired, it must be designed separately (e.g., M9.8)
- No hidden hardening through doctor integration

## 15. Package Script Compatibility

- M9.7 does NOT modify `package.json`
- Future npm scripts should be separate from `check:all` unless intentionally promoted
- No hidden gate promotion through package scripts
- `awe doctor` should remain a health check, not a validation gate

## 16. Implementation Readiness Checklist

Before any future implementation must satisfy:

- [ ] Report writer returns stable summary object
- [ ] Standalone script remains passing
- [ ] Doctor current checks remain unchanged
- [ ] Summary wording reviewed for clarity
- [ ] No exit code changes anywhere
- [ ] No full JSON in doctor output
- [ ] Tests cover pass / warning / soft-fail preview scenarios
- [ ] CI verifies no hard-fail semantics introduced

## 17. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Soft preview mistaken for hard fail | Users panic, CI confusion | Always label "preview only" / "non-blocking" |
| Doctor output noise | Health check loses focus | Separate section, limited findings display |
| Warning fatigue | Users ignore all previews | Cap at 3 top codes, no full details |
| Internal report fields leaked | Security/exposure risk | Never show `path`, `expected`, `actual` in preview |
| Future CI accidentally gates on preview | Blocking behavior introduced | Document non-blocking policy; test explicitly |
| Users ignoring preview warnings | Issues go unaddressed | Include standalone script command in preview |
| Doctor summary diverges from standalone report | Confusing inconsistency | Use same summary data source; document format contract |

## 18. Recommended Next Steps

Future milestone options (NOT implemented here):

### Option A — M9.8 Doctor Summary Preview Implementation
- Implement opt-in or hidden preview in doctor
- No exit code changes
- Separate "Preview Checks" section

### Option B — M9.8 Optional CI Artifact Design
- Documentation-only
- Design artifact upload strategy
- No workflow changes yet

### Option C — M9.8 Package Script Entrypoint Design
- Documentation-only
- Decide whether to add `npm run soft-report`
- No package.json changes in this PR

**Recommendation:** Continue conservative route with M9.8 Optional CI Artifact Design or Package Script Entrypoint Design first. If faster visibility is needed, proceed with Doctor Summary Preview Implementation.

## 19. Checkpoint Conclusion

M9.7 only defines how doctor summary preview should behave. It does NOT wire soft validation into doctor. Any future implementation must preserve non-blocking semantics, use a separate preview section, avoid full JSON output, and never change doctor exit codes.