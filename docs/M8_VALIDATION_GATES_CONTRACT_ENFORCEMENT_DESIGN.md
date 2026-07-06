# M8.5 Validation Gates & Contract Enforcement Design

## 1. Purpose

This document defines the validation gate strategy for M8 PackRuntime hardening.

M8.5 consolidates the contract, discovery, and resolver design work from:

- M8.2 PackRuntimeContext Contract Schema
- M8.3 Multi-Pack Discovery Assumptions Design
- M8.4 Resolver Boundary & Error Semantics Design

The goal is to define how future validation should be introduced without breaking existing CLI behavior, smoke tests, story parity, or downstream consumers.

## 2. Non-Goals

M8.5 does not implement validation logic.

This document does not:

- add runtime validation code
- add JSON schema files
- change PackRuntimeContext behavior
- change resolver behavior
- change multi-pack discovery behavior
- change CLI output
- change errorCode behavior
- introduce hard CI failures
- modify existing smoke/parity expectations

M8.5 is documentation-only.

## 3. Source Documents

| Source | Role |
|---|---|
| `docs/M8_PACK_RUNTIME_CONTEXT_CONTRACT_SCHEMA.md` | Defines PackRuntimeContext required sections, values, immutability, compatibility, and future schema gates |
| `docs/M8_MULTI_PACK_DISCOVERY_ASSUMPTIONS_DESIGN.md` | Defines future multi-pack discovery assumptions, duplicate handling, ordering, version conflict behavior, and output collision policy |
| `docs/M8_RESOLVER_BOUNDARY_ERROR_SEMANTICS_DESIGN.md` | Defines resolver boundary, input/output contract, error taxonomy, and errorCode semantics |

## 4. Validation Philosophy

Validation must be introduced gradually.

The core philosophy is:

1. Document before validating.
2. Observe before enforcing.
3. Soft-fail before hard-fail.
4. Preserve CLI compatibility.
5. Preserve story parity.
6. Avoid changing runtime behavior during design phases.
7. Treat explicit false values as contract values.
8. Treat unknown future fields as extension points unless reserved.
9. Keep errorCode semantics stable once exposed.
10. Prefer deterministic validation results over convenience.

## 5. Gate Categories

M8 validation gates are divided into four enforcement levels.

| Gate Level | Meaning | M8.5 Status |
|---|---|---|
| Documentation Gate | Confirms that contract documents and references exist | Defined only |
| Smoke Gate | Confirms existing behavior does not regress | Already active |
| Soft Validation Gate | Detects contract violations but does not fail CI | Future |
| Hard Validation Gate | Fails CI/release on contract violations | Future |

## 6. Documentation Gates

### DOC_M8_2_CONTRACT_SCHEMA_GATE

Ensures that the PackRuntimeContext contract schema document exists.

Expected source:

- `docs/M8_PACK_RUNTIME_CONTEXT_CONTRACT_SCHEMA.md`

### DOC_M8_3_DISCOVERY_ASSUMPTIONS_GATE

Ensures that the multi-pack discovery assumptions design exists.

Expected source:

- `docs/M8_MULTI_PACK_DISCOVERY_ASSUMPTIONS_DESIGN.md`

### DOC_M8_4_RESOLVER_ERROR_SEMANTICS_GATE

Ensures that the resolver boundary and error semantics design exists.

Expected source:

- `docs/M8_RESOLVER_BOUNDARY_ERROR_SEMANTICS_DESIGN.md`

### DOC_M8_5_VALIDATION_GATES_GATE

Ensures that this validation gate design document exists.

Expected source:

- `docs/M8_VALIDATION_GATES_CONTRACT_ENFORCEMENT_DESIGN.md`

## 7. Smoke Gates

Smoke gates protect current runtime behavior.

| Gate | Expected Behavior |
|---|---|
| Boundary smoke | Existing pack runtime boundary behavior remains unchanged |
| Contract smoke | Existing contract-facing behavior remains unchanged |
| Pack story parity | Existing `story` and `pack-story` behavior remains compatible |

Smoke gates should continue to pass before any future validation is introduced.

## 8. PackRuntimeContext Contract Gates

These gates derive from M8.2.

### CONTEXT_REQUIRED_SECTIONS_GATE

Validates that PackRuntimeContext exposes all required top-level sections.

Initial status:

- future soft gate

Hard-fail eligibility:

- only after runtime `contractVersion` exists
- only after downstream compatibility is confirmed

### CONTEXT_REQUIRED_VALUES_GATE

Validates required values that must be present inside required sections.

Initial status:

- future soft gate

### CONTEXT_READ_ONLY_FIELDS_GATE

Validates that read-only context fields are not mutated by downstream execution layers.

Initial status:

- future soft gate

### CONTEXT_RESERVED_NAMESPACE_GATE

Validates that reserved namespaces are not used by extensions or pack-specific fields.

Initial status:

- future soft gate

### CONTEXT_COMPATIBILITY_GATE

Validates that known compatibility-sensitive CLI behaviors remain stable.

Initial status:

- smoke gate now
- future soft gate
- possible hard gate after M9

## 9. Multi-Pack Discovery Gates

These gates derive from M8.3.

### PACK_DISCOVERY_ORDER_GATE

Validates deterministic discovery order.

Expected rule:

- discovery order must be deterministic
- ordering must not depend on filesystem nondeterminism

Initial status:

- future soft gate

### PACK_DUPLICATE_ID_GATE

Validates duplicate pack id detection.

Expected rule:

- duplicate pack ids must be detected
- conflict behavior must be deterministic
- the chosen policy must match M8.3 assumptions

Initial status:

- future soft gate

### PACK_VERSION_CONFLICT_GATE

Validates conflicting version behavior.

Expected rule:

- version conflicts must produce stable resolver behavior
- semver interpretation must be documented before enforcement

Initial status:

- future soft gate

### PACK_OUTPUT_COLLISION_GATE

Validates output path collision behavior.

Expected rule:

- default behavior should avoid cross-pack output collision
- explicit user overrides must remain compatible with CLI expectations

Initial status:

- future soft gate

### PACK_DISCOVERY_PERFORMANCE_GATE

Validates that discovery checks do not introduce unacceptable latency.

Initial status:

- future observation gate only

## 10. Resolver Error Semantics Gates

These gates derive from M8.4.

### RESOLVER_INPUT_CONTRACT_GATE

Validates resolver input shape before resolution.

Initial status:

- future soft gate

### RESOLVER_OUTPUT_CONTRACT_GATE

Validates resolver success and error output shape.

Initial status:

- future soft gate

### RESOLVER_ERROR_CODE_GATE

Validates that resolver errors use stable errorCode values.

Required errorCode family includes:

- `PACK_NOT_FOUND`
- `PACK_ID_DUPLICATE`
- `PACK_VERSION_CONFLICT`
- `PACK_DISCOVERY_FAILED`
- `PACK_CONTEXT_INCOMPLETE`
- `PACK_OUTPUT_COLLISION`
- `PACK_RESOLVER_INTERNAL_ERROR`

Initial status:

- future soft gate

### RESOLVER_UNKNOWN_PACK_GATE

Validates unknown pack behavior.

Expected rule:

- unknown pack failures must be explicit
- error behavior must not be silently downgraded

Initial status:

- future soft gate

### RESOLVER_PARTIAL_CONTEXT_GATE

Validates behavior when PackRuntimeContext is incomplete.

Expected rule:

- incomplete context should produce structured failure
- partial context must not produce misleading success

Initial status:

- future soft gate

## 11. CLI Compatibility Gates

CLI compatibility gates protect current user-facing behavior.

### CLI_LIST_PACKS_COMPAT_GATE

Protects `list-packs` behavior.

### CLI_INSPECT_PACK_COMPAT_GATE

Protects `inspect-pack` behavior.

### CLI_HELP_COMPAT_GATE

Protects help output compatibility.

### CLI_UNKNOWN_FLAG_COMPAT_GATE

Protects unknown flag behavior.

### CLI_STORY_PARITY_GATE

Protects `story` behavior.

### CLI_PACK_STORY_PARITY_GATE

Protects `pack-story` behavior.

M8.5 does not change any CLI behavior.

## 12. Smoke vs Soft Gate vs Hard Gate

### Smoke Gate

A smoke gate verifies that existing behavior still works.

Smoke gates should remain lightweight, deterministic, and fast.

### Soft Validation Gate

A soft validation gate detects and reports problems without failing CI.

Soft gates are appropriate when:

- the rule is newly introduced
- downstream behavior is not fully migrated
- false positives are still possible
- the rule depends on future resolver behavior

### Hard Validation Gate

A hard validation gate fails CI or release.

Hard gates are only appropriate when:

- the rule is stable
- false positives are unlikely
- migration is complete
- downstream consumers are compatible
- error semantics are stable

## 13. CI Integration Strategy

CI integration should follow a staged sequence.

### Stage 1 — Documentation Only

- documents exist
- references are updated
- no runtime behavior changes

### Stage 2 — Smoke Baseline

- boundary smoke passes
- contract smoke passes
- pack story parity passes

### Stage 3 — Soft Validation

- validation reports are generated
- CI remains green on violations
- violations are visible in logs

### Stage 4 — Hard Validation

- stable violations fail CI
- release process blocks invalid contracts
- migration notes are published

## 14. Error Reporting Strategy

Validation errors should be structured and stable.

A future validation report should include:

| Field | Meaning |
|---|---|
| `gateId` | Stable validation gate identifier |
| `severity` | info / warning / error |
| `errorCode` | Stable machine-readable code if applicable |
| `message` | Human-readable explanation |
| `source` | Document, pack, resolver, CLI, or runtime source |
| `path` | Field path or file path when available |
| `expected` | Expected contract value or behavior |
| `actual` | Observed value or behavior |
| `enforcement` | documentation / smoke / soft / hard |

## 15. Migration Sequence

### M8.5 — Validation Gate Design

- define gate taxonomy
- define enforcement levels
- consolidate M8.2 / M8.3 / M8.4
- no runtime behavior change

### M8.6 — First Soft Validation Smoke

- introduce non-blocking validation checks
- report contract gaps
- keep CI green

### M8.7 — Resolver Validation Prototype

- validate resolver input/output shape
- validate stable errorCode family
- keep validation soft

### M9.0 — Contract Enforcement Readiness

- decide which gates become hard
- publish migration notes
- preserve CLI compatibility

## 16. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Validation becomes too strict too early | Use soft gates first |
| CLI output changes unexpectedly | Keep CLI compatibility gates active |
| Downstream consumers depend on old shapes | Provide migration notes before hard gates |
| Multi-pack assumptions are incomplete | Keep discovery gates soft until implementation proves behavior |
| Error codes become unstable | Treat exposed errorCode values as compatibility-sensitive |

## 17. Future Work

Future work may include:

- machine-readable schema files
- validation report snapshots
- CI soft-gate summary output
- hard-gate promotion criteria
- resolver validation harness
- multi-pack fixture library
- downstream compatibility matrix
