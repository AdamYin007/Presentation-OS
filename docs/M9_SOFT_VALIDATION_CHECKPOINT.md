# M9.6 Soft Validation Checkpoint

## 1. Purpose

This checkpoint records the completed state of the M9 soft validation infrastructure (M9.0–M9.5) and clarifies that the current stage is manual / standalone / report-only.

It does not introduce new code, new gates, or new integrations. It freezes the current capability boundary and sets the stage for optional integration design in future milestones.

## 2. Scope

This checkpoint covers:

- M9.0 Contract Version Readiness Design
- M9.1 PackRuntimeContext Soft Validator Design
- M9.2 PackRuntimeContext Soft Validator Skeleton
- M9.3 Soft Validation Report Format Design
- M9.4 Soft Validation Report Writer Skeleton
- M9.5 Standalone Soft Validation Report Script

## 3. Completed Milestones

| Milestone | Status | Output |
|---|---|---|
| M9.0 | Complete | docs/M9_CONTRACT_VERSION_READINESS_DESIGN.md |
| M9.1 | Complete | docs/M9_PACK_RUNTIME_CONTEXT_SOFT_VALIDATOR_DESIGN.md |
| M9.2 | Complete | packages/cli/src/validation/pack-runtime-context-soft-validator.js |
| M9.3 | Complete | docs/M9_SOFT_VALIDATION_REPORT_FORMAT_DESIGN.md |
| M9.4 | Complete | packages/cli/src/validation/soft-validation-report-writer.js |
| M9.5 | Complete | scripts/generate-pack-runtime-context-soft-report.cjs |

## 4. Current Capability

The following capabilities exist today:

- PackRuntimeContext soft validator skeleton (M9.2)
- Stable warning/error shape (M9.1, M9.3)
- Stable soft validation report format (M9.3)
- Report writer skeleton with JSON serialization (M9.4)
- Standalone manual report generation script (M9.5)
- Explicit `--out` file writing support
- Stdout JSON default output (no file)
- Standalone local validation scripts for each component

## 5. Current Execution Model

### Manual only

```
npm run check:all
node scripts/check-pack-runtime-context-soft-validator.cjs
node scripts/check-soft-validation-report-writer.cjs
node scripts/check-standalone-soft-validation-report-script.cjs
```

### Standalone report generation examples

```
node scripts/generate-pack-runtime-context-soft-report.cjs --input <path>
node scripts/generate-pack-runtime-context-soft-report.cjs --input <path> --compact
node scripts/generate-pack-runtime-context-soft-report.cjs --input <path> --out <path>
```

Key behaviors:

- Without `--out`: outputs JSON to stdout only, no file created
- With `--out`: writes JSON to the specified file path
- No default `.validation/` directory creation
- `soft-fail` status does NOT equal process exit 1
- Process exit behavior is controlled by the standalone script, not by report status

## 6. Boundaries Preserved

The following boundaries are intentionally preserved at M9.6:

- Not wired into `awe doctor`
- Not wired into CLI main commands (`story`, `list`, `help`, `pack-story`)
- Not wired into GitHub Actions workflow
- Not wired into `package.json` scripts
- No default `.validation/` output
- No hard validation gate
- No JSON schema files
- No runtime behavior changes
- No resolver behavior changes
- No multi-pack discovery behavior changes

## 7. Validation Status

Current verification state (as of this checkpoint):

- **GitHub Actions**: `npm run check:all` pass
- **Local verification**:
  - `npm run check:all` pass
  - `node scripts/check-pack-runtime-context-soft-validator.cjs` pass
  - `node scripts/check-soft-validation-report-writer.cjs` pass
  - `node scripts/check-standalone-soft-validation-report-script.cjs` pass

This checkpoint does NOT add any new automated gates. All existing validations remain unchanged.

## 8. Report Semantics Snapshot

### Status values

| Status | Meaning |
|---|---|
| `pass` | All checks passed, no findings |
| `pass-with-info` | Only INFO-level findings |
| `pass-with-warnings` | WARNING-level findings present |
| `soft-fail` | Structural issues detected (not blocking) |
| `internal-error` | Validator implementation error |

### Severity values

| Severity | Meaning |
|---|---|
| `info` | Informational, no action required |
| `warning` | Advisory finding, review recommended |
| `error` | Serious structural issue detected |

Key semantics:

- `soft-fail` remains report-only; it does not block CI
- `error` severity inside a soft report does not imply a hard gate
- Process exit behavior is controlled by the standalone script, not by report status

## 9. Known Non-Goals

M9.6 explicitly does NOT:

- Wire the validator into `awe doctor`
- Wire the validator into CI artifact generation
- Add a CLI command for soft validation
- Add a `package.json` script entry
- Introduce JSON schema files
- Upgrade to hard validation
- Change any runtime behavior
- Change any resolver behavior

## 10. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Soft report mistaken for hard gate | Users expect blocking behavior | Clear documentation: soft = advisory only |
| Warning noise overwhelms users | Valid findings buried | Severity filtering, opt-in display |
| Report shape drift | Consumers break on format changes | Freeze format before integration; version policy in M9.3 |
| Standalone script accidentally wired into CI | Unexpected blocks | Document non-blocking policy; gate with separate PR |
| Future doctor output too verbose | UX degradation | Limit doctor to summary line only |
| `generatedAt` timestamp breaks snapshot tests | CI flakiness | Make timestamp optional or exclude from comparison |
| Report files pollute working tree | Untracked files in git | No default file output; `--out` is explicit opt-in |
| Downstream consumers depend on internal fields | Breaking changes | Document public vs private fields; version policy |

## 11. Recommended Next Steps

The following options are proposed for future milestones (NOT implemented here):

### Option A — M9.7 Optional CI Artifact Design (documentation-only)

Design a CI artifact strategy for soft validation reports. Does not modify `.github/workflows/check.yml`.

### Option B — M9.8 Doctor Summary Preview Design (documentation-only)

Design how `awe doctor` could display a soft validation summary line. Does not modify `packages/cli/src/index.js`.

### Option C — M9.9 Package Script Entrypoint Design (documentation-only)

Design whether to add an `npm run` script for soft validation. Does not modify `package.json`.

### Option D — M10.0 Hard Gate Candidate Readiness (documentation-only)

Evaluate promotion criteria from soft validation to hard gates. Does not implement any gates.

**Recommended priority**: M9.7 or M9.8. Both are documentation-only and preserve current boundaries.

## 12. Checkpoint Conclusion

After M9.6, AWE has a manual, standalone, report-only PackRuntimeContext soft validation pipeline. It is ready for optional integration design, but not yet promoted into doctor, CI, package scripts, or hard gates.

The soft validation infrastructure is stable and documented. Future milestones may design integrations without modifying existing behavior.