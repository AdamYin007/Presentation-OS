# IP Protection Baseline Snapshot

**Snapshot Time**: 2026-07-21
**Branch**: chore/ip-protection-hardening (created from develop@3b2d229)
**Purpose**: Record pre-change state for rollback reference

---

## Pre-Change State

| Item | Value |
|------|-------|
| HEAD Commit | `3b2d229 feat(m12-23): Desktop App Launcher MVP (#119)` |
| Default Branch | `develop` |
| Repository Visibility | **PUBLIC** ⚠️ |
| Owner | AdamYin007 (Personal account) |
| Forks | 0 |
| Existing Tags | m7-0 through m8-2, presentation-os-v1.0 |
| Releases | None |

### Existing Protection Files (Before Change)

| File | Status | Notes |
|------|--------|-------|
| LICENSE | ✅ Exists | MIT License, Copyright AWE Team |
| CONTRIBUTING.md | ✅ Exists | Basic version, no IP/review rules |
| NOTICE.md | ❌ Missing | — |
| SECURITY.md | ❌ Missing | — |
| .github/CODEOWNERS | ❌ Missing | — |
| .github/pull_request_template.md | ❌ Missing | — |
| docs/IP_SECURITY_AUDIT.md | ❌ Missing | — |
| docs/IP_PROTECTION_BASELINE.md | ❌ Missing | This file |

### Branch Protection (Before Change)

| Rule | Value |
|------|-------|
| Enforce Admins | Enabled |
| Required Linear History | Enabled |
| Force Pushes | Disabled |
| Allow Deletions | Disabled |
| Required PR Reviews | **Not Configured** |
| Code Owner Reviews | Not Required |
| Last Push Approval | Not Required |
| Conversation Resolution | Not Required |
| Commit Signatures | Not Required |

### Rulesets

**None configured.**

### Actions Permissions

Enabled, all actions allowed.

### Fork Settings

- `allow_forking`: true
- `delete_branch_on_merge`: false

### Sensitive Files Found

| File | Risk | Content |
|------|------|---------|
| `scripts/.env.test` | 🔴 High | Stripe test keys (`sk_test_*`, `whsec_*`, `pk_test_*`) |
| `.env.example` | 🟡 Low | Demo placeholders only |

### Git History Deleted Sensitive Files

**Not scanned yet** — recommended follow-up: `git log --all --diff-filter=D --name-only`

---

## Rollback Reference

To revert all changes from this PR:
```bash
# After PR is merged, revert on develop:
git revert <merge-commit-hash>
# Or if not merged yet:
git checkout develop && git reset --hard 3b2d229
```

---

*This baseline records the state BEFORE any modifications. All changes made in this branch should be reversible via the PR process.*
