# M10.10 Snapshot Comparator Validation & Checkpoint

## 1. Purpose

This document records the stable state of the M10.9 Snapshot Comparator CLI and establishes a validation baseline for future hard gate integration.

M10.10 is documentation + validation only. It freezes the current comparator behavior as a checkpoint reference. It does NOT:
- Modify the comparator module
- Modify the comparator CLI
- Modify any fixture or snapshot
- Modify package.json
- Wire anything into check:all, doctor, or CI
- Implement hard gate

## 2. Validation Scope

This checkpoint validates the following comparator behaviors:

| Area | Verified |
|------|----------|
| Single fixture compare | ✅ `--fixture <path>` |
| Compare all | ✅ `--all` |
| Semantic comparison | ✅ JSON object equality |
| Byte comparison | ✅ Serialized byte equality |
| Orphan detection | ✅ `--detect-orphans` |
| Deterministic ordering | ✅ Fixture discovery sorted |
| Deterministic output | ✅ Repeated execution byte-identical |

## 3. Supported Status Matrix

The comparator recognizes the following status values:

| Status | Meaning | Exit Code |
|--------|---------|-----------|
| `MATCH` | semantic equal + byte equal | 0 |
| `MISSING_SNAPSHOT` | fixture exists, snapshot file does not | 1 |
| `INVALID_SNAPSHOT_JSON` | snapshot file exists but is not valid JSON | 1 |
| `CONTENT_DRIFT` | semantic JSON differs | 1 |
| `FORMAT_DRIFT` | semantic equal, bytes differ | 1 |
| `ORPHAN_SNAPSHOT` | snapshot without matching fixture | 1 |
| `FIXTURE_READ_ERROR` | cannot read fixture file | 1 |
| `FIXTURE_JSON_ERROR` | fixture is not valid JSON | 1 |
| `CANDIDATE_GENERATION_ERROR` | snapshot writer failed | 1 |
| `INTERNAL_ERROR` | comparator implementation error | 1 |

## 4. Fixture Validation Matrix

Three canonical fixtures are validated against committed snapshots:

### 4.1 valid/minimal-valid.json

| Property | Value |
|----------|-------|
| Comparator status | `match` |
| Report status | `pass` |
| semanticEqual | `true` |
| byteEqual | `true` |
| expectedBytes | 605 |
| actualBytes | 605 |
| differences | `[]` |

### 4.2 invalid/context-not-object.json

| Property | Value |
|----------|-------|
| Comparator status | `match` |
| Report status | `soft-fail` |
| semanticEqual | `true` |
| byteEqual | `true` |
| expectedBytes | 1190 |
| actualBytes | 1190 |
| differences | `[]` |

**Note:** `soft-fail` is a report status, not a comparator failure. The comparator correctly returns `match` because the candidate report byte-for-byte equals the committed snapshot.

### 4.3 edge/missing-contract-version.json

| Property | Value |
|----------|-------|
| Comparator status | `match` |
| Report status | `pass-with-info` |
| semanticEqual | `true` |
| byteEqual | `true` |
| expectedBytes | 1283 |
| actualBytes | 1283 |
| differences | `[]` |

## 5. CLI Contract Freeze

### 5.1 Supported Flags

| Flag | Behavior |
|------|----------|
| `--fixture <path>` | Compare single fixture against snapshot |
| `--all` | Compare all fixtures deterministically |
| `--json` | Output structured JSON |
| `--compact` | Compact JSON (single line, requires `--json`) |
| `--detect-orphans` | Detect orphan snapshots (enabled by default with `--all`) |
| `--help` | Show usage and exit 0 |

### 5.2 Rejected Flags

| Flag | Behavior |
|------|----------|
| `--update` | Rejected — read-only CLI |
| `--write` | Rejected — read-only CLI |
| `--fix` | Rejected — read-only CLI |
| `--delete-orphans` | Rejected — read-only CLI |
| `--repair` | Rejected — read-only CLI |
| `--unknown` | Rejected — unknown option |

All rejected flags exit with code 1 and a clear error message.

### 5.3 Mutually Exclusive Flags

| Conflict | Behavior |
|----------|----------|
| `--fixture` + `--all` | Rejected — mutually exclusive |
| `--compact` without `--json` | Rejected — compact requires JSON |

## 6. Read-Only Guarantee

The comparator (module + CLI) NEVER:
- Writes snapshot files
- Updates snapshot files
- Deletes snapshot files
- Repairs snapshot files
- Modifies fixture files
- Creates new directories
- Calls `writeSnapshotReport()`
- Invokes snapshot writer update mode

## 7. Determinism Guarantee

The comparator guarantees deterministic behavior:

| Aspect | Guarantee |
|--------|-----------|
| Fixture discovery | Sorted alphabetically by path |
| Compare-all ordering | Deterministic iteration order |
| JSON output | Stable field ordering |
| Repeated execution | Byte-identical output |
| No timestamps | No current time in output |
| No random IDs | No random values |
| No machine paths | No absolute paths in output |

## 8. Orphan Policy

Orphan snapshot behavior:

| Aspect | Policy |
|--------|--------|
| Detection | Scanned when `--detect-orphans` is enabled (default with `--all`) |
| Reporting | Listed in summary and structured output |
| Exit code | `exit 1` on orphan detection |
| Deletion | Never automatic — requires intentional PR |
| Exclusions | `.gitkeep` and `README.md` are not counted as orphans |

## 9. Relationship to Hard Gate

**Comparator failure ≠ hard gate failure.**

- Snapshot comparator verifies output contract stability
- Hard gate enforcement requires separate `strict-mode` and finding promotion design
- Snapshot stability is a hard gate prerequisite, not the hard gate itself
- M10.10 remains in the validation foundation layer

## 10. Future Hard Gate Requirements

Before hard gate integration, the following prerequisites must be met:

1. **Stable snapshots** — comparator consistently passes across iterations
2. **Reviewed drift policy** — documented process for handling content/format drift
3. **CI integration proposal** — separate PR for non-required CI check
4. **Required check proposal** — separate PR after branch protection assessment
5. **Approval workflow** — documented process for accepting drift vs rejecting regressions

## 11. Checkpoint Conclusion

M10.10 freezes the comparator behavior as validated by M10.9. All three canonical fixtures produce `match` status with correct report preservation (pass, soft-fail, pass-with-info). The CLI is read-only, deterministic, and isolated from package.json, check:all, doctor, CI, strict mode, and hard gates.

The next step after this checkpoint is either:
- Hard gate integration (requires separate design PR)
- Or continued validation foundation work

This checkpoint serves as the baseline for comparing future comparator behavior changes.
