# AWE Presentation OS — Roadmap

> **Version**: 1.0.0  
> **Date**: 2026-07-01  
> **Status**: Architecture Frozen v1 — M3 Adapter Migration Complete

---

## Current Status (2026-07-01)

### Completed Components

| Component | Status | PR | Details |
|---|---|---|---|
| **Story Layer** | ✅ Done | — | JSON-driven slide definition, 15 slide types |
| **Hero Engine** | ✅ Done | PR10 | `enrichStoryWithHero()`, `--hero` flag |
| **Content Engine** | ✅ Done | PR14 | `compileContent()`, registry + dispatch, `planners/` split |
| **Layout Engine** | ✅ Done | PR11, PR15 | `compileLayoutPlan()`, `planners/` split (10 types) |
| **Theme Engine Core** | ✅ Done | PR9 | `createTheme()`, `getTheme()`, `resolveColor()`, `applyTypography()` |
| **Renderer Engine** | ✅ Done | PR16 | `createRendererEngine()`, adapter-first + legacy fallback |
| **Layout Adapters** | ✅ Done | PR5–PR28 | 16 adapters covering all slide types (100%) |
| **Adapter Default** | ✅ Done | PR31B | Adapter-first is now the default rendering path |
| **Dead Code Removal** | ✅ Done | PR30 | Removed `dispatcher.js`, `dispatchLegacy()`, duplicate entries |
| **Adapter Registry** | ✅ Done | PR15 | `ADAPTERS` object lookup, `dispatchAdapter()` |
| **Legacy Registry** | ✅ Done | PR16 | `registerLegacyRenderer()`, centralized management |
| **Architecture Docs** | ✅ Done | PR17 | This document + ARCHITECTURE.md |
| **Platform Strategy** | ✅ Done | PR19 | Core + Presentation Packs + Applications model |
| **RFC-0001 Platform Spec** | ✅ Done | PR20 | docs/rfc/RFC-0001-platform.md |
| **RFC-0002 SDK Spec** | ✅ Done | PR21 | docs/rfc/RFC-0002-sdk.md |
| **RFC-0003 Pack Spec** | ✅ Done | PR21 | docs/rfc/RFC-0003-pack.md |
| **RFC-0004 Marketplace Spec** | ✅ Done | PR21 | docs/rfc/RFC-0004-marketplace.md |
| **RFC-0005 Compiler Spec** | ✅ Done | PR21 | docs/rfc/RFC-0005-compiler.md |
| **RFC-0006 Audience Engine Spec** | ✅ Done | PR21 | docs/rfc/RFC-0006-audience.md |
| **RFC Governance Integration** | ✅ Done | PR21 | CONTRIBUTING.md, ROADMAP.md, ARCHITECTURE.md updated |

### In Progress

| Component | Status | Details |
|---|---|---|
| **Legacy Removal** | ⏳ Future Hardening | PR32 — remove legacy renderers after production validation |

### Planned

| Component | Priority | Description |
|---|---|---|
| **Adapter Migration** | High | Migrate remaining legacy renderers to adapters |
| **Content Data Migration** | High | Migrate story JSON data to Content Engine planners |
| **Platform Specification Sprint** | High | All 6 RFCs completed. Next: implement SDK, Pack, Marketplace, Compiler, Audience Engine per RFC specs |
| **Presentation Compiler** | Medium | Optimize render instructions, batch calls, cache plans (per RFC-0005) |
| **Audience Engine** | Medium | Adapt output based on `story.audience` metadata (per RFC-0006) |
| **Theme Engine Enforcement** | Low | Make Theme Engine mandatory for all rendering paths |
| **Automated Testing** | High | PPTX comparison tests, regression detection |

---

## Milestones

### M1 — Foundation (Completed)
- [x] Story Layer
- [x] Hero Engine
- [x] Layout Engine
- [x] Layout Adapters (PoC → 3 types)
- [x] Theme Engine Core

### M2 — Architecture Freeze v1 (Completed)
- [x] Content Engine Phase 1
- [x] Renderer Engine Phase 1
- [x] Module Split (planners/, registry pattern)
- [x] Architecture Documentation
- [x] Consistent Engine Structure
- [x] Platform Strategy (Core + Presentation Packs)
- [x] RFC-0001 Platform Specification

### RFC Sprint (Completed)
- [x] RFC-0001 Platform Specification
- [x] RFC-0002 SDK Specification
- [x] RFC-0003 Presentation Pack Specification
- [x] RFC-0004 Marketplace Specification
- [x] RFC-0005 Presentation Compiler Specification
- [x] RFC-0006 Audience Engine Specification
- [x] RFC Governance Integration (CONTRIBUTING.md, ROADMAP.md, ARCHITECTURE.md)

> **Note**: Before creating real Presentation Pack directory structures, SDK APIs, or Marketplace infrastructure, the relevant RFC should be completed first. All 6 RFCs are now complete.

### M3 — Adapter Migration (Completed)
- [x] Migrate 16 legacy renderers to adapters ([Audit](M3_ADAPTER_MIGRATION_AUDIT.md))
- [x] Achieve 16/16 adapter coverage (100%)
- [x] Enable adapter-first as default rendering path (PR31B)
- [x] Remove dead code: `dispatcher.js`, `dispatchLegacy()` (PR30)
- [ ] Remove legacy renderers from `run.js` (PR32 — pending production validation)
- [ ] Resolve hero-sequence story format incompatibility (separate migration)

### M4 — Presentation Pack Foundation (In Progress)
- [x] Audit domain-specific assets ([Audit](M4_PRESENTATION_PACK_FOUNDATION_AUDIT.md)) — PR34
- [x] Create digital pathology pack skeleton — PR35
- [x] Copy story assets into pack — PR36 ✅
- [x] Copy hero-sequence assets into pack — PR36 ✅
- [x] Copy terminology and reference docs — PR37 ✅
- [ ] Pack loader proof of concept (optional) — PR39
- [x] Read-only pack manifest validator — PR39 ✅
- [x] Digital pathology pack asset index — PR40 ✅
- [x] Pack usage documentation — PR41 ✅
- [x] Pack changelog and maintenance policy — PR42 ✅
- [x] Read-only pack discovery — PR43 ✅
- [x] CLI unknown argument guard — PR44 ✅
- [x] Read-only pack inspection — PR45 ✅
- [x] CLI help for pack commands — PR46 ✅
- [x] M4 pack system checkpoint documentation — PR47 ✅
- [x] M5.0 Pack Runtime Integration Design Note — PR48 ✅
- [x] M5.1 Pack Story Resolution Design Validation — PR49 ✅
- [x] M5.2 Pack Story CLI Contract Guard — PR50 ✅
- [x] M5.3 Read-only Pack Story Resolver — PR51 ✅
- [x] M5.4 Explicit Pack Story Rendering Prototype — PR52 ✅
- [x] M5.5 Pack Story Rendering Parity Validation — PR53 ✅
- [x] M5.6 Pack Story Rendering Hardening — PR54 ✅
- [x] M5.7 Pack Runtime Integration Checkpoint — PR55 ✅
- [x] M6.0 Pack Loader Design RFC — PR56 ✅
- [x] M6.1 Read-only Pack Loader Skeleton — PR57 ✅
- [x] M6.2 Pack Loader CLI Integration — PR58 ✅
- [x] M6.3 Pack Loader Error Model Hardening — PR59 ✅
- [x] M6.4 Pack Loader Validation Contract — PR60 ✅
- [x] M6.5 Pack Loader Contract Regression Guard — PR61 ✅
- [x] M6.6 M6 Pack Loader Checkpoint — PR62 ✅
- [x] M7.0 Post-M6 Direction Decision RFC — PR63 ✅
- [x] M7.1 Pack Runtime Boundary Design — PR64 ✅
- [x] M7.2 Pack Runtime Context Inspection Hardening — PR65 ✅
- [x] M7.3 Pack Story Resolver / Loader Boundary Alignment Design — PR66 ✅
- [x] M7.4 Pack Runtime Boundary Smoke Checks — PR67 ✅
- [x] M7.5 Pack Runtime Boundary Checkpoint — PR68 ✅
- M7 Pack Runtime Boundary Deepening is COMPLETE.
- Next phase: M8 — Pack Runtime RFC / Post-M7 Platform Direction Decision
- [x] M8.0 Post-M7 Platform Direction RFC — PR69 ✅
- M8.0 selects Option A — Pack Runtime Contract Hardening.
- Next task: M8.1 Pack Runtime Contract Hardening Design
- [x] M8.1 Pack Runtime Contract Hardening Design — PR70 ✅
- M8.1 hardens Pack Runtime Contract through documentation.
- Next task: M8.2 PackRuntimeContext Contract Schema Documentation
- [x] M8.2 PackRuntimeContext Contract Schema Documentation — PR71 ✅
- M8.2 documents PackRuntimeContext conceptual schema (identity, metadata, governance, runtime, boundaries, sourceOfTruth, outputPolicy, validation).
- No executable schema validation. No JSON schema files. No runtime shape change.
- Next task: M8.3 Multi-Pack Discovery Assumptions Design — PR72 ✅
- M8.3 defines multi-pack discovery assumptions (9 areas).
- Next task: M8.4 Resolver Boundary & Error Semantics Design
### M5 — Pack Runtime Integration
- [x] M5.0 Pack Runtime Integration Design Note
- [x] M5.1 Pack Story Resolution Design Validation
- [x] M5.2 Pack Story CLI Contract Guard
- [x] M5.3 Read-only Pack Story Resolver
- [x] M5.4 Explicit Pack Story Rendering Prototype — PR52 ✅
- [x] M5.5 Pack Story Rendering Parity Validation — PR53 ✅
- [x] M5.6 Pack Story Rendering Hardening — PR54 ✅
- [x] M5.7 Pack Runtime Integration Checkpoint — PR55 ✅
- [x] M6.0 Pack Loader Design RFC — PR56 ✅
- [x] M6.1 Read-only Pack Loader Skeleton — PR57 ✅
- [x] M6.2 Pack Loader CLI Integration — PR58 ✅
- [x] M6.3 Pack Loader Error Model Hardening — PR59 ✅
- [x] M6.4 Pack Loader Validation Contract — PR60 ✅
- [x] M6.5 Pack Loader Contract Regression Guard — PR61 ✅
- [x] M6.6 M6 Pack Loader Checkpoint — PR62 ✅
- [ ] M5.8 Source-of-truth decision

### M5 — Intelligence
- [ ] Audience Engine adapts output per audience
- [ ] Hero sequences become audience-aware
- [ ] Automated quality checks

---

## Metrics

| Metric | Pre-PR23 | Post-PR31B |
|---|---|---|
| Adapter coverage | 3/15 types | 16/16 types (100%) |
| Legacy renderers in run.js | 16 functions | 16 functions (preserved as fallback) |
| Dead code removed | — | `dispatcher.js`, `dispatchLegacy()` |
| Default rendering path | 100% legacy | Adapter-first |
| Docs coverage | 2 files | 5 files |

---

## M9 — Contract Version Readiness

- [ ] M9.0 Contract Version Readiness Design — PR43 ✅
- [ ] M9.1 PackRuntimeContext Soft Validator Design — PR44 ✅
- [ ] M9.2 PackRuntimeContext Soft Validator Skeleton — PR45 ✅
- [ ] M9.3 Soft Validation Report Format Design — PR46 ✅
- [ ] M9.4 Soft Validation Report Writer Skeleton — PR47 ✅
- [ ] M9.5 Standalone Soft Validation Report Script — PR48 ✅
- [ ] M9.6 Soft Validation Checkpoint — PR49 ✅
- [ ] M9.7 Doctor Summary Preview Design — PR50 ✅
- [ ] M9.8 Package Script Entrypoint Design — PR51 ✅
- [x] M9.9 Package Script Entrypoint Implementation — PR52 ✅
- [ ] M9.10 Soft Validation Package Entrypoint Checkpoint — PR53 ✅
- [ ] M10.0 Hard Gate Readiness Design — PR55 ✅

## Rules for Future Work

1. **One PR = One Goal** — 每个 PR 只做一个明确的事情
2. **No Feature Creep** — 架构冻结期间不新增 PPT 功能
3. **Consistency Over Completeness** — 保持三个 Engine 结构一致
4. **Document First** — 新功能必须先更新 ARCHITECTURE.md 和 ROADMAP.md
5. **Test Before Ship** — 所有功能必须通过默认模式和 --layout-engine 双重验证
6. **RFC Governance** — Core 修改必须先有 RFC 批准。Pack/Application 修改不需要 RFC。详见 CONTRIBUTING.md Section 0
