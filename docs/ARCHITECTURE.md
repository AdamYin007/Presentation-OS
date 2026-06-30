# AWE Presentation OS — Architecture v1

> **Version**: 1.0.0  
> **Date**: 2026-06-30  
> **Status**: Frozen — Production-ready baseline  

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Story Layer                               │
│  story JSON → slide objects { no, type, title, message, hero? } │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
   ┌──────────────────────┐      ┌──────────────────────┐
   │   Content Engine     │      │   Layout Engine      │
   │ (data model)         │      │ (spatial plan)       │
   │ compileContent()     │      │ compileLayoutPlan()  │
   └──────────┬───────────┘      └──────────┬───────────┘
              │                              │
              ▼                              ▼
   ┌──────────────────────────────────────────────────────┐
   │              Hero Engine                             │
   │  enrichStoryWithHero() — narrative enrichment        │
   └──────────────────────┬───────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
   ┌──────────────────┐    ┌──────────────────┐
   │ Theme Engine     │    │ Layout Adapters  │
   │ (design tokens)  │    │ (rendering)      │
   └────────┬─────────┘    └────────┬─────────┘
            │                       │
            └───────────┬───────────┘
                        ▼
            ┌──────────────────────┐
            │   Renderer Engine    │
            │  adapter first       │
            │  legacy fallback     │
            └──────────┬───────────┘
                       ▼
            ┌──────────────────────┐
            │   PPTX Output        │
            │   pptxgenjs          │
            └──────────────────────┘
```

---

## 2. Seven-Layer Architecture

### Layer 1 — Story Layer

**职责**：唯一数据源。定义幻灯片结构。

**输入**：`story.json`  
**输出**：`{ name, audience, slides: [{ no, type, title, message }] }`

**规则**：
- 禁止修改 story JSON 结构
- 禁止新增 story 字段
- 新增 slide type 需先确认不影响现有渲染

---

### Layer 2 — Content Engine

**职责**：组织每页的内容数据模型。

**位置**：`src/content-engine/`

**文件结构**：
```
content-engine/
├── index.js          # compileContent(), dispatch()
├── schema.js         # 内容数据结构定义
└── planners/
    ├── executive.js  # planExecutive()
    └── generic.js    # planGeneric()
```

**核心函数**：
- `compileContent(slide, story)` — 根据 slide type 生成内容数据
- `dispatch(type)` — 按类型路由到对应 planner

**约束**：
- 不输出任何视觉信息
- 不依赖 theme、layout、hero
- 纯数据模型

---

### Layer 3 — Hero Engine

**职责**：叙事增强。将 hero sequence 注入到 slide 数据中。

**位置**：`src/hero-engine.js`

**核心函数**：
- `enrichStoryWithHero(story, heroSequence, options)` — 合并 hero 叙事层
- `options.overrideTitle: true` — hero 语句优先于原始标题

**触发**：`--hero` 标志

**规则**：
- 默认模式不激活
- 注入字段：`slide.hero.pattern_id`, `slide.hero.statement`, `slide.hero.visual_focus`

---

### Layer 4 — Layout Engine

**职责**：空间规划。为每页幻灯片生成 Layout Plan。

**位置**：`src/layout-engine/`

**文件结构**：
```
layout-engine/
├── index.js          # compileLayoutPlan(), schema
├── schema.js         # 布局数据结构定义
├── planner.js        # registry + dispatch + compileLayoutPlan()
└── planners/
    ├── cover.js      # planCover()
    ├── executive.js  # planExecutive()
    ├── workflow.js   # planWorkflow()
    ├── generic.js    # planGeneric()
    ├── governance.js # planGovernance()
    ├── research.js   # planResearch()
    ├── collaboration.js # planCollaboration()
    ├── roi.js        # planROI()
    ├── differentiation.js # planDifferentiation()
    └── recommendation.js # planRecommendation()
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
- `compileLayoutPlan(slide)` — 输入 slide，输出 validated Layout Plan
- 每个 `planXxx()` 函数只负责生成对应 slide type 的布局方案

**约束**：
- 不执行渲染
- 不访问 pptxgenjs
- 不依赖 theme（仅使用固定尺寸）

---

### Layer 5 — Theme Engine

**职责**：设计令牌系统。提供颜色、字体、间距等主题数据。

**位置**：`src/theme/`

**文件结构**：
```
theme/
├── index.js          # 导出所有主题能力
├── registry.js       # createTheme(), getTheme(), listThemes()
└── helpers.js        # resolveColor(), applyTypography(), computeSpacing()
```

**核心函数**：
- `resolveColor(theme, "colors.blue")` → `"2563EB"`
- `applyTypography(theme, "heading1")` → `{ fontSize: 28, bold: true, ... }`
- `computeSpacing(theme, 2)` → `0.4`

**规则**：
- 当前默认使用 `components/helpers.js` 中的 C 调色板
- Theme Engine 是未来多主题支持的抽象层
- 当前不强制使用，legacy renderer 仍直接引用 `comp.C.*`

---

### Layer 6 — Layout Adapters

**职责**：消费 Layout Plan 并执行渲染。

**位置**：`src/layout-adapters/`

**文件结构**：
```
layout-adapters/
├── index.js          # dispatchAdapter() — registry + lookup + fallback
├── cover.js          # Cover adapter
├── executive.js      # Executive adapter
└── workflow.js       # Workflow adapter
```

**核心函数**：
```javascript
dispatchAdapter({ slide, comp, pptx, story, layoutPlan })
```

**工作流程**：
1. 从 `ADAPTERS` 对象中按 `slide.type` 查找适配器
2. 找到 → 执行 → 返回 `true`（已处理）
3. 未找到 → 返回 `false`（触发 legacy fallback）

**约束**：
- 必须读取 `layoutPlan.zones`、`layoutPlan.constraints`、`layoutPlan.flow`
- 不得使用硬编码布局逻辑
- 必须使用 `comp.*` 组件，不直接使用 pptxgenjs

---

### Layer 7 — Renderer Engine

**职责**：渲染调度器。决定每页走 adapter 路径还是 legacy 路径。

**位置**：`src/renderer-engine/`

**文件结构**：
```
renderer-engine/
├── index.js          # createRendererEngine() — 工厂函数
├── registry.js       # registerLegacyRenderer() + getLegacyRenderer()
└── dispatcher.js     # dispatchRender() — 安全分发器
```

**核心函数**：
```javascript
const renderSlide = createRendererEngine({
  useLayoutEngine: true/false,
  layoutPlans: [...],
  legacyRenderer: (slide) => { ... }
});
renderSlide(slide, comp, pptx, story); // → boolean
```

**工作流程**：
1. 如果 `useLayoutEngine` 为 `true`，优先尝试 `dispatchAdapter()`
2. Adapter 返回 `true` → 渲染成功，跳过 legacy
3. Adapter 返回 `false` → fallback 到 `legacyRenderer()`
4. 如果 `useLayoutEngine` 为 `false` → 直接走 legacy

**约束**：
- 只做调度，不包含任何渲染代码
- 错误在 dispatcher 中捕获并记录，不中断流程

---

## 3. Platform Strategy

### Presentation OS = Core + Domain Packs + Applications

```
Presentation OS
├── Core (domain-agnostic engines)
├── Domain Packs (industry knowledge)
└── Applications (packaged solutions)
```

**Core**
- Contains only domain-agnostic engines
- Knows nothing about any industry
- Provides Presentation Computing only
- Never changes for a specific domain

**Domain Packs**
- Carry industry-specific knowledge
- Sit on top of the Core
- Can be added, removed, or replaced independently
- May contain story templates, hero patterns, content planners, theme variants, charts, icons, terminology, validation rules, best practices, example decks

**Applications**
- Packaged solutions combining Core + Domain Pack(s)
- Examples: PPT Factory, Medical Proposal Generator, Investor Deck Builder

### Core Platform Contents

| Engine | Responsibility | Domain Knowledge |
|---|---|---|
| Story Engine | Define slide structure | None |
| Content Engine | Organize content data | None |
| Hero Engine | Narrative enrichment | None |
| Layout Engine | Spatial planning | None |
| Theme Engine | Design tokens | None |
| Renderer Engine | Render dispatch | None |
| Future Compiler | Constraint solving | None |

### Domain Pack Examples

| Pack | Industry |
|---|---|
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

The Core Platform is designed to allow third-party Domain Pack development:
- Third-party companies can build industry-specific packs
- Consulting firms can create branded presentation packs
- Hospitals can develop internal domain packs
- Individual developers can contribute to the ecosystem

---

## 4. File Structure

```
registry/packages/ppt-factory/
├── bin/
│   └── run.js                    # CLI 入口，coordinator（逐步变薄）
├── src/
│   ├── content-engine/           # Content Engine
│   │   ├── index.js              # compileContent(), dispatch()
│   │   ├── schema.js             # 内容数据结构
│   │   └── planners/             # 内容规划器
│   │       ├── executive.js
│   │       └── generic.js
│   ├── hero-engine.js            # Hero Engine
│   ├── layout-engine/            # Layout Engine
│   │   ├── index.js              # compileLayoutPlan(), schema
│   │   ├── schema.js             # 布局数据结构
│   │   ├── planner.js            # registry + dispatch
│   │   └── planners/             # 布局规划器
│   │       ├── cover.js
│   │       ├── executive.js
│   │       ├── workflow.js
│   │       ├── generic.js
│   │       ├── governance.js
│   │       ├── research.js
│   │       ├── collaboration.js
│   │       ├── roi.js
│   │       ├── differentiation.js
│   │       └── recommendation.js
│   ├── layout-adapters/          # Layout Adapters
│   │   ├── index.js              # dispatchAdapter()
│   │   ├── cover.js
│   │   ├── executive.js
│   │   └── workflow.js
│   ├── renderer-engine/          # Renderer Engine
│   │   ├── index.js              # createRendererEngine()
│   │   ├── registry.js           # legacy renderer registry
│   │   └── dispatcher.js         # safe dispatch
│   ├── theme/                    # Theme Engine
│   │   ├── index.js
│   │   ├── registry.js
│   │   └── helpers.js
│   └── layout/
│       └── base.js               # getSlide(), bg()
├── components/                   # 共享组件库
│   ├── index.js
│   ├── helpers.js                # C palette, makeTitle, makeFooter
│   ├── card.js
│   ├── timeline.js
│   ├── platform-hub.js
│   └── layered-architecture.js
└── story/                        # Story JSON 数据
    └── digital-pathology-15.json
```

---

## 5. Key Principles

### 5.1 默认模式永不改变

- 不加任何 flag → 100% legacy renderer
- 所有新能力都是 opt-in
- `--layout-engine` 控制 Layout Engine + Adapters
- `--hero` 控制 Hero Engine

### 5.2 Adapter First, Legacy Fallback

- Layout Adapters 优先尝试渲染
- 不能处理的 slide type 自动 fallback 到 legacy
- 两种路径输出必须完全一致

### 5.3 Registry over Switch

- `layout-adapters/index.js`：`ADAPTERS[type]` 对象查找
- `renderer-engine/registry.js`：`registerLegacyRenderer(type, fn)` 注册表
- 禁止在 index.js 中使用超过 10 行的 switch

### 5.4 统一模块结构

三个 Engine 采用一致的结构模式：
```
engine-name/
├── index.js          # 主导出：compileXxx() / dispatch()
├── schema.js         # 数据结构定义
└── planners/         # 或 adapters/ — 按类型拆分
    ├── type-a.js
    └── type-b.js
```

### 5.5 run.js 逐步变成 Coordinator

当前 run.js 职责：
1. CLI 参数解析
2. Story 加载
3. Hero 接入（可选）
4. Layout Plan 预编译（可选）
5. 调用 Renderer Engine
6. 输出 PPTX

禁止在 run.js 中添加新的渲染逻辑。

### 5.6 组件共享

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
1. 在 story JSON 中添加新 slide（type 字段）
2. 在 `layout-engine/planners/` 中创建 `planNewType.js`
3. 在 `layout-engine/planner.js` 中注册
4. 在 `layout-adapters/` 中创建 `new-type.js` adapter
5. 在 `layout-adapters/index.js` 中注册
6. （可选）在 `content-engine/planners/` 中创建内容规划器
7. 在 `renderer-engine/registry.js` 中注册 legacy renderer

**约束**：
- 必须同时提供 adapter 和 legacy renderer
- 两种路径输出必须一致
- 默认模式下 legacy 生效

### 6.2 新增 Theme

**步骤**：
1. 在 `theme/registry.js` 中 `createTheme(name, definitions)`
2. 在 `theme/helpers.js` 中配置 `resolveColor` 路径映射
3. 在 `run.js` 中选择加载哪个 theme

### 6.3 新增 Hero Sequence

**步骤**：
1. 在 `story/` 中创建 `{story-name}-hero-sequence.json`
2. 格式：`{ slides: [{ no, pattern_id, statement, visual_focus }] }`
3. 运行时传入 `--hero` 自动加载

### 6.4 新增 Domain Pack

**步骤**：
1. 创建 `domain-packs/{pack-name}/` 目录
2. 在 pack 中包含 story templates、hero patterns、content planners、theme variants
3. 注册 pack 到 platform configuration
4. 测试 pack 与 Core 引擎的兼容性

**约束**：
- Domain Pack 不得修改 Core 引擎代码
- Domain Pack 不得包含行业知识到 Core
- 每个 pack 必须独立测试

---

## 7. Architecture Debt

| 债务 | 影响 | 解决方案 | 优先级 |
|---|---|---|---|
| Legacy renderers 仍在 run.js 中 | run.js 持续增长 | 逐步迁移到 `renderer-engine/renderers/` | 高 |
| Theme Engine 未强制使用 | 新旧路径颜色不一致 | Phase 2 中统一 | 中 |
| 无自动化测试 | 回归风险 | 建立 PPTX 对比测试 | 高 |
| Layout Plan 未缓存 | 重复计算 | Presentation Compiler 中处理 | 低 |
| Dispatcher 暂未使用 | 代码冗余 | Phase 2 中集成 | 低 |

---

## 8. Version History

| Version | Date | Changes |
|---|---|---|
| 1.1.0 | 2026-06-30 | Platform strategy: Core + Domain Packs + Applications. Domain-agnostic Core declared. |
| 1.0.0 | 2026-06-30 | Initial architecture freeze. Seven layers defined. |
