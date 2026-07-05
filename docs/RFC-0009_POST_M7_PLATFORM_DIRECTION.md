# RFC-0009 Post-M7 Platform Direction

> **Version**: 1.0.0
> **Date**: 2026-07-05
> **Status**: RFC — Draft
> **Related**: M7.5 Checkpoint, PR68, PR69
> **Category**: Architecture — Post-M7 Direction
> **Target Phase**: M8.0 (documentation-only RFC)

---

## Purpose

Evaluate post-M7 platform direction options and select the next safe M8 path.
This RFC does not implement any runtime behavior. It is documentation-only.

## Context

After M7.5, the platform has reached a stable foundation:

- Core PPT generation works.
- Adapter-first rendering is complete.
- Digital Pathology Presentation Pack exists.
- Pack story explicit rendering exists.
- Registry/pack parity validation exists.
- Pack Loader exists (8 modules).
- PackRuntimeContext exists with 6 normalized sections.
- Manual boundary smoke exists (60/60 checks).
- Contract smoke exists (31/31 checks).
- M7 boundary checkpoint exists.

## M7 Completion Summary

M7 Pack Runtime Boundary Deepening is complete:

| Milestone | PR | Outcome |
|---|---|---|
| M7.0 RFC | PR63 | Selected Option A — Boundary Deepening |
| M7.1 Design | PR64 | Pack Runtime Boundary Design documented |
| M7.2 Hardening | PR65 | PackRuntimeContext hardened (6 sections) |
| M7.3 Alignment | PR66 | Resolver/Loader alignment designed (not implemented) |
| M7.4 Smoke | PR67 | Manual smoke script (60/60 pass) |
| M7.5 Checkpoint | PR68 | M7 boundary frozen |

## Current Stable Platform State

- Core PPT generation works.
- Adapter-first rendering is complete.
- Digital Pathology Pack is the testbed pack.
- Pack story explicit rendering via `--pack-story`.
- Registry/pack parity via `--validate-pack-story-parity`.
- Pack Loader (8 modules) manages metadata.
- PackRuntimeContext (6 sections) is immutable.
- Manual boundary smoke guards the M7 boundary.

## Current Frozen Boundaries

The following boundaries are frozen after M7.5:

1. `--story` remains registry-backed.
2. `--pack-story` remains explicit pack-backed rendering.
3. Presentation Packs are NOT the default source of truth.
4. No automatic pack lookup from `--story`.
5. No planner extraction.
6. No adapter extraction.
7. No theme extraction.
8. No source-of-truth migration.
9. Pack Loader is read-only.
10. PackRuntimeContext is immutable/frozen.
11. Resolver is the explicit bridge into rendering.
12. Rendering pipeline is core-owned.
13. M7.4 smoke is manual, not CI.

## Problem Statement

Post-M7, we need to decide the next safe direction. The M7 boundary is frozen and stable.
We must choose an M8 path that:
- Builds on the M7 checkpoint without violating frozen boundaries.
- Prepares the platform for future growth (multi-pack, resolver/context alignment).
- Maintains compatibility with existing CLI commands and rendering.
- Minimizes runtime risk.

## Decision Criteria

| Criterion | Weight | Notes |
|---|---|---|
| Compatibility risk | High | Must not break existing CLI output |
| Runtime risk | High | Must not change rendering behavior |
| Platform leverage | Medium | Should prepare for future growth |
| Multi-pack readiness | Medium | Should support >1 pack eventually |
| User-facing value | Low-Medium | M8 is platform preparation |
| Maintenance cost | Medium | Should be sustainable |
| Testability | High | Must be verifiable via smoke/contract |
| Reversibility | High | Must be easy to roll back |
| Documentation maturity | Medium | Should improve doc coverage |
| Impact on M7 boundaries | High | Must not violate frozen boundaries |

## Candidate Directions

### Option A — Pack Runtime Contract Hardening

**Focus:** Strengthen PackRuntimeContext contract documentation.

- Define resolver/context consumption requirements.
- Define version compatibility model.
- Define multi-pack discovery assumptions.
- Prepare future implementation without implementing it.
- Documentation-only. No runtime changes.

**Risk:** Very low. Purely documentation.
**Leverage:** High. Prepares for all future M8+ work.
**Compatibility:** Zero risk. No code changes.

### Option B — Multi-Pack Discovery and Validation Hardening

**Focus:** Improve assumptions for more than one pack.

- Define duplicate/invalid pack behavior.
- Define pack version metadata expectations.
- Define cross-pack validation model.
- Still no source-of-truth migration.

**Risk:** Low. Documentation-only.
**Leverage:** Medium. Useful but narrower than A.
**Compatibility:** Zero risk.

### Option C — Resolver Consumes PackRuntimeContext

**Focus:** Implement the M7.3 proposed alignment.

- Resolver uses PackRuntimeContext directly.
- Higher runtime risk (changes resolver behavior).
- Requires implementation, not documentation-only.

**Risk:** Medium-High. Changes resolver contract.
**Leverage:** High. But premature without contract hardening.
**Compatibility:** Potential breaking changes.

### Option D — CI Integration of Smoke Checks

**Focus:** Convert manual smoke/contract/parity checks into CI.

- Useful for regression detection.
- May be premature before M8 direction is finalized.
- Scope of CI integration not yet decided.

**Risk:** Low. No runtime changes.
**Leverage:** Medium. Operational improvement.
**Compatibility:** Zero risk.

### Option E — SDK / Marketplace Direction

**Focus:** Define SDK API or marketplace metadata.

- Higher product/platform scope.
- Premature unless pack runtime contract is stable.
- Requires significant design effort.

**Risk:** Medium. Broad scope.
**Leverage:** High. But premature.
**Compatibility:** Zero risk (design only).

### Option F — Source-of-truth Migration

**Focus:** Packs become default story source or `--story` auto-searches packs.

- High risk. Changes fundamental platform assumption.
- Requires stakeholder review.
- Must remain rejected for now.

**Risk:** Very High.
**Leverage:** Very High. But too risky for M8.0.
**Compatibility:** Breaking change.

### Option G — Planner / Adapter / Theme Extraction

**Focus:** Move deeper runtime assets into packs.

- High risk. Core responsibility shift.
- Requires extensive architectural review.
- Must remain rejected for now.

**Risk:** Very High.
**Leverage:** High. But premature.
**Compatibility:** Breaking change.

## Option Evaluation Matrix

| Option | Compat Risk | Runtime Risk | Leverage | Testability | M7 Impact | Recommended |
|---|---|---|---|---|---|---|
| A — Contract Hardening | None | None | High | High | None | **SELECTED** |
| B — Multi-Pack | None | None | Medium | Medium | None | Deferred |
| C — Resolver Context | Low | Medium | High | Medium | None | Deferred |
| D — CI Integration | None | None | Medium | High | None | Deferred |
| E — SDK/Marketplace | None | None | High | Low | None | Deferred |
| F — Source-of-truth | High | High | High | Low | None | **REJECTED** |
| G — Planner/Adapter | High | High | High | Low | None | **REJECTED** |

## Selected Direction

**M8.0 selects Option A — Pack Runtime Contract Hardening.**

### Rationale

1. **Lowest runtime risk.** Purely documentation. No code changes.
2. **Builds on M7 checkpoint.** Directly extends M7.5 frozen boundary state.
3. **Prepares future implementation.** Defines resolver/context requirements without implementing.
4. **Keeps --story and --pack-story stable.** No CLI changes.
5. **Keeps packs explicit opt-in.** No source-of-truth migration.
6. **Preserves source-of-truth policy.** Registry remains default.
7. **Improves future M8 readiness.** Makes Option C (resolver context) safer when it comes.

### What M8.0 Does

- Documents PackRuntimeContext contract requirements.
- Defines resolver/context consumption prerequisites.
- Defines version compatibility model.
- Defines multi-pack discovery assumptions.
- Proposes M8 milestone sequence.

### What M8.0 Does NOT Do

- No runtime implementation.
- No CLI changes.
- No new public commands.
- No source-of-truth migration.
- No planner/adapter/theme extraction.
- No automatic pack lookup.
- No resolver/context implementation.
- No CI integration.

## Rejected / Deferred Directions

The following are explicitly rejected or deferred for M8.0:

### Rejected Immediately

| Direction | Reason |
|---|---|
| Source-of-truth migration | Too high-risk without stakeholder review |
| Automatic pack lookup | Violates explicit opt-in policy |
| Planner extraction | Core responsibility, not pack |
| Adapter extraction | Core responsibility, not pack |
| Theme extraction | Core responsibility, not pack |
| Resolver/context implementation | Premature without contract hardening |

### Deferred to Later M8 or Beyond

| Direction | Reason |
|---|---|
| Option B — Multi-Pack Discovery | Useful but lower priority than A |
| Option C — Resolver Context | Needs contract hardening first |
| Option D — CI Integration | Scope not yet decided |
| Option E — SDK/Marketplace | Premature, needs contract stability |

## M8 Proposed Milestones

The following M8 sequence is proposed:

| Milestone | Type | Description |
|---|---|---|
| M8.0 | RFC | **This document** — Post-M7 Platform Direction |
| M8.1 | Design | Pack Runtime Contract Hardening Design |
| M8.2 | Design | PackRuntimeContext Contract Schema Documentation |
| M8.3 | Design | Multi-Pack Discovery Assumptions Design |
| M8.4 | RFC | Resolver/Context Consumption RFC |
| M8.5 | Checkpoint | M8 Runtime Contract Checkpoint |

**Important:**
- M8.1 is **Pack Runtime Contract Hardening Design**, NOT planner extraction.
- M8.1 is **NOT adapter extraction**.
- M8.1 is **NOT theme extraction**.
- M8.1 is **NOT source-of-truth migration**.
- All M8 milestones remain design-only until explicitly approved for implementation.

## Migration Safety Policy

Any M8+ change that modifies runtime behavior must:

1. **Pass M7 boundary smoke** (60/60 checks) before and after.
2. **Pass contract smoke** (31/31 checks) before and after.
3. **Pass parity validation** before and after.
4. **Have a documented rollback plan.**
5. **Not violate any frozen M7 boundary.**

## Compatibility Policy

The following compatibility guarantees hold for M8:

- `--story` remains registry-backed.
- `--pack-story` remains explicit opt-in.
- Packs remain explicit opt-in.
- Successful CLI output remains compatible.
- Rendering behavior remains unchanged.
- Output paths remain unchanged.
- Parity guard remains required.
- Boundary smoke remains required.
- Contract smoke remains required.

## Regression Guard Policy

Current manual guards:

```bash
node registry/packages/ppt-factory/scripts/pack-runtime-boundary-smoke.js
node registry/packages/ppt-factory/scripts/pack-loader-contract-smoke.js
node registry/packages/ppt-factory/bin/run.js --validate-pack-story-parity digital-pathology/digital-pathology-15
```

These remain manual unless a future explicit CI task is approved.
CI integration is deferred.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| M7 boundary drift | Low | Manual smoke guards |
| Premature implementation | Medium | M8.0 is documentation-only |
| Scope creep into M8.1 | Medium | Clear non-goals |
| Resolver/context risk | Low | Deferred until M8.4 RFC |

## Open Questions

1. When should CI integration be proposed?
2. How many packs before multi-pack discovery is needed?
3. What version compatibility model works best?
4. When should resolver context consumption be revisited?

## Review Checklist

- [x] RFC-0009 created
- [x] Documentation-only
- [x] No package.json changes
- [x] No bin/run.js changes
- [x] No src/ changes
- [x] No scripts/ changes
- [x] All candidate directions A-G evaluated
- [x] Option A selected
- [x] Source-of-truth migration rejected
- [x] Automatic pack lookup rejected
- [x] Planner/adapter/theme extraction rejected
- [x] SDK/Marketplace deferred
- [x] CI integration deferred
- [x] M8 milestone sequence proposed
- [x] M7 boundaries restated
- [x] Compatibility policy documented
- [x] Regression guard policy documented

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-07-05 | Hermes | Initial Post-M7 Platform Direction RFC (M8.0) |
