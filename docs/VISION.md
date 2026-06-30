# AWE Presentation OS — Vision v2

> **Version**: 2.0.0  
> **Date**: 2026-06-30  
> **Status**: Draft — Product & Architecture Vision

---

## 1. What Is Presentation OS?

Presentation OS 不是 PPT Generator。不是模板库。不是 AI 生成工具。

它是**把 Story 编译成高质量演示文稿的操作系统**。

类比理解：
- 操作系统管理硬件资源 → Presentation OS 管理演示内容资源
- 编译器将源代码转为可执行程序 → Presentation OS 将 Story 转为 PPTX
- 文件系统组织文件 → Story Layer 组织幻灯片

Presentation OS 的核心价值在于**确定性**：同样的 Story + 同样的 Engine 配置，每次输出完全一致的高质量演示文稿。

---

## 2. Mission

> **Presentation OS is to presentations what an operating system is to computers.**

我们构建的不是一个生成工具，而是一个平台：
- 定义演示文稿的数据模型（Story）
- 提供可组合的引擎（Content / Hero / Layout / Theme / Renderer）
- 实现可控的编译流程（Compiler）
- 支持多受众适配（Audience Engine）
- 面向多输出格式（PPTX / Keynote / PDF / HTML / Video）

---

## 3. Seven-Layer Architecture Vision

```
┌─────────────────────────────────────────────────────────────┐
│                    Story Layer                               │
│  唯一数据源：slides[]，每片定义 no/type/title/message         │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Content  │  │  Hero    │  │ Audience │
  │  Engine  │  │  Engine  │  │  Engine  │
  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │              │             │
       └──────────────┼─────────────┘
                      ▼
            ┌─────────────────┐
            │   Layout Engine │
            │  zones/flows/   │
            │  density/constr │
            └────────┬────────┘
                     ▼
            ┌─────────────────┐
            │   Theme Engine  │
            │  colors/fonts/  │
            │  spacing/token  │
            └────────┬────────┘
                     ▼
            ┌─────────────────┐
            │  Renderer Eng.  │
            │ adapter-first   │
            │ legacy-fallback │
            └────────┬────────┘
                     ▼
            ┌─────────────────┐
            │ Presentation    │
            │   Compiler      │
            │ constraint solve │
            │ overflow detect  │
            │ auto paginate    │
            └────────┬────────┘
                     ▼
            ┌─────────────────┐
            │   PPTX Output   │
            │ pptxgenjs /     │
            │ libreoffice /   │
            │ html / video    │
            └─────────────────┘
```

### 各层职责

| 层级 | 职责 | 输入 | 输出 |
|---|---|---|---|
| **Story Layer** | 定义演示文稿的结构与内容 | JSON 文件 | 标准化 slide 对象数组 |
| **Content Engine** | 组织每页的内容数据模型 | slide + story | 结构化内容数据（无视觉） |
| **Hero Engine** | 叙事增强，注入故事主线 | story + hero sequence | enriched story |
| **Audience Engine** | 根据受众调整内容与叙事 | audience metadata | 受众定制版 story |
| **Layout Engine** | 空间规划，决定每页布局 | slide + content | Layout Plan（zones/flow/density） |
| **Theme Engine** | 设计令牌系统，提供视觉规范 | theme name | 颜色/字体/间距令牌 |
| **Renderer Engine** | 渲染调度，选择最佳渲染路径 | slide + plan + theme | 渲染结果（true/false） |
| **Presentation Compiler** | 全局优化，解决约束冲突 | 所有 Plans | Render Plan（优化后） |

---

## 4. Why We Need a Compiler

### Compiler 做什么

| 功能 | 说明 |
|---|---|
| **Constraint Solving** | 当多个 slide 共享同一布局模式时，求解最优全局布局 |
| **Overflow Detection** | 检测文本/卡片超出画布边界，自动调整 |
| **Auto Pagination** | 内容过多时自动分页，保持视觉一致性 |
| **Conflict Resolution** | 解决同一 slide 中多个元素的位置冲突 |
| **Theme Resolution** | 将设计令牌解析为具体颜色/字体/尺寸 |
| **Rendering Optimization** | 批量渲染调用，减少重复计算 |

### Compiler 不做什么

- ❌ 不画 PPT（那是 Renderer 的职责）
- ❌ 不生成内容（那是 Content Engine 的职责）
- ❌ 不做叙事决策（那是 Hero Engine 的职责）
- ❌ 不调度渲染路径（那是 Renderer Engine 的职责）

**Compiler 只生成 Render Plan**——一份优化后的全局渲染指令集，供 Renderer Engine 执行。

---

## 5. Why Not Just Use AI to Generate PPT

| 维度 | AI 直接生成 | Presentation OS |
|---|---|---|
| **内容生成** | ✅ 擅长 | 由 Story Layer + Content Engine 提供结构化数据 |
| **结构稳定性** | ❌ 每次输出不一致 | ✅ Engine 保证确定性 |
| **品牌一致性** | ❌ 难以控制 | ✅ Theme Engine 统一管理 |
| **受众适配** | ❌ 需要重新生成 | ✅ Audience Engine 动态调整 |
| **多格式输出** | ❌ 通常只有一种格式 | ✅ 编译为多种格式 |
| **可追溯性** | ❌ 黑盒 | ✅ 每层都有明确输入输出 |

**Presentation OS 是 AI 与工程系统的结合**：
- AI 负责生成 Story（内容层）
- Engine 负责将 Story 编译为高质量演示文稿（结构层）
- Compiler 负责优化输出（优化层）

我们不替代 AI，我们**利用 AI 的创造力，加上工程系统的确定性**。

---

## 6. Audience Engine Vision

### 支持的受众类型

| 受众 | 特点 | 调整策略 |
|---|---|---|
| **院长** | 关注战略、ROI、合规 | 精简内容，突出数据和结论 |
| **病理科主任** | 关注工作流、效率 | 详细展示技术方案和收益 |
| **信息中心** | 关注集成、安全、运维 | 强调技术架构和兼容性 |
| **科研人员** | 关注数据、方法、创新 | 突出研究价值和数据资产 |
| **投资人** | 关注市场、竞争、增长 | 展示市场规模和商业模型 |
| **厂商市场团队** | 关注差异化、定位 | 强调竞争优势和独特价值 |

### 受众如何影响输出

```
Audience: "院长办公会"
  ├─ Story Layer → 精简到 10 页以内
  ├─ Content Engine → 突出 ROI 和数据
  ├─ Hero Engine → 战略叙事优先
  ├─ Layout Engine → 高密度、少动画
  └─ Theme Engine → 正式、保守配色

Audience: "技术评审"
  ├─ Story Layer → 扩展到 20+ 页
  ├─ Content Engine → 详细技术方案
  ├─ Hero Engine → 技术创新叙事
  ├─ Layout Engine → 低密度、多图示
  └─ Theme Engine → 现代、科技感配色
```

---

## 7. vs. Gamma / Beautiful.ai / 普通 PPT 工具

| 特性 | Presentation OS | Gamma | Beautiful.ai | 普通 PPT 工具 |
|---|---|---|---|---|
| **Story Layer** | ✅ 结构化 JSON 数据模型 | ❌ 自由文本输入 | ❌ 自由文本输入 | ❌ 手动编辑 |
| **Hero Layer** | ✅ 叙事引擎，可组合 | ❌ 无 | ❌ 无 | ❌ 无 |
| **Content Engine** | ✅ 数据驱动内容组织 | ❌ AI 生成 | ❌ AI 生成 | ❌ 手动 |
| **Layout Engine** | ✅ 空间规划，可定制 | ⚠️ 有限模板 | ⚠️ 智能模板 | ❌ 手动 |
| **Theme Engine** | ✅ 设计令牌系统 | ⚠️ 预设主题 | ⚠️ 预设主题 | ⚠️ 手动 |
| **Presentation Compiler** | ✅ 约束求解 + 优化 | ❌ 无 | ❌ 无 | ❌ 无 |
| **Audience Engine** | ✅ 受众适配 | ❌ 无 | ❌ 无 | ❌ 无 |
| **Multi-output** | ✅ PPTX/PDF/HTML/Video | ⚠️ PPTX/PDF | ⚠️ PPTX/PDF | ✅ 原生 |
| **Deterministic** | ✅ 完全确定 | ❌ 随机性 | ❌ 随机性 | ✅ 手动 |
| **Extensible** | ✅ 插件化引擎 | ❌ 闭源 | ❌ 闭源 | ❌ 有限 |

**核心差异**：Gamma 和 Beautiful.ai 是 AI-first 的黑盒工具。Presentation OS 是**引擎化的白盒系统**——每一步都可追溯、可调试、可定制。

---

## 8. Five-Year Vision

### Year 1 (2026) — Presentation OS
- 完成七层架构
- 覆盖 15+ slide type
- 支持 PPTX + PDF 输出
- 建立 Compiler MVP

### Year 2 (2027) — Presentation IDE
- Web 编辑器，所见即所得
- Story JSON 可视化编辑
- 实时预览渲染结果
- 团队协作

### Year 3 (2028) — Presentation Cloud
- 云端编译服务
- 多租户架构
- API 集成（Slack/Teams/飞书）
- 版本管理与回滚

### Year 4 (2029) — Presentation Agent
- AI 辅助 Story 生成
- 自动受众识别
- 智能布局推荐
- 对话式演示编辑

### Year 5 (2030) — Presentation Platform
- 开放插件生态
- 第三方引擎市场
- 多格式输出（Keynote/Google Slides/HTML/Video）
- 企业级 SSO 与合规

### 支持的输出格式

| 格式 | Year | 说明 |
|---|---|---|
| **PowerPoint (.pptx)** | Y1 | 核心输出，pptxgenjs |
| **PDF** | Y1 | 文档分发 |
| **HTML** | Y2 | Web 分享 |
| **Keynote** | Y3 | macOS 生态 |
| **Google Slides** | Y3 | 云端协作 |
| **Video** | Y4 | 自动翻页动画 |

---

## 9. Long-Term Architecture Principles

### 9.1 Engine over Logic

> 用可组合的引擎替代硬编码逻辑。

- ❌ `if (type === 'cover') { /* 20 行逻辑 */ }`
- ✅ `ContentEngine.compile() → LayoutEngine.plan() → RendererEngine.render()`

### 9.2 Data over Code

> 用数据驱动行为，而非代码分支。

- ❌ 新增 slide type 需要修改 5 个文件
- ✅ 新增 slide type 只需注册 1 个 planner + 1 个 adapter

### 9.3 Composition over Duplication

> 用组件组合替代重复代码。

- ❌ 每页自定义布局
- ✅ 共享 `comp.card()`、`comp.timeline()`、`comp.platformHub()`

### 9.4 Compiler over Renderer

> 全局优化优先于局部渲染。

- ❌ 每页独立渲染，不考虑全局约束
- ✅ Compiler 先求解全局约束，再下发 Render Plan

### 9.5 Determinism over Creativity

> 确定性优先于随机性。

- ❌ 每次生成结果不同
- ✅ 同样的输入总是产生同样的输出

### 9.6 Extensibility over Completeness

> 可扩展性优先于功能完整性。

- ❌ 内置 100 种 slide type
- ✅ 内置 10 种核心类型，其余通过插件扩展

---

## 10. Development Principles

### 10.1 One PR = One Goal

每个 PR 只做一件事：
- ✅ `feat(adapter): add cover adapter` — 一个 slide type
- ✅ `fix(planner): correct workflow zone calculation` — 一个 bug fix
- ✅ `docs(architecture): update diagram` — 一个文档变更
- ❌ `feat: add cover adapter, fix planner, update docs` — 太多目标

### 10.2 Default Compatibility First

- `--layout-engine` 标志控制所有新行为
- 不加 flag 时，100% 兼容现有行为
- 新增 adapter 必须同时维护 legacy renderer

### 10.3 No Core File Growth

- `run.js` 只增不减 → 逐步迁移到独立模块
- `planner.js` 只增不减 → 拆分为 `planners/` 目录
- 核心文件（index.js）行数上限：100 行

### 10.4 Registry over Switch

- `ADAPTERS[type]` 对象查找替代 switch
- `registerLegacyRenderer(type, fn)` 注册表替代硬编码
- 禁止在 index.js 中使用超过 10 行的 switch

### 10.5 Adapters Consume Plans

- Adapter 必须读取 `layoutPlan.zones`、`layoutPlan.constraints`
- 禁止在 Adapter 中重新计算布局
- 布局决策的唯一来源是 `compileLayoutPlan()`

### 10.6 Engines Remain Pure Where Possible

- Content Engine 不依赖 Theme / Layout / Renderer
- Layout Engine 不依赖 Hero / Theme / Renderer
- Theme Engine 不依赖任何 Engine
- 纯函数优先，副作用最小化

---

## Appendix: Glossary

| 术语 | 定义 |
|---|---|
| **Story** | 演示文稿的结构化数据（JSON），定义 slide 数组 |
| **Slide** | 单页演示文稿，有 type/title/message 等属性 |
| **Engine** | 独立的可组合处理单元（Content/Hero/Layout/Theme/Renderer） |
| **Adapter** | 消费 Layout Plan 并执行渲染的模块 |
| **Layout Plan** | 编译引擎输出的空间规划数据（zones/flows/density/constraints） |
| **Theme** | 设计令牌集合（颜色/字体/间距） |
| **Renderer** | 最终输出演示文稿的模块 |
| **Compiler** | 全局优化引擎，解决约束冲突和优化渲染 |
| **Audience** | 演示文稿的目标受众，影响内容和叙事 |
| **Hero Sequence** | 叙事主线数据，注入到 Story 中 |

---

## Appendix: Reference Materials

- [ARCHITECTURE.md](./ARCHITECTURE.md) — 当前架构详细文档
- [ROADMAP.md](./ROADMAP.md) — 开发路线图与里程碑
- [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) — 架构决策记录
- [CONTRIBUTING.md](./CONTRIBUTING.md) — 开发者贡献指南

---

*This document is a living vision. It will evolve as the platform matures. Last reviewed: 2026-06-30.*
