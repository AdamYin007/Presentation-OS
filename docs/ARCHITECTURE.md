# AWE Presentation OS — Architecture v2

> **Version**: 2.0.0
> **Date**: 2026-07-19
> **Status**: Production-ready baseline + Optimization Layer Active

---

## 1. System Overview

### 1.1 Pipeline Data Flow

```
Markdown / Source Document
        │
        ▼
┌──────────────────┐
│  Ingest          │  M12.1
│  document-ingest │
└────────┬─────────┘
         │ SourceDocumentModel
         ▼
┌──────────────────┐
│  Intent Parser   │  M12.2
│  intent-parser   │
└────────┬─────────┘
         │ PresentationIntent
         ▼
┌──────────────────┐
│  Story Planner   │  M12.3
│  story-planner   │
└────────┬─────────┘
         │ DeckPlan
         ▼
┌──────────────────┐
│  SlideSpec Gen   │  M12.4
│  slidespec       │
└────────┬─────────┘
         │ SlideSpec[]
         │
         ├──── [M12.25 Audience Engine] ────▶ Adapted SlideSpec[]
         │     (speaker × audience)
         │
         ▼
┌──────────────────┐
│  Theme-Layout    │  M12.5
│  theme-layout    │
└────────┬─────────┘
         │ LayoutPlan[]
         │
         ├──── [M12.24 Presentation Compiler] ──▶ Render Plan[]
         │      (overflow / pagination / dedup)
         │
         ▼
┌──────────────────┐
│  PPTX Renderer   │  M12.6
│  pptx-renderer   │
└────────┬─────────┘
         │ .pptx buffer
         ▼
┌──────────────────┐
│  Quality Gates   │  M12.8–17
│  QA / Visual /   │
│  Accessibility   │
└──────────────────┘
```

### 1.2 Monorepo Package Map

```
packages/
├── document-ingest/          # M12.1 — Markdown/text ingestion
├── intent-parser/            # M12.2 — Prompt → PresentationIntent
├── story-planner/            # M12.3 — Intent → DeckPlan
├── slidespec/                # M12.4 — DeckPlan → SlideSpec[]
├── presentation-audience-engine/  # M12.25 — Speaker × Audience adaptation
├── theme-layout/             # M12.5 — SlideSpec[] → LayoutPlan[]
├── presentation-compiler/    # M12.24 — Global optimization layer
├── pptx-renderer/            # M12.6 — LayoutPlan[] → .pptx buffer
├── presentation-pipeline/    # M12.7 — End-to-end orchestrator
├── brand-profiles/           # M12.20 — Brand template profiles
├── logo-safe-area-gate/      # M12.19 — Logo safe area enforcement
├── pixel-accessibility-gate/ # M12.17 — Pixel contrast & color blindness
├── visual-design-gate/       # M12.16 — Visual design standards
├── presentation-revision/    # M12.9 — Natural language revision
└── cli/                      # M12.11 — CLI skill packaging
```

---

## 2. Architecture Layers

### Layer 1 — Story Layer (M12.3)

**职责**：唯一数据源。定义幻灯片结构。

**位置**：`packages/story-planner/`

**输入**：`PresentationIntent` + `SourceDocumentModel`
**输出**：`DeckPlan { name, purpose, narrativePattern, slides: [...] }`

**核心函数**：
- `planDeck(intent, sourceDocument)` — 根据意图和源文档规划幻灯片结构
- `selectNarrativePattern(purpose)` — 选择叙事模式（teaching/persuade/review/summarize/inform）

**规则**：
- 不执行渲染
- 不依赖 theme、layout、brand
- 纯数据模型

---

### Layer 2 — Content Engine (M12.4)

**职责**：组织每页的内容数据模型。

**位置**：`packages/slidespec/`

**输入**：`DeckPlan`
**输出**：`SlideSpec[]`

**核心函数**：
- `generateSlideSpecs(deckPlan)` — 将 DeckPlan 映射为 SlideSpec 数组
- `mapDeckPlanToSlideSpec(slidePlan, deckPlan)` — 单页映射

**约束**：
- 不输出任何视觉信息
- 不依赖 theme、layout、hero
- 纯数据模型

---

### Layer 3 — Audience Engine (M12.25)

**职责**：看人下菜碟。根据讲者身份和听众特征双向动态调整内容深度、术语层级、视觉优先级。

**位置**：`packages/presentation-audience-engine/`

**输入**：`SlideSpec[]` + `{ speaker: string, audience: string, customRules?: object }`
**输出**：`AdaptationResult { contract, slideAdjustments, deckHints, assumptions }`

**核心函数**：
- `adaptDeck(slideSpecs, deckMetadata, options)` — 主入口，返回适配计划
- `resolveSpeakerProfile(profile)` — 解析讲者画像（executive / manager / specialist / student / general_public）
- `resolveAudienceRole(role)` — 解析听众角色（board / executives / managers / engineers / students / investors / customers / general）
- `deriveContract(speaker, audience)` — 基于讲者权威性和听众时间预算推导适配合同
- `applySlideAdjustments(slideSpecs, adjustments)` — 将适配结果应用到 SlideSpec

**8 个适配维度**：

| Dimension | Values | Driven By |
|-----------|--------|-----------|
| `titleDepth` | executive / professional / educational / technical | 讲者权威性 × 听众时间预算 |
| `bodyDetailLevel` | minimal / moderate / detailed | 讲者权威性 × 听众时间预算 |
| `terminology` | business / professional / technical / educational | 听众专业度 |
| `visualPriority` | high / medium / low | 讲者权威性 |
| `emphasis` | financial / operational / strategic / technical | 讲者权威性 |
| `speakerNotesTone` | organized / conversational / formal / detailed | 讲者权威性 |
| `metricDepth` | summary / insight / granular | 听众专业度 |
| `narrativeAngle` | problem-solution / data-driven / chronological / comparative | 讲者权威性 |

**权重逻辑**：
- **听众专业度** 决定 terminology 和 metricDepth
- **讲者权威性** 决定 titleDepth、bodyDetailLevel、emphasis、notesTone
- **听众时间预算** 降低 titleDepth 和 bodyDetailLevel
- **讲者权威性低** 时提升 titleDepth（弥补可信度缺口）

**规则**：
- Opt-in：`opts.audienceEngine` 存在时才激活
- Non-destructive：返回 `AdaptationResult`，不修改原始 SlideSpec
- Pipeline 在调用方决定是否应用 `slideAdjustments`
- 未知 profile 不崩溃，记录 warning 并使用默认值

**CLI**：`--audience <role>` + `--speaker <profile>`

---

### Layer 4 — Hero Engine (Legacy / Optional)

**职责**：叙事增强。将 hero sequence 注入到 slide 数据中。

**位置**：`packages/story-planner/src/narrative-patterns.js` + legacy `enrichStoryWithHero()`

**核心函数**：
- `enrichStoryWithHero(story, heroSequence, options)` — 合并 hero 叙事层
- `options.overrideTitle: true` — hero 语句优先于原始标题

**触发**：`--hero` 标志

**规则**：
- 默认模式不激活
- 注入字段：`slide.hero.pattern_id`, `slide.hero.statement`, `slide.hero.visual_focus`
- Hero sequences 尚未接入 Audience Engine（M5 Intelligence 待完成）

---

### Layer 5 — Layout Engine (M12.5)

**职责**：空间规划。为每页幻灯片生成 Layout Plan。

**位置**：`packages/theme-layout/`

**输入**：`SlideSpec[]`（可选：Audience Engine 适配后的版本）
**输出**：`LayoutPlan[]`

**文件结构**：
```
theme-layout/
├── src/
│   ├── index.js          # generateLayoutPlan()
│   ├── schema.js         # LAYOUT_FAMILIES, THEME_TOKENS, DEFAULT_THEME
│   └── generator.js      # resolveLayout(), selectTheme(), generateColorPalette()
```

**Layout Plan 结构**：
```json
{
  "flow": "CENTERED | PIPELINE | QUADRANT | RADIAL | GRID | MATRIX | LINEAR",
  "density": "SPARSE | MODERATE | DENSE",
  "zones": [{ "position": "...", "priority": 1, "span": "full|half", "label": "..." }],
  "visual_hierarchy": { "primary": "...", "secondary": "...", "tertiary": "..." },
  "constraints": { "canvas": { "w": 12.8, "h": 7.2 }, "grid": "...", "card": "..." }
}
```

**核心函数**：
- `generateLayoutPlan(slideSpecs, options)` — 输入 slide specs，输出 validated Layout Plan 数组
- `resolveLayout(slideSpec)` — 根据 role + density + visualType 选择 layout family
- `selectTheme(deckMetadata)` — 根据 deck metadata 选择主题风格
- `generateColorPalette(themeName, slideSpec, themeTokensOverride)` — 生成颜色调色板

**约束**：
- 不执行渲染
- 不访问 pptxgenjs
- 不依赖 theme（仅使用固定尺寸）

---

### Layer 6 — Presentation Compiler (M12.24)

**职责**：全局优化调度器。在 layout planning 之后、rendering 之前，检测溢出、自动分页、去重资源、求解布局冲突，生成优化后的 Render Plan。

**位置**：`packages/presentation-compiler/`

**输入**：`LayoutPlan[]` + `SlideSpec[]` + `{ mode: 'fast'|'standard'|'optimized' }`
**输出**：`CompileResult { renderPlan, analysis, warnings }`

**7 阶段 Pipeline**：

| Stage | Function | Responsibility |
|-------|----------|----------------|
| 1. Input Analyzer | `analyzeInput()` | 统计 slide 数量、类型分布、内容密度 |
| 2. Constraint Solver | `solveConstraints()` | 调和布局/主题/可访问性冲突 |
| 3. Overflow Detector | `detectOverflow()` | 检测 bullet 过载、长标题、内容溢出 |
| 4. Pagination Manager | `paginateContent()` | 自动分页，添加 `continued...` 标记 |
| 5. Theme Resolver | `resolveThemeFonts()` | 统一字体映射，减少变体 |
| 6. Resource Optimizer | `optimizeResources()` | 跨页图表/图标去重缓存 |
| 7. Render Plan Generator | `generateRenderPlan()` | 输出最终 Render Plan |

**三种编译模式**：

| Mode | Flag | Behavior |
|------|------|----------|
| Fast | （未启用） | 零开销，直接透传 LayoutPlan |
| Standard | `--compiler` | 溢出检测 + 字体映射 + 警告 |
| Optimized | `--optimize` | 全量约束求解 + 分页 + 去重 + 无障碍检查 |

**规则**：
- Opt-in：`opts.compiler` 存在且非 false 时才激活
- Graceful degradation：缺失 `layoutPlan` 时记录 warning 但不崩溃
- 分页后标记 `continued...`，跨页内容不丢失
- 重复图表/图标只渲染一次，通过 hash 缓存

**CLI**：`--compiler`（standard）或 `--optimize`（optimized）

---

### Layer 7 — Renderer Engine (M12.6)

**职责**：消费 Layout Plan 并执行实际 PPTX 渲染。

**位置**：`packages/pptx-renderer/`

**输入**：`LayoutPlan[]` + （可选）Compiler Render Plan
**输出**：`.pptx` Buffer

**核心函数**：
- `renderPptx(layoutPlans, options)` — 渲染完整 PPTX
- `generateBuffer(layoutPlans, options)` — 生成 pptxgenjs buffer

**工作流程**：
1. Adapter-first：优先查找对应 slide type 的 adapter
2. Adapter 返回成功 → 跳过 legacy
3. Adapter 失败或未找到 → fallback 到 legacy renderer
4. Compiler Render Plan 覆盖默认布局参数

**约束**：
- 只做调度，不包含任何渲染代码
- 错误在 dispatcher 中捕获并记录，不中断流程

---

## 3. Platform Strategy

### Presentation OS = Core + Presentation Packs + Applications

```
Presentation OS
├── Core (domain-agnostic engines)
├── Presentation Packs (industry knowledge)
└── Applications (packaged solutions)
```

**Core**
- Contains only domain-agnostic engines
- Knows nothing about any industry
- Provides Presentation Computing only
- Never changes for a specific domain

**Presentation Packs**
- Carry industry-specific knowledge
- Sit on top of the Core
- Can be added, removed, or replaced independently
- May contain story templates, hero patterns, content planners, theme variants, charts, icons, terminology, validation rules, best practices, example decks

**Applications**
- Packaged solutions combining Core + Domain Pack(s)
- Examples: PPT Factory, Medical Proposal Generator, Investor Deck Builder

### Core Platform Contents

| Engine | Package | Responsibility | Milestone |
|--------|---------|----------------|-----------|
| Document Ingest | `document-ingest` | Parse markdown/plain text into SourceDocumentModel | M12.1 |
| Intent Parser | `intent-parser` | Extract topic, purpose, tone, style from prompt | M12.2 |
| Story Planner | `story-planner` | Generate DeckPlan from intent + source doc | M12.3 |
| SlideSpec Generator | `slidespec` | Map DeckPlan to page-level contracts | M12.4 |
| Audience Engine | `presentation-audience-engine` | Speaker × Audience dynamic adaptation | M12.25 |
| Theme-Layout | `theme-layout` | Spatial planning + theme tokens | M12.5 |
| Presentation Compiler | `presentation-compiler` | Global optimization + Render Plan | M12.24 |
| PPTX Renderer | `pptx-renderer` | Adapter-first rendering to .pptx | M12.6 |
| Pipeline Orchestrator | `presentation-pipeline` | End-to-end chain coordination | M12.7 |
| Brand Profiles | `brand-profiles` | Template profile packs + resolution | M12.20 |
| Logo Safe Area | `logo-safe-area-gate` | Logo boundary enforcement | M12.19 |
| Pixel Accessibility | `pixel-accessibility-gate` | Contrast + color blindness checks | M12.17 |
| Visual Design | `visual-design-gate` | Visual design standards gate | M12.16 |
| Revision | `presentation-revision` | Natural language slide revision | M12.9 |

### Presentation Pack Examples

| Pack | Industry |
|------|----------|
| Medical AI | Artificial intelligence in medicine |
| Digital Pathology | Digital pathology workflows |
| Medical Devices | Ultrasound bone scalpel, surgical robots |
| Finance | Investment, board, market analysis |
| Consulting | Strategy consulting presentations |
| Education | Academic and teaching materials |
| Sales | Product sales and proposals |
| Research | Academic research communication |
| Government | Government reporting and proposals |

### Third-Party Extensions

The Core Platform is designed to allow third-party Presentation Pack development:
- Third-party companies can build industry-specific packs
- Consulting firms can create branded presentation packs
- Hospitals can develop internal presentation packs
- Individual developers can contribute to the ecosystem

---

## 4. File Structure (Monorepo)

```
packages/
├── document-ingest/
│   ├── package.json
│   └── src/
│       ├── index.js          # ingestDocument(), detectFormat()
│       ├── schema.js         # SourceDocumentModel
│       ├── plain-text.js
│       └── markdown.js
├── intent-parser/
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── parser.js         # parsePresentationIntent()
│       └── schema.js         # PresentationIntent contract
├── story-planner/
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── planner.js        # planDeck(), validateDeckPlan()
│       ├── schema.js
│       └── narrative-patterns.js
├── slidespec/
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── generator.js      # generateSlideSpecs()
│       └── schema.js
├── presentation-audience-engine/
│   ├── package.json
│   └── src/
│       ├── index.js          # adaptDeck()
│       ├── schema.js         # ADAPTATION_DIMENSIONS, profiles
│       └── engine.js         # resolveSpeakerProfile(), deriveContract()
├── theme-layout/
│   ├── package.json
│   └── src/
│       ├── index.js          # generateLayoutPlan()
│       ├── schema.js         # LAYOUT_FAMILIES, THEME_TOKENS
│       └── generator.js      # resolveLayout(), selectTheme()
├── presentation-compiler/
│   ├── package.json
│   └── src/
│       ├── index.js          # compilePresentation()
│       ├── schema.js         # COMPILER_MODES, RenderPlan
│       └── compiler.js       # 7-stage optimization pipeline
├── pptx-renderer/
│   ├── package.json
│   └── src/
│       ├── index.js          # renderPptx(), generateBuffer()
│       ├── renderer.js       # adapter dispatch + legacy fallback
│       └── schema.js         # SlideSpec contract
├── presentation-pipeline/
│   ├── package.json
│   └── src/
│       ├── index.js
│       └── pipeline.js       # runPipeline() orchestrator
├── brand-profiles/
│   ├── package.json
│   └── src/
│       ├── index.js          # loadProfile(), resolveBrandConfig()
│       ├── loader.js
│       ├── schema.js
│       └── builtins.js
├── logo-safe-area-gate/
│   ├── package.json
│   └── src/
│       └── index.js          # checkLogoSafeArea()
├── pixel-accessibility-gate/
│   ├── package.json
│   └── src/
│       └── index.js          # pixel contrast + color blindness
├── visual-design-gate/
│   ├── package.json
│   └── src/
│       └── index.js          # visual design standards
├── presentation-revision/
│   ├── package.json
│   └── src/
│       ├── index.js          # reviseDeck()
│       └── revision-parser.js
├── presentation-components/
│   ├── package.json
│   └── src/
│       └── index.js          # comp.card(), comp.timeline(), etc.
└── cli/
    ├── package.json
    └── src/
        └── index.js          # awe / awe-dev CLI entrypoints
```

---

## 5. Key Principles

### 5.1 Opt-In, Zero Default Change

- 不加任何 flag → 行为与 v1 完全一致
- 所有新能力都是 opt-in
- Compiler 通过 `--compiler` / `--optimize` 控制
- Audience Engine 通过 `--audience` / `--speaker` 控制
- `--hero` 控制 Hero Engine

### 5.2 Non-Destructive Adaptation

- Audience Engine 返回 `AdaptationResult`，不修改原始 SlideSpec
- Pipeline 在调用方决定是否应用 `slideAdjustments`
- Compiler 返回 `CompileResult`，不修改原始 LayoutPlan
- Pipeline 在调用方决定是否使用 `renderPlan`

### 5.3 Registry over Switch

- `presentation-audience-engine/src/schema.js`：profile 注册表
- `theme-layout/src/schema.js`：LAYOUT_FAMILIES, THEME_TOKENS
- `pptx-renderer/src/renderer.js`：adapter registry + legacy fallback
- 禁止在 index.js 中使用超过 10 行的 switch

### 5.4 Unified Module Structure

每个 Engine 采用一致的结构模式：
```
engine-name/
├── package.json
├── src/
│   ├── index.js          # 主导出
│   ├── schema.js         # 数据结构定义
│   └── engine.js         # 核心逻辑
└── tests/
    └── engine-name.test.js
```

### 5.5 Pipeline as Single Entry Point

`packages/presentation-pipeline/src/pipeline.js` 是端到端编排入口：
```
runPipeline(markdownInput, options) → { specs, layoutPlan, renderPlan?, pptxBuffer, qualityManifest }
```

所有 CLI 工具（`deliver-pptx.js`、`studio:pptx`）都通过 pipeline 调用各引擎。

### 5.6 Component Sharing

Adapters 和 legacy renderers 使用相同的 `comp.*` 组件 API：
- `comp.card()`
- `comp.timeline()`
- `comp.platformHub()`
- `comp.layeredArchitecture()`
- `comp.makeTitle()`
- `comp.makeFooter()`

---

## 6. Extension Guide

### 6.1 新增 Slide Type

**步骤**：
1. 在 slidespec 中确认新 slide type 的映射
2. 在 `theme-layout/src/generator.js` 的 `resolveLayout()` 中添加 layout 选择逻辑
3. 在 `pptx-renderer/` 中创建对应 adapter
4. 更新 `pptx-renderer/src/renderer.js` 的 adapter registry
5. （可选）在 `presentation-compiler/` 中添加该类型的约束规则
6. 测试 adapter 路径和 legacy fallback 路径输出一致

**约束**：
- 必须同时提供 adapter 和 legacy renderer（PR32 前）
- 两种路径输出必须一致
- PR32 后 legacy renderer 移除

### 6.2 新增 Theme

**步骤**：
1. 在 `theme-layout/src/schema.js` 的 `THEME_TOKENS` 中注册新主题
2. 在 `generateColorPalette()` 中配置颜色映射
3. 通过 `--style` 或 `brandProfile` 选择加载

### 6.3 新增 Audience Profile

**步骤**：
1. 在 `presentation-audience-engine/src/schema.js` 的 `SPEAKER_PROFILES` 或 `AUDIENCE_ROLES` 中添加
2. 定义该 profile 的权重（authority、timeBudget、expertise）
3. 在 `engine.js` 的 `deriveContract()` 中验证新权重是否合理
4. 编写测试覆盖新 profile 组合

**约束**：
- 不得修改 Core 数据模型
- 新 profile 必须有明确的 authority / timeBudget / expertise 权重
- 未知 profile 降级为 default，不崩溃

### 6.4 新增 Compiler Rule

**步骤**：
1. 在 `presentation-compiler/src/compiler.js` 的对应 stage 中添加规则
2. 在 `schema.js` 中定义新的 constraint 类型
3. 编写测试覆盖新规则的触发和降级场景

### 6.5 新增 Presentation Pack

**步骤**：
1. 创建 `presentation-packs/{pack-name}/` 目录
2. 在 pack 中包含 story templates、hero patterns、content planners、theme variants
3. 测试 pack 与 Core 引擎的兼容性

**约束**：
- Presentation Pack 不得修改 Core 引擎代码
- Presentation Pack 不得包含行业知识到 Core
- 每个 pack 必须独立测试

---

## 7. Architecture Debt

| 债务 | 影响 | 解决方案 | 状态 |
|------|------|----------|------|
| Legacy renderers 仍在 run.js 中 | PR32 pending | 生产验证通过后移除 | ⏳ Future Hardening |
| Hero sequences 未接入 Audience Engine | M5 Intelligence | 扩展 `enrichStoryWithHero()` 支持 audience contract | 🔴 Pending |
| Theme Engine 未强制使用 | 新旧路径颜色不一致 | Phase 2 中统一 | 🟡 Low |
| 无 PPTX diff 自动化测试 | 回归风险 | M12.24+ 已有 snapshot + commercial gate | 🟡 In Progress |
| M5.8 Source-of-truth decision | Pack runtime 边界模糊 | M8.0 已选 Option A，待执行 | 🟡 Pending |
| M10 快照比较器 checkpoint 未标记完成 | ROADMAP 不一致 | 需刷新 checkbox 状态 | 🟡 Documentation |

---

## 8. Governance

### RFC Compliance

- The architecture follows **RFC-0001 — Presentation OS Platform Specification**.
- The Core is **domain-agnostic** — it contains zero industry-specific knowledge.
- Industry knowledge belongs exclusively in **Presentation Packs**.
- **Core modifications require RFC approval** before implementation. See CONTRIBUTING.md Section 0.
- **Pack/Application changes should not modify Core** unless a Core capability gap is proven and documented via RFC.

### Governing Principle

> **Core is expensive. Extensions are cheap.**

Every Core change costs more than a Pack change because:
- Core changes affect all Packs and Applications
- Core changes require RFC approval
- Core changes must maintain backward compatibility
- Core changes impact third-party developers

Therefore: **always prefer extending via Packs before modifying the Core.**

---

## 9. Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-07-19 | Added Audience Engine (M12.25) and Presentation Compiler (M12.24) to architecture. Rewrote system overview as pipeline data flow. Added monorepo package map. Expanded Core Platform table. Updated extension guide for audience profiles and compiler rules. Refreshed architecture debt. |
| 1.2.0 | 2026-07-01 | RFC governance integration: Core changes require RFC, Pack/Application changes do not. Added governance section. |
| 1.1.0 | 2026-06-30 | Platform strategy: Core + Presentation Packs + Applications. Domain-agnostic Core declared. |
| 1.0.0 | 2026-06-30 | Initial architecture freeze. Seven layers defined. |
