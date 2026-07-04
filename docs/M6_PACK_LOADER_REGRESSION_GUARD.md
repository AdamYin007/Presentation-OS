# Pack Loader Contract Regression Guard

> **Version**: 1.0.0  
> **Date**: 2026-07-04  
> **Status**: Manual guard (M6.5)  
> **Related**: M6.4 Validation Contract, RFC-0007

---

## Purpose

This document formalizes the Pack Loader contract smoke script as a **required manual regression guard** for any future changes to the Pack Loader error model, loader modules, or related CLI behavior.

The guard ensures that:

1. Error codes remain consistent and structured.
2. Success paths continue to produce compatible output.
3. No unintended side effects are introduced when modifying loader modules.

## Scope

This guard covers:

- Pack Loader error model (`errorCode` + `details` fields)
- Pack Loader modules (`pack-loader.js`, `pack-manifest-reader.js`, `pack-asset-resolver.js`, `pack-inspection.js`, `pack-discovery.js`, `pack-registry.js`, `pack-runtime-context.js`)
- Pack manifest schema (`pack.json` structure)
- CLI error mapping (`--list-packs`, `--inspect-pack` error messages)
- Successful output compatibility (`--list-packs`, `--inspect-pack`)

## Non-goals

- **No CI integration**: M6.5 intentionally keeps the guard manual. Future CI integration may add a `package.json` script or pipeline step, but that is out of scope.
- **No runtime behavior change**: This guard does not modify any loader module, CLI command, or rendering path.
- **No visual rendering validation**: This guard does not validate PPTX output, slide plans, or visual rendering. Use `--validate-pack-story-parity` for rendering parity.
- **No PPTX binary identity**: This guard does not compare generated PPTX files.
- **No dependency changes**: No new packages, scripts, or configurations are added.

---

## Guard Command

```bash
node registry/packages/ppt-factory/scripts/pack-loader-contract-smoke.js
```

### Required Passing Output

```
PASS loadPack digital-pathology
PASS   packId === digital-pathology
PASS   context is frozen
PASS loadAllPacks ok
PASS loadAllPacks includes digital-pathology
PASS inspectPack digital-pathology
PASS   result.name present
PASS MANIFEST_MISSING
PASS   details.packRoot
PASS MANIFEST_INVALID_JSON
PASS   details.manifestPath
PASS ASSET_UNSAFE_PATH
PASS   details.validationError
PASS ASSET_MISSING
PASS   details.validationError
PASS PACK_NOT_FOUND
PASS   details.target

Contract: passed (17/17 checks)
```

If any check fails, the script exits with code 1 and prints `FAIL` lines with details.

### What the Guard Protects

| Area | Protected By |
|---|---|
| Error code consistency | `errorCode` assertions in smoke script |
| Structured error details | `details.*` field assertions |
| Successful loadPack behavior | `loadPack("digital-pathology")` checks |
| Successful loadAllPacks behavior | `loadAllPacks()` checks |
| Successful inspectPack behavior | `inspectPack("digital-pathology")` checks |
| Context immutability | `Object.isFrozen(context)` check |

### What the Guard Intentionally Does NOT Protect

| Area | How to Verify |
|---|---|
| Visual rendering output | Run `--story` / `--pack-story` commands manually |
| PPTX binary identity | Use `--validate-pack-story-parity` |
| Slide plan content | Run `--validate-pack-story-parity` |
| Legacy renderer behavior | Run `--story --legacy-renderer` manually |
| CLI help text | Run `--help` manually |
| Unknown flag guard | Run `--unknown-flag` manually |
| --validate-pack behavior | Run `--validate-pack` manually |

---

## When to Run

Run the guard **before merging** any change that touches:

1. `src/pack-loader.js`
2. `src/pack-manifest-reader.js`
3. `src/pack-asset-resolver.js`
4. `src/pack-inspection.js`
5. `src/pack-discovery.js`
6. `src/pack-registry.js`
7. `src/pack-runtime-context.js`
8. `src/pack-validator.js`
9. Any `pack.json` manifest structure change
10. `--list-packs` or `--inspect-pack` behavior change
11. Error code or CLI error mapping change

### Required Follow-Up Commands

After the guard passes, run these **required follow-up commands** to verify successful-path compatibility:

```bash
node registry/packages/ppt-factory/bin/run.js --list-packs
node registry/packages/ppt-factory/bin/run.js --inspect-pack digital-pathology
node registry/packages/ppt-factory/bin/run.js --validate-pack-story-parity digital-pathology/digital-pathology-15
```

All three must exit with code 0 and produce compatible output.

---

## Review Checklist

Before merging any Pack Loader change, verify:

- [ ] Contract smoke passes: `Contract: passed (17/17 checks)`
- [ ] `--list-packs` output is compatible (no new fields, no reordering)
- [ ] `--inspect-pack digital-pathology` output is compatible
- [ ] `--validate-pack-story-parity` still passes
- [ ] No forbidden files changed (see below)
- [ ] No hidden Unicode in changed files
- [ ] Documentation updated (ROADMAP, RFC, README, USAGE)

### Forbidden Files

The following files must NOT be modified in an M6.5 regression guard PR:

- `package.json`
- `bin/run.js`
- `src/` modules (except where specifically required for the change being guarded)
- `story/` directory
- `adapters/`
- `planners/`
- `hero-sequence/` JSON files
- `content-engine/`
- `theme-engine/`
- `renderer-engine/`

---

## Failure Handling

If the guard fails:

1. **Identify the failing check** from the `FAIL` output line.
2. **Determine the root cause**:
   - If `errorCode` is wrong: check the loader step that returns the error.
   - If `details` fields are missing: check the error construction in the relevant module.
   - If successful-path check fails: check if the loader behavior changed unexpectedly.
3. **Fix the source code** (not the smoke script) unless the smoke script assertion itself is wrong.
4. **Re-run the guard** after the fix.
5. **Re-run required follow-up commands** to confirm no regression.

If the smoke script assertion is genuinely wrong (e.g., a new error code was intentionally added), update the smoke script **and** the contract document (`docs/M6_PACK_LOADER_VALIDATION_CONTRACT.md`).

---

## Relationship to M6 Validation Contract

This guard is the **executable enforcement mechanism** for the contract documented in `docs/M6_PACK_LOADER_VALIDATION_CONTRACT.md`.

- The contract document defines the **specification** (error codes, result shapes, CLI mappings).
- The smoke script implements the **verification** (automated checks against the spec).
- This regression guard document defines the **process** (when to run, what to verify, how to handle failures).

Together, these three documents form the complete Pack Loader contract protection layer.

---

## Relationship to Future CI

M6.5 intentionally keeps the guard **manual only**. There is no `package.json` script, no CI pipeline step, and no pre-commit hook.

Future integration may include:

- Adding `"test:contract"` to `package.json` scripts
- Adding a CI step that runs the smoke script on every PR touching loader modules
- Adding a pre-commit hook for loader-related file changes

None of these are in scope for M6.5.

---

## Boundary Guarantees

1. **No runtime changes**: This guard does not modify any loader module, CLI command, or rendering path.
2. **No new dependencies**: The smoke script uses only Node built-in modules (`fs`, `path`, `os`).
3. **No public CLI commands**: The smoke script is invoked directly via `node`, not through `run.js`.
4. **No CI configuration**: This PR does not add any CI/CD files or scripts.
5. **No package.json changes**: The guard is documented but not wired into npm scripts.
6. **No rendering validation**: This guard checks error model correctness, not visual output.

---

## Version History

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-07-04 | Initial regression guard documentation (M6.5) |
