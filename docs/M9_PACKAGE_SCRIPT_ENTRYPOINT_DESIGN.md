# M9.8 Package Script Entrypoint Design

## 1. Purpose

This design evaluates whether future PackRuntimeContext soft validation should gain npm package script entrypoints. The goal is improved discoverability and convenient manual invocation — without elevating soft validation to a hard gate.

No code is implemented in this PR. This is documentation-only.

## 2. Non-Goals

M9.8 explicitly does NOT:

- Modify package.json
- Add npm scripts
- Couple soft validation into npm run check:all
- Couple soft validation into npm run doctor
- Modify GitHub Actions workflow
- Modify the validator
- Modify the report writer
- Modify the standalone report script
- Add JSON schema files
- Add hard validation gates
- Change runtime behavior
- Change resolver behavior

## 3. Background

M9.5 introduced the standalone soft validation report script:

- scripts/generate-pack-runtime-context-soft-report.cjs

M9.6 confirmed the current stage is manual / standalone / report-only.

M9.7 designed a non-blocking doctor summary preview concept.

Currently, soft validation can be invoked manually:

```
node scripts/generate-pack-runtime-context-soft-report.cjs --input <path>
```

But there is no package-level entrypoint (no npm script alias).

## 4. Problem Statement

Adding soft validation scripts to package.json introduces several risks:

- Users may mistake it for a hard validator
- CI may accidentally couple it into check:all
- soft-fail may be misunderstood as failure
- npm run check:all semantics become unclear
- report output files may pollute the working tree
- input path arguments cannot be cleanly expressed via npm scripts
- Too many package scripts increase maintenance cost

M9.8 addresses these by designing a careful, conservative entrypoint strategy.

## 5. Design Goals

A future package script entrypoint should:

- Improve discoverability of the standalone script
- Preserve manual explicit invocation (never auto-run)
- Avoid coupling into check:all
- Avoid coupling into doctor
- Avoid CI hard gate semantics
- Keep input path explicit (via npm run -- --input)
- Keep --out explicit for file writing
- Preserve stdout JSON default behavior
- Preserve soft-fail exit 0 behavior
- Allow future opt-in package script addition

## 6. Candidate Script Names

| Candidate | Pros | Cons | Recommendation |
|---|---|---|---|
| `npm run soft-report` | Short and discoverable | Too generic | Possible |
| `npm run pack-context:soft-report` | Precise, emphasizes report | Longer name | **Recommended** |
| `npm run validate:pack-context` | Sounds authoritative | Implies hard gate | Avoid |
| `npm run check:soft-report` | Descriptive | Suggests check semantics | Avoid initially |

## 7. Implementation (M9.9)

M9.9 implements the recommended entrypoint:

- Added `pack-context:soft-report` to package.json scripts
- Value: `node scripts/generate-pack-runtime-context-soft-report.cjs`
- Added `scripts/check-package-script-entrypoint.cjs` for local validation
- No coupling into check:all, doctor, or CI

**Recommendation:** Prioritize `pack-context:soft-report` because it clearly associates with PackRuntimeContext and emphasizes report (not validation).

## 7. Proposed Future Script Shape

Conceptual only (NOT implemented):

```json
{
  "scripts": {
    "pack-context:soft-report": "node scripts/generate-pack-runtime-context-soft-report.cjs"
  }
}
```

Future invocation examples:

```
npm run pack-context:soft-report -- --input <path>
npm run pack-context:soft-report -- --input <path> --compact
npm run pack-context:soft-report -- --input <path> --out <path>
```

Key rule: Arguments after `--` are forwarded to the underlying Node.js script.

## 8. Scripts Explicitly Not Recommended Yet

The following are NOT recommended for M9.8 or early milestones:

| Script | Reason to Avoid |
|---|---|
| `check:pack-context` | Implies hard validation |
| `check:soft-report` | Suggests check semantics |
| `validate:pack-context` | Sounds like hard gate |
| `doctor:soft-validation` | Implies doctor coupling |
| `check:all` extended | Coupling into core health check |

## 9. Exit Code Semantics

The package script must preserve standalone script semantics:

| Scenario | Expected Exit Code |
|---|---|
| Report status: `pass` | 0 |
| Report status: `pass-with-warnings` | 0 |
| Report status: `soft-fail` | 0 (non-blocking) |
| Missing --input argument | 1 |
| Input file not found | 1 |
| JSON parse error | 1 |
| Writer internal error | 1 |

Critical rule: **No package script wrapper should reinterpret report status as failure.** The script must never exit non-zero solely because the report status is `soft-fail` or contains warnings.

## 10. File Output Semantics

- No default `.validation/` output
- Stdout JSON is the default
- `--out` is required for file writing
- `--out` may create parent directories
- Generated report files are user-explicit artifacts
- Future CI artifact design must be separate

## 11. Relationship to check:all

- M9.8 does NOT modify check:all
- Future package script must NOT be appended to check:all by default
- check:all remains the current hard/smoke health check
- Soft validation report is advisory unless separately promoted
- Hard gate promotion requires separate design and PR

## 12. Relationship to doctor

- Package script does NOT replace doctor
- Package script does NOT imply doctor integration
- Doctor summary preview (M9.7) remains a separate design
- Future doctor preview should not depend on package script naming

## 13. Relationship to CI

- M9.8 does NOT modify GitHub Actions
- Future CI usage should start as artifact/report-only
- CI must NOT fail on soft-fail report status
- CI hard gate promotion requires M10+ readiness

## 14. User Experience Examples

### Example 1: Print full pretty JSON report to stdout

```
npm run pack-context:soft-report -- --input ./context.json
```

Expected output: Full JSON report to stdout.
Expected exit code: 0 (regardless of report status).

### Example 2: Print compact JSON report to stdout

```
npm run pack-context:soft-report -- --input ./context.json --compact
```

Expected output: Compact JSON report to stdout.
Expected exit code: 0.

### Example 3: Write report to explicit file

```
npm run pack-context:soft-report -- --input ./context.json --out ./report.json
```

Expected output: JSON report written to `./report.json` AND stdout.
Expected exit code: 0.

### Example 4: Missing input argument

```
npm run pack-context:soft-report
```

Expected output: Error message: "--input is required (use --help for usage)"
Expected exit code: 1.

## 15. Implementation Readiness Checklist

Before modifying package.json in any future milestone:

- [ ] Standalone script remains passing
- [ ] Report writer check remains passing
- [ ] Validator check remains passing
- [ ] Package script name reviewed and approved
- [ ] No check:all coupling
- [ ] No CI workflow changes
- [ ] No doctor changes
- [ ] npm argument forwarding documented (-- separator)
- [ ] soft-fail exit 0 behavior tested through npm script
- [ ] --out explicit file writing tested through npm script

## 16. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Confusing script name | Users invoke wrong command | Use precise name `pack-context:soft-report` |
| Accidental check:all coupling | Soft validation blocks CI | Document no-coupling policy; test explicitly |
| CI treating soft-fail as failure | Pipeline breaks | Explicit exit 0 guarantee; test in CI |
| User forgetting npm `--` separator | Arguments not forwarded | Document `--` requirement; add script help |
| Output file pollution | Untracked files in git | No default file output; --out is opt-in |
| Report shape drift | Script output changes unexpectedly | Lock report format before adding script |
| Too many package scripts | Maintenance burden | Limit to one script: `pack-context:soft-report` |
| Future doctor and package script divergence | Inconsistent UX | Shared design document; review together |

## 17. Recommended Next Steps

Future milestone options (NOT implemented here):

### Option A — M9.9 Package Script Entrypoint Implementation ✅ DONE

- Added only `pack-context:soft-report` to package.json
- No check:all coupling
- No CI changes
- Conservative, low-risk

### Option B — M9.9 Optional CI Artifact Design
- Documentation-only
- Design artifact upload behavior separately
- No workflow changes yet

### Option C — M9.9 Doctor Summary Preview Implementation
- Opt-in / hidden preview in doctor
- No exit code changes

**Recommendation:** M9.9 implemented Option A. Proceed to M10+ if hard gate promotion is desired.

## 18. Checkpoint Conclusion

M9.8 defined the package script entrypoint strategy. M9.9 implemented it: `pack-context:soft-report` is now a package.json script alias, preserving all boundaries (no check:all, no doctor, no CI coupling). Any future implementation must remain explicit, manual, non-blocking, and separate from check:all, doctor, and CI.