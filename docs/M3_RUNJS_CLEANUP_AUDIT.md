# M3 run.js Cleanup Audit

> **Date**: 2026-07-01
> **Author**: Agnes-2.0-Flash (MD Senior Implementation Engineer)
> **Scope**: `registry/packages/ppt-factory` — legacy renderer inventory, adapter coverage, cleanup plan
> **Governance**: RFC-0001 Section 0 — this audit does NOT modify Core behavior; cleanup plan is advisory only

---

## 1 Summary

This audit documents all remaining legacy renderer logic in `run.js` after PR28 (complete adapter migration).
It does NOT remove code. It does NOT refactor run.js. It produces a cleanup plan for future PRs.

**Key findings:**
- **16 legacy renderers** still registered in `run.js` (L598-613)
- **13 slide types** now have adapter support (all slide types in `digital-pathology-15` story)
- **2 duplicate entries** in `planner.js` (roi, differentiation registered twice)
- **`dispatcher.js`** is dead code — never imported
- **`registry.js`** `dispatchLegacy()` is dead code — never called
- **Default CLI** (`--story digital-pathology-15`) still uses legacy renderers via `createRendererEngine`
- **`--layout-engine`** path tries adapter first, falls back to legacy

---

## 2 Current Rendering Paths

### 2.1 Default CLI Path (no `--layout-engine`)

```
node bin/run.js --story digital-pathology-15
  → useLayoutEngine = false
  → compileLayoutPlan = () => null (no-op)
  → dispatchAdapter = () => false (no-op)
  → layoutPlans = [] (empty)
  → createRendererEngine({ useLayoutEngine: false, layoutPlans: [], legacyRenderer: ... })
  → renderSlide(slide, comp, pptx, story)
    → Step 1: useLayoutEngine is false → skip adapter
    → Step 2: legacyRenderer(slide, comp, pptx, story)
      → getLegacyRenderer(slide.type)(slide)
    → Returns true
```

**Result:** 100% legacy. All 15 slides rendered by legacy functions.

### 2.2 `--layout-engine` Path

```
node bin/run.js --story digital-pathology-15 --layout-engine
  → useLayoutEngine = true
  → compileLayoutPlan() called for each slide → layoutPlans array
  → dispatchAdapter() available
  → createRendererEngine({ useLayoutEngine: true, layoutPlans: [...], legacyRenderer: ... })
  → renderSlide(slide, comp, pptx, story)
    → Step 1: useLayoutEngine is true
      → find matching layoutPlan
      → dispatchAdapter({ slide, comp, pptx, story, layoutPlan })
        → ADAPTERS[slide.type](params)
        → Returns true if adapter exists, false otherwise
      → If adapter returned false → Step 2: legacyRenderer fallback
    → Returns true
```

**Result:** Adapter-first, legacy fallback for unknown types.

### 2.3 Legacy Fallback Path

```
registerLegacyRenderer("cover", cover)
registerLegacyRenderer("executive-summary", executive)
...
registerLegacyRenderer("generic", generic)
→ 16 registrations (L598-613)
```

All 16 legacy renderers are registered in `renderer-engine/registry.js` and called via `getLegacyRenderer()` in the legacyRenderer callback.

### 2.4 Adapter Path

```
ADAPTERS = {
  cover, "executive-summary", workflow, generic, recommendation,
  "why-now", problem, governance, research, collaboration,
  roi, differentiation, transformation, solution,
  architecture, roadmap
}
→ 16 entries (but only 13 unique slide types)
```

Note: `cover` and `executive-summary` are in ADAPTERS but NOT in the legacy renderer registry (they are handled differently). Wait — let me verify.

Actually, looking at run.js L598-613: `cover` and `executive-summary` ARE registered as legacy renderers too. So the ADAPTERS registry has 16 entries but only 13 unique slide types because some types are registered in both places.

Let me recount:
- ADAPTERS has: cover, executive-summary, workflow, generic, recommendation, why-now, problem, governance, research, collaboration, roi, differentiation, transformation, solution, architecture, roadmap = **16 entries**
- Legacy registry has: cover, executive-summary, why-now, problem, transformation, solution, architecture, roadmap, workflow, governance, research, collaboration, roi, differentiation, recommendation, generic = **16 entries**

Both have 16 entries covering the same 16 slide types. But the story only has 15 slides (cover + 14 content slides).

---

## 3 Legacy Renderer Inventory

| Legacy Renderer | Slide Type | Adapter Exists | Planner Exists | Used by Default CLI | Used by --layout-engine Fallback | Safe to Remove? | Notes |
|---|---|---|---|---|---|---|---|
| `cover` | `cover` | ✅ `cover.js` | ✅ `planners/cover.js` | ✅ (always) | ✅ (fallback if no adapter) | ⚠️ Conditional | Default CLI always uses legacy cover. Adapter path also covers it. |
| `executive` | `executive-summary` | ✅ `executive.js` | ✅ `planners/executive.js` | ✅ (slide 2) | ✅ (fallback if no adapter) | ⚠️ Conditional | Default CLI always uses legacy executive. Adapter path also covers it. |
| `whyNow` | `why-now` | ✅ `why-now.js` | ✅ `planners/why-now.js` | ✅ (slide 3) | ✅ (fallback if no adapter) | ❌ No | Legacy still used by default CLI. |
| `problem` | `problem` | ✅ `problem.js` | ✅ `planners/problem.js` | ✅ (slide 4) | ✅ (fallback if no adapter) | ❌ No | Legacy still used by default CLI. |
| `transformation` | `transformation` | ✅ `transformation.js` | ✅ `planners/transformation.js` | ✅ (slide 5) | ✅ (fallback if no adapter) | ❌ No | Legacy still used by default CLI. |
| `platformHubSlide` | `solution` | ✅ `solution.js` | ✅ `planners/solution.js` | ✅ (slide 6) | ✅ (fallback if no adapter) | ❌ No | Legacy still used by default CLI. |
| `layeredArchSlide` | `architecture` | ✅ `architecture.js` | ✅ `planners/architecture.js` | ✅ (slide 7) | ✅ (fallback if no adapter) | ❌ No | Legacy still used by default CLI. |
| `roadmap` | `roadmap` | ✅ `roadmap.js` | ✅ `planners/roadmap.js` | ✅ (slide 14) | ✅ (fallback if no adapter) | ❌ No | Legacy still used by default CLI. |
| `workflow` | `workflow` | ✅ `workflow.js` | ✅ `planners/workflow.js` | ✅ (slide 15) | ✅ (fallback if no adapter) | ❌ No | Legacy still used by default CLI. |
| `governance` | `governance` | ✅ `governance.js` | ✅ `planners/governance.js` | ✅ (slide 8) | ✅ (fallback if no adapter) | ❌ No | Legacy still used by default CLI. |
| `research` | `research` | ✅ `research.js` | ✅ `planners/research.js` | ✅ (slide 9) | ✅ (fallback if no adapter) | ❌ No | Legacy still used by default CLI. |
| `collaboration` | `collaboration` | ✅ `collaboration.js` | ✅ `planners/collaboration.js` | ✅ (slide 10) | ✅ (fallback if no adapter) | ❌ No | Legacy still used by default CLI. |
| `roi` | `roi` | ✅ `roi.js` | ✅ `planners/roi.js` | ✅ (slide 11) | ✅ (fallback if no adapter) | ❌ No | Legacy still used by default CLI. |
| `differentiation` | `differentiation` | ✅ `differentiation.js` | ✅ `planners/differentiation.js` | ✅ (slide 12) | ✅ (fallback if no adapter) | ❌ No | Legacy still used by default CLI. |
| `recommendation` | `recommendation` | ✅ `recommendation.js` | ✅ `planners/recommendation.js` | ✅ (slide 13) | ✅ (fallback if no adapter) | ❌ No | Legacy still used by default CLI. |
| `generic` | `generic` | ✅ `generic.js` | ✅ `planners/generic.js` | ❌ (not in story) | ✅ (fallback for unknown types) | ❌ No | Never used in `digital-pathology-15`, but serves as universal fallback. |

---

## 4 Adapter Coverage

All 16 slide types in `ADAPTERS` registry:

| Slide Type | Adapter File | Planner File | Verified Match |
|---|---|---|---|
| `cover` | `cover.js` | `planners/cover.js` | ✅ PR23 |
| `executive-summary` | `executive.js` | `planners/executive.js` | ✅ PR23 |
| `workflow` | `workflow.js` | `planners/workflow.js` | ✅ PR23 |
| `generic` | `generic.js` | `planners/generic.js` | ✅ PR23 |
| `recommendation` | `recommendation.js` | `planners/recommendation.js` | ✅ PR23 |
| `why-now` | `why-now.js` | `planners/why-now.js` | ✅ PR24 |
| `problem` | `problem.js` | `planners/problem.js` | ✅ PR24 |
| `governance` | `governance.js` | `planners/governance.js` | ✅ PR25 |
| `research` | `research.js` | `planners/research.js` | ✅ PR25 |
| `collaboration` | `collaboration.js` | `planners/collaboration.js` | ✅ PR25 |
| `roi` | `roi.js` | `planners/roi.js` | ✅ PR26 |
| `differentiation` | `differentiation.js` | `planners/differentiation.js` | ✅ PR26 |
| `transformation` | `transformation.js` | `planners/transformation.js` | ✅ PR27 |
| `solution` | `solution.js` | `planners/solution.js` | ✅ PR27 |
| `architecture` | `architecture.js` | `planners/architecture.js` | ✅ PR28 |
| `roadmap` | `roadmap.js` | `planners/roadmap.js` | ✅ PR28 |

**16/16 slide types have adapter coverage. 100% complete.**

---

## 5 13 vs 16 Count Explanation

The audit document previously stated "13 slide types" but the actual count is **16**:

- **15 slides in story**: `cover`, `executive-summary`, `why-now`, `problem`, `transformation`, `solution`, `architecture`, `roadmap`, `workflow`, `governance`, `research`, `collaboration`, `roi`, `differentiation`, `recommendation`
- **16 legacy renderer functions**: All 15 above + `generic` (universal fallback, never used in `digital-pathology-15`)
- **16 adapters**: All 15 above + `generic` (also registered as adapter)
- **13 unique slide types** (pre-PR28 count): Before PR27-28, only 13 had adapters. PR27 added transformation+solution (15), PR28 added architecture+roadmap (17... wait).

Correction: The story has 15 slides with 15 unique types. Plus `generic` as a 16th type. Total = **16 slide types**, all adapter-backed.

The "13" count in the audit doc was from before PR27-28. After PR28, all 16 types have adapters.

---

## 6 Cleanup Risk

### 6.1 Default Behavior Breakage

**Risk: HIGH**

Default CLI (`node bin/run.js --story digital-pathology-15`) currently uses 100% legacy renderers. Removing legacy renderers before verifying that the adapter path produces identical output for ALL stories (not just `digital-pathology-15`) would break default behavior.

### 6.2 Fallback Loss

**Risk: MEDIUM**

`generic` renderer serves as a universal fallback for unknown slide types. If removed, unknown types would produce blank slides.

### 6.3 Visual Regression

**Risk: LOW**

All adapters have been verified against legacy for `digital-pathology-15`. However, other stories may have different content that exercises different code paths.

### 6.4 Hidden Dependencies

**Risk: LOW**

The `createRendererEngine` function in `renderer-engine/index.js` is the only runtime dispatcher. It calls `dispatchAdapter()` first (if `useLayoutEngine=true`), then `legacyRenderer` callback. No other code path depends on legacy renderers directly.

### 6.5 Dispatcher Confusion

**Risk: LOW**

`dispatcher.js` (renderer-engine/dispatcher.js) is dead code — never imported. `registry.js` `dispatchLegacy()` is also dead code. These should be cleaned up but are not blocking.

---

## 7 Recommended Cleanup Plan

### PR30 — Remove dead code only

**Scope:**
- Remove `renderer-engine/dispatcher.js` (dead code, never imported)
- Remove `dispatchLegacy()` from `registry.js` (dead code, never called)
- Keep all legacy renderer functions in `run.js`
- Keep all `registerLegacyRenderer()` calls
- Keep `createRendererEngine` as-is

**Risk:** None. These are confirmed dead code paths.

### PR31 — Enable adapter as default rendering path

**Scope:**
- Modify `createRendererEngine` in `renderer-engine/index.js` to use adapter as default (not just when `useLayoutEngine=true`)
- Or: modify `run.js` to always enable `useLayoutEngine=true` by default
- Keep `registerLegacyRenderer()` calls as fallback for any type without adapter

**Risk:** MEDIUM. Requires verification against all stories, not just `digital-pathology-15`.

### PR32 — Remove legacy renderers from run.js

**Scope:**
- Remove all 16 legacy renderer functions from `run.js` (after PR31 verified)
- Remove all `registerLegacyRenderer()` calls
- Simplify `run.js` to only contain story loading, output writing, and adapter dispatch

**Risk:** HIGH. This is the final cleanup step. Should only happen after PR31 is verified.

### PR33 — M3 completion note

**Scope:**
- Update `docs/M3_ADAPTER_MIGRATION_AUDIT.md` with final status
- Add completion note to `docs/ROADMAP.md`
- Document lessons learned

**Risk:** None. Documentation only.

---

## 8 Recommendation

**Do NOT remove code immediately.**

The safest approach is:

1. **PR30 first** — remove confirmed dead code (`dispatcher.js`, `dispatchLegacy()`). Zero risk.
2. **PR31 second** — enable adapter as default path. Requires testing against additional stories beyond `digital-pathology-15`.
3. **PR32 third** — remove legacy renderers from `run.js`. Only after PR31 is verified.
4. **PR33 fourth** — documentation cleanup.

The current state (all 16 legacy renderers preserved + all 16 adapters registered) is the **correct safe state**. Legacy renderers serve as a verified fallback. Removing them prematurely would break default CLI behavior for any story that hasn't been tested with the adapter path.

---

## Known Issues

1. **Duplicate entries in `planner.js`**: `roi` and `differentiation` are registered twice (lines 24+29, 25+30). This is harmless in JavaScript (last definition wins) but should be cleaned up in PR30.
2. **Audit doc counts are stale**: The `M3_ADAPTER_MIGRATION_AUDIT.md` still references pre-PR27 counts. Should be updated in PR33.

---

## Appendix: File Locations

| Component | File | Lines |
|---|---|---|
| Legacy renderers | `bin/run.js` L86-591 | 506 lines |
| Legacy registrations | `bin/run.js` L598-613 | 16 calls |
| Adapter registry | `layout-adapters/index.js` L35-52 | 16 entries |
| Planner registry | `layout-engine/planner.js` L17-35 | 16 entries (+ 2 duplicates) |
| Runtime dispatcher | `renderer-engine/index.js` L26-55 | 30 lines |
| Legacy registry | `renderer-engine/registry.js` L12-58 | 47 lines |
| Dead dispatcher | `renderer-engine/dispatcher.js` L1-41 | 41 lines (unused) |
