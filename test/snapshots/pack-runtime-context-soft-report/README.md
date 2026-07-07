# PackRuntimeContext Soft Report Snapshots

## Purpose

This directory stores normalized PackRuntimeContext soft validation report snapshots for report output stability, snapshot comparison, strict mode readiness, and future hard gate readiness.

## Current Status

- **Initial snapshots generated** (M10.6).
- Snapshots are deterministic with fixed timestamps.
- Snapshots were generated through explicit `--update` CLI invocation.
- Snapshots are not wired into `check:all`, CI, doctor, or runtime.

## Current Snapshots

| Snapshot | Source Fixture | Expected Status | Primary Finding |
|---|---|---|---|
| `valid/minimal-valid.report.json` | `valid/minimal-valid.json` | pass | none |
| `invalid/context-not-object.report.json` | `invalid/context-not-object.json` | soft-fail | ERROR_CONTEXT_NOT_OBJECT |
| `edge/missing-contract-version.report.json` | `edge/missing-contract-version.json` | pass-with-info | INFO_CONTRACT_VERSION_ABSENT |

## Directory Layout

```
test/snapshots/pack-runtime-context-soft-report/
├── valid/
│   └── minimal-valid.report.json
├── invalid/
│   └── context-not-object.report.json
├── edge/
│   └── missing-contract-version.report.json
└── README.md
```

## Rules for Future Snapshot PRs

1. Snapshots must be normalized and deterministic.
2. `generatedAt` must be fixed (`1970-01-01T00:00:00.000Z`).
3. Result ordering must be stable.
4. Finding codes must be stable.
5. `gateId` values must be stable.
6. Path semantics must be stable.
7. Snapshot updates require intentional PRs.
8. Do not auto-update snapshots in CI.
9. Do not wire snapshot checks into `check:all` without separate approval.
10. Use explicit `--update` flag to write snapshot files.
11. Default behavior remains dry-run.
12. Orphan snapshots are never deleted automatically.

## Related Documents

- [docs/M10_FIXTURES_AND_SNAPSHOT_TEST_DESIGN.md](../../docs/M10_FIXTURES_AND_SNAPSHOT_TEST_DESIGN.md)
- [docs/M10_SNAPSHOT_WRITER_DESIGN.md](../../docs/M10_SNAPSHOT_WRITER_DESIGN.md)
- [docs/M9_SOFT_VALIDATION_PACKAGE_ENTRYPOINT_CHECKPOINT.md](../../docs/M9_SOFT_VALIDATION_PACKAGE_ENTRYPOINT_CHECKPOINT.md)
