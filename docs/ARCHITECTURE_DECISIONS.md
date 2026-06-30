# AWE Presentation OS — Architecture Decision Records

> **Version**: 1.0.0  
> **Date**: 2026-06-30  
> **Status**: Frozen baseline

---

## ADR-001: One PR = One Goal

**Date**: 2026-06-25  
**Status**: Active  
**Context**: 早期开发中出现过一个 PR 同时修改 adapter、planner、run.js 的情况，导致审查困难和回归风险。  
**Decision**: 每个 PR 只做一件事——要么新增 adapter，要么拆分模块，要么更新文档。  
**Consequences**: 
- 提交历史更清晰，便于回溯
- 每个 PR 可以独立测试和验证
- 代码审查更高效

---

## ADR-002: Seven-Layer Engine Separation

**Date**: 2026-06-25  
**Status**: Active  
**Context**: 最初所有逻辑都在 run.js 中，导致单文件超过 600 行，职责混乱。  
**Decision**: 将系统拆分为七个独立层：Story → Content → Hero → Layout → Theme → Renderer → Output。  
**Consequences**:
- 每层有明确的输入输出契约
- 新增功能只需修改对应层，不影响其他层
- 测试可以按层独立进行

---

## ADR-003: Content / Hero / Layout / Theme / Renderer 分离

**Date**: 2026-06-28  
**Status**: Active  
**Context**: Layout Engine 同时负责内容组织和布局规划，导致 planner.js 膨胀到 200+ 行。  
**Decision**: 将内容组织（Content Engine）和布局规划（Layout Engine）拆分为两个独立模块。  
**Consequences**:
- Content Engine 只输出数据模型，不关心视觉
- Layout Engine 只输出空间计划，不关心内容
- 两者可以独立扩展

---

## ADR-004: Adapter First, Legacy Fallback

**Date**: 2026-06-26  
**Status**: Active  
**Context**: 如果直接替换 legacy renderer，默认模式会改变，破坏兼容性。  
**Decision**: 新增 adapter 优先尝试，失败则 fallback 到 legacy renderer。默认模式完全不变。  
**Consequences**:
- 新增 adapter 不影响默认模式
- 可以逐步迁移，不必一次性替换
- 两种路径必须输出一致

---

## ADR-005: Registry over Switch

**Date**: 2026-06-28  
**Status**: Active  
**Context**: `layout-adapters/index.js` 中使用 switch 语句，每新增一个 adapter 就要修改 switch。  
**Decision**: 使用对象查找（`ADAPTERS[type]`）和注册表模式（`registerLegacyRenderer()`）替代 switch。  
**Consequences**:
- 新增 adapter 只需注册，不需要修改 dispatch 逻辑
- 降低修改风险
- 代码更易于审查

---

## ADR-006: run.js Should Become Coordinator

**Date**: 2026-06-29  
**Status**: Active  
**Context**: run.js 包含所有 legacy renderer 函数和渲染调度逻辑，超过 600 行。  
**Decision**: 将调度逻辑迁移到 Renderer Engine，run.js 只保留 CLI 解析、故事加载和最终输出。  
**Consequences**:
- run.js 职责简化为协调器
- 渲染决策集中在 Renderer Engine
- 未来可以继续迁移 legacy renderers 到独立模块

---

## ADR-007: Module Split for Planners

**Date**: 2026-06-28  
**Status**: Active  
**Context**: `layout-engine/planner.js` 包含 10 个 planXxx() 函数，超过 150 行。  
**Decision**: 将每个 planXxx() 迁移到 `planners/` 目录下的独立文件，planner.js 只保留 registry 和 dispatch。  
**Consequences**:
- 每个 planner 文件不超过 50 行
- 新增 slide type 只需添加一个新文件
- 便于独立测试和维护

---

## ADR-008: Theme Engine Is Abstraction, Not Replacement

**Date**: 2026-06-27  
**Status**: Active  
**Context**: 最初考虑让 Theme Engine 立即替换所有硬编码颜色。  
**Decision**: Theme Engine 作为抽象层存在，当前不强制使用。legacy renderer 继续使用 `comp.C.*`。  
**Consequences**:
- 避免大规模重构带来的回归风险
- 为未来多主题支持奠定基础
- 可以在 M4 阶段逐步强制执行

---

## ADR-009: Default Mode Never Changes

**Date**: 2026-06-25  
**Status**: Active  
**Context**: 任何破坏默认模式的行为都会导致用户无法使用现有工作流。  
**Decision**: 所有新功能必须是 opt-in（通过 flag 控制）。不加 flag 时行为 100% 不变。  
**Consequences**:
- 用户可以随时回退到旧行为
- 新功能可以独立测试
- 兼容性问题最小化

---

## ADR-010: Architecture Freeze v1

**Date**: 2026-06-30  
**Status**: Active  
**Context**: 经过 10+ PR 的迭代，核心架构已经稳定。继续并行开发功能和架构会导致混乱。  
**Decision**: 冻结架构，停止新增 PPT 功能。下一阶段的唯一目标是迁移现有功能到新的架构模式。  
**Consequences**:
- 团队精力集中在质量提升而非功能扩展
- 后续 PR 的目标明确：Adapter Migration、Content Migration、Testing
- 架构债务被正式记录并有明确的偿还计划
