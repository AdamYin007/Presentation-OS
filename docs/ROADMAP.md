# AWE Presentation OS — Roadmap

> **Version**: 1.0.0  
> **Date**: 2026-06-30  
> **Status**: Architecture Frozen v1

---

## Current Status (2026-06-30)

### Completed Components

| Component | Status | PR | Details |
|---|---|---|---|
| **Story Layer** | ✅ Done | — | JSON-driven slide definition, 15 slide types |
| **Hero Engine** | ✅ Done | PR10 | `enrichStoryWithHero()`, `--hero` flag |
| **Content Engine** | ✅ Done | PR14 | `compileContent()`, registry + dispatch, `planners/` split |
| **Layout Engine** | ✅ Done | PR11, PR15 | `compileLayoutPlan()`, `planners/` split (10 types) |
| **Theme Engine Core** | ✅ Done | PR9 | `createTheme()`, `getTheme()`, `resolveColor()`, `applyTypography()` |
| **Renderer Engine** | ✅ Done | PR16 | `createRendererEngine()`, adapter-first + legacy fallback |
| **Workflow Adapter** | ✅ Done | PR5 | Pipeline layout from plan, covers `workflow` type |
| **Cover Adapter** | ✅ Done | PR6 | Brand panel + hero statement from plan, covers `cover` type |
| **Executive Adapter** | ✅ Done | PR13 | Badge cards from plan, covers `executive-summary` type |
| **Adapter Registry** | ✅ Done | PR15 | `ADAPTERS` object lookup, `dispatchAdapter()` |
| **Legacy Registry** | ✅ Done | PR16 | `registerLegacyRenderer()`, centralized management |
| **Architecture Docs** | ✅ Done | PR17 | This document + ARCHITECTURE.md |

### In Progress

| Component | Status | Details |
|---|---|---|
| **Adapter Coverage** | 3/15 types | Cover, Executive, Workflow implemented |
| **Legacy Migration** | 0/16 functions | All legacy renderers still in run.js |

### Planned

| Component | Priority | Description |
|---|---|---|
| **Adapter Migration** | High | Migrate remaining legacy renderers to adapters |
| **Content Data Migration** | High | Migrate story JSON data to Content Engine planners |
| **Presentation Compiler** | Medium | Optimize render instructions, batch calls, cache plans |
| **Audience Engine** | Medium | Adapt output based on `story.audience` metadata |
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

### M2 — Architecture Freeze v1 (Current)
- [x] Content Engine Phase 1
- [x] Renderer Engine Phase 1
- [x] Module Split (planners/, registry pattern)
- [x] Architecture Documentation
- [x] Consistent Engine Structure

### M3 — Adapter Migration (Next)
- [ ] Migrate 10+ legacy renderers to adapters
- [ ] Achieve 10+ adapter coverage
- [ ] Reduce run.js legacy functions by 50%

### M4 — Content & Compiler
- [ ] Content Engine covers all 15 slide types
- [ ] Presentation Compiler batches render calls
- [ ] Layout Plan caching

### M5 — Intelligence
- [ ] Audience Engine adapts output per audience
- [ ] Hero sequences become audience-aware
- [ ] Automated quality checks

---

## Metrics

| Metric | Current | M3 Target | M5 Target |
|---|---|---|---|
| Adapter coverage | 3/15 types | 10/15 types | 15/15 types |
| Legacy renderers in run.js | 16 functions | 8 functions | 0 functions |
| Plan-driven rendering | 20% | 70% | 100% |
| Architecture debt items | 5 | 3 | 1 |
| Docs coverage | 2 files | 3 files | 5 files |

---

## Rules for Future Work

1. **One PR = One Goal** — 每个 PR 只做一个明确的事情
2. **No Feature Creep** — 架构冻结期间不新增 PPT 功能
3. **Consistency Over Completeness** — 保持三个 Engine 结构一致
4. **Document First** — 新功能必须先更新 ARCHITECTURE.md 和 ROADMAP.md
5. **Test Before Ship** — 所有功能必须通过默认模式和 --layout-engine 双重验证
