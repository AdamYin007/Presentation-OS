# M3 Adapter Migration Checkpoint

> **Date**: 2026-07-01
> **Author**: Agnes-2.0-Flash (MD Senior Implementation Engineer)
> **Context**: Pre-PR31 checkpoint — before enabling adapters as the default rendering path
> **Governance**: RFC-0001 — this document records state only; no code changes

---

## 1 Summary

**Current State:**
- Adapter coverage: **16 / 16** slide types (100%)
- Legacy fallback: **preserved** in `run.js` (16 `registerLegacyRenderer()` calls)
- Default CLI: uses **legacy renderers** (adapter path skipped when `--layout-engine` not specified)
- `--layout-engine` path: uses **adapter-first** rendering with legacy fallback
- Dead renderer code: **removed** in PR30 (`dispatcher.js`, `dispatchLegacy()`)
- Duplicate planner entries: **cleaned** in PR30 (`roi`, `differentiation` were registered twice)
- No Core API changes across all PRs (PR23–PR30)
- No story JSON changes across all PRs
- No package file changes across all PRs

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

**Total commits:** 15 (including PR24 fix commit and PR29 audit commit)
**Total files created/modified:** 30+ across adapters, planners, registries, docs

---

## 3 Current Rendering Modes

### Default Path

```bash
node bin/run.js --story digital-pathology-15
```

- `useLayoutEngine = false`
- `compileLayoutPlan()` → no-op (returns null)
- `dispatchAdapter()` → no-op (returns false)
- `createRendererEngine` → always uses `legacyRenderer` callback
- **Result:** 100% legacy rendering

### Adapter Path

```bash
node bin/run.js --story digital-pathology-15 --layout-engine
```

- `useLayoutEngine = true`
- `compileLayoutPlan()` → produces layout plans for each slide
- `dispatchAdapter()` → tries ADAPTERS[slide.type] first
- If adapter exists → returns true (adapter rendered)
- If adapter not found → falls back to `legacyRenderer`
- **Result:** Adapter-first, legacy fallback

---

## 4 Why Legacy Fallback Is Still Preserved

1. **Default CLI compatibility:** Users running `node bin/run.js --story <name>` without flags expect the same output as before. Changing this would be a breaking change.

2. **Rollback safety:** If adapter default causes issues with any story, legacy renderers provide an immediate rollback path (simply remove `--layout-engine` flag).

3. **Unverified stories:** Only `digital-pathology-15` has been tested across both rendering paths. Other stories may have different slide types, different content, or different structural requirements that haven't been validated against adapters.

4. **PR31 is higher risk:** Enabling adapters by default changes the fundamental rendering behavior of the CLI. This should only happen after comprehensive validation.

---

## 5 PR31 Entry Criteria

Before enabling adapters as the default rendering path, the following must be verified:

1. **Inventory all story files:** List every `.json` file in `story/` directory.
2. **Legacy mode generation:** Generate PPTX for every story in default (legacy) mode. Confirm all succeed.
3. **Adapter mode generation:** Generate PPTX for every story with `--layout-engine`. Confirm all succeed.
4. **Slide count comparison:** For each story, confirm legacy and adapter produce identical slide counts.
5. **XML text extraction:** For each story, extract text from every slide in both legacy and adapter output. Confirm all match.
6. **Crash detection:** Confirm no story crashes under adapter mode (no unhandled exceptions, no missing adapters).
7. **Unknown slide type fallback:** Confirm stories with slide types not in ADAPTERS registry fall back to legacy gracefully.
8. **Cover footer behavior:** Acknowledge that cover adapter adds a footer while legacy cover does not (pre-existing difference, acceptable).
9. **Rollback flag:** Define a mechanism (CLI flag or environment variable) to revert to legacy default if adapter default causes issues.

---

## 6 Known Issues

| Issue | Severity | Status | Notes |
|---|---|---|---|
| Cover adapter adds footer, legacy does not | Low | Accepted | Pre-existing from PR23. Affects slide 1 only. |
| Some planners contain hardcoded content | Low | Intentional | `why-now`, `problem`, `governance`, `transformation`, `solution`, `architecture`, `roadmap` hardcode data matching legacy. This is correct for compatibility. |
| Content Engine not source of truth for all types | Low | Known | Only `executive-summary` has a dedicated Content Engine planner. Others use `generic` fallback or hardcoded content in adapters. |
| Legacy renderers still in `run.js` | Informational | By design | Preserved as fallback until PR32. |
| Default path not yet switched | Informational | By design | PR31 will address this. |
| Duplicate planner entries were cleaned | Resolved | Fixed | `roi` and `differentiation` were registered twice in `planner.js`. PR30 removed duplicates. |

---

## 7 Recommendation

**Do NOT enable adapters by default until PR31 validation passes across all stories.**

The safest sequence:

| PR | Scope | Risk |
|---|---|---|
| **PR31A** | All-story rendering validation audit | None (documentation only) |
| **PR31B** | Enable adapter default behind compatibility flag | Medium (behavior change) |
| **PR31C** | Remove legacy default path after validation | Low (cleanup) |
| **PR32** | Remove legacy renderer functions from run.js | Medium (code removal) |
| **PR33** | M3 completion note and documentation | None |

---

## Appendix: Git History

| Commit | Scope |
|---|---|
| `ba7b718` | refactor(renderer): remove dead dispatcher code (PR30) |
| `c802bc0` | docs: audit runjs legacy cleanup scope (PR29) |
| `d7f36ff` | feat(adapter): migrate architecture and roadmap renderers (PR28) |
| `fbeb838` | feat(adapter): migrate transformation and solution renderers (PR27) |
| `4e201d6` | feat(adapter): migrate roi and differentiation renderers (PR26) |
| `8c32b70` | feat(adapter): migrate governance, research and collaboration renderers (PR25) |
| `e963bd3` | fix(layout): hardcode why-now and problem planner content (PR24 fix) |
| `86f15d6` | feat(adapter): migrate why-now and problem renderers (PR24) |
| `ccacd5d` | feat(adapter): migrate generic and recommendation renderers (PR23) |
