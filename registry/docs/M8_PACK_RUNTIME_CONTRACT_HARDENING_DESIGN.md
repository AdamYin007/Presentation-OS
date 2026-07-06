# M8.1 Pack Runtime Contract Hardening Design

> **Version**: 1.0.0
> **Date**: 2026-07-05
> **Status**: Design — Documentation Only
> **Related**: M8.0 RFC-0009, PR69, PR70
> **Category**: Architecture — Contract Hardening
> **Target Phase**: M8.1 (design document only)

---

## Purpose

Define the hardened Pack Runtime Contract that future M8+ implementations must satisfy.
This design does not implement any runtime behavior. It is documentation-only.

## Scope

This document defines contracts for:
- PackRuntimeContext (sections, required values, immutability)
- Pack Loader (ownership, read-only constraints)
- Pack Story Resolver (current behavior, future preconditions)
- Shared context contract (loader ↔ resolver relationship)
- Output policy (path isolation)
- Source-of-truth policy (registry default)
- Compatibility policy (CLI output)
- Validation policy (manual guards)
- Error model (stable errorCode)
- Version compatibility assumptions
- Multi-pack readiness assumptions

## Non-goals

- **No implementation.** M8.1 does not change any runtime behavior.
- **No resolver/context consumption.** Resolver does not consume PackRuntimeContext.
- **No schema validation code.** No JSON schema files added.
- **No errorCode changes.** Existing Pack Loader error model remains stable.
- **No CLI changes.** No new commands, no output format changes.
- **No source-of-truth migration.** Registry remains default.
- **No planner/adapter/theme extraction.** All remain core-owned.
- **No CI integration.** Manual guards remain manual.

## PackRuntimeContext Contract

### Required Sections

The PackRuntimeContext must contain these sections:

| Section | Type | Required | Mutability |
|---|---|---|---|
| identity / metadata | object | Yes | Immutable |
| governance | object | Yes | Immutable |
| runtime | object | Yes | Immutable |
| boundaries | object | Yes | Immutable |
| sourceOfTruth | object | Yes | Immutable |
| outputPolicy | object | Yes | Immutable |
| validation | object | Yes | Immutable |

### Required Boundary Values

These values must remain stable:

| Field | Required Value | Rationale |
|---|---|---|
| `boundaries.storyRegistryDefault` | `true` | --story uses registry |
| `boundaries.packStoryExplicit` | `true` | --pack-story is explicit opt-in |
| `boundaries.automaticPackLookup` | `false` | No auto pack search |
| `boundaries.plannerExtraction` | `false` | Planners remain core-owned |
| `boundaries.adapterExtraction` | `false` | Adapters remain core-owned |
| `boundaries.themeExtraction` | `false` | Themes remain core-owned |
| `boundaries.sourceOfTruthMigration` | `false` | No migration |
| `sourceOfTruth.packsAreDefault` | `false` | Registry is default |
| `runtime.loadedByDefault` | `false` | Packs are explicit opt-in |
| `runtime.requiresPackLoader` | `true` | Pack metadata requires loader |
| `governance.coreChangesAllowed` | `false` | Core boundaries frozen |

### Future Hardening Requirements

Before any future implementation, the PackRuntimeContext contract must guarantee:

- Section presence must be stable. Missing required section = contract violation.
- Section meaning must be stable. Changing a section's semantics = contract violation.
- Missing required section must be treated as contract violation.
- False boundary values must not be silently flipped.
- Context must remain frozen (Object.isFrozen).
- Context must remain read-only.
- Context must not carry mutable runtime state.
- Context must not trigger rendering.
- Context must not imply source-of-truth migration.

## Pack Loader Contract

### Loader Owns

- Manifest reading
- Manifest validation
- Asset declaration validation
- Asset path safety validation
- PackRuntimeContext creation
- Inspection input normalization

### Loader Does NOT Own

- Rendering
- Story registry
- Planner selection
- Adapter selection
- Theme selection
- Output writing
- Source-of-truth migration
- Automatic pack lookup from --story

### Loader Guarantees

- Loader remains read-only.
- Loader may validate assets but must not render them.
- Loader may create context but must not decide rendering source.
- Loader error model must remain stable.
- No errorCode changes in M8.1.

## Pack Story Resolver Contract

### Current Stable Behavior

- `--pack-story <pack-id>/<story-id>` remains explicit.
- Resolver parses pack/story reference.
- Resolver verifies story declaration.
- Resolver resolves story path.
- Resolver loads story JSON only for explicit pack-story rendering.
- Resolver passes story into existing rendering pipeline.
- Resolver does not affect `--story`.
- Resolver does not make packs default source of truth.

### Future Contract (Proposed Only — Not Implemented)

Resolver may consume PackRuntimeContext after future RFC/implementation:

- Resolver may consume PackRuntimeContext directly.
- Resolver may use context.assets.stories for declaration checks.
- Resolver may use context.boundaries to enforce explicit mode.
- Resolver may use context.outputPolicy for output path consistency.
- Resolver must not auto-search packs for --story.
- Resolver must not load planners/adapters/themes from packs.
- Resolver/context consumption requires future approval.

## Shared Context Contract

Proposed future relationship between Pack Loader and Pack Story Resolver:

PackRuntimeContext can be shared between loader and resolver only if:

- Immutable (Object.isFrozen)
- Validated (section presence confirmed)
- Explicit (traceable to packId)
- Includes validation summary
- Does not mutate rendering behavior
- Does not make packs default
- Does not trigger rendering

**This is design-only and not implemented in M8.1.**

## Output Policy Contract

Must preserve:

- `--story` output path remains existing registry output path.
- `--pack-story` output path remains `output/ppt-factory/packs/<pack-id>/<story-id>.pptx`.
- Parity temp outputs remain isolated under `.parity-temp/`.
- No output path change in M8.1.
- Future output policy changes require RFC.

## Source-of-Truth Contract

Must preserve:

- Registry remains default for `--story`.
- Packs remain explicit opt-in.
- `--story` does not search packs.
- Packs are not default source of truth.
- Source-of-truth migration requires future RFC.
- Automatic pack lookup remains rejected.

## Compatibility Contract

Must preserve:

- Successful `--list-packs` output compatible.
- Successful `--inspect-pack` output compatible.
- `--help` output compatible.
- Unknown flag guard compatible.
- Existing pack story parity compatible.
- Existing rendering outputs compatible.
- No new public CLI command.

## Validation Contract

Current manual guards:

```bash
node registry/packages/ppt-factory/scripts/pack-runtime-boundary-smoke.js
node registry/packages/ppt-factory/scripts/pack-loader-contract-smoke.js
node registry/packages/ppt-factory/bin/run.js --validate-pack-story-parity digital-pathology/digital-pathology-15
```

Guarantees:

- Manual guards remain required for M8.1 review.
- CI integration is deferred.
- Boundary smoke is not a substitute for unit tests.
- Contract smoke is not a complete schema validator.
- Parity compares slide plans, not PPTX binary identity.

## Error Model Contract

- Existing Pack Loader errorCode model remains stable.
- ErrorCode contracts must not be altered in M8.1.
- Future resolver/context alignment may need normalized resolver error shapes.
- Any new errorCode requires RFC or explicit implementation task.
- M8.1 does not add errorCode.

## Version Compatibility Assumptions

Design only:

- Current Digital Pathology Pack version remains 0.1.0.
- PackRuntimeContext contract versioning is not implemented in M8.1.
- Future M8.2 may document schema/contract version.
- Pack manifest version compatibility requires explicit design.
- Multi-pack version conflicts require future design.

## Multi-Pack Readiness Assumptions

Design only:

- M8.1 does not implement multi-pack discovery changes.
- Current discovery still supports existing pack behavior.
- M8.3 (PR72) defines multi-pack discovery assumptions: duplicate policy, version conflicts, ordering, output paths, resolver implications, CLI compatibility, validation gates, migration sequence.
- Duplicate pack ids, invalid manifests, missing assets, and version differences need formalized policy.
- No source-of-truth migration.

## Resolver/Context Consumption Preconditions

Before resolver can consume PackRuntimeContext, ALL of these must be satisfied:

1. PackRuntimeContext contract documented. ✅ (this document)
2. Required sections stable. ✅ (M7.2 hardening)
3. Output policy stable. ✅ (frozen)
4. Error model stable. ✅ (M6.3+ hardening)
5. Story declaration checks aligned. ⬜ (future)
6. Boundary smoke updated only by explicit task. ✅ (M7.4)
7. Parity guard passing. ✅ (M5.6+)
8. No `--story` behavior change. ✅ (frozen)
9. Future RFC approval. ⬜ (required before implementation)

**M8.1 does not implement resolver/context consumption.**

## Migration Phases

Safe sequence for M8+:

| Phase | Milestone | Type | Status |
|---|---|---|---|
| M8.1 | Pack Runtime Contract Hardening Design | Documentation | **PR70** — Contract hardening design |
| M8.2 | PackRuntimeContext Contract Schema Documentation | Documentation | **PR71** — Full conceptual schema (8 sections, 11 required values) |
| [x] M8.3 | Multi-Pack Discovery Assumptions Design | Documentation | **PR72** — Multi-pack discovery assumptions design |
| M8.4 | Resolver/Context Consumption RFC | RFC | Proposed |
| M8.5 | M8 Runtime Contract Checkpoint | Checkpoint | Proposed |

## Future Implementation Gates

Before any M8+ implementation touches runtime code:

1. **Contract gate.** M8.1 design must be reviewed and accepted.
2. **Smoke gate.** Boundary smoke (60/60) and contract smoke (31/31) must pass.
3. **Parity gate.** `--validate-pack-story-parity` must pass.
4. **CLI gate.** `--list-packs` and `--inspect-pack` output must remain compatible.
5. **RFC gate.** High-risk changes (source-of-truth, resolver consolidation) require RFC.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Contract drift | Low | M8.1 documents explicit contract |
| Premature implementation | Medium | Migration phases gate implementation |
| Scope creep | Medium | Clear non-goals section |
| Resolver/context risk | Low | Precondition gates (9 items) |
| Multi-pack complexity | Medium | M8.3 deferred design |

## Open Questions

1. What schema format for PackRuntimeContext (JSON Schema, TypeScript types, prose)?
2. How should multi-pack version conflicts be resolved?
3. When should resolver/context precondition #5 (story declaration alignment) be addressed?
4. What is the minimum viable resolver/context consumption contract?
5. Should boundary smoke be extended to validate M8.1 contract requirements?

## Review Checklist

- [x] M8_PACK_RUNTIME_CONTRACT_HARDENING_DESIGN.md created
- [x] Documentation-only (no code changes)
- [x] No package.json changes
- [x] No bin/run.js changes
- [x] No src/ changes
- [x] No scripts/ changes
- [x] No story JSON changes
- [x] No adapters/planners changes
- [x] PackRuntimeContext contract defined
- [x] Required boundary values documented
- [x] Pack Loader contract defined
- [x] Pack Story Resolver contract defined
- [x] Shared context contract defined
- [x] Output policy contract defined
- [x] Source-of-truth contract defined
- [x] Compatibility contract defined
- [x] Validation contract defined
- [x] Error model contract defined
- [x] Version compatibility assumptions documented
- [x] Multi-pack readiness assumptions documented
- [x] Resolver/context consumption preconditions listed
- [x] Resolver/context consumption NOT implemented
- [x] Migration phases defined (M8.1 → M8.5)
- [x] Future implementation gates defined
- [x] Risks documented
- [x] Open questions listed

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-07-05 | Hermes | Initial Pack Runtime Contract Hardening Design (M8.1) |
