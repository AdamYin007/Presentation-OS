# IP & Security Audit Report

**Repository**: AdamYin007/Presentation-OS
**Date**: 2026-07-21
**Auditor**: Agnes-2.5-Flash (Hermes Agent)
**Branch**: chore/ip-protection-hardening (from develop@3b2d229)

---

## 1. Repository Overview

| Item | Value |
|------|-------|
| Full Name | AdamYin007/Presentation-OS |
| Visibility | **PUBLIC** ⚠️ |
| Default Branch | develop |
| Owner Type | Personal account (AdamYin007) |
| Fork Count | 0 |
| Has Issues | Yes |
| Has Wiki | Yes |
| Has Downloads | Yes |
| Has Pages | No |
| Archived | No |
| Disabled | No |

### Merge Settings

| Setting | Value |
|---------|-------|
| Squash Merge | Allowed |
| Merge Commit | Allowed |
| Rebase Merge | Allowed |
| Auto Delete Branch | **Disabled** ⚠️ |
| Fork Syncing | Disabled |

---

## 2. Branch Protection Status

### develop Branch (API: `/branches/{name}/protection`)

| Rule | Current State | Required State | Status |
|------|--------------|----------------|--------|
| Enforce Admins | ✅ Enabled | ✅ Enabled | OK |
| Required Linear History | ✅ Enabled | ✅ Enabled | OK |
| Allow Force Pushes | ❌ Disabled | ❌ Disabled | OK |
| Allow Deletions | ❌ Disabled | ❌ Disabled | OK |
| Required Pull Request Reviews | **Not Configured** ⚠️ | ≥1 Approver + Code Owner | **MISSING** |
| Require Code Owner Reviews | Not Set | ✅ Required | **MISSING** |
| Require Last Push Approval | Not Set | ✅ Required | **MISSING** |
| Required Conversation Resolution | Not Set | ✅ Required | **MISSING** |
| Required Signatures | ❌ Disabled | ✅ Required | **MISSING** |

### Rulesets

**None configured.** No repository-level rulesets exist.

---

## 3. Secret Scanning & Dependabot

| Feature | Status | Notes |
|---------|--------|-------|
| Secret Scanning | ⚠️ Cannot verify via API (404) | May require org-level enablement |
| Dependabot Settings | ⚠️ Cannot verify via API (404) | May require org-level enablement |
| Actions Permissions | Enabled, all actions allowed | Should restrict to selected actions for production |

---

## 4. Existing Protection Files

| File | Status |
|------|--------|
| LICENSE | ✅ EXISTS — **MIT License (Copyright AWE Team)** ⚠️ |
| CONTRIBUTING.md | ✅ EXISTS — Basic version, lacks IP/review requirements |
| NOTICE.md | ❌ MISSING |
| SECURITY.md | ❌ MISSING |
| .github/CODEOWNERS | ❌ MISSING |
| .github/pull_request_template.md | ❌ MISSING |
| docs/IP_SECURITY_AUDIT.md | ❌ MISSING |
| docs/IP_PROTECTION_BASELINE.md | ❌ MISSING |

---

## 5. Sensitive File Scan

### Files Found

| File | Risk Level | Content Type | Status |
|------|-----------|--------------|--------|
| `.env.example` | 🟡 Low | Demo keys (`demo-key-123`, `test-key-456`) | Placeholder only, acceptable |
| `scripts/.env.test` | 🔴 High | **Stripe test secrets** (`sk_test_...`, `whsec_...`, `pk_test_...`) | **Must be removed/rotated** |

### Detailed Findings

**`scripts/.env.test`** contains:
- `STRIPE_SECRET_KEY=sk_tes...2mno` — Stripe test secret key
- `STRIPE_WEBHOOK_SECRET=whsec_abc123def456ghi789jkl012mno` — Webhook signing secret
- `STRIPE_PUBLISHABLE_KEY=pk_test_abc123def456ghi789jkl012mno` — Publishable key

⚠️ **Action Required**: These must be revoked/rotated in Stripe Dashboard even if test keys. The file must be added to `.gitignore` and removed from staging area.

---

## 6. License Analysis

### Current License: MIT

```
MIT License — Copyright (c) 2026 AWE Team
```

**Risk Assessment**:
- If this is core commercial/closed-source code, MIT is **incompatible** with proprietary restrictions
- MIT grants unrestricted rights to use, copy, modify, merge, publish, distribute, sublicense, and sell
- Anyone can fork, redistribute, and commercially exploit this code under MIT terms

**Recommendation**: Replace with proprietary license if code is intended to remain closed-source.

---

## 7. Git History — Deleted Sensitive Files

Check for files that were previously committed then deleted but may still exist in history.

**Status**: Not fully scanned yet. Recommend running `git log --all --diff-filter=D --name-only` in follow-up.

---

## 8. Risk Summary

| # | Risk | Severity | Priority |
|---|------|----------|----------|
| 1 | Repository is PUBLIC with potentially commercial code | 🔴 Critical | P0 |
| 2 | MIT License grants open-source rights to proprietary code | 🔴 Critical | P0 |
| 3 | Stripe test secrets in `scripts/.env.test` | 🔴 High | P0 |
| 4 | No PR review / Code Owner requirements | 🟠 Medium | P1 |
| 5 | No CODEOWNERS file | 🟠 Medium | P1 |
| 6 | No SECURITY.md disclosure policy | 🟡 Low | P2 |
| 7 | No NOTICE.md / IP evidence docs | 🟡 Low | P2 |
| 8 | No commit signature requirement | 🟡 Low | P2 |
| 9 | No repository rulesets | 🟡 Low | P2 |

---

## 9. Recommended Actions (This PR)

1. Replace MIT License with proprietary license
2. Remove `scripts/.env.test` from tracking, add to `.gitignore`
3. Create NOTICE.md, SECURITY.md, CODEOWNERS, PR template
4. Enhance CONTRIBUTING.md with IP/review requirements
5. Create IP protection docs (audit, baseline, evidence, registration, infringement, trademark)
6. Create IP evidence packaging script
7. Configure GitHub branch protection (PR review, code owners, signatures)
8. Set Actions permissions to read-only by default
9. Enable auto-delete branches on merge
10. Create Draft PR for review

---

*This audit does not constitute legal advice. All license changes should be reviewed by qualified legal counsel.*
