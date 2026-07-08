# M11.7 Strict Mode Validation Matrix & Checkpoint

## 1. Purpose

Freeze the current behavior of the strict mode library and CLI. Establish a
deterministic validation matrix that serves as the ground truth before CI
integration.

**Scope**: This checkpoint documents the behavior of:
- `pack-runtime-context-strict-validator.js` (library)
- `pack-runtime-context-strict-policy.js` (policy)
- `validate-pack-runtime-context.cjs` (CLI)

**Not in scope**: CI required checks, package.json scripts, branch protection,
snapshot comparator integration, or runtime resolver changes.

## 2. Frozen Validation Matrix

| Fixture | Soft Status | Soft Exit | Strict Status | Strict Blocking | Strict Exit |
|---------|-------------|-----------|---------------|-----------------|-------------|
| `minimal-valid.json` | `pass` | 0 | `pass` | false | 0 |
| `context-not-object.json` | `soft-fail` | 0 | `hard-fail` | true | 1 |
| `missing-contract-version.json` | `pass-with-info` | 0 | `pass-with-info` | false | 0 |

### Verification

All three fixtures verified against both library and CLI:

```
minimal-valid.json:
  library: soft=pass, strict=pass, strictBlocking=false
  cli: softExit=0, strictExit=0

context-not-object.json:
  library: soft=soft-fail, strict=hard-fail, strictBlocking=true
  cli: softExit=0, strictExit=1

missing-contract-version.json:
  library: soft=pass-with-info, strict=pass-with-info, strictBlocking=false
  cli: softExit=0, strictExit=0
```

## 3. Finding Policy Matrix

| Finding Code | Severity | Soft Blocking | Strict Blocking |
|--------------|----------|---------------|-----------------|
| `ERROR_CONTEXT_NOT_OBJECT` | error | false | **true** |
| `INFO_CONTRACT_VERSION_ABSENT` | info | false | false |
| `WARN_CONTRACT_SECTION_MISSING` | warning | false | false |
| `WARN_CONTRACT_VERSION_MALFORMED` | warning | false | false |
| `WARN_RESERVED_NAMESPACE_USED` | warning | false | false |
| *any unknown code* | — | false | false |

**Rule**: `ERROR_CONTEXT_NOT_OBJECT` is the **only** strict-mode blocking
finding in policy version 1. All other findings (warning, info, unknown) are
non-blocking.

## 4. CLI Contract Freeze

### Supported Parameters

| Parameter | Behavior |
|-----------|----------|
| `--fixture <path>` | Required. Path to PackRuntimeContext fixture JSON. |
| `--strict` | Enable strict mode (default: soft). |
| `--soft` | Explicitly enable soft mode. |
| `--json` | Output structured JSON result. |
| `--compact` | Compact JSON (single line, only with `--json`). |
| `--help` | Display usage and exit 0. |

### Mutually Exclusive

| Conflict | Error |
|----------|-------|
| `--strict` + `--soft` | exit 1 |
| `--compact` without `--json` | exit 1 |

### Explicitly Rejected (exit 1)

| Parameter | Reason |
|-----------|--------|
| `--update` | Read-only CLI |
| `--write` | Read-only CLI |
| `--fix` | Read-only CLI |
| `--delete` | Read-only CLI |
| `--repair` | Read-only CLI |
| `--all` | Read-only CLI |

## 5. Exit Code Freeze

### Soft Mode

| Status | Exit Code |
|--------|-----------|
| `pass` | 0 |
| `pass-with-info` | 0 |
| `soft-fail` | 0 |
| parse/read/internal/CLI error | 1 |

**Principle**: Soft mode never blocks. All validation results exit 0 unless
there is an infrastructure error.

### Strict Mode

| Status | Exit Code |
|--------|-----------|
| `pass` | 0 |
| `pass-with-info` | 0 |
| `hard-fail` | 1 |
| parse/read/internal/CLI error | 1 |

**Principle**: Strict mode enforces policy. Only `hard-fail` exits 1.

## 6. Failure Domain Separation

| Domain | Source | Behavior |
|--------|--------|----------|
| `validation` | strict validator | Reports strict pass/fail with blocking findings |
| `snapshot-verification` | snapshot comparator | Reports drift between expected and actual snapshots |

**Key**: Comparator drift ≠ strict hard-fail. These are separate failure
domains that must have separate CI check names in future integration.

## 7. Determinism Guarantees

| Guarantee | Verified |
|-----------|----------|
| Repeated library output deep equal | ✅ |
| Serialized output byte equal | ✅ |
| Repeated CLI JSON output byte equal | ✅ |
| Formatter output deterministic | ✅ |
| No timestamp/random/environment dependence | ✅ |
| Stable finding order | ✅ |
| No absolute path leakage in output | ✅ |

## 8. Read-Only Guarantees

| Guarantee | Verified |
|-----------|----------|
| No fixture modification | ✅ |
| No snapshot modification | ✅ |
| No write/update/delete API in CLI | ✅ |
| No `.validation/` directory created | ✅ |
| No snapshot/comparator import in strict validator | ✅ |
| No snapshot/comparator import in CLI | ✅ |

## 9. Immutability Guarantees

| Guarantee | Verified |
|-----------|----------|
| Input object unchanged after validation | ✅ |
| Options object unchanged after validation | ✅ |
| Soft report unchanged after strict processing | ✅ |
| Policy rules deep frozen | ✅ |

## 10. Known Non-Goals

| Item | Status |
|------|--------|
| package.json script entry | Not implemented |
| check:all integration | Not implemented |
| doctor integration | Not implemented |
| CI hard gate / required check | Not implemented |
| Branch protection | Not implemented |
| Required check | Not implemented |
| Bypass mechanism | Not implemented |
| JSON allowlist | Not implemented (JS policy module is sole runtime authority) |

## 11. Risks Before CI Integration

| Risk | Description | Mitigation |
|------|-------------|------------|
| False positive | Unknown finding codes treated as non-blocking when they should be blocking | Policy audit on new finding codes |
| Accidental strict activation | Soft mode defaults; strict must be explicit via `--strict` | Code review, documentation |
| Required-check deadlock | If strict mode becomes a required check, soft-fail fixtures will block PRs | Use non-required advisory mode |
| Soft/strict status drift | Changes to soft validator could change strict mode indirectly | Regression tests in check script |
| Unknown finding promotion | New finding codes default to non-blocking | Policy review process |
| Policy version drift | `STRICT_POLICY_VERSION` must increment on classification changes | Version check in policy module |
| CLI behavior drift | CLI exit codes or output format changes | Snapshot tests in check script |

## 12. Recommended Next Step

### M11.8 CI Informational Design

Design a non-required CI check that:
- Runs strict validation as **allowed-to-fail** or **advisory**
- Separates `validation` check from `snapshot-comparator` check
- Does NOT enforce branch protection
- Reports findings without blocking merges

This allows teams to adopt strict validation gradually without hard gates.
