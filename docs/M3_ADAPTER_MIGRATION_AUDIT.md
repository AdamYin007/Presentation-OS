# M3 Adapter Migration Audit

> **Date**: 2026-07-01
> **Author**: Agnes-2.0-Flash (Implementation Engineer / Code Auditor)
> **Scope**: `registry/packages/ppt-factory` — legacy renderers, layout adapters, layout engine, content engine
> **Governance**: RFC-0001 Section 0 (Core changes require RFC; adapter migration without Core behavior change does not)

---

## 1 Summary

This audit maps all 16 registered legacy renderers in `run.js` against the current adapter system. It identifies:

- **11 renderers** fully covered (planner + adapter): `cover`, `workflow`, `generic`, `recommendation`, `why-now`, `problem`, `governance`, `research`, `collaboration`, `roi`, `differentiation`
- **6 renderers** with planners only (no adapter): `governance`, `research`, `collaboration`, `roi`, `differentiation`
- **6 renderers** with neither planner nor adapter (pure legacy): `transformation`, `solution`, `architecture`, `roadmap`

The Content Engine is disconnected from the Layout Engine and Adapters — its output is never consumed. The dispatcher.js module exists but is not wired into run.js. Three custom comp methods (`platformHub`, `layeredArchitecture`, `timeline`) are used exclusively by pure-legacy renderers and have no adapter counterpart.

**Recommendation**: Migrate in 5 PRs, starting with the simplest adapters for planner-only renderers, then tackle pure-legacy renderers in order of complexity.

---

## 2 Current Rendering Architecture

### 2.1 Pipeline Flow

```
run.js (entry point)
  ├── Hero Engine (optional enrichment)
  ├── Layout Engine (optional, --layout-engine flag)
  │     ├── Content Engine (compileContent) → Layout Planners → Layout Plan
  │     └── Layout Planners → Layout Plan {zones, constraints, visual_hierarchy}
  ├── Layout Adapters (via dispatchAdapter)
  │     └── ADAPTERS registry: cover, executive-summary, workflow
  └── Legacy Renderers (fallback)
        └── registerLegacyRenderer() → 16 types
```

### 2.2 Key Observations

1. **Three parallel rendering paths exist**:
   - **Adapter path**: `useLayoutEngine=true` → `compileLayoutPlan()` → `dispatchAdapter()` → adapter function
   - **Legacy path**: `useLayoutEngine=false` → direct `renderSlide()` call → legacy renderer function
   - **Hybrid path**: `useLayoutEngine=true` but no adapter exists → falls back to legacy

2. **`createRendererEngine`** (renderer-engine/index.js) is the actual runtime dispatcher:
   - Tries adapter first (if `useLayoutEngine` is true and plan exists)
   - Falls back to `legacyRenderer` callback

3. **`dispatcher.js`** (renderer-engine/dispatcher.js) exists but is **NOT imported** by run.js. It provides error handling and logging but is dead code.

4. **Content Engine** (`compileContent`) is called by Layout Engine planners but its output is not passed to adapters. Only `executiveAdapter` reads `zone.content`.

### 2.3 File Inventory

| File | Purpose | Lines |
|---|---|---|
| `bin/run.js` | Entry point, 16 legacy renderers, registry wiring | 644 |
| `src/layout-adapters/index.js` | Adapter registry + `dispatchAdapter()` | 48 |
| `src/layout-adapters/cover.js` | Cover slide adapter | 80 |
| `src/layout-adapters/executive.js` | Executive summary adapter | 78 |
| `src/layout-adapters/workflow.js` | Workflow pipeline adapter | 96 |
| `src/renderer-engine/index.js` | `createRendererEngine()` — runtime dispatcher | 57 |
| `src/renderer-engine/dispatcher.js` | Error-handling dispatcher (dead code) | 41 |
| `src/renderer-engine/registry.js` | Legacy renderer registration | 58 |
| `src/layout-engine/index.js` | `compileLayoutPlan()` — layout planner entry | 51 |
| `src/layout-engine/planners/*.js` | 10 planner modules | varies |
| `src/content-engine/index.js` | `compileContent()` — content compiler | 37 |
| `src/content-engine/planners/*.js` | 2 content planner modules | varies |
| `src/layout/base.js` | `getSlide()`, `bg()` helpers | 26 |

## 3 Existing Adapter Coverage

### 3.1 Adapter Registry

The `ADAPTERS` object in `layout-adapters/index.js` contains 3 entries:

| Type | Adapter File | Has Planner | Covers Legacy |
|---|---|---|---|
| `cover` | `cover.js` | ✅ `planners/cover.js` | ✅ L86-111 (26 lines) |
| `executive-summary` | `executive.js` | ✅ `planners/executive.js` | ✅ L112-127 (16 lines) |
| `workflow` | `workflow.js` | ✅ `planners/workflow.js` | ✅ L225-273 (49 lines) |

### 3.2 Coverage Matrix

| Slide Type | Legacy Function | Lines | Planner | Adapter | Fully Covered |
|---|---|---|---|---|---|
| `cover` | `cover()` | L86-111 | ✅ | ✅ | ✅ YES |
| `executive-summary` | `executive()` | L112-127 | ✅ | ✅ | ✅ YES |
| `workflow` | `workflow()` | L225-273 | ✅ | ✅ | ✅ YES |
| `governance` | `governance()` | L274-316 | ✅ | ❌ | ⚠️ PLANNER ONLY |
| `research` | `research()` | L317-365 | ✅ | ❌ | ⚠️ PLANNER ONLY |
| `collaboration` | `collaboration()` | L366-411 | ✅ | ❌ | ⚠️ PLANNER ONLY |
| `roi` | `roi()` | L412-477 | ✅ | ❌ | ⚠️ PLANNER ONLY |
| `differentiation` | `differentiation()` | L478-543 | ✅ | ❌ | ⚠️ PLANNER ONLY |
| `recommendation` | `recommendation()` | L544-576 | ✅ | ✅ | ✅ YES |
| `generic` | `generic()` | L577-645 | ✅ | ✅ | ✅ YES |
| `why-now` | `whyNow()` | L128-144 | ❌ | ❌ | ❌ PURE LEGACY |
| `problem` | `problem()` | L145-161 | ❌ | ❌ | ❌ PURE LEGACY |
| `transformation` | `transformation()` | L162-181 | ❌ | ❌ | ❌ PURE LEGACY |
| `solution` | `platformHubSlide()` | L182-196 | ❌ | ❌ | ❌ PURE LEGACY |
| `architecture` | `layeredArchSlide()` | L197-210 | ❌ | ❌ | ❌ PURE LEGACY |
| `roadmap` | `roadmap()` | L211-224 | ❌ | ❌ | ❌ PURE LEGACY |

### 3.3 Adapter Quality Assessment

**`cover.js` adapter**: Reads `layoutPlan.zones` and `layoutPlan.visual_hierarchy` for positioning, but uses hardcoded values for brand panel dimensions (4.2 × 7.5) and text positions. Not fully plan-driven.

**`executive.js` adapter**: Fully plan-driven. Reads `cardWidthIn`, `cardHeightIn`, `maxCards`, `cardGapIn` from `plan.constraints`. Reads card content from `zone.content`. Most adapter-ready.

**`workflow.js` adapter**: Reads `cardWidthIn`, `cardHeightIn`, `hasArrows`, `hasBottomBar` from plan. But contains hardcoded step data (5 pipeline steps with Chinese text). Not plan-driven for content.

### 3.4 Dead Code

- **`dispatcher.js`**: Provides error-handling wrapper around adapter+legacy dispatch. Never imported by run.js. Safe to remove or integrate.
- **`registry.js`**: `registerLegacyRenderer()` and `getLegacyRenderer()` are called from run.js but the registry is only used in the legacyRenderer callback within `createRendererEngine`. The `dispatchLegacy()` function is never called.

## 4 Remaining Legacy Renderers

### 4.1 Planner-Only Renderers (7) — Need Adapter Creation

These have Layout Planners but no corresponding adapters. The planner produces a `Layout Plan` with zones, constraints, and visual_hierarchy. An adapter would read this plan and render the slide.

#### 4.1.1 `governance` — Closed-Loop Governance Quadrants

| Field | Value |
|---|---|
| Function | `governance()` |
| Lines | L274-316 |
| Slide Type | `governance` |
| Pattern | 4-quadrant cycle with arrows |
| Complexity Score | 7 |
| Difficulty | Medium |
| Risk | Medium |

**Comp calls**: `makeTitle(1)`, `card(x4)`, `addText(x5)`, `makeFooter(1)`
**Hardcoded data**: 4 quadrant titles/descriptions, arrow positions (tl/tr/br/bl)
**Dependencies**: `comp.card()`, `comp.makeTitle()`, `comp.makeFooter()`, `slide.addShape()`

**Migration approach**: 
1. Planner already exists (`planners/governance.js`) — produces zones for 4 quadrants
2. Adapter reads zone positions and renders cards at each position
3. Arrows between quadrants are decorative — can be encoded as zone metadata

**Target adapter file**: `src/layout-adapters/governance.js`

---

#### 4.1.2 `research` — Data Flywheel

| Field | Value |
|---|---|
| Function | `research()` |
| Lines | L317-365 |
| Slide Type | `research` |
| Pattern | Center hub + 4 orbiting cards with radial lines |
| Complexity Score | 10 |
| Difficulty | Medium |
| Risk | Medium |

**Comp calls**: `makeTitle(1)`, `card(x4)`, `addText(x2)`, `addShape(line x4)`, `addShape(ellipse x1)`
**Hardcoded data**: 4 capability labels (数字切片, 诊断标签, 病例数据, 标注集), center text (病理数据资产)
**Dependencies**: `comp.card()`, `comp.makeTitle()`, `slide.addShape(ellipse)`, `slide.addShape(line)`

**Migration approach**:
1. Planner already exists (`planners/research.js`) — produces zones for center hub and 4 orbiting cards
2. Adapter reads zone positions and renders ellipse + cards
3. Radial lines are computed from center-to-card vectors — can be derived from zone positions

**Target adapter file**: `src/layout-adapters/research.js`

---

#### 4.1.3 `collaboration` — Regional Network

| Field | Value |
|---|---|
| Function | `collaboration()` |
| Lines | L366-411 |
| Slide Type | `collaboration` |
| Pattern | Central hub + 4 satellite nodes with connecting lines |
| Complexity Score | 8 |
| Difficulty | Medium |
| Risk | Medium |

**Comp calls**: `makeTitle(1)`, `card(x4)`, `addText(x1)`, `addShape(roundRect x1)`, `addShape(line x4)`
**Hardcoded data**: 4 satellite labels (三甲医院, 社区医院, 县级医院, 乡镇卫生院), center text (区域病理中心)
**Dependencies**: `comp.card()`, `comp.makeTitle()`, `slide.addShape(roundRect)`, `slide.addShape(line)`

**Migration approach**: Same pattern as `research` — hub-and-spoke with computed lines.

**Target adapter file**: `src/layout-adapters/collaboration.js`

---

#### 4.1.4 `roi` — Value Bridge Pillars

| Field | Value |
|---|---|
| Function | `roi()` |
| Lines | L412-477 |
| Slide Type | `roi` |
| Pattern | 4 vertical pillars with color bars + bottom summary |
| Complexity Score | 10 |
| Difficulty | Medium |
| Risk | Medium |

**Comp calls**: `addText(x6)`, `addShape(roundRect x5)`, `addShape(rect x4)`
**Hardcoded data**: 4 pillar titles/metrics/descriptions, bottom bar text
**Dependencies**: `slide.addShape(roundRect)`, `slide.addShape(rect)`, `slide.addText()`

**Migration approach**:
1. Planner already exists (`planners/roi.js`) — produces zones for 4 pillars
2. Adapter reads pillar zones and renders colored top bars + text
3. Bottom bar is a full-width element — can be zone-based

**Target adapter file**: `src/layout-adapters/roi.js`

---

#### 4.1.5 `differentiation` — Comparison Matrix

| Field | Value |
|---|---|
| Function | `differentiation()` |
| Lines | L478-543 |
| Slide Type | `differentiation` |
| Pattern | 3-column comparison table (criteria vs traditional vs digital) |
| Complexity Score | 10 |
| Difficulty | Medium-High |
| Risk | Medium |

**Comp calls**: `addText(x11)`, `addShape(roundRect x12)`
**Hardcoded data**: 5 criteria rows, 3 column headers, alternating row colors
**Dependencies**: `slide.addShape(roundRect)`, `slide.addText()`

**Migration approach**:
1. Planner already exists (`planners/differentiation.js`) — produces zones for table cells
2. Adapter reads cell zones and renders rounded rectangles + text
3. This is the most complex planner-only renderer — table layout requires precise zone mapping

**Target adapter file**: `src/layout-adapters/differentiation.js`

---

#### 4.1.6 `recommendation` — Action Cards

| Field | Value |
|---|---|
| Function | `recommendation()` |
| Lines | L544-576 |
| Slide Type | `recommendation` |
| Pattern | 3 horizontal cards with emphasis bar |
| Complexity Score | 7 |
| Difficulty | Medium |
| Risk | Low |

**Comp calls**: `makeTitle(1)`, `card(x3)`, `addText(x1)`, `addShape(roundRect x1)`, `makeFooter(1)`
**Hardcoded data**: 3 action titles/descriptions/priorities, bottom emphasis text
**Dependencies**: `comp.card()`, `comp.makeTitle()`, `comp.makeFooter()`, `slide.addShape(roundRect)`

**Migration approach**:
1. Planner already exists (`planners/recommendation.js`) — produces zones for 3 cards
2. Simple card layout — straightforward adapter
3. Bottom emphasis bar can be a separate zone

**Target adapter file**: `src/layout-adapters/recommendation.js`

---

#### 4.1.7 `generic` — Default Fallback

| Field | Value |
|---|---|
| Function | `generic()` |
| Lines | L577-645 |
| Slide Type | `generic` |
| Pattern | 3 badge cards (generic fallback) |
| Complexity Score | 6 |
| Difficulty | Low |
| Risk | Low |

**Comp calls**: `makeTitle(1)`, `card(x3)`, `makeFooter(1)`
**Hardcoded data**: 3 card titles/descriptions/badges
**Dependencies**: `comp.card()`, `comp.makeTitle()`, `comp.makeFooter()`

**Migration approach**:
1. Planner already exists (`planners/generic.js`) — produces zones for 3 cards
2. Simplest adapter to create — just 3 cards in a row
3. This is the default fallback renderer; should be migrated early to reduce risk

**Target adapter file**: `src/layout-adapters/generic.js`

### 4.2 Pure Legacy Renderers (7) — Need Planner + Adapter

These have no planner and no adapter. They use custom comp methods (`platformHub`, `layeredArchitecture`, `timeline`) that are not available in the generic card system.

#### 4.2.1 `executive-summary` — Executive Takeaways

| Field | Value |
|---|---|
| Function | `executive()` |
| Lines | L112-127 |
| Pattern | 3 badge cards (horizontal row) |
| Complexity Score | 5 |
| Difficulty | Low |
| Risk | Low |

**Comp calls**: `makeTitle(1)`, `card(x3)`, `makeFooter(1)`
**Hardcoded data**: 3 takeaway cards with titles, descriptions, colors, badge numbers
**Dependencies**: `comp.card()`, `comp.makeTitle()`, `comp.makeFooter()`

**Note**: This is already adapter-covered by `executive.js` adapter! The adapter reads `zone.content` for card data. The legacy function has 3 cards with badges 01/02/03.

**Migration approach**: Already done — the `executive` adapter handles this slide type. The legacy renderer `executive()` is redundant if the adapter works correctly.

**Target**: Remove legacy `executive()` from run.js once adapter is verified.

---

#### 4.2.2 `why-now` — Why Now Cards

| Field | Value |
|---|---|
| Function | `whyNow()` |
| Lines | L128-144 |
| Pattern | 4 icon cards in a row |
| Complexity Score | 4 |
| Difficulty | Low |
| Risk | Low |

**Comp calls**: `makeTitle(1)`, `card(x4)`, `makeFooter(1)`
**Hardcoded data**: 4 items (诊断需求增长, 病理医生稀缺, AI 技术成熟, 区域协同需求) with icons (▲, 👤, ◆, ◎)
**Dependencies**: `comp.card()`, `comp.makeTitle()`, `comp.makeFooter()`

**Migration approach**:
1. Create `planners/why-now.js` — produces 4 zones with content
2. Create `adapters/why-now.js` — reads zones, renders cards with icon variant
3. Simplest pure-legacy to migrate

**Target files**: `src/layout-engine/planners/why-now.js`, `src/layout-adapters/why-now.js`

---

#### 4.2.3 `problem` — Problem Bottleneck Cards

| Field | Value |
|---|---|
| Function | `problem()` |
| Lines | L145-161 |
| Pattern | 2×2 icon cards grid |
| Complexity Score | 4 |
| Difficulty | Low |
| Risk | Low |

**Comp calls**: `makeTitle(1)`, `card(x4)`, `makeFooter(1)`
**Hardcoded data**: 4 bottleneck items (效率瓶颈, 质控瓶颈, 协同瓶颈, 数据瓶颈) with icons (⏱, ⚠, 🔗, 📊)
**Dependencies**: `comp.card()`, `comp.makeTitle()`, `comp.makeFooter()`

**Migration approach**: Same as `why-now` — 4 cards in 2×2 grid. Planner produces zones with positions.

**Target files**: `src/layout-engine/planners/problem.js`, `src/layout-adapters/problem.js`

---

#### 4.2.4 `transformation` — 3-Step Transformation with Arrows

| Field | Value |
|---|---|
| Function | `transformation()` |
| Lines | L162-181 |
| Pattern | 3 cards with → arrows between them |
| Complexity Score | 6 |
| Difficulty | Medium |
| Risk | Medium |

**Comp calls**: `makeTitle(1)`, `card(x3)`, `addText(x2)`, `makeFooter(1)`
**Hardcoded data**: 3 stages (硬件数字化, 平台流程化, AI 智能化) with icons (📷, ⚙, 🧠)
**Dependencies**: `comp.card()`, `comp.makeTitle()`, `comp.makeFooter()`, `slide.addText()`

**Migration approach**:
1. Create planner producing 3 zones + arrow metadata
2. Adapter renders cards and arrow text between them
3. Arrows are simple text characters — easy to encode in plan

**Target files**: `src/layout-engine/planners/transformation.js`, `src/layout-adapters/transformation.js`

---

#### 4.2.5 `solution` — Platform Hub Diagram

| Field | Value |
|---|---|
| Function | `platformHubSlide()` |
| Lines | L182-196 |
| Pattern | Hub-and-spoke diagram |
| Complexity Score | 3 |
| Difficulty | High |
| Risk | High |

**Comp calls**: `makeTitle(1)`, `platformHub(x1)`, `makeFooter(1)`
**Hardcoded data**: Hub label (数字病理软件平台), 6 spokes (LIS, 扫描仪, AI 模型, 数字阅片, 质控, 归档/会诊)
**Dependencies**: `comp.platformHub()` — custom component NOT in generic card system

**Migration approach**:
1. `comp.platformHub()` is a complex custom component with auto-layout
2. Adapter cannot use generic card system — needs custom rendering logic
3. This is the highest-risk pure-legacy migration

**Target files**: `src/layout-engine/planners/solution.js`, `src/layout-adapters/solution.js`

---

#### 4.2.6 `architecture` — Layered Architecture Diagram

| Field | Value |
|---|---|
| Function | `layeredArchSlide()` |
| Lines | L197-210 |
| Pattern | Stacked layers with side panel |
| Complexity Score | 4 |
| Difficulty | High |
| Risk | High |

**Comp calls**: `makeTitle(1)`, `layeredArchitecture(x1)`, `makeFooter(1)`
**Hardcoded data**: 4 layers (应用层, 平台层, 数据层, 连接层) with Roman numeral side labels
**Dependencies**: `comp.layeredArchitecture()` — custom component NOT in generic card system

**Migration approach**:
1. `comp.layeredArchitecture()` is a complex custom component
2. Similar risk to `solution` — requires custom rendering logic
3. Could potentially be simplified to stacked cards if the custom component is refactored

**Target files**: `src/layout-engine/planners/architecture.js`, `src/layout-adapters/architecture.js`

---

#### 4.2.7 `roadmap` — Timeline with Arrows

| Field | Value |
|---|---|
| Function | `roadmap()` |
| Lines | L211-224 |
| Pattern | 4-stage timeline |
| Complexity Score | 4 |
| Difficulty | Medium-High |
| Risk | Medium |

**Comp calls**: `makeTitle(1)`, `timeline(x1)`, `makeFooter(1)`
**Hardcoded data**: 4 stages (扫描阅片, 平台协同, AI 应用, 区域运营) with colors
**Dependencies**: `comp.timeline()` — custom component for horizontal timeline

**Migration approach**:
1. `comp.timeline()` is a custom component with arrow connectors
2. Planner produces stage zones with sequential ordering
3. Adapter renders timeline with connecting arrows

**Target files**: `src/layout-engine/planners/roadmap.js`, `src/layout-adapters/roadmap.js`

## 5 Migration Priority

### 5.1 Prioritization Rules (per RFC-0001 Governance)

1. **Low-risk first**: Migrate simple card-based renderers before complex diagram renderers
2. **2-3 renderers per PR**: Avoid large-bang migrations
3. **Planner-only before pure-legacy**: Adapters for planner-only renderers are simpler (planner already exists)
4. **No executive/complex first**: Do not migrate `solution`, `architecture`, `roadmap` until baseline is stable
5. **Preserve behavior**: Adapter must produce identical output to legacy renderer

### 5.2 Priority Matrix

| Priority | Slide Types | Count | Reason |
|---|---|---|---|
| P0 (Immediate) | `generic`, `recommendation` | 2 | Lowest complexity, simple card layouts |
| P1 | `why-now`, `problem` | 2 | Simple card layouts, no custom components |
| P2 | `governance`, `research` | 2 | Medium complexity, some geometry computation |
| P3 | `collaboration`, `roi`, `differentiation` | 3 | Higher complexity, table/hub layouts |
| P4 | `transformation`, `roadmap` | 2 | Arrow connectors, custom comp methods |
| P5 | `solution`, `architecture` | 2 | Custom components (platformHub, layeredArchitecture) |

### 5.3 Complexity Summary

| Category | Count | Avg Complexity | Est Effort |
|---|---|---|---|
| Full coverage (already migrated) | 3 | — | 0 PRs |
| Planner-only (need adapter) | 7 | Medium | 3 PRs |
| Pure legacy (need planner + adapter) | 7 | Medium-High | 4 PRs |
| Total to migrate | 14 | — | 7 PRs |

## 6 Proposed PR Batches

### PR23 — Low-risk adapter migration batch 1 (generic + recommendation)

**Files to create**:
- `src/layout-adapters/generic.js` — 3 badge cards
- `src/layout-adapters/recommendation.js` — 3 action cards + bottom emphasis bar
- Update `src/layout-adapters/index.js` — register 2 new adapters

**Files to verify** (planners already exist):
- `src/layout-engine/planners/generic.js`
- `src/layout-engine/planners/recommendation.js`

**Risk**: Low. Both use only `comp.card()`, `comp.makeTitle()`, `comp.makeFooter()`.

**Estimated effort**: 2 hours

---

### PR24 — Low-risk adapter migration batch 2 (why-now + problem)

**Files to create**:
- `src/layout-engine/planners/why-now.js` — 4 icon cards row layout
- `src/layout-engine/planners/problem.js` — 2×2 icon cards grid layout
- `src/layout-adapters/why-now.js`
- `src/layout-adapters/problem.js`
- Update `src/layout-adapters/index.js` — register 2 new adapters

**Risk**: Low. Both use only `comp.card()`, `comp.makeTitle()`, `comp.makeFooter()`.

**Estimated effort**: 3 hours

---

### PR25 — Medium-risk adapter migration (governance + research + collaboration)

**Files to create**:
- `src/layout-adapters/governance.js` — 4 quadrant cards with cycle arrows
- `src/layout-adapters/research.js` — center hub + 4 orbiting cards with radial lines
- `src/layout-adapters/collaboration.js` — central hub + 4 satellites with lines
- Update `src/layout-adapters/index.js` — register 3 new adapters

**Risk**: Medium. Requires geometry computation for radial/hub-and-spoke layouts.

**Estimated effort**: 4 hours

---

### PR26 — Medium-high risk adapter migration (roi + differentiation)

**Files to create**:
- `src/layout-adapters/roi.js` — 4 vertical pillars with colored bars
- `src/layout-adapters/differentiation.js` — 3-column comparison table
- Update `src/layout-adapters/index.js` — register 2 new adapters

**Risk**: Medium-High. Table layout (differentiation) is the most complex planner-only case.

**Estimated effort**: 4 hours

---

### PR27 — run.js renderer cleanup

**Files to modify**:
- `bin/run.js` — remove legacy renderers that have adapters
- `src/renderer-engine/registry.js` — remove registrations for migrated renderers
- `src/renderer-engine/dispatcher.js` — integrate or remove (dead code decision)

**Risk**: Medium. Requires careful testing that adapter path works for all migrated types.

**Estimated effort**: 2 hours

---

### PR28+ — Pure legacy migration (executive-summary, transformation, solution, architecture, roadmap)

These are deferred to a separate phase because:
1. `executive-summary` is already adapter-covered
2. `solution` and `architecture` use custom comp methods (`platformHub`, `layeredArchitecture`)
3. `transformation` and `roadmap` use `comp.timeline()`

**Risk**: High. Requires new custom component adapters or refactoring of comp methods.

**Estimated effort**: 8-12 hours across 3-4 PRs

## 7 Risks

### 7.1 Behavioral Regression Risk

**HIGH**: Adapters must produce pixel-identical output to legacy renderers. Any deviation in positioning, sizing, or color will be visible in the final PPTX.

**Mitigation**: 
- Compare PPTX output side-by-side for each migrated slide type
- Use `--layout-engine` flag to test adapter path independently
- Keep legacy renderers as fallback until adapter is verified

### 7.2 Content Engine Disconnection

**MEDIUM**: The Content Engine (`compileContent`) is called by Layout Engine planners but its output is never consumed by adapters. Only `executiveAdapter` reads `zone.content`. This means:

- Content Engine output is effectively dead code in the adapter path
- Adapters must either read from `zone.content` (requires Content Engine output in plan) or duplicate content logic

**Recommendation**: Either wire Content Engine output into Layout Plans, or accept that adapters will contain content logic (like `workflow.js` currently does).

### 7.3 Custom Component Dependencies

**HIGH**: Three pure-legacy renderers use custom comp methods not available in the generic system:
- `comp.platformHub()` — hub-and-spoke diagram
- `comp.layeredArchitecture()` — stacked layers with side panel
- `comp.timeline()` — horizontal timeline with arrows

These cannot be expressed as generic `comp.card()` layouts. Each requires either:
1. A dedicated adapter method (custom rendering logic)
2. Refactoring the comp method to be plan-driven

### 7.4 Dead Code Accumulation

**LOW**: `dispatcher.js` and `registry.dispatchLegacy()` are never called. The legacy registry pattern adds cognitive overhead without benefit.

**Recommendation**: Clean up dead code in the same PR batches as migration.

## 8 Architecture Debt

### 8.1 Content Engine Not Wired to Adapters

The Content Engine compiles semantic content (cards, headlines, support text) but this output is not passed to adapters. The Layout Engine's `compileContent()` call in `compileLayoutPlan()` produces content, but adapters don't read it.

**Impact**: Adapters must either duplicate content logic or the Content Engine must be integrated into the Layout Plan.

**Resolution**: Decide whether Content Engine is a planning concern (output goes into Layout Plan zones) or a rendering concern (output is consumed directly by adapters). Currently neither — it's orphaned.

### 8.2 dispatcher.js Is Dead Code

`renderer-engine/dispatcher.js` provides error handling and logging for the adapter+legacy dispatch but is never imported. `createRendererEngine` in `index.js` does the dispatch inline without error handling.

**Resolution**: Either integrate `dispatcher.js` error handling into `createRendererEngine` or remove it.

### 8.3 Hardcoded Content in Adapters

`workflow.js` adapter contains hardcoded pipeline step data (5 Chinese labels). `cover.js` adapter uses hardcoded brand panel dimensions. This violates the plan-driven principle.

**Resolution**: Move hardcoded content into Layout Plans or Content Engine output.

## 9 Recommendation

### 9.1 Immediate Actions

1. **Merge this audit into the project** — `docs/M3_ADAPTER_MIGRATION_AUDIT.md`
2. **Start with PR23** — Migrate `generic` and `recommendation` adapters (lowest risk, 2 slide types)
3. **Decide on Content Engine wiring** — Before starting PR23, decide if Content Engine output should flow into Layout Plans

### 9.2 Do Not Start Yet

1. **Pure-legacy renderers** (`executive-summary`, `why-now`, `problem`, `transformation`, `solution`, `architecture`, `roadmap`) — defer to PR28+
2. **Custom comp method refactoring** (`platformHub`, `layeredArchitecture`, `timeline`) — defer until baseline adapters are stable
3. **Dead code cleanup** (`dispatcher.js`, `dispatchLegacy()`) — can be done alongside migration PRs

### 9.3 Governance Compliance

This audit does not propose any Core API changes. All migration is within the adapter system (Presentation Pack scope per RFC-0001 Section 0). No RFC amendment is required.

If migration reveals that Core APIs need extension (e.g., Content Engine must be wired into Layout Plans), that will be reported as Architecture Debt requiring RFC review.

