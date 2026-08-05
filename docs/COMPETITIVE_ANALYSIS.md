# AWE Presentation-OS 竞品分析报告

## 执行摘要

通过 Tavily Pro 全功能搜索（7轮搜索 + 5个项目深度提取），我们发现了以下关键竞品：

| 项目 | GitHub Stars | 核心特点 | 与 AWE 的关系 |
|------|-------------|---------|--------------|
| **codex-ppt-skill** | 4,512 | GPT-Image-2 图片式 PPT，阶段化确认流程 | 学习其大纲确认流程 |
| **ppt-agent-skill** | 120 | 26种世界级风格，6步Pipeline | 对标设计美学 |
| **presentation-ai** | 2,926 | Gamma 开源替代，Web UI | 功能参考 |
| **slideforge** | 0 | Markdown→PPTX，自动布局检测 | 架构相似 |
| **presenton** | 9,279 | 可编辑 PPTX，BYOK，模板导入 | 核心功能对标 |

---

## 一、竞品详细分析

### 1. codex-ppt-skill (ningzimu/codex-ppt-skill)

**GitHub**: https://github.com/ningzimu/codex-ppt-skill  
**Stars**: 4,512 | **Forks**: 223  
**License**: MIT  
**最后更新**: 1周前

#### 核心特点
- **阶段化流程**: 先确认大纲 → 选择风格 → 生成样张 → 批量生产
- **图片式 PPT**: 使用 GPT-Image-2 生成每页幻灯片图片，再组装为 .pptx
- **多 Agent 支持**: Codex, Claude Code, OpenClaw, Hermes Agent
- **个人风格库**: `~/.codex-ppt-skill/references/` 沉淀用户偏好
- **演讲稿生成**: 自动生成 `speech.md` 写入 PPT 备注

#### 12种内置风格
| 风格 | 特点 |
|------|------|
| 清爽专业风 | 商务简洁 |
| 科研答辩风 | 学术严谨 |
| 党政红风格 | 政府公文 |
| 教学课件风 | 教育场景 |
| 电子墨水杂志风 | 阅读体验 |
| 手绘技术解释风 | 技术分享 |
| 数据仪表盘风 | 数据展示 |
| 麦肯锡风格 | 咨询报告 |
| 创意杂志风 | 视觉冲击 |
| 复古扁平插画风 | 设计感 |
| 手绘白板风 | 轻松风格 |
| 温暖手工风 | 亲和力 |

#### 与 AWE 的差异
| 维度 | codex-ppt-skill | AWE Presentation-OS |
|------|----------------|---------------------|
| 输出格式 | 图片式 PPT | 原生可编辑 PPTX |
| 内容生成 | LLM 生成文本+图片 | 确定性规则 + LLM 可选 |
| 模板驱动 | 支持导入风格 | **核心优势：模板分析+注入** |
| 品牌系统 | 简单配色 | **完整品牌配置系统** |
| 大纲预览 | 确认后生成 | **实时大纲预览** |
| 测试覆盖 | 无 | 96个测试 |

#### 学习点
1. 阶段化确认流程值得借鉴（大纲预览 → 风格确认 → 生成）
2. 个人风格库沉淀机制
3. 演讲稿自动生成

---

### 2. ppt-agent-skill (Akxan/ppt-agent-skill)

**GitHub**: https://github.com/Akxan/ppt-agent-skill  
**Stars**: 120 | **Forks**: 46  
**License**: MIT  
**最后更新**: 3个月前

#### 核心特点
- **26种世界级风格**: 对标 Linear/Anthropic/Stripe/Apple/NYT
- **18种数据可视化**: 基础8 + 进阶6 + ECharts级4
- **Bento Grid 布局**: 7种卡片式灵活布局
- **世界级排版**: 7级字号阶梯、字距铁律、tabular-nums
- **智能配图**: AI生成配图 + 5种视觉融入技法
- **失败模式目录**: 8种 failure modes + 修复顺序

#### 6步 Pipeline
```
需求调研 → 资料搜集 → 大纲策划 → 策划稿 → HTML设计稿 → 后处理(SVG→PPTX)
```

#### 26种风格分类
| 分类 | 风格数 | 代表风格 |
|------|--------|---------|
| 暗色专业 | 7 | Linear, Apple Hardware, Tom Ford |
| 浅色高级 | 8 | Apple企业, Aesop, NYT Magazine |
| 活力鲜明 | 4 | Cyberpunk, Y2K, Neon |
| 东方文化 | 3 | 党政红, 水墨风 |
| 自然复古 | 4 | 手绘, 复古插画 |

#### 与 AWE 的差异
| 维度 | ppt-agent-skill | AWE Presentation-OS |
|------|-----------------|---------------------|
| 技术栈 | Python + HTML + SVG | Node.js 纯代码 |
| 设计风格 | 世界级设计 agency | 商务咨询风格 |
| 图表能力 | 18种可视化 | 基础图表 |
| 模板分析 | 无 | **核心优势** |
| 品牌配置 | 简单 | **完整系统** |

---

### 3. presentation-ai (allweonedev/presentation-ai)

**GitHub**: https://github.com/allweonedev/presentation-ai  
**Stars**: 2,926 | **Forks**: 506  
**License**: MIT  
**最后更新**: 2个月前

#### 核心特点
- **Gamma 开源替代**: Web UI + AI 生成
- **38种内置主题**: 可创建自定义主题
- **多 AI 提供商**: OpenAI, Ollama, LM Studio
- **本地模型支持**: 完整隐私控制
- **PPTX 主题导入**: 从现有 PPTX 导入主题
- **API 接口**: 支持 MCP 协议

#### 功能对比
| 功能 | presentation-ai | AWE Presentation-OS |
|------|-----------------|---------------------|
| Web UI | ✅ | ❌ (CLI only) |
| API | ✅ REST API | ❌ |
| 本地模型 | ✅ Ollama/LM Studio | ❌ |
| 模板导入 | ✅ PPTX主题导入 | ✅ **模板分析+注入** |
| 大纲预览 | ✅ 实时编辑 | ✅ previewOnly |
| 品牌系统 | ✅ 主题创建 | ✅ **品牌配置** |

#### 优势
- 完整的 Web 应用架构
- BYOK (Bring Your Own Key) 模式
- MCP 服务器集成

---

### 4. slideforge (NagaYu/slideforge)

**GitHub**: https://github.com/NagaYu/slideforge  
**Stars**: 0 | **Forks**: 0  
**License**: MIT  
**最后更新**: 2个月前

#### 核心特点
- **Markdown 到 PPTX**: 纯 CLI 工具
- **自动布局检测**: 根据内容自动选择版式
- **多主题支持**: TechBlue, WarmCreative, MinimalGray 等
- **单依赖**: python-pptx
- **CJK 支持**: 中文/日文/韩文

#### 布局自动检测规则
```
1. 两个以上编号列表 → 步骤时间线
2. 恰好两个 ## 标题 → 双栏布局
3. 3-4 个平行要点 → 卡片网格
4. 无正文，首/尾页 → Hero 封面
```

#### 与 AWE 的相似性
| 特性 | slideforge | AWE Presentation-OS |
|------|-----------|---------------------|
| Markdown 输入 | ✅ | ✅ |
| 布局自动检测 | ✅ | ✅ |
| 多主题 | ✅ | ✅ |
| 确定性生成 | ✅ | ✅ |
| 大纲生成 | ❌ | ✅ |
| 叙事模式 | ❌ | ✅ 10种 |
| 品牌系统 | ❌ | ✅ |
| 模板分析 | ❌ | ✅ |
| 测试覆盖 | ❌ | 96 tests |

---

### 5. presenton (presenton/presenton)

**GitHub**: https://github.com/presenton/presenton  
**Stars**: 9,279 | **Forks**: ~800  
**License**: Apache 2.0  
**最后更新**: 持续活跃

#### 核心特点
- **最大开源 PPT 项目**: 近万 Star
- **可编辑 PPTX**: 原生形状，非图片
- **模板系统**: 导入 PPTX 作为设计系统
- **AI 生成 + 手动编辑**: 混合工作流
- **多平台**: Web, Desktop (Mac/Win/Linux)
- **MCP 服务器**: 模型上下文协议

#### 关键功能
| 功能 | 说明 |
|------|------|
| AI 模板生成 | 从 PPTX 自动提取设计系统 |
| 可编辑导出 | PPTX 和 PDF，保持矢量 |
| 素材导入 | 支持 Excel、截图嵌入 |
| 事实检查 | 逐页溯源 |
| 多 AI 提供商 | OpenAI, Gemini, Claude, Ollama |

#### 与 AWE 的定位差异
- **presenton**: 通用型商业工具，强调易用性和设计
- **AWE**: 开发者工具，强调确定性、可测试性、模板驱动

---

### 6. 其他值得关注的竞品

| 项目 | Stars | 特点 |
|------|-------|------|
| **SlideBot-AI** | 1,217 | AI PPT 生成器，支持录音转写 |
| **PPTX-Presentation-Generator** | 146 | 早期 Python 工具 |
| **LRriver/AIPPT** | 10 | 端到端可控生成 |
| **ysskrishna/ai-ppt-slide-generator** | 19 | Gemini + FastAPI |
| **hugohe3/ppt-master** | 42,563 | PPTX 原生编辑 |

---

## 二、市场格局分析

### 2.1 商业模式分类

```
                    高定制化
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    │   开发者工具       │   混合模式        │   商业 SaaS
    │   (AWE, slideforge) │   (presenton)     │   (Gamma, Beautiful.ai)
    │                   │                   │
    └───────────────────┼───────────────────┘
                        │
                    低定制化
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    │   图片式 PPT       │   模板驱动        │   自动生成
    │   (codex-ppt)     │   (ppt-agent)     │   (SlideBot)
    │                   │                   │
    └───────────────────┼───────────────────┘
                        │
                    高自动化
```

### 2.2 技术路线对比

| 技术路线 | 代表项目 | 优势 | 劣势 |
|---------|---------|------|------|
| **图片式** | codex-ppt-skill | 视觉效果好 | 不可编辑 |
| **HTML→PPTX** | ppt-agent-skill | 设计灵活 | 转换复杂 |
| **原生 PPTX** | AWE, slideforge | 完全可编辑 | 设计受限 |
| **Web UI** | presentation-ai | 易用 | 需要部署 |

### 2.3 功能覆盖矩阵

| 功能 | AWE | codex-ppt | ppt-agent | presenton | slideforge |
|------|-----|-----------|-----------|-----------|------------|
| Markdown 输入 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 大纲预览 | ✅ | ✅ | ❌ | ✅ | ❌ |
| 模板分析 | ✅ | ❌ | ❌ | ✅ | ❌ |
| 品牌配置 | ✅ | ❌ | ❌ | ✅ | ❌ |
| 叙事模式 | ✅ 10种 | ❌ | ❌ | ❌ | ❌ |
| 自定义模式 | ✅ | ✅ | ❌ | ✅ | ❌ |
| 测试覆盖 | ✅ 96 | ❌ | ❌ | ❌ | ❌ |
| 本地模型 | ❌ | ✅ | ✅ | ✅ | ✅ |
| API 接口 | ❌ | ❌ | ❌ | ✅ | ❌ |
| Web UI | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## 三、AWE 的差异化优势

### 3.1 核心竞争优势

1. **模板驱动设计** (Template-First)
   - 唯一支持完整模板分析的项目
   - 提取主题颜色、字体、布局、媒体资产
   - 自动生成 template-spec.md

2. **确定性生成** (Deterministic)
   - 96个测试用例覆盖全流程
   - Schema-first 方法论
   - 可预测的输出

3. **品牌系统** (Brand System)
   - 完整的 brandConfig 支持
   - 模板到品牌配置转换
   - 样式令牌管理

4. **开发者优先** (Developer-First)
   - CLI 工具链
   - npm scripts
   - Monorepo 架构

### 3.2 市场定位

```
                    高设计质量
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    │   商业 SaaS        │   AWE             │   图片式工具
    │   (Gamma)         │   (差异化定位)     │   (codex-ppt)
    │                   │                   │
    └───────────────────┼───────────────────┘
                        │
                    高可控性
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    │   原始模板         │   混合模式        │   自动生成
    │   (pptxgenjs)     │   (presenton)     │   (SlideBot)
    │                   │                   │
    └───────────────────┼───────────────────┘
                        │
                    可编程性
```

### 3.3 目标用户

| 用户类型 | 痛点 | AWE 解决方案 |
|---------|------|-------------|
| **开发者** | 需要可集成、可测试的 PPT 生成 | CLI + npm + 测试覆盖 |
| **企业 IT** | 需要品牌一致性 | 模板分析 + 品牌系统 |
| **文档工程师** | 需要从文档自动生成 | Markdown → PPTX 管线 |
| **数据科学家** | 需要可复现的报告 | 确定性生成 + 大纲预览 |

---

## 四、技术趋势与建议

### 4.1 行业趋势

1. **AI + 确定性结合**: 纯 LLM 生成质量不稳定，混合模式是方向
2. **模板驱动回归**: BYO Design (Bring Your Own Design) 成为标配
3. **Agent 集成**: MCP、Claude Code、Codex 技能成为新入口
4. **本地优先**: Ollama/LM Studio 支持成为差异化因素

### 4.2 AWE 发展建议

| 优先级 | 建议 | 理由 |
|-------|------|------|
| **P0** | 添加本地模型支持 | Ollama/LM Studio 集成 |
| **P1** | 完善品牌配置 UI | 可视化品牌管理 |
| **P1** | 添加 API 接口 | REST API + MCP |
| **P2** | 学习 codex-ppt 流程 | 阶段化确认体验 |
| **P2** | 增强可视化 | 更多图表类型 |
| **P3** | Web UI | 降低使用门槛 |

### 4.3 生态位定位

```
                    商业应用层
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    │   Gamma/Beautiful  │   AWE             │   SlideForge
    │   (最终用户)       │   (开发者工具)     │   (极简工具)
    │                   │                   │
    └───────────────────┼───────────────────┘
                        │
                    开发集成层
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    │   codex-ppt       │   AWE             │   ppt-agent
    │   (图片式)         │   (模板驱动)       │   (设计驱动)
    │                   │                   │
    └───────────────────┼───────────────────┘
                        │
                    基础设施层
```

---

## 五、结论

### 5.1 AWE 的独特价值

AWE Presentation-OS 在开源 PPT 生成工具中占据**独特的开发者工具生态位**：

1. **唯一完整的模板分析系统** — 从 PPTX 提取设计系统
2. **唯一确定性生成管线** — 96个测试覆盖
3. **唯一品牌配置系统** — 企业级品牌一致性
4. **唯一大纲预览功能** — 生成前确认

### 5.2 竞争策略

- **不直接竞争** Gamma/Beautiful.ai 等商业 SaaS
- **差异化定位** 开发者工具、企业集成
- **学习借鉴** codex-ppt 的流程设计、ppt-agent 的美学
- **持续创新** 模板分析、品牌系统、测试覆盖

### 5.3 下一步行动

1. 添加本地模型支持 (Ollama/LM Studio)
2. 完善品牌配置 UI
3. 添加 REST API 和 MCP 支持
4. 学习 codex-ppt 的阶段化确认流程
5. 增强可视化图表类型

---

*报告生成时间: 2026-08-05*  
*数据来源: Tavily Pro 搜索 + GitHub 手动分析*
