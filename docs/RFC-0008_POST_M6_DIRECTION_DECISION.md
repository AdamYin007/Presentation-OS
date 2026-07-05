# RFC-0008: Post-M6 Direction Decision

**Status:** Proposed  
**Author:** Hermes (MD Senior Implementation Engineer)  
**Date:** 2026-07-05  
**Prerequisite:** M6.6 Pack Loader Checkpoint (PR62), tag `m6-6-pack-loader-checkpoint`  
**Category:** Architecture — M7 Planning  
**Target Phase:** M7.0 (decision only, no implementation)

---

## Status

**Proposed.** This RFC is a planning and decision document only. It evaluates candidate M7 directions and selects the safest, highest-leverage M7 mainline.

No code is written. No runtime behavior changes. No CLI changes. No package.json modifications.

---

## Context

M6 completed seven milestones (M6.0–M6.6), culminating in the Pack Loader Checkpoint:

| Milestone | PR | Title | Status |
|---|---|---|---|
| M6.0 | PR56 | Pack Loader Design RFC | ✅ Done |
| M6.1 | PR57 | Read-only Pack Loader Skeleton | ✅ Done |
| M6.2 | PR58 | Pack Loader CLI Integration | ✅ Done |
| M6.3 | PR59 | Pack Loader Error Model Hardening | ✅ Done |
| M6.4 | PR60 | Pack Loader Validation Contract | ✅ Done |
| M6.5 | PR61 | Pack Loader Contract Regression Guard | ✅ Done |
| M6.6 | PR62 | M6 Pack Loader Checkpoint | ✅ Done |

Current state:

- **Pack Loader**: 8 modules implemented, loader-backed `--list-packs` and `--inspect-pack`.
- **Error model**: Standardized `errorCode` + `details` across all loader paths.
- **Validation contract**: Documented and smoke-tested (17/17 checks).
- **Regression guard**: Manual, documented, no CI/npm script added.
- **Source-of-truth**: `--story` remains registry-backed. Packs remain explicit opt-in.
- **Runtime boundaries**: Frozen — no planner/adapter/theme ownership by packs.
- **Output path policy**: Frozen — pack outputs isolated under `output/ppt-factory/packs/<pack-id>/`.
- **M6 checkpoint**: Tagged `m6-6-pack-loader-checkpoint`. M6 is closed.

M7 planning begins from this stable baseline.

---

## Problem Statement

M6 established a solid Pack Loader foundation, but M7 must decide **what the mainline focus should be** after M6 closes. The decision must:

1. Preserve the M6 frozen boundaries (no source-of-truth migration, no planner/adapter extraction).
2. Select the highest-leverage direction that strengthens the pack ecosystem without introducing breaking changes.
3. Avoid premature scope expansion (marketplace, SDK, multi-pack before runtime boundary is stable).
4. Ensure any M7 work can be validated against existing contract smoke and parity checks.
5. Document the decision clearly so future M7 milestones have an unambiguous entry point.

---

## Decision Criteria

M7 direction selection is evaluated against these criteria:

| Criterion | Weight | Description |
|---|---|---|
| **Strategic Value** | High | Does the direction advance the core platform vision (RFC-0001)? |
| **Risk** | High | Does the direction risk breaking existing `--story`, `--pack-story`, or parity behavior? |
| **Runtime Impact** | High | Does the direction change runtime rendering, output paths, or CLI behavior? |
| **Compatibility** | High | Does the direction preserve backward compatibility with existing packs and stories? |
| **Architectural Fit** | Medium | Does the direction align with the current registry+dispatch architecture? |
| **Testability** | Medium | Can the direction be validated with existing smoke tests and parity checks? |
| **RFC Prerequisite** | Medium | Does the direction require a new RFC before implementation? |
| **Extraction Risk** | High | Does the direction risk premature planner/adapter/source-of-truth migration? |

---

## Candidate Directions

Five candidate directions are evaluated below.

### Option A — Pack Runtime Boundary Deepening

**Description:** Extend Pack Loader to own more runtime assets (themes, content) while maintaining explicit opt-in. Define clear pack runtime boundary interfaces. Improve internal consistency between pack inspection, validation, and explicit pack story resolution.

**Scope:**
- Make Pack Loader context more useful for pack metadata and governance.
- Define pack runtime boundary interfaces (what the loader owns vs. what core owns).
- Improve internal consistency between `--inspect-pack`, validation, and `--pack-story` resolution.
- Document how future pack runtime integration should work.
- Add read-only runtime boundary checks if needed.
- Keep `--story` registry-backed.
- Keep `--pack-story` explicit.
- Keep planners/adapters/themes in core.
- Keep source-of-truth migration blocked until separate RFC.

**What it does NOT do:**
- Does not make packs default source of truth.
- Does not implement planner/adapter extraction.
- Does not change `--story` behavior.
- Does not change `--pack-story` rendering behavior.
- Does not add new public CLI commands.
- Does not change successful `--list-packs` or `--inspect-pack` output.

**RFC prerequisite:** Yes — a dedicated RFC defining the runtime boundary contract before implementation.

---

### Option B — Pack SDK Read-only Specification

**Description:** Define a read-only SDK API for pack consumers (metadata queries, asset listing, validation) per RFC-0002.

**Scope:**
- Define programmatic API surface for pack metadata access.
- Document SDK versioning and compatibility.
- Provide typed interfaces for pack discovery, inspection, and validation.

**Risks:**
- Premature without clearer runtime boundary.
- SDK API design could conflict with future runtime boundary decisions.
- Adds complexity before the pack ecosystem has multiple packs.

**RFC prerequisite:** Yes — RFC-0002 SDK specification needs updating with runtime boundary context.

---

### Option C — Multi-pack Expansion

**Description:** Add additional domain packs beyond digital-pathology. Require pack structure validation and cross-pack compatibility.

**Scope:**
- Create a second domain pack (e.g., orthopedics, neurology).
- Validate pack structure with multiple packs.
- Test pack discovery at scale.
- Evaluate cross-pack story ID collision handling.

**Risks:**
- Premature before runtime boundary is stable.
- Single pack (digital-pathology) should remain the testbed until runtime boundary is mature.
- Multi-pack scenarios expose edge cases in loader that are not yet well-defined.

**RFC prerequisite:** Yes — multi-pack strategy requires separate RFC.

---

### Option D — Marketplace Metadata Readiness

**Description:** Prepare pack manifests for marketplace metadata fields (version compatibility, dependencies, publisher info) per RFC-0004.

**Scope:**
- Extend `pack.json` schema with marketplace-relevant fields.
- Define dependency resolution strategy.
- Prepare for version compatibility checking.

**Risks:**
- Premature before SDK and multi-pack maturity.
- Marketplace infrastructure (RFC-0004) is not implemented.
- Metadata changes could break existing pack validators.

**RFC prerequisite:** Yes — marketplace metadata changes require RFC-0004 update.

---

### Option E — Source-of-truth Migration RFC

**Description:** Draft RFC for strategic decision on making packs the default source of truth. Would change `--story` to search packs in addition to registry.

**Scope:**
- Define migration strategy (copy-first, verify, switch).
- Specify backward compatibility guarantees.
- Document rollback plan.
- Stakeholder review process.

**Risks:**
- Highest risk direction — fundamentally changes how stories are resolved.
- Could break existing `--story` behavior expectations.
- Requires extensive migration testing.
- Strategic decision that should not be rushed.

**RFC prerequisite:** This RFC IS the prerequisite — implementation requires separate RFC.

---

## Evaluation Matrix

| Criterion | Option A | Option B | Option C | Option D | Option E |
|---|---|---|---|---|---|
| **Strategic Value** | High | Medium | Medium | Low | High |
| **Risk** | Low | Medium | Medium | Low | Very High |
| **Runtime Impact** | None (design) | None (spec) | Low | None (spec) | Very High |
| **Compatibility** | Preserved | Preserved | Preserved | Preserved | Breaking risk |
| **Architectural Fit** | Excellent | Good | Good | Fair | Disruptive |
| **Testability** | High (existing smoke) | Medium | Medium | Medium | Complex |
| **RFC Prerequisite** | Required | Required | Required | Required | Is the RFC |
| **Extraction Risk** | None | Low | Low | Low | High |
| **Recommended Timing** | **Immediate (M7.1)** | After M7 boundary | After M7 boundary | After M7 multi-pack | Separate strategic RFC |

**Scoring rationale:**

- **Option A** scores highest because it strengthens the foundation without changing behavior. It is design-only in M7.1, preserving all M6 frozen boundaries.
- **Option B** is useful but premature — SDK design should follow runtime boundary clarity.
- **Option C** is useful later but the single pack (digital-pathology) should remain the testbed until runtime boundary is stable.
- **Option D** is premature — marketplace metadata requires SDK and multi-pack maturity first.
- **Option E** is strategically important but too high-risk for immediate M7 implementation. Requires separate stakeholder review.

---

## Recommended M7 Mainline

**Selected: Option A — Pack Runtime Boundary Deepening**

### Decision

M7 should deepen Pack Runtime boundaries **without** making packs the default source of truth.

### Scope for Near-term M7

1. **M7.1 — Pack Runtime Boundary Design**
   - **PR64 implements this as a documentation-only design document.**
   - Define what Pack Loader owns vs. what Core owns.
   - Document runtime boundary interfaces.
   - No implementation — design document only.
   - No runtime behavior change.
   - No CLI behavior change.
   - No source-of-truth migration.
   - No planner/adapter/theme extraction.

2. **M7.2 — Pack Runtime Context Inspection Hardening**
   - **PR65 implements this with normalized read-only context sections.**
   - Add normalized read-only sections to `PackRuntimeContext`: governance, runtime, boundaries, sourceOfTruth, outputPolicy, validation.
   - Derive inspection from normalized context.
   - Extend contract smoke from 17 to 31 checks.
   - No CLI output change. No rendering change. No source-of-truth migration.

3. **M7.3 — Pack Story Resolver / Loader Boundary Alignment Design**
   - **PR66 implements this as a documentation-only design document.**
   - Document boundary mismatch between resolver and loader.
   - Define desired future alignment model.
   - Propose future resolver contract shape (not implemented).
   - No implementation — design document only.
   - No runtime behavior change.
   - No CLI behavior change.
   - No source-of-truth migration.
   - No planner/adapter/theme extraction.

4. **M7.4 — Pack Runtime Boundary Smoke Checks**
   - **PR67 implements this with a manual smoke script.**
   - Add `scripts/pack-runtime-boundary-smoke.js` — 60 checks across 7 categories.
   - Validates PackRuntimeContext sections, CLI compatibility, rendering isolation.
   - No npm script added. No package.json changes. No CI config changes.
   - Manual invocation only: `node scripts/pack-runtime-boundary-smoke.js`.
   - No runtime behavior change. No CLI behavior change.
   - No source-of-truth migration. No planner/adapter/theme extraction.
   - Verify `--story` remains independent.

5. **M7.5 — M7 Runtime Boundary Checkpoint**
   - Formal checkpoint documenting M7 runtime boundary state.
   - Frozen boundaries for M8 entry.

### Explicit Non-goals for M7

- **No source-of-truth migration.** `--story` remains registry-backed.
- **No planner extraction.** Planners remain in core.
- **No adapter extraction.** Adapters remain in core.
- **No theme extraction.** Themes remain in core.
- **No new public CLI commands.**
- **No `package.json` changes.**
- **No CI/npm script additions.**
- **No rendering behavior changes.**
- **No marketplace behavior.**
- **No SDK API implementation.**
- **No automatic pack lookup from `--story`.**
- **No change to `--pack-story` rendering behavior.**

---

## Rejected Immediate Directions

The following are **not selected** as immediate M7.1 implementation targets:

### Option B — Pack SDK Read-only Specification

**Reason:** Useful, but should follow clearer runtime boundary. SDK design without runtime boundary clarity risks conflicting assumptions.

### Option C — Multi-pack Expansion

**Reason:** Useful later, but current single pack (digital-pathology) should remain the testbed until runtime boundary is stable.

### Option D — Marketplace Metadata Readiness

**Reason:** Premature before SDK and multi-pack maturity. Marketplace infrastructure (RFC-0004) is not implemented.

### Option E — Source-of-truth Migration RFC

**Reason:** Important strategic decision, but too high-risk until runtime boundary and compatibility rules are stronger. Requires separate stakeholder review process.

### Explicitly Rejected Items

The following are **explicitly not selected** for M7:

- **Planner extraction** — Not selected. Requires separate RFC.
- **Adapter extraction** — Not selected. Requires separate RFC.
- **Source-of-truth migration** — Not selected. Too high-risk, requires stakeholder review.
- **Automatic pack lookup from `--story`** — Not selected. Violates explicit opt-in principle.
- **Marketplace behavior** — Not selected. Out of scope.
- **SDK API implementation** — Not selected. Premature.

---

## Guardrails Inherited from M6

The following M6 frozen boundaries carry forward into M7:

1. **`--story` remains registry-backed.** Default story source is `registry/packages/ppt-factory/story/`.
2. **`--pack-story` remains explicit pack-backed story rendering.** Packs accessed only via explicit `--pack-story <pack>/<id>`.
3. **Packs are NOT default source of truth.** No automatic pack lookup from `--story`.
4. **Pack assets remain copy-first migration assets.** Assets in packs are copies for migration tracking.
5. **Output path isolation preserved.** `--pack-story` outputs under `output/ppt-factory/packs/<pack-id>/`.
6. **Pack Loader is read-only.** Never modifies pack files or registry files.
7. **Pack Loader does not execute code from packs.** JSON/data resolution only.
8. **Planners and adapters remain core components.** No extraction without RFC.
9. **No new public CLI commands.**
10. **No `package.json` changes.**
11. **No CI/npm script additions.**
12. **No rendering behavior changes.**
13. **Contract smoke must pass.** `node registry/packages/ppt-factory/scripts/pack-loader-contract-smoke.js` must return `Contract: passed (17/17 checks)` before any M7 merge.
14. **Parity validation must pass.** `--validate-pack-story-parity` must pass before any M7 merge affecting pack story resolution.

---

## M7 Proposed Milestone Sequence

| Milestone | Title | Type | Notes |
|---|---|---|---|
| **M7.0** | Post-M6 Direction Decision RFC | **Documentation** | **PR63** — This RFC |
| M7.1 | Pack Runtime Boundary Design | Design | **PR64** — M7.1 begins Option A with documentation-only Pack Runtime Boundary Design |
| M7.2 | Pack Runtime Context Inspection Hardening | Implementation | **PR65** — Hardened PackRuntimeContext with normalized read-only sections |
| M7.3 | Pack Story Resolver / Loader Boundary Alignment Design | Design | **PR66** — Documents alignment without changing resolver behavior |
| M7.4 | Pack Runtime Boundary Smoke Checks | Testing | **PR67** — Adds manual smoke script validating frozen M7 boundaries (60/60 checks) |
| M7.5 | M7 Runtime Boundary Checkpoint | Documentation | Formal checkpoint, frozen boundaries |

**Important:** These are **proposed milestones only**. They are not implemented in PR63. M7.1 is set to **Pack Runtime Boundary Design**, NOT planner extraction, NOT adapter extraction, NOT source-of-truth migration.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| M7 scope creep into source-of-truth migration | Medium | Critical | Explicit non-goals documented in this RFC. M7.1 is design-only. |
| M7 scope creep into planner/adapter extraction | Medium | High | Explicitly rejected. Requires separate RFC. |
| M7 changes break existing `--story` behavior | Low | Critical | Guardrail #1: `--story` remains registry-backed. Contract smoke required. |
| M7 changes break `--pack-story` parity | Low | High | Guardrail: parity validation must pass before any M7 merge. |
| M7 changes break `--list-packs` / `--inspect-pack` output | Low | Medium | Guardrail: successful output compatibility guaranteed. |
| M7 adds new CLI commands unexpectedly | Low | Medium | Guardrail: no new public CLI commands. |
| M7 modifies `package.json` or adds CI scripts | Low | Medium | Guardrail: no `package.json` changes, no CI additions. |
| M7 runtime boundary design conflicts with M6 architecture | Low | Medium | Design-only M7.1. Stakeholder review before implementation. |

---

## Rollback Policy

If M7 work introduces issues:

1. **Revert to M6.6 checkpoint.** Tag `m6-6-pack-loader-checkpoint` is the stable baseline.
2. **Restore `--story` registry path.** `--story` remains independent of M7 changes.
3. **Restore M5 explicit `--pack-story` behavior.** `pack-story-resolver.js` remains available as rollback.
4. **No state persistence.** M7 changes are additive and reversible.

Rollback is safe because:
- M7 is bounded by M6 frozen guardrails.
- No behavioral changes to `--story`, `--pack-story`, `--list-packs`, or `--inspect-pack`.
- All M7 work is gated by contract smoke and parity validation.

---

## Review Checklist

Before merging PR63, verify:

- [ ] `docs/RFC-0008_POST_M6_DIRECTION_DECISION.md` created
- [ ] `docs/ROADMAP.md` updated with M7.0 entry
- [ ] `presentation-packs/digital-pathology/README.md` updated with M7.0 planning status
- [ ] `presentation-packs/digital-pathology/USAGE.md` updated with M7.0 note
- [ ] `package.json` NOT modified
- [ ] `bin/run.js` NOT modified
- [ ] `src/` NOT modified
- [ ] `story/` NOT modified
- [ ] `scripts/` NOT modified
- [ ] `adapters/` NOT modified
- [ ] `planners/` NOT modified
- [ ] All 5 candidate directions evaluated
- [ ] Option A selected as recommended M7 mainline
- [ ] Planner extraction explicitly rejected
- [ ] Adapter extraction explicitly rejected
- [ ] Source-of-truth migration explicitly rejected
- [ ] `--story` remains registry-backed
- [ ] `--pack-story` remains explicit
- [ ] Contract smoke passes (17/17 checks)
- [ ] `--list-packs` output compatible
- [ ] `--inspect-pack` output compatible
- [ ] Parity validation passes
- [ ] `--story` behavior unchanged
- [ ] `--pack-story` behavior unchanged
- [ ] Unknown flag guard still works
- [ ] No adapters/planners/story JSON changed
- [ ] Packs NOT made default source of truth
- [ ] No CI or npm script added
- [ ] M7.1 set to Pack Runtime Boundary Design

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-07-05 | Hermes | Initial Post-M6 Direction Decision RFC (M7.0) |
| 1.1 | 2026-07-05 | Hermes | M7.1 implemented: Pack Runtime Boundary Design documented (PR64) |
| 1.2 | 2026-07-05 | Hermes | M7.2 implemented: Pack Runtime Context Inspection Hardening (PR65) |
| 1.3 | 2026-07-05 | Hermes | M7.3 implemented: Pack Story Resolver / Loader Alignment Design (PR66) |
| 1.4 | 2026-07-05 | Hermes | M7.4 implemented: Pack Runtime Boundary Smoke Checks (PR67) — 60/60 checks pass |
