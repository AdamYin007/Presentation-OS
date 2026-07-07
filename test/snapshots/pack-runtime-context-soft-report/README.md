# PackRuntimeContext Soft Report Snapshots

## Purpose

This directory stores normalized PackRuntimeContext soft validation report snapshots for report output stability, snapshot comparison, strict mode readiness, and future hard gate readiness.

## Current Status

- This directory is a **skeleton only**.
- No snapshot JSON files are added in M10.2.
- Snapshot contents will be added only after fixture contents and normalization rules are stable.
- Snapshots are not wired into `check:all`, CI, doctor, or runtime.

## Directory Layout

```
test/snapshots/pack-runtime-context-soft-report/
├── valid/
├── invalid/
├── edge/
└── README.md
```

## Snapshot Categories

### valid

Future snapshots for expected soft reports from valid fixtures.

### invalid

Future snapshots for expected soft reports from invalid fixtures.

### edge

Future snapshots for expected soft reports from edge fixtures.

## Rules for Future Snapshot PRs

1. Snapshots must be normalized and deterministic.
2. `generatedAt` must be fixed or disabled.
3. Result ordering must be stable.
4. Finding codes must be stable.
5. `gateId` values must be stable.
6. Path semantics must be stable.
7. Snapshot updates require intentional PRs.
8. Do not auto-update snapshots in CI.
9. Do not wire snapshot checks into `check:all` without separate approval.

## Related Documents

- [docs/M10_FIXTURES_AND_SNAPSHOT_TEST_DESIGN.md](../../docs/M10_FIXTURES_AND_SNAPSHOT_TEST_DESIGN.md)
- [docs/M10_HARD_GATE_READINESS_DESIGN.md](../../docs/M10_HARD_GATE_READINESS_DESIGN.md)
- [docs/M9_SOFT_VALIDATION_PACKAGE_ENTRYPOINT_CHECKPOINT.md](../../docs/M9_SOFT_VALIDATION_PACKAGE_ENTRYPOINT_CHECKPOINT.md)
