# M8.10 Validation Checkpoint

## 1. Purpose

This checkpoint summarizes the M8 Pack Runtime validation hardening line from M8.2 through M8.9.

It records the current contract documentation, validation smoke checks, doctor integration, script entrypoints, and CI status before moving toward M9 hard validation work.

## 2. Scope

M8.10 is a checkpoint document.

It does not introduce:

- runtime behavior changes
- CLI behavior changes
- JSON schema files
- hard validation gates
- resolver implementation changes
- multi-pack discovery implementation changes

## 3. Completed M8 Milestones

| Milestone | Status | Summary |
|---|---:|---|
| M8.2 PackRuntimeContext Contract Schema | Complete | Defines the PackRuntimeContext contract, required sections, required values, immutability, compatibility, and future schema gates |
| M8.3 Multi-Pack Discovery Assumptions | Complete | Defines assumptions for discovery ordering, duplicate pack ids, version conflict handling, and output path collision behavior |
| M8.4 Resolver Boundary & Error Semantics | Complete | Defines resolver ownership, input/output contract, error taxonomy, and stable errorCode semantics |
| M8.5 Validation Gates & Contract Enforcement | Complete | Defines documentation, smoke, soft validation, and hard validation gate categories |
| M8.6 First Docs Smoke Check | Complete | Adds a lightweight script to verify canonical M8 docs paths and prevent misplaced registry/docs copies |
| M8.7 Doctor Integration | Complete | Wires the M8 docs smoke check into `awe doctor` |
| M8.8 Validation Script Entrypoints | Complete | Adds standard npm validation entrypoints |
| M8.9 GitHub Actions Check | Complete | Adds a GitHub Actions workflow that runs the standard validation entrypoint |

## 4. Canonical M8 Design Documents

The canonical M8 design documents are:

- `docs/M8_PACK_RUNTIME_CONTEXT_CONTRACT_SCHEMA.md`
- `docs/M8_MULTI_PACK_DISCOVERY_ASSUMPTIONS_DESIGN.md`
- `docs/M8_RESOLVER_BOUNDARY_ERROR_SEMANTICS_DESIGN.md`
- `docs/M8_VALIDATION_GATES_CONTRACT_ENFORCEMENT_DESIGN.md`

These files must remain under `docs/`.

Misplaced copies under `registry/docs/` are not valid canonical documents.

## 5. Current Validation Entrypoints

| Entrypoint | Purpose |
|---|---|
| `npm run check:m8-docs` | Runs the M8 docs smoke check directly |
| `npm run check` | Runs the default validation entrypoint |
| `npm run check:docs` | Runs documentation validation |
| `npm run check:all` | Runs M8 docs smoke and doctor |
| `npm run doctor` | Runs AWE doctor, including M8 docs smoke |

## 6. GitHub Actions Status

M8.9 introduced:

- `.github/workflows/check.yml`

The workflow runs:

- `npm ci`
- `npm run check:all`

The workflow runs on:

- pull requests targeting `develop`
- pushes to `develop`

## 7. Doctor Workspace Contract

The current doctor check expects the following workspace paths to exist:

- `package.json`
- `packages/cli/src/index.js`
- `registry`
- `skills`
- `workflows`
- `factories`
- `prompts`
- `docs`
- `tests`
- M8 docs smoke

Empty workspace directories required by doctor are tracked with `.gitkeep` where needed so CI matches the local workspace contract.

## 8. M8 Docs Smoke Contract

The M8 docs smoke check verifies:

### Required canonical docs

- `docs/M8_PACK_RUNTIME_CONTEXT_CONTRACT_SCHEMA.md`
- `docs/M8_MULTI_PACK_DISCOVERY_ASSUMPTIONS_DESIGN.md`
- `docs/M8_RESOLVER_BOUNDARY_ERROR_SEMANTICS_DESIGN.md`
- `docs/M8_VALIDATION_GATES_CONTRACT_ENFORCEMENT_DESIGN.md`

### Forbidden misplaced docs

- `registry/docs/M8_PACK_RUNTIME_CONTEXT_CONTRACT_SCHEMA.md`
- `registry/docs/M8_MULTI_PACK_DISCOVERY_ASSUMPTIONS_DESIGN.md`
- `registry/docs/M8_RESOLVER_BOUNDARY_ERROR_SEMANTICS_DESIGN.md`
- `registry/docs/M8_VALIDATION_GATES_CONTRACT_ENFORCEMENT_DESIGN.md`

## 9. Current Enforcement Level

M8 validation is currently at smoke-check level.

The current system enforces:

- canonical M8 document presence
- absence of misplaced M8 registry docs
- doctor-required workspace structure
- standard validation script entrypoints
- CI execution of `npm run check:all`

The current system does not enforce:

- PackRuntimeContext field-level schema validation
- multi-pack discovery behavior
- resolver error semantics at runtime
- hard validation gates
- release-blocking contractVersion checks

## 10. M9 Readiness Boundary

M8.10 marks the end of the M8 documentation and smoke validation line.

M9 work may begin only after preserving the following constraints:

1. Keep current smoke checks green.
2. Keep `npm run check:all` as the standard validation entrypoint.
3. Keep `awe doctor` compatible with current output expectations.
4. Introduce soft validation before hard validation.
5. Avoid changing CLI behavior while introducing schema checks.
6. Keep errorCode semantics stable once exposed.
7. Avoid implementing multi-pack behavior without deterministic fixture coverage.

## 11. Recommended Next Steps

Recommended M9 sequence:

1. M9.0 Contract Version Readiness Design
2. M9.1 PackRuntimeContext Soft Schema Validator
3. M9.2 Resolver ErrorCode Soft Validation
4. M9.3 Multi-Pack Fixture Library
5. M9.4 CI Soft Validation Report
6. M9.5 Hard Gate Promotion Criteria

## 12. Checkpoint Validation

Before merging this checkpoint, run:

```bash
npm run check:all
```
