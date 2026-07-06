# M8.5 Validation Gates & Contract Enforcement Design

> **Version**: 1.0.0
> **Date**: 2026-07-06
> **Status**: Design — Documentation Only
> **Related**: M8.1 Contract Hardening (PR70), M8.2 PackRuntimeContext Schema (PR71), M8.3 Multi-Pack Discovery (PR72), M8.4 Resolver Error Semantics (PR73)
> **Category**: Architecture — Validation Gates & Enforcement Strategy
> **Target Phase**: M8.5 (gate design only, no implementation)

---

## Purpose

Define the **validation gate framework** for AWE Presentation OS M8 milestones. This document consolidates the contracts and assumptions from M8.1 through M8.4 into a unified gate system with four enforcement levels: documentation, smoke, soft validation, and hard validation.

This is **documentation-only**. No gates are implemented. No runtime behavior changes. No schema validation code. No JSON schema files.

## Scope

This document covers:

1. **Gate categories** — documentation, smoke, soft validation, hard validation
2. **Enforcement levels** — what each level checks, who approves, what blocks
3. **PackRuntimeContext gates** — schema compliance from M8.2
4. **Multi-pack discovery gates** — assumptions from M8.3
5. **Resolver error semantics gates** — error taxonomy from M8.4
6. **CLI compatibility gates** — backward compatibility guarantees
7. **Error reporting strategy** — how gate failures are reported
8. **Migration sequence** — M8.5 gates to M9.0 enforcement
9. **CI integration strategy** — how gates map to automated checks

## Non-goals

- **No gate implementation.** M8.5 does not add any validation code.
- **No runtime enforcement.** Gates are documented policies, not executable checks.
- **No new CLI flags.** Existing flags remain unchanged.
- **No schema validator.** No JSON schema files added.
- **No CI configuration.** No CI/CD pipeline changes.
- **No PackRuntimeContext mutation.** Context schema remains frozen.
- **No resolver implementation.** Resolver behavior unchanged.
- **No source-of-truth migration.** Registry remains default.
## Baseline: Consolidated M8 Contracts

### M8.1 — Pack Runtime Contract Hardening (PR70)

M8.1 established the PackRuntimeContract interface and governance/runtime/boundaries/sourceOfTruth/outputPolicy sections. Key contracts:

| Contract | Section | Status |
|---|---|---|
| PackRuntimeContext schema | `context.governance`, `context.runtime`, `context.boundaries`, `context.sourceOfTruth`, `context.outputPolicy`, `context.validation` | Documented, frozen |
| Story source-of-truth | `sourceOfTruth.registryStoryDefault` | True — registry is default |
| Pack story explicit opt-in | `boundaries.packStoryExplicit` | True — requires `--pack-story` flag |
| Automatic pack lookup | `boundaries.automaticPackLookup` | False — no implicit resolution |
| Planner/adapter/theme extraction | `boundaries.*Extraction` | False — all extraction disabled |
| Source-of-truth migration | `boundaries.sourceOfTruthMigration` | False — registry remains default |

### M8.2 — PackRuntimeContext Schema (PR71)

M8.2 documented the PackRuntimeContext conceptual schema with 7 sections: identity, metadata, governance, runtime, boundaries, sourceOfTruth, outputPolicy, validation.

| Section | Fields | Validation |
|---|---|---|
| identity | packId, name, version, status | Required, frozen |
| metadata | createdAt, updatedAt, createdBy | Optional, timestamp |
| governance | coreChangesAllowed, schemaVersion | Required, frozen |
| runtime | loadedByDefault, requiresPackLoader | Required, frozen |
| boundaries | storyRegistryDefault, packStoryExplicit, automaticPackLookup, plannerExtraction, adapterExtraction, themeExtraction, sourceOfTruthMigration | Required, frozen |
| sourceOfTruth | packsAreDefault, registryStoryDefault | Required, frozen |
| outputPolicy | perPackIsolation, outputOverrideAllowed | Required, frozen |
| validation | schemaVersion, lastValidated | Optional, timestamp |

### M8.3 — Multi-Pack Discovery Assumptions (PR72)

M8.3 defined 9 assumption areas for multi-pack discovery:

| Area | Policy | Gate Category |
|---|---|---|
| Discovery scanning | Recursive directory scan, pack.json required | Documentation |
| Duplicate pack IDs | First-wins, error on conflict | Soft validation |
| Conflicting versions | semver comparison, error on mismatch | Soft validation |
| Discovery ordering | Alphabetical sort, deterministic | Smoke |
| Output path collision | Per-pack isolation, --out override | Hard validation |
| Resolver implications | Single-pack operation, hard error | Documentation |
| CLI compatibility | Existing flags unchanged | Smoke |
| Validation gates | 6 pre-implementation gates | Documentation |
| Migration sequence | 3 phases: docs → impl → hardening | Documentation |

### M8.4 — Resolver Error Semantics (PR73)

M8.4 defined the resolver boundary, input/output contract, error taxonomy, and errorCode naming rules.

| Category | Prefix | Codes Documented |
|---|---|---|
| Input errors | INPUT | MISSING_VALUE, INVALID_FORMAT, UNSAFE_PATH |
| Discovery errors | PACK | PACK_NOT_FOUND, PACKS_DIR_NOT_FOUND |
| Validation errors | VALIDATION | VALIDATION_FAILED, STORY_NOT_DECLARED, MULTIPLE_MATCHES |
| File errors | FILE | INVALID_JSON, FILE_MISSING |
| Registry errors | REGISTRY | DUPLICATE_PACK_ID |
| General errors | GENERAL | PACK_LOAD_FAILED |

New codes reserved for M8.5+: PACK_VERSION_CONFLICT, PACK_ID_DUPLICATE, PACK_DISCOVERY_FAILED, PACK_CONTEXT_INCOMPLETE, PACK_OUTPUT_COLLISION, PACK_RESOLVER_INTERNAL_ERROR.
## 1. Gate Categories

### GATE-1: Documentation Gates

Documentation gates verify that design decisions are **fully documented** before implementation begins. These gates ensure no assumptions are implicit.

| Gate | Checks | Owner | Blocker? |
|---|---|---|---|
| **DG-1: Contract Documented** | PackRuntimeContext schema fully documented (M8.2) | Architecture Lead | No |
| **DG-2: Assumptions Documented** | Multi-pack assumptions listed and reviewed (M8.3) | Tech Lead | No |
| **DG-3: Error Taxonomy Documented** | All errorCode values documented with severity (M8.4) | Contract Owner | No |
| **DG-4: Migration Plan Documented** | Phased migration from current to multi-pack documented | Product Owner | Yes |
| **DG-5: CLI Compatibility Documented** | All existing CLI behaviors preserved, documented | CLI Owner | Yes |

**Approval criteria**: All documentation gates must be marked "reviewed" before implementation gates begin. DG-4 and DG-5 are blockers — if no migration plan or CLI compatibility plan exists, no code changes proceed.

**Automation potential**: None. Documentation gates are manual reviews. Future M9.0 may automate documentation completeness checks (e.g., "does every errorCode have a severity?").

### GATE-2: Smoke Gates

Smoke gates verify that **existing functionality still works** after any change. These are automated, fast checks.

| Gate | Checks | Script | Blocker? |
|---|---|---|---|
| **SM-1: Pack Loader Context** | loadPack returns frozen context with all sections | `pack-runtime-boundary-smoke.js` | Yes |
| **SM-2: CLI Output Compatibility** | --list-packs, --inspect-pack, --story, --pack-story output unchanged | `pack-runtime-boundary-smoke.js` | Yes |
| **SM-3: Pack Story Parity** | Registry and pack story produce identical output | `--validate-pack-story-parity` | Yes |
| **SM-4: Help / Unknown Flag** | --help exits 0, unknown flags exit non-zero | `pack-runtime-boundary-smoke.js` | No |
| **SM-5: Source File Boundaries** | bin/run.js contains expected flags and notes | `pack-runtime-boundary-smoke.js` | No |

**Pass criteria**: All smoke gates must pass. SM-1 through SM-3 are hard blockers. SM-4 and SM-5 are informational — they catch regressions but don't block releases.

**Current status** (as of M8.4):
- SM-1: 60/60 PASS ✅
- SM-2: 31/31 PASS ✅
- SM-3: PASS ✅ (registry and pack story produce identical slide plans)

### GATE-3: Soft Validation Gates

Soft validation gates check **structural integrity** of packs and contexts without enforcing strict schema compliance. These are advisory — they warn but don't block.

| Gate | Checks | Scope | Warning Level |
|---|---|---|---|
| **SV-1: PackManifestPresent** | pack.json exists in every pack directory | All packs | Medium |
| **SV-2: PackManifestValidJSON** | pack.json parses as valid JSON | All packs | High |
| **SV-3: PackIdentityFields** | packId, name, version present in pack.json | All packs | High |
| **SV-4: StoryAssetPathsSafe** | No `..` in declared story asset paths | All packs | **High** (security) |
| **SV-5: StoryAssetsExist** | Declared story files exist on disk | All packs | Medium |
| **SV-6: PackRuntimeContextFrozen** | Loaded context is immutable (Object.freeze) | All loaded packs | Medium |
| **SV-7: PackRuntimeContextSections** | All 7 sections present in context | All loaded packs | Medium |
| **SV-8: MultiPackDuplicateIDs** | No duplicate pack IDs in scan directories | Multi-pack | Medium |
| **SV-9: MultiPackVersionConflict** | No conflicting versions for same pack ID | Multi-pack | High |
| **SV-10: ResolverErrorCodeConsistent** | All errorCode values match documented taxonomy | Resolver | Low |

**Warning levels**:
- **Low**: Informational, no action required
- **Medium**: Recommended fix, non-blocking
- **High**: Should fix before release, advisory
- **Security**: Must fix, blocks release (even though soft validation)

**Note**: SV-4 and SV-8 are security-sensitive. While soft validation gates are advisory, security-level warnings should be escalated to hard validation.

### GATE-4: Hard Validation Gates

Hard validation gates enforce **strict compliance** with documented contracts. These gates **block** any release that fails.

| Gate | Checks | Enforced By | Blocker? |
|---|---|---|---|
| **HV-1: PackRuntimeContextSchema** | Context has all required sections with correct types | Future validator (M9.0) | Yes |
| **HV-2: PackStoryResolverContract** | resolvePackStory returns correct shape for all inputs | Future tests (M9.0) | Yes |
| **HV-3: ErrorCodeStability** | No undocumented or renamed errorCode values | Static analysis (M9.0) | Yes |
| **HV-4: CLIExitCodes** | All CLI commands return correct exit codes | Test suite (M9.0) | Yes |
| **HV-5: MultiPackIsolation** | Output paths don't collide between packs | Future validator (M9.0) | Yes |
| **HV-6: RegistryStoryDefault** | Registry remains default story source | Code review | Yes |
| **HV-7: NoImplicitPackLookup** | No automatic pack resolution without --pack-story | Code review | Yes |
| **HV-8: FrozenContext** | PackRuntimeContext is immutable after load | Unit tests (M9.0) | Yes |
## 2. Enforcement Levels

### EL-1: Enforcement Tier Definitions

Each gate belongs to one of four enforcement tiers:

| Tier | Name | Blocks Release? | Automated? | Review Required? |
|---|---|---|---|---|
| **Tier 0** | Documentation | No | No | Manual review |
| **Tier 1** | Smoke | Yes | Yes | None (auto-pass) |
| **Tier 2** | Soft Validation | No | Partial | Advisory review |
| **Tier 3** | Hard Validation | Yes | Yes | None (auto-pass) |

### EL-2: Gate-to-Tier Mapping

| Gate | Tier | Rationale |
|---|---|---|
| DG-1 through DG-5 | 0 | Documentation review, no automation |
| SM-1 through SM-3 | 1 | Critical regression detection |
| SM-4, SM-5 | 1 | Regression detection, lower severity |
| SV-1 through SV-7 | 2 | Structural checks, advisory |
| SV-8, SV-9 | 2 | Multi-pack specific, advisory |
| SV-10 | 2 | Error code consistency, advisory |
| HV-1 through HV-8 | 3 | Strict contract enforcement |

### EL-3: Escalation Rules

Soft validation warnings escalate to hard validation blockers under these conditions:

| Condition | Escalation |
|---|---|
| Security-level soft warning (e.g., SV-4 path traversal) | Automatically escalates to HV-4 (Hard Validation) |
| Multiple medium warnings (>3) in same pack | Escalates to release-blocker advisory |
| Any hard validation gate fails | Release blocked, no exceptions |
| Documentation gate not approved | No implementation begins |

### EL-4: Approval Workflow

```
Documentation Gate Approved (DG-1 through DG-5)
  → Implementation begins
  → Smoke Gates run (SM-1 through SM-5)
    → All pass? → Proceed to release
    → Any fail? → Block release, fix, re-run
  → Soft Validation Gates run (SV-1 through SV-10)
    → Warnings? → Advisory review, fix recommended
    → No warnings? → Release proceeds
  → Hard Validation Gates run (HV-1 through HV-8)
    → All pass? → Release approved
    → Any fail? → Release blocked
```

## 3. PackRuntimeContext Gates (M8.2 Consolidation)

### CRT-1: Context Schema Compliance

The PackRuntimeContext schema from M8.2 defines 7 required sections. Each section has a corresponding gate:

| Section | Gate | Check | Enforced By |
|---|---|---|---|
| identity | HV-1 | packId, name, version present and non-empty | Future validator |
| metadata | HV-1 | createdAt, updatedAt are valid ISO dates (if present) | Future validator |
| governance | HV-1 | coreChangesAllowed is boolean, schemaVersion is string | Future validator |
| runtime | HV-1 | loadedByDefault is boolean, requiresPackLoader is boolean | Future validator |
| boundaries | HV-1 | All 7 boundary flags are boolean | Future validator |
| sourceOfTruth | HV-1 | packsAreDefault is boolean, registryStoryDefault is boolean | Future validator |
| outputPolicy | HV-1 | perPackIsolation is boolean, outputOverrideAllowed is boolean | Future validator |

### CRT-2: Context Immutability

| Gate | Check | Current Status |
|---|---|---|
| SV-6: FrozenContext | Object.freeze() called after context build | ✅ Implemented in pack-loader.js |
| HV-8: FrozenContext | Context cannot be mutated after load | ⬜ Future (M9.0) |

### CRT-3: Context Sections Not Mutated

| Gate | Check | Current Status |
|---|---|---|
| HV-1: Schema Compliance | All sections match documented types | ⬜ Future (M9.0) |
| SV-7: ContextSections | All 7 sections present | ✅ Manual verification |

## 4. Multi-Pack Discovery Gates (M8.3 Consolidation)

### MPD-1: Duplicate Pack ID Detection

| Gate | Check | Enforced By |
|---|---|---|
| SV-8: MultiPackDuplicateIDs | No duplicate pack IDs in scan directories | Soft validation (advisory) |
| HV-5: MultiPackIsolation | Output paths don't collide between packs | Hard validation (blocker) |

**Policy**: Duplicate pack IDs are detected at discovery time (first-wins). Version conflicts produce `PACK_VERSION_CONFLICT` error. M8.3 recommends error-on-conflict (Option C).

### MPD-2: Version Conflict Resolution

| Gate | Check | Enforced By |
|---|---|---|
| SV-9: MultiPackVersionConflict | No conflicting versions for same pack ID | Soft validation (advisory) |
| HV-5: MultiPackIsolation | Same pack ID in multiple dirs → error | Hard validation (blocker) |

**Policy**: M8.3 defines semver comparison for version conflicts. If versions differ, `PACK_VERSION_CONFLICT` error is raised.

### MPD-3: Discovery Ordering

| Gate | Check | Enforced By |
|---|---|---|
| SM-2: CLI Output Compatibility | Discovery order doesn't change CLI output | Smoke (automated) |

**Policy**: M8.3 requires deterministic alphabetical sort of pack IDs.

### MPD-4: Output Path Isolation

| Gate | Check | Enforced By |
|---|---|---|
| HV-5: MultiPackIsolation | Each pack's output goes to unique path | Hard validation (blocker) |

**Policy**: M8.3 defines per-pack output isolation. `--out` flag overrides default but must not cause collisions.
## 5. Resolver Error Semantics Gates (M8.4 Consolidation)

### RES-1: Error Code Consistency

| Gate | Check | Enforced By |
|---|---|---|
| SV-10: ResolverErrorCodeConsistent | All errorCode values match documented taxonomy | Soft validation (advisory) |
| HV-3: ErrorCodeStability | No undocumented or renamed errorCode values | Hard validation (blocker) |

**Check**: Every errorCode used in the codebase must appear in the M8.4 error taxonomy table.

### RES-2: Error Code Naming Convention

| Gate | Check | Enforced By |
|---|---|---|
| SV-10: ResolverErrorCodeConsistent | ErrorCode follows naming rules (prefix + description) | Soft validation (advisory) |
| HV-3: ErrorCodeStability | No legacy codes renamed without deprecation period | Hard validation (blocker) |

**Rules from M8.4**:
- UPPERCASE_WITH_UNDERSCORES format
- Category prefix (INPUT, PACK, VALIDATION, FILE, REGISTRY, GENERAL)
- No module-specific codes (global taxonomy)
- Severity annotation (Low, Medium, High)
- Stability guarantee (documented codes are frozen)

### RES-3: Error Output Shape

| Gate | Check | Enforced By |
|---|---|---|
| HV-2: PackStoryResolverContract | resolvePackStory returns correct shape for all inputs | Hard validation (blocker) |

**Shape contract from M8.4**:
- Success: `{ok: true, packId, storyId, packPath, storyPath, storyAbsolutePath, validation, manifest}`
- Error: `{ok: false, error, errorCode, packId, storyId, details?}`
- packId and storyId always present in error results
- errorCode always one of documented values
- details field optional, varies by errorCode

### RES-4: Multi-Pack Error Scenarios

| errorCode | Gate | Check |
|---|---|---|
| PACK_NOT_FOUND | HV-2 | Resolver returns error when pack missing |
| PACK_VERSION_CONFLICT | HV-5 | Resolver/loader propagates version conflict |
| PACK_ID_DUPLICATE | SV-8 | Duplicate pack ID detected at discovery |
| PACK_DISCOVERY_FAILED | HV-2 | Discovery failure returns structured error |
| PACK_CONTEXT_INCOMPLETE | HV-1 | Missing context sections detected |
| PACK_OUTPUT_COLLISION | HV-5 | Output path collision prevented |
| PACK_RESOLVER_INTERNAL_ERROR | HV-2 | Internal error returns structured error |

## 6. CLI Compatibility Gates

### CLI-1: Existing Flag Preservation

| Gate | Check | Enforced By |
|---|---|---|
| SM-2: CLI Output Compatibility | All existing flags produce same output | Smoke (automated) |
| HV-4: CLIExitCodes | All CLI commands return correct exit codes | Hard validation (blocker) |
| DG-5: CLI Compatibility Documented | CLI behavior changes documented | Documentation |

**Flag inventory** (from M8.1/M8.2):

| Flag | Current Behavior | M8.5 Change? |
|---|---|---|
| `--list-packs` | List packs with validation status | No change |
| `--inspect-pack` | Inspect pack with runtime/governance/boundaries | No change |
| `--story` | Render registry story (default) | No change |
| `--pack-story` | Render pack story (explicit opt-in) | No change |
| `--validate-pack-story-parity` | Compare registry vs pack story output | No change |
| `--help` | Show help text | No change |

### CLI-2: Exit Code Stability

| Command | Success Exit | Error Exit | Gate |
|---|---|---|---|
| `--list-packs` | 0 | 1 | HV-4 |
| `--inspect-pack` | 0 | 1 | HV-4 |
| `--story` | 0 | 1 | HV-4 |
| `--pack-story` | 0 | 1 | HV-4 |
| `--validate-pack-story-parity` | 0 | 1 | HV-4 |
| `--help` | 0 | N/A | HV-4 |
| unknown flag | N/A | non-zero | SM-5 |

### CLI-3: Output Format Stability

| Output | Current Format | M8.5 Change? |
|---|---|---|
| `--list-packs` | "Available Presentation Packs:" header + pack list | No change |
| `--inspect-pack` | Pack name, validation, runtime, governance, boundaries | No change |
| `--pack-story` | Pack Story Resolution header + path details | No change |
| Error messages | Human-readable via `result.error` | No change (errorCode stable) |

## 7. Error Reporting Strategy

### ER-1: Gate Failure Reporting

When a gate fails, the reporting format depends on the gate tier:

| Tier | Reporting Format | Destination |
|---|---|---|
| Tier 0 (Documentation) | Manual review checklist | PR description, meeting notes |
| Tier 1 (Smoke) | Automated pass/fail count | Terminal output, CI log |
| Tier 2 (Soft Validation) | Warning count by severity | Terminal output, advisory report |
| Tier 3 (Hard Validation) | Detailed failure report with errorCode | Terminal output, CI block |

### ER-2: Error Code to User Message Mapping

| errorCode | User-Facing Message Pattern | Severity |
|---|---|---|
| PACK_NOT_FOUND | "Presentation Pack not found: {packId}" | Medium |
| PACK_VERSION_CONFLICT | "Version conflict for pack '{packId}': {versions}" | High |
| PACK_ID_DUPLICATE | "Duplicate pack ID '{packId}' found at {existingPath} and {newPath}" | Medium |
| PACK_DISCOVERY_FAILED | "Pack discovery failed: {reason} in {scanDir}" | Medium |
| PACK_CONTEXT_INCOMPLETE | "Pack context incomplete for '{packId}': missing {sections}" | Medium |
| PACK_OUTPUT_COLLISION | "Output path collision for pack '{packId}': {outputPath}" | High |
| PACK_RESOLVER_INTERNAL_ERROR | "Internal resolver error: {operation} failed — {cause}" | High |

### ER-3: Structured Error Details

Every errorCode includes a `details` object with context-specific fields:

| errorCode | details fields |
|---|---|
| PACK_NOT_FOUND | `{target: string}` |
| PACK_VERSION_CONFLICT | `{packId: string, versions: [{path, version}], policy: string}` |
| PACK_ID_DUPLICATE | `{packId: string, existingPath: string, newPath: string}` |
| PACK_DISCOVERY_FAILED | `{scanDir: string, reason: string}` |
| PACK_CONTEXT_INCOMPLETE | `{packId: string, missingSections: string[]}` |
| PACK_OUTPUT_COLLISION | `{packId: string, outputPath: string, existingPack: string}` |
| PACK_RESOLVER_INTERNAL_ERROR | `{operation: string, cause: string}` |
## 8. Migration Sequence

### MS-1: M8.5 Gates to M9.0 Enforcement

The validation gate framework evolves across M8 and M9 milestones:

| Milestone | Gate Type | Status | Automation |
|---|---|---|---|
| **M8.5 (this PR)** | All gates documented | Documentation only | None |
| M8.6 | Smoke gates enhanced | Automated smoke tests added | `pack-runtime-boundary-smoke.js` extended |
| M8.7 | Soft validation gates | Advisory warnings added | New smoke scripts |
| **M9.0** | Hard validation gates | Strict enforcement | Schema validator + CI integration |

### MS-2: Phased Implementation

**Phase 1 — M8.5 (this PR)**: Document all gates. No code changes.
- All 29 gates documented (5 DG + 5 SM + 10 SV + 8 HV)
- Error taxonomy from M8.4 referenced
- Multi-pack assumptions from M8.3 referenced
- PackRuntimeContext schema from M8.2 referenced

**Phase 2 — M8.6**: Enhance smoke gates.
- Extend `pack-runtime-boundary-smoke.js` to cover M8.5 scenarios
- Add multi-pack smoke tests (SV-8, SV-9)
- Add resolver error smoke tests (SV-10)

**Phase 3 — M8.7**: Implement soft validation gates.
- Add SV-1 through SV-7 as advisory warnings in pack-loader
- Add SV-8 through SV-10 as multi-pack checks
- Warnings logged to stderr, don't block execution

**Phase 4 — M9.0**: Implement hard validation gates.
- HV-1: JSON schema validator for PackRuntimeContext
- HV-2: Unit tests for resolver contract
- HV-3: Static analysis for errorCode stability
- HV-4: CLI exit code tests
- HV-5: Multi-pack isolation tests
- HV-6/HV-7: Code review gates (manual)
- HV-8: Immutability tests

### MS-3: Backward Compatibility Guarantee

**Principle**: M8.5 gates maintain full backward compatibility with M8.1 through M8.4.

- No existing gate is removed or renamed
- No existing smoke test behavior changes
- No existing errorCode meaning changes
- No existing CLI behavior changes
- No existing PackRuntimeContext section removed

**Risk**: The only risk is documentation drift — if documented gate expectations don't match actual implementation. M8.5 ensures documentation matches current implementation.

### MS-4: Gate Dependency Graph

```
DG-1 (PackRuntimeContext documented) ──┐
DG-2 (Multi-pack assumptions) ─────────┤
DG-3 (Error taxonomy) ─────────────────┤
DG-4 (Migration plan) ────────────────┼──► Implementation begins
DG-5 (CLI compatibility) ─────────────┘

SM-1 (Context) ◄── depends on DG-1
SM-2 (CLI output) ◄── depends on DG-5
SM-3 (Parity) ◄── depends on SM-1, SM-2
SM-4, SM-5 ◄── informational

SV-1 through SV-7 ◄── depends on SM-1, SM-2
SV-8, SV-9 ◄── depends on DG-2
SV-10 ◄── depends on DG-3

HV-1 through HV-8 ◄── depends on all above
```

## 9. CI Integration Strategy

### CI-1: Gate-to-Step Mapping

| CI Step | Gates Checked | Script | Timeout |
|---|---|---|---|
| **Step 1: Documentation Review** | DG-1 through DG-5 | Manual (PR review) | N/A |
| **Step 2: Smoke Tests** | SM-1 through SM-5 | `pack-runtime-boundary-smoke.js` | 60s |
| **Step 3: Contract Tests** | SM-1 (re-run), HV-4 | `pack-loader-contract-smoke.js` | 60s |
| **Step 4: Parity Check** | SM-3 | `--validate-pack-story-parity` | 120s |
| **Step 5: Soft Validation** | SV-1 through SV-10 | Future: `soft-validation-check.js` | 120s |
| **Step 6: Hard Validation** | HV-1 through HV-8 | Future: `hard-validation-check.js` | 300s |

### CI-2: Gate Failure Handling

| Tier | Failure Action | Retry? | Notify? |
|---|---|---|---|
| Tier 0 | Block PR merge | N/A (manual fix) | PR reviewer |
| Tier 1 | Block CI pipeline | Yes (after fix) | Channel alert |
| Tier 2 | Warn in CI output | No (advisory) | Weekly report |
| Tier 3 | Block CI pipeline | Yes (after fix) | Channel alert |

### CI-3: Current CI Coverage

| Gate | Currently Automated? | Script |
|---|---|---|
| SM-1: Pack Loader Context | ✅ Yes | `pack-runtime-boundary-smoke.js` |
| SM-2: CLI Output Compatibility | ✅ Yes | `pack-runtime-boundary-smoke.js` |
| SM-3: Pack Story Parity | ✅ Yes | `--validate-pack-story-parity` |
| SM-4: Help / Unknown Flag | ✅ Yes | `pack-runtime-boundary-smoke.js` |
| SM-5: Source File Boundaries | ✅ Yes | `pack-runtime-boundary-smoke.js` |
| SV-1 through SV-10 | ❌ No | Future (M8.7) |
| HV-1 through HV-8 | ❌ No | Future (M9.0) |

### CI-4: Future CI Enhancements

Planned CI additions (M8.6+):

| Enhancement | Target Milestone | Description |
|---|---|---|
| Multi-pack smoke tests | M8.6 | Test duplicate ID detection, version conflict |
| Resolver error smoke tests | M8.6 | Test all 7 errorCode values |
| Soft validation runner | M8.7 | Run SV-1 through SV-10 as advisory |
| JSON schema validator | M9.0 | HV-1: validate PackRuntimeContext schema |
| Static analysis for errorCode | M9.0 | HV-3: grep all errorCode values |
| Immutability tests | M9.0 | HV-8: verify Object.freeze() on context |
## 10. Cross-Reference: Gate Traceability

### Gate-to-Requirement Mapping

| Requirement | Gate(s) | Source Doc |
|---|---|---|
| PackRuntimeContext schema compliance | HV-1, SV-7 | M8.2 (PR71) |
| Multi-pack discovery correctness | SV-8, SV-9, HV-5 | M8.3 (PR72) |
| Resolver error semantics | SV-10, HV-2, HV-3 | M8.4 (PR73) |
| CLI compatibility | SM-2, SM-3, HV-4 | M8.1 (PR70) |
| Documentation completeness | DG-1 through DG-5 | All M8 docs |

### Gate-to-M8 Milestone Mapping

| M8 Milestone | Contributing Gates |
|---|---|
| M8.1 (Contract Hardening) | SM-2, SM-3, HV-4, HV-6, HV-7 |
| M8.2 (PackRuntimeContext Schema) | HV-1, SV-7, SV-6, HV-8 |
| M8.3 (Multi-Pack Discovery) | SV-8, SV-9, HV-5, DG-2 |
| M8.4 (Resolver Error Semantics) | SV-10, HV-2, HV-3, DG-3 |
| M8.5 (Validation Gates) | All gates documented in this PR |

### All 29 Gates Inventory

| # | Gate ID | Tier | Blocker? | Source |
|---|---|---|---|---|
| 1 | DG-1: Contract Documented | 0 | No | M8.2 |
| 2 | DG-2: Assumptions Documented | 0 | No | M8.3 |
| 3 | DG-3: Error Taxonomy Documented | 0 | No | M8.4 |
| 4 | DG-4: Migration Plan Documented | 0 | Yes | M8.3 |
| 5 | DG-5: CLI Compatibility Documented | 0 | Yes | M8.1 |
| 6 | SM-1: Pack Loader Context | 1 | Yes | M8.1 |
| 7 | SM-2: CLI Output Compatibility | 1 | Yes | M8.1 |
| 8 | SM-3: Pack Story Parity | 1 | Yes | M8.1 |
| 9 | SM-4: Help / Unknown Flag | 1 | No | M8.1 |
| 10 | SM-5: Source File Boundaries | 1 | No | M8.1 |
| 11 | SV-1: PackManifestPresent | 2 | No | M8.3 |
| 12 | SV-2: PackManifestValidJSON | 2 | No | M8.3 |
| 13 | SV-3: PackIdentityFields | 2 | No | M8.3 |
| 14 | SV-4: StoryAssetPathsSafe | 2 | **Yes** (security) | M8.3 |
| 15 | SV-5: StoryAssetsExist | 2 | No | M8.3 |
| 16 | SV-6: PackRuntimeContextFrozen | 2 | No | M8.2 |
| 17 | SV-7: PackRuntimeContextSections | 2 | No | M8.2 |
| 18 | SV-8: MultiPackDuplicateIDs | 2 | No | M8.3 |
| 19 | SV-9: MultiPackVersionConflict | 2 | No | M8.3 |
| 20 | SV-10: ResolverErrorCodeConsistent | 2 | No | M8.4 |
| 21 | HV-1: PackRuntimeContextSchema | 3 | Yes | M8.2 |
| 22 | HV-2: PackStoryResolverContract | 3 | Yes | M8.4 |
| 23 | HV-3: ErrorCodeStability | 3 | Yes | M8.4 |
| 24 | HV-4: CLIExitCodes | 3 | Yes | M8.1 |
| 25 | HV-5: MultiPackIsolation | 3 | Yes | M8.3 |
| 26 | HV-6: RegistryStoryDefault | 3 | Yes | M8.1 |
| 27 | HV-7: NoImplicitPackLookup | 3 | Yes | M8.1 |
| 28 | HV-8: FrozenContext | 3 | Yes | M8.2 |

## 11. Open Questions

1. **Should soft validation warnings block releases?**
   - Current policy: No, they're advisory.
   - Exception: Security-level warnings (SV-4) escalate to blockers.
   - **Recommendation**: Keep advisory, but weekly reports track recurring warnings.

2. **Should HV-6 and HV-7 be automated?**
   - Currently manual code review gates.
   - Automation would require AST analysis of bin/run.js to verify no implicit lookup.
   - **Recommendation**: Defer to M9.0.

3. **Should gate failure reports include errorCode?**
   - Smoke gates: No (pass/fail count sufficient).
   - Soft/hard gates: Yes (structured error reporting).
   - **Recommendation**: Use errorCode for SV/HV gates, pass/fail for SM gates.

4. **Should documentation gates be automated?**
   - Currently manual review.
   - Could add "does every errorCode have a severity?" static check.
   - **Recommendation**: Defer to M9.0.

5. **Should gate tiers be re-evaluated for M9.0?**
   - Potential: Demote some SV gates to HV (make them blockers).
   - **Recommendation**: Review at M8.7.

## 12. Review Checklist

- [x] M8_VALIDATION_GATES_CONTRACT_ENFORCEMENT_DESIGN.md created
- [x] Documentation-only (no code changes)
- [x] No package.json changes
- [x] No bin/run.js changes
- [x] No src/ changes
- [x] No scripts/ changes
- [x] No story JSON changes
- [x] No adapters/planners changes
- [x] Gate categories defined (documentation, smoke, soft validation, hard validation)
- [x] Enforcement levels defined (4 tiers: 0-3)
- [x] PackRuntimeContext gates defined (CRT-1 through CRT-3, 8 gates)
- [x] Multi-pack discovery gates defined (MPD-1 through MPD-4, 8 gates)
- [x] Resolver error semantics gates defined (RES-1 through RES-4, 7 gates)
- [x] CLI compatibility gates defined (CLI-1 through CLI-3, 3 gates)
- [x] Error reporting strategy defined (ER-1 through ER-3, 3 sections)
- [x] Migration sequence defined (MS-1 through MS-4, 4 sections)
- [x] CI integration strategy defined (CI-1 through CI-4, 4 sections)
- [x] All 29 gates inventoried with tier, blocker status, and source
- [x] No runtime behavior changes
- [x] No schema validation code
- [x] No JSON schema files
- [x] No PackRuntimeContext implementation changes
- [x] No resolver implementation changes
- [x] No CLI behavior changes
- [x] Consolidates M8.1, M8.2, M8.3, M8.4 references
