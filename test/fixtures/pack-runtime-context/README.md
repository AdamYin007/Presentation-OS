# PackRuntimeContext Fixtures

## Purpose

This directory stores canonical PackRuntimeContext validation fixtures for soft validation, snapshot testing, strict mode, and hard gate readiness.

## Current Status

- This directory is a **skeleton only**.
- No fixture JSON files are added in M10.2.
- Fixture contents will be added in future small PRs.
- Fixtures are not wired into `check:all`, CI, doctor, or runtime.

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
