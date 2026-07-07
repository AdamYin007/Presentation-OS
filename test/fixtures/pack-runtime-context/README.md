# PackRuntimeContext Fixtures

## Purpose

This directory stores canonical PackRuntimeContext validation fixtures for soft validation, snapshot testing, strict mode, and hard gate readiness.

## Current Status

- This directory is a **skeleton with minimal fixtures**.
- 3 fixture files added in M10.3.
- More fixtures will be added in future small PRs.
- Fixtures are not wired into `check:all`, CI, doctor, or runtime.

## Current Fixtures

| Fixture | Category | Intent | Expected Primary Finding |
|---|---|---|---|
| valid/minimal-valid.json | valid | smallest currently accepted PackRuntimeContext | none |
| invalid/context-not-object.json | invalid | valid JSON with non-object root | ERROR_CONTEXT_NOT_OBJECT |
| edge/missing-contract-version.json | edge | structurally valid context without contractVersion | INFO_CONTRACT_VERSION_ABSENT |

**Notes:**

- No snapshots are added in M10.3.
- Fixtures are not wired into `check:all` or CI.
- Expected behavior is based on the current soft validator skeleton.

## Directory Layout

```
test/fixtures/pack-runtime-context/
├── valid/
├── invalid/
├── edge/
└── README.md
```

## Fixture Categories

### valid

Future fixtures for:

- minimal valid PackRuntimeContext
- full valid PackRuntimeContext
- versioned valid PackRuntimeContext

### invalid

Future fixtures for:

- context not object
- missing required section
- missing required value
- reserved namespace used
- malformed contractVersion
- unsupported contractVersion
- deprecated contractVersion

### edge

Future fixtures for:

- empty object
- unknown extra fields
- null values
- optional fields omitted
- future-compatible metadata

## Rules for Future Fixture PRs

1. Add fixtures incrementally.
2. Keep each fixture small and readable.
3. One fixture should primarily test one behavior.
4. Invalid fixtures must map to expected finding codes.
5. Do not add snapshots in the same PR unless explicitly scoped.
6. Do not wire fixtures into `check:all` without separate approval.
7. Do not use `generatedAt`-dependent output in fixtures.
8. Document fixture intent in the PR body.

## Related Documents

- [docs/M10_FIXTURES_AND_SNAPSHOT_TEST_DESIGN.md](../../docs/M10_FIXTURES_AND_SNAPSHOT_TEST_DESIGN.md)
- [docs/M10_HARD_GATE_READINESS_DESIGN.md](../../docs/M10_HARD_GATE_READINESS_DESIGN.md)
- [docs/M9_SOFT_VALIDATION_PACKAGE_ENTRYPOINT_CHECKPOINT.md](../../docs/M9_SOFT_VALIDATION_PACKAGE_ENTRYPOINT_CHECKPOINT.md)
