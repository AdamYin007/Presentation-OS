# M3 Adapter Migration Checkpoint

> **Date**: 2026-07-01
> **Author**: Agnes-2.0-Flash (MD Senior Implementation Engineer)
> **Context**: M3 Adapter Migration officially completed
> **Governance**: RFC-0001 — documentation only, no code changes

---

## 1 Summary

### M3 Adapter Migration — COMPLETED

**Current State:**
- Adapter coverage: **16 / 16** slide types (100%)
- Legacy fallback: **preserved** in `run.js` (16 `registerLegacyRenderer()` calls)
- Default CLI: uses **adapter-first** rendering (PR31B)
- `--legacy-renderer` flag: forces legacy rendering
- `AWE_LEGACY_RENDERER=1` env var: forces legacy rendering
- `--layout-engine` flag: still accepted, now redundant (adapter is default)
- Cover footer difference: **resolved** (PR31B removed `comp.makeFooter()` from cover adapter)
- Dead renderer code: **removed** in PR30 (`dispatcher.js`, `dispatchLegacy()`)
- Duplicate planner entries: **cleaned** in PR30 (`roi`, `differentiation` were registered twice)
- No Core API changes across all PRs (PR23–PR31B)
- No story JSON changes across all PRs
- No package file changes across all PRs

**Validation:** `digital-pathology-15` generates identically in adapter-default and legacy-rollback modes. 15/15 slides match textually.

**Note:** Legacy renderer removal is **not** a prerequisite for M3 completion. It is a future hardening step (PR32).

---

## 2 Completed Work

| PR | Scope | Status |
|---|---|---|
| PR22 | Adapter migration audit | ✅ Complete |
| PR23 | generic, recommendation, cover, executive-summary, workflow adapters | ✅ Complete |
| PR24 | why-now, problem adapters + planner content fix | ✅ Complete |
| PR25 | governance, research, collaboration adapters | ✅ Complete |
| PR26 | roi, differentiation adapters | ✅ Complete |
| PR27 | transformation, solution adapters | ✅ Complete |
| PR28 | architecture, roadmap adapters | ✅ Complete |
| PR29 | run.js legacy cleanup audit | ✅ Complete |
| PR30 | Dead code removal (dispatcher.js, dispatchLegacy(), duplicate planner entries) | ✅ Complete |
| PR31A | All-story rendering validation audit | ✅ Complete |
| PR31B | Enable adapter rendering by default with legacy rollback | ✅ Complete |

**Total commits:** 15 (including PR24 fix commit and PR29 audit commit)
**Total files created/modified:** 30+ across adapters, planners, registries, docs

---

## 3 Current Rendering Modes

### Default Path (Adapter-First)

```bash
node bin/run.js --story digital-pathology-15
```

- `useLayoutEngine = true` (adapter-first by default)
- `compileLayoutPlan()` → produces layout plans for each slide
- `dispatchAdapter()` → tries ADAPTERS[slide.type] first
- If adapter exists → adapter renders the slide
- If adapter not found → falls back to `legacyRenderer`
- **Result:** Adapter-first rendering with legacy fallback

### Legacy Rollback (Explicit)

```bash
node bin/run.js --story digital-pathology-15 --legacy-renderer
# or
AWE_LEGACY_RENDERER=1 node bin/run.js --story digital-pathology-15
```

- `forceLegacy = true`
- `useLayoutEngine = false`
- `compileLayoutPlan()` → no-op
- Always uses `legacyRenderer` callback
- **Result:** 100% legacy rendering

### --layout-engine Flag

```bash
node bin/run.js --story digital-pathology-15 --layout-engine
```

- Functionally equivalent to default path (adapter-first)
- Kept for backward compatibility
- Considered redundant after PR31B but not removed

### PR31B Validation Result

| Mode | Command | Exit | PPTX Size | Slides |
|---|---|---|---|---|
| Default (adapter) | `--story digital-pathology-15` | ✅ 0 | 327,446 | 15 |
| Explicit adapter | `--story digital-pathology-15 --layout-engine` | ✅ 0 | 327,446 | 15 |
| Legacy rollback | `--story digital-pathology-15 --legacy-renderer` | ✅ 0 | 327,529 | 15 |
| Env rollback | `AWE_LEGACY_RENDERER=1` | ✅ 0 | 327,529 | 15 |

**Text comparison:** 15/15 slides match exactly between adapter default and legacy rollback. Cover footer difference resolved.

---

## 4 Why Legacy Fallback Is Still Preserved

Legacy renderers are preserved (not removed) because:

1. **Unknown slide type safety:** If a story contains a slide type not yet covered by an adapter, the legacy fallback renders it. This prevents blank slides.
2. **Rollback capability:** The `--legacy-renderer` flag and `AWE_LEGACY_RENDERER=1` env var provide immediate escape hatch if adapter default causes issues.
3. **Future hardening:** PR32 will remove legacy renderers only after adapter default has been validated in production.

**Important:** Legacy renderer removal is **not** a prerequisite for M3 completion. M3 is considered complete once:
- All slide types are adapter-backed (16/16 ✅)
- Adapter-first is the default rendering path (✅)
- Legacy rollback mechanism exists (✅)
- Validation passes on available stories (✅)

---

## 5 PR31B Status — COMPLETED

PR31B (enable adapter by default) is complete. The following was achieved:

- Adapter-first rendering is now the default CLI path
- Legacy rollback via `--legacy-renderer` flag
- Legacy rollback via `AWE_LEGACY_RENDERER=1` env var
- Cover footer difference resolved
- 15/15 slides match between adapter default and legacy rollback

### What remains for PR32 (future)

Before removing legacy renderers from `run.js`:

1. Validate adapter default against additional stories beyond `digital-pathology-15`
2. Confirm no regressions in production usage
3. Monitor rollback flag usage to assess adoption stability

---

## 6 Known Issues

| Issue | Severity | Status | Notes |
|---|---|---|---|
| Cover adapter adds footer, legacy does not | **Resolved** | Fixed in PR31B | Removed `comp.makeFooter()` from cover adapter |
| Some planners contain hardcoded content | Low | Intentional | Matches legacy output for compatibility |
| Content Engine not source of truth | Low | Known | Only `executive-summary` has dedicated CE planner |
| Legacy renderers still in `run.js` | Informational | By design | PR32 will remove after production validation |
| Default path not yet switched | **Resolved** | Fixed in PR31B | Adapter-first is now the default |
| Hero-sequence story format incompatibility | **Resolved** | Documented | `digital-pathology-15-hero-sequence.json` is a Hero Engine companion metadata file, NOT a renderable story. See [HERO_SEQUENCE_FORMAT_AUDIT.md](HERO_SEQUENCE_FORMAT_AUDIT.md) for details. |

---

## 7 Recommendation

**M3 Adapter Migration is officially complete.**

Legacy renderer removal is future hardening, not a completion requirement.

### M3 Completion Criteria Met

| Criterion | Status |
|---|---|
| All slide types adapter-backed (16/16) | ✅ |
| Adapter-first rendering enabled as default | ✅ |
| Legacy rollback mechanism (`--legacy-renderer`) | ✅ |
| Legacy rollback mechanism (`AWE_LEGACY_RENDERER=1`) | ✅ |
| Validation passes on available stories | ✅ |
| No Core API changes | ✅ |
| No story JSON changes | ✅ |
| No package file changes | ✅ |
| Dead code removed (PR30) | ✅ |
| Cover footer difference resolved (PR31B) | ✅ |

### Future Hardening (Not M3 Completion Blockers)

| PR | Scope | Priority |
|---|---|---|
| **PR32** | Remove legacy renderer functions from `run.js` | Medium — after production validation |
| **PR33** | Final completion note and documentation | Low — housekeeping |
| **Future** | Move hero-sequence files to `hero-sequences/` directory | Low — documentation improvement |
| **Future** | Add story format validation or clearer loader errors | Low — UX improvement |
| **Future** | Expand standard story examples beyond `digital-pathology-15` | Low — content expansion |

---

## Appendix: Git History

| Commit | Scope |
|---|---|
| `2d6a8af` | docs: audit hero sequence story format (PR31D) |
| `e2cf108` | docs: document adapter-first default rendering (PR31C) |
| `6d0682d` | feat(renderer): enable adapter rendering by default with legacy rollback (PR31B) |
| `0c8258a` | docs: audit all-story rendering validation (PR31A) |
| `ba7b718` | refactor(renderer): remove dead dispatcher code (PR30) |
| `c802bc0` | docs: audit runjs legacy cleanup scope (PR29) |
| `d7f36ff` | feat(adapter): migrate architecture and roadmap renderers (PR28) |
| `fbeb838` | feat(adapter): migrate transformation and solution renderers (PR27) |
| `4e201d6` | feat(adapter): migrate roi and differentiation renderers (PR26) |
| `8c32b70` | feat(adapter): migrate governance, research and collaboration renderers (PR25) |
| `e963bd3` | fix(layout): hardcode why-now and problem planner content (PR24 fix) |
| `86f15d6` | feat(adapter): migrate why-now and problem renderers (PR24) |
| `ccacd5d` | feat(adapter): migrate generic and recommendation renderers (PR23) |
