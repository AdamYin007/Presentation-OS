# M9.10 Soft Validation Package Entrypoint Checkpoint

## 1. Purpose

This checkpoint documents the completion of the M9.0–M9.9 soft validation foundation stage. It records that PackRuntimeContext soft validation has progressed from design, skeleton implementations, and standalone scripts to a discoverable npm package script entrypoint.

**Important:** The current state is still **manual / standalone / report-only / non-blocking**. No hard gates, no CI wiring, no doctor integration, no JSON schema, no default file output.

## 2. Scope

This checkpoint covers the following milestones:

- M9.0 Contract Version Readiness Design
- M9.1 PackRuntimeContext Soft Validator Design
- M9.2 PackRuntimeContext Soft Validator Skeleton
- M9.3 Soft Validation Report Format Design
- M9.4 Soft Validation Report Writer Skeleton
- M9.5 Standalone Soft Validation Report Script
- M9.6 Soft Validation Checkpoint
- M9.7 Doctor Summary Preview Design
- M9.8 Package Script Entrypoint Design
- M9.9 Package Script Entrypoint Implementation

## 3. Completed Milestones

| Milestone | Status | Output |
|---|---|---|
| M9.0 | Complete | docs/M9_CONTRACT_VERSION_READINESS_DESIGN.md |
| M9.1 | Complete | docs/M9_PACK_RUNTIME_CONTEXT_SOFT_VALIDATOR_DESIGN.md |
| M9.2 | Complete | packages/cli/src/validation/pack-runtime-context-soft-validator.js |
| M9.3 | Complete | docs/M9_SOFT_VALIDATION_REPORT_FORMAT_DESIGN.md |
| M9.4 | Complete | packages/cli/src/validation/soft-validation-report-writer.js |
| M9.5 | Complete | scripts/generate-pack-runtime-context-soft-report.cjs |
| M9.6 | Complete | docs/M9_SOFT_VALIDATION_CHECKPOINT.md |
| M9.7 | Complete | docs/M9_DOCTOR_SUMMARY_PREVIEW_DESIGN.md |
| M9.8 | Complete | docs/M9_PACKAGE_SCRIPT_ENTRYPOINT_DESIGN.md |
| M9.9 | Complete | package.json script: pack-context:soft-report |

## 4. Current Capability

The following capabilities are confirmed present and verified:

- PackRuntimeContext soft validator skeleton (`packages/cli/src/validation/pack-runtime-context-soft-validator.js`)
- Stable warning/error shape in validation results
- Soft validation report writer (`packages/cli/src/validation/soft-validation-report-writer.js`)
- Stable report summary generation
- JSON serialization of reports
- Standalone report generation script (`scripts/generate-pack-runtime-context-soft-report.cjs`)
- npm package script entrypoint (`pack-context:soft-report`)
- stdout JSON default output (no --out flag)
- Compact JSON output (--compact flag)
- Explicit --out file writing
- Standalone local validation scripts (5 check scripts)

## 5. Current User-Facing Entry Point

Recommended usage:

```bash
npm run pack-context:soft-report -- --input <path>
npm run pack-context:soft-report -- --input <path> --compact
npm run pack-context:soft-report -- --input <path> --out <path>
npm run pack-context:soft-report -- --help
```

Notes:

- Arguments after `npm run` must be separated by `--`
- `--input` is required unless `--help` is used
- Without `--out`, output goes to stdout only (JSON)
- With `--out`, report is written to the specified file
- Does NOT default-create `.validation/` directory
- Report status `soft-fail` does NOT equal process exit 1

## 6. Current Internal Architecture

```
PackRuntimeContext JSON input
  -> validatePackRuntimeContext()
  -> createSoftValidationReport()
  -> serializeSoftValidationReport()
  -> stdout JSON or explicit --out file
```

Corresponding files:

- `packages/cli/src/validation/pack-runtime-context-soft-validator.js` — validator skeleton
- `packages/cli/src/validation/soft-validation-report-writer.js` — report writer
- `scripts/generate-pack-runtime-context-soft-report.cjs` — standalone report generator
- `package.json` — script entrypoint definition

## 7. Current Validation Entrypoints

Manual verification commands:

```bash
npm run check:all
node scripts/check-pack-runtime-context-soft-validator.cjs
node scripts/check-soft-validation-report-writer.cjs
node scripts/check-standalone-soft-validation-report-script.cjs
node scripts/check-package-script-entrypoint.cjs
```

Notes:

- `check-package-script-entrypoint.cjs` is NOT wired into `check:all`
- Standalone checks must be run manually
- GitHub Actions currently only runs `npm run check:all`

## 8. Boundaries Preserved

The following boundaries are intentionally preserved:

- Not wired into `check:all`
- Not wired into `doctor`
- Not wired into GitHub Actions
- Not a hard validation gate
- No JSON schema
- No default `.validation` output
- No runtime behavior changes
- No resolver behavior changes
- No multi-pack discovery behavior changes
- No automatic report file generation
- No package script that implies hard validation (e.g., `validate:pack-context`)

## 9. Exit Code Semantics Snapshot

| Scenario | Exit Code |
|---|---|
| report status `pass` | 0 |
| report status `pass-with-info` | 0 |
| report status `pass-with-warnings` | 0 |
| report status `soft-fail` | 0 |
| argument error (missing `--input`) | 1 |
| missing input file | 1 |
| JSON parse error | 1 |
| writer/internal script error | 1 |

**Key principle:** Soft validation status does not control process exit behavior. Process exit behavior is controlled by the standalone script argument/runtime layer.

## 10. Report Semantics Snapshot

**Report status values:**

- `pass`
- `pass-with-info`
- `pass-with-warnings`
- `soft-fail`
- `internal-error`

**Severity levels:**

- `info`
- `warning`
- `error`

**Important:**

- `error` severity inside soft report does NOT imply hard gate
- `soft-fail` remains report-only
- Hard gate promotion requires separate design and PR

## 11. Package Script Semantics Snapshot

Current only added package script:

```json
"pack-context:soft-report": "node scripts/generate-pack-runtime-context-soft-report.cjs"
```

Explicitly confirmed NOT present:

- No `check:soft-report`
- No `validate:pack-context`
- No `check:pack-context`
- No `doctor:soft-validation`
- `check:all` does NOT include `pack-context:soft-report`
- `doctor` does NOT depend on `pack-context:soft-report`
- CI does NOT depend on `pack-context:soft-report`

## 12. Known Non-Goals

The following are explicitly NOT in scope for M9.10:

- Not wiring `pack-context:soft-report` into `check:all`
- Not wiring into `doctor`
- Not adding CI artifact
- Not modifying GitHub Actions
- Not adding JSON schema
- Not adding hard gate
- Not changing runtime/resolver behavior
- Not default-writing report files
- Not introducing any package script that implies hard validation

## 13. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Package script mistaken for hard validator | Medium | High | Clear naming convention (`soft-report`, not `validate`) |
| `soft-fail` status mistaken for failed command | Medium | Medium | Documented exit code semantics (always 0 for soft status) |
| Users forgetting npm `--` argument separator | Low | Low | `--help` error message guides users |
| Report files polluting working tree | Low | Medium | No default `.validation/` creation; explicit `--out` required |
| Future `check:all` accidental coupling | Medium | High | M9.10 boundary enforcement; future PRs must explicitly justify |
| Future `doctor` output noise | Medium | Medium | Doctor does not depend on soft report |
| Future CI accidentally gating on soft report | Medium | High | CI currently only runs `check:all`; hard gate requires separate design |
| Report shape drift | Low | Medium | Versioned report schema needed before hard gate |
| Downstream consumer over-depending on internal fields | Medium | Medium | Report fields are implementation details; consumers should use public API |
| Warning fatigue | High | Medium | Future hard gate design must define which warnings escalate |

## 14. M10 Readiness Considerations

Before entering M10, the following questions must be answered:

1. Which warnings can be upgraded to hard failures in future?
2. Should `contractVersion` absent remain advisory forever, or become warning/hard gate?
3. Can `required sections missing` be hardened to a hard fail?
4. Should `reserved namespace use` trigger a hard fail?
5. Should hard gate start from `doctor` or from CI artifact?
6. Is JSON schema required before hard gate?
7. Are test fixtures required before hard gate?
8. Are snapshot tests required before hard gate?
9. Is versioned report schema required before hard gate?

## 15. Recommended Next Steps

The following candidate routes are proposed (NOT executed in this PR):

**Option A — M10.0 Hard Gate Readiness Design** (documentation-only)
- Evaluate conditions for promoting soft validation to hard gate

**Option B — M9.11 Optional CI Artifact Design** (documentation-only)
- Design artifact behavior without modifying workflow

**Option C — M9.11 Doctor Summary Preview Implementation** (code implementation)
- Preserve exit code behavior; implement doctor summary

**Option D — M9.11 Fixtures and Snapshot Test Design** (documentation-only)
- Prepare stable tests before hard gate implementation

**Recommended path:** Proceed to **M10.0 Hard Gate Readiness Design** first. This remains documentation-only and does NOT implement hard gate directly.

## 16. Checkpoint Conclusion

After M9.10, AWE has a complete manual, standalone, non-blocking PackRuntimeContext soft validation foundation with an npm package script entrypoint. It is ready for hard gate readiness design, but not yet ready for hard gate implementation.
