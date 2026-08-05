# 竞品深度分析与超越策略

## 一、5 个核心竞品优势分析

### 1. codex-ppt-skill (4,512 ⭐)

#### 具体优点

| 优势 | 实现方式 | 用户价值 |
|------|---------|---------|
| **阶段化确认流程** | 大纲 → 风格 → 样张 → 批量生产，5 步确认 | 用户可在生成前调整方向，避免返工 |
| **图片式 PPT** | GPT-Image-2 生成每页图片，再组装为 .pptx | 视觉质量极高，媲美设计稿 |
| **个人风格库** | `~/.codex-ppt-skill/references/` 持久化用户偏好 | 随使用时间积累，越来越懂用户 |
| **演讲稿自动生成** | 生成 `speech.md` 写入 PPT 备注 | 完整的演讲准备，不只是 PPT |
| **多 Agent 支持** | Codex/Claude/OpenClaw/Hermes 通用 | 不绑定单一工具 |
| **12 种内置风格** | 覆盖党政红/学术/商务/创意等场景 | 开箱即用，无需自定义 |

#### 技术亮点

```
阶段 1: 确认大纲 (用户审核)
阶段 2: 选择风格 (12 选 1)
阶段 3: 生成样张 (1-2 页预览)
阶段 4: 确认样张 (用户反馈)
阶段 5: 批量生产 (剩余页面)
```

#### 用户反馈 (Issue #157)
- "生成的 PPT 视觉质量超预期"
- "阶段化确认避免了一次性生成失败"
- "个人风格库让重复工作变得简单"

---

### 2. ppt-agent-skill (120 ⭐)

#### 具体优点

| 优势 | 实现方式 | 用户价值 |
|------|---------|---------|
| **26 种世界级风格** | 对标 Linear/Apple/Stripe/Anthropic | 设计水准媲美万元/页的咨询公司 |
| **18 种数据可视化** | 基础 8 + 进阶 6 + ECharts 级 4 | 复杂数据也能优雅呈现 |
| **Bento Grid 布局** | 7 种卡片式灵活布局 | 内容驱动版式，非固定模板 |
| **世界级排版** | 7 级字号阶梯、字距铁律、tabular-nums | 专业级印刷品水准 |
| **智能配图** | AI 生成 + 5 种视觉融入技法 | 图文和谐，非简单拼接 |
| **失败模式目录** | 8 种 failure modes + 修复顺序 | 质量保障，自动修复常见问题 |

#### 技术亮点

```
Pipeline: 需求调研 → 资料搜集 → 大纲策划 → 策划稿 → HTML 设计稿 → 后处理 (SVG→PPTX)
```

**排版铁律**:
- 字距: `letter-spacing: -0.02em` (标题)
- 数字: `font-variant-numeric: tabular-nums`
- 字体栈: `system-ui, -apple-system, sans-serif` (三层降级)
- Serif Italic: 标题使用 `font-style: italic` 混排

#### 用户反馈
- "生成的 PPT 可以直接用于融资演示"
- "图表类型丰富，数据呈现更专业"
- "Bento Grid 布局让内容更有层次感"

---

### 3. presenton (9,279 ⭐)

#### 具体优点

| 优势 | 实现方式 | 用户价值 |
|------|---------|---------|
| **最大开源社区** | 9.3k Stars, 1.5k Forks | 生态成熟，文档丰富 |
| **可编辑 PPTX** | 原生形状，非图片占位 | 用户可二次编辑 |
| **模板导入** | 上传 PPTX → AI 提取设计系统 | 品牌一致性传承 |
| **BYOK 模式** | 用户自带 API Key | 无厂商锁定，成本可控 |
| **多平台** | Web + Desktop (Mac/Win/Linux) | 降低使用门槛 |
| **MCP 集成** | 内置 Model Context Protocol | 可与 AI Agent 集成 |
| **迭代速度快** | 2408 commits, 95 branches | 持续更新，活跃维护 |

#### 技术亮点

```
Template → Design System → AI Generation → Manual Edit → Export
```

**核心流程**:
1. 上传现有 PPTX → 提取颜色/字体/布局
2. 生成 Outline → 用户确认
3. AI 逐页生成 → 实时预览
4. 手动微调 → 导出 PPTX/PDF

#### 用户反馈
- "最接近 Gamma 的开源替代"
- "模板导入功能非常好用"
- "社区活跃，问题响应快"

---

### 4. presentation-ai (2,926 ⭐)

#### 具体优点

| 优势 | 实现方式 | 用户价值 |
|------|---------|---------|
| **Web UI** | Next.js + React | 开箱即用，无需配置 |
| **38 种内置主题** | Tailwind CSS 自定义 | 选择丰富 |
| **本地模型支持** | Ollama/LM Studio 集成 | 隐私保护，离线可用 |
| **PPTX 主题导入** | 从 PowerPoint 提取主题 | 品牌一致性 |
| **API 接口** | REST API + MCP | 可集成到工作流 |

#### 技术亮点

```
Theme System:
├── 内置主题 (38 种)
├── 自定义主题创建
├── PPTX 主题导入
└── 主题持久化存储 (Prisma + PostgreSQL)
```

#### 用户反馈
- "Web UI 很易用，团队协作方便"
- "本地模型支持适合企业内网部署"
- "API 接口方便集成到 CI/CD"

---

### 5. slideforge (0 ⭐)

#### 具体优点

| 优势 | 实现方式 | 用户价值 |
|------|---------|---------|
| **极简设计** | 单文件 Python CLI | 零配置，即装即用 |
| **Markdown 输入** | 纯文本驱动 | 开发者友好 |
| **自动布局检测** | 基于内容规则推断 | 无需手动选择版式 |
| **多主题支持** | TechBlue/WarmCreative/MinimalGray | 风格可选 |
| **单依赖** | 仅 python-pptx | 安装简单 |

#### 技术亮点

```
Layout Auto-Detection Rules:
1. 两个以上编号列表 → 步骤时间线
2. 恰好两个 ## 标题 → 双栏布局
3. 3-4 个平行要点 → 卡片网格
4. 无正文，首/尾页 → Hero 封面
```

#### 用户反馈
- "最简单的 Markdown→PPTX 工具"
- "自动布局检测很聪明"
- "适合快速原型"

---

## 二、AWE 的超越策略

### 2.1 超越 codex-ppt-skill

#### 现有差距

| 维度 | codex-ppt | AWE | 差距 |
|------|-----------|-----|------|
| 阶段化流程 | ✅ 5 步确认 | ❌ 一次性生成 | 大 |
| 个人风格库 | ✅ 持久化 | ❌ 无 | 中 |
| 演讲稿生成 | ✅ speech.md | ⚠️ 基础支持 | 中 |
| 图片式 PPT | ✅ GPT-Image-2 | ❌ 不支持 | 大 |
| 多 Agent 支持 | ✅ 通用 | ✅ Hermes | 小 |

#### 超越方案

| 方案 | 实现难度 | 投入时间 | 优先级 |
|------|---------|---------|--------|
| **添加阶段化确认** | 中 | 2 周 | P0 |
| **个人风格库** | 低 | 1 周 | P1 |
| **演讲稿增强** | 低 | 3 天 | P1 |
| **图片式 PPT 支持** | 高 | 1 月 | P2 |

##### 具体实施

**1. 阶段化确认流程**

```javascript
// 新增: packages/presentation-pipeline/src/phase-gate.js
async function runPipelineWithPhases(markdown, options) {
  // Phase 1: 大纲预览 (用户确认)
  const outlineResult = await runPipeline(markdown, { 
    previewOnly: true,
    outputDir: options.outputDir 
  });
  
  // 等待用户确认
  const confirmed = await waitForUserConfirmation(outlineResult.outline);
  if (!confirmed) return { cancelled: true };
  
  // Phase 2: 风格选择 (用户确认)
  const styleChoice = await showStyleGallery(outlineResult);
  
  // Phase 3: 样张生成 (用户确认)
  const sampleResult = await generateSamples(outlineResult, {
    style: styleChoice,
    sampleCount: 2
  });
  
  // 等待用户确认样张
  const sampleConfirmed = await waitForUserConfirmation(sampleResult);
  
  // Phase 4: 批量生产
  return await runFullPipeline(markdown, {
    ...options,
    style: styleChoice,
    sampleFeedback: sampleConfirmed.feedback
  });
}
```

**2. 个人风格库**

```javascript
// 新增: packages/style-library/src/index.js
class StyleLibrary {
  constructor(home = '~/.awe/style-library') {
    this.home = home;
    this.styles = [];
    this.load();
  }
  
  save(userPreferences) {
    // 持久化到 JSON
    fs.writeFileSync(
      path.join(this.home, 'preferences.json'),
      JSON.stringify(userPreferences, null, 2)
    );
  }
  
  recommend() {
    // 基于历史使用推荐风格
    return this.styles
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);
  }
}

// 在 pipeline 中集成
async function runPipelineWithStyleLibrary(markdown, options) {
  const styleLib = new StyleLibrary();
  
  // 自动推荐风格
  if (!options.style) {
    const recommendations = styleLib.recommend();
    options.style = recommendations[0]?.id;
  }
  
  // 执行生成
  const result = await runPipeline(markdown, options);
  
  // 学习用户反馈
  if (result.userFeedback) {
    styleLib.save(result.userFeedback);
  }
  
  return result;
}
```

**3. 演讲稿增强**

```javascript
// 在 slidespec generator 中增强
function generateSpeakerNotes(slideSpec, deckPlan) {
  const notes = [];
  
  // 原有逻辑
  notes.push(`Purpose: ${slideSpec.objective}`);
  notes.push(`Key argument: ${slideSpec.keyMessage}`);
  
  // 新增: 时间分配
  const slideIndex = deckPlan.slides.findIndex(s => s.id === slideSpec.id);
  notes.push(`Position: Slide ${slideIndex + 1} of ${deckPlan.slides.length}`);
  notes.push(`Suggested duration: ~${Math.ceil(deckPlan.totalDuration / deckPlan.slides.length)}s`);
  
  // 新增: 过渡提示
  if (slideIndex > 0) {
    const prevSlide = deckPlan.slides[slideIndex - 1];
    notes.push(`Previous: ${prevSlide.keyMessage}`);
  }
  if (slideIndex < deckPlan.slides.length - 1) {
    const nextSlide = deckPlan.slides[slideIndex + 1];
    notes.push(`Next: ${nextSlide.keyMessage}`);
  }
  
  return notes.join('\n');
}
```

#### 实现难点

| 难点 | 解决方案 | 风险评估 |
|------|---------|---------|
| 阶段化流程的 UI 交互 | CLI 交互式确认 + 配置文件 | 中 |
| 个人风格库的同步 | 本地 JSON + Git 版本控制 | 低 |
| 演讲稿的时间计算 | 基于内容复杂度估算 | 低 |

---

### 2.2 超越 ppt-agent-skill

#### 现有差距

| 维度 | ppt-agent | AWE | 差距 |
|------|-----------|-----|------|
| 设计风格 | 26 种世界级 | 3 种商务 | 大 |
| 数据可视化 | 18 种 | 基础 4 种 | 大 |
| 排版专业度 | 字距/数字/字体栈 | 基础 | 大 |
| 智能配图 | AI 生成 + 融入技法 | ❌ | 中 |
| 失败模式 | 8 种 failure modes | ❌ | 中 |

#### 超越方案

| 方案 | 实现难度 | 投入时间 | 优先级 |
|------|---------|---------|--------|
| **增强设计风格** | 中 | 1 月 | P0 |
| **添加数据可视化** | 高 | 2 月 | P1 |
| **排版专业度** | 低 | 1 周 | P1 |
| **失败模式目录** | 中 | 2 周 | P2 |

##### 具体实施

**1. 增强设计风格**

```javascript
// 在 brand-profiles 中添加新风格
const STYLES = {
  // 现有
  'minimal-modern': { ... },
  'executive-report': { ... },
  
  // 新增: 对标 Linear
  'linear-dark': {
    colors: {
      primary: '#6F7981',
      secondary: '#343940',
      accent: '#7D6FF7',
      background: '#101113',
      text: '#EDEDED'
    },
    fonts: {
      heading: 'Inter, system-ui, sans-serif',
      body: 'Inter, system-ui, sans-serif'
    },
    typography: {
      letterSpacing: '-0.02em',
      lineHeight: 1.4,
      fontVariantNumeric: 'tabular-nums'
    }
  },
  
  // 新增: 对标 Apple Keynote
  'apple-keynote': {
    colors: {
      primary: '#0071E3',
      secondary: '#86868B',
      accent: '#30D158',
      background: '#FFFFFF',
      text: '#1D1D1F'
    },
    fonts: {
      heading: '-apple-system, BlinkMacSystemFont, sans-serif',
      body: '-apple-system, BlinkMacSystemFont, sans-serif'
    },
    typography: {
      letterSpacing: '-0.015em',
      lineHeight: 1.35
    }
  },
  
  // 新增: 对标 Anthropic
  'anthropic-clean': {
    colors: {
      primary: '#FF5C00',
      secondary: '#6B7280',
      accent: '#FF5C00',
      background: '#FAFAFA',
      text: '#111827'
    },
    fonts: {
      heading: 'Cal Sans, system-ui, sans-serif',
      body: 'Inter, system-ui, sans-serif'
    },
    typography: {
      letterSpacing: '-0.01em',
      lineHeight: 1.5
    }
  }
};
```

**2. 排版专业度增强**

```javascript
// 在 renderer 中添加排版规则
function applyTypographyRules(slide) {
  // 字距调整
  const titleElements = slide.querySelectorAll('h1, h2, .title');
  titleElements.forEach(el => {
    el.style.letterSpacing = '-0.02em';
  });
  
  // 数字等宽
  const numericElements = slide.querySelectorAll('.number, .metric');
  numericElements.forEach(el => {
    el.style.fontVariantNumeric = 'tabular-nums';
  });
  
  // 字体栈
  const bodyElements = slide.querySelectorAll('p, .body');
  bodyElements.forEach(el => {
    el.style.fontFamily = 'Inter, -apple-system, system-ui, sans-serif';
  });
}
```

**3. 失败模式目录**

```javascript
// 新增: packages/quality-gate/src/failure-modes.js
const FAILURE_MODES = {
  // 内容不足
  UNDERFILL: {
    id: 'underfill',
    description: 'Slide has less than 20% content density',
    detection: (slide) => slide.contentLength < 50,
    fix: 'Add key message or visual element'
  },
  
  // 装饰性替代
  DECORATIVE_SUBSTITUTION: {
    id: 'decorative_substitution',
    description: 'Image replaces actual content',
    detection: (slide) => slide.hasImage && slide.contentLength < 30,
    fix: 'Add caption or replace with actual data'
  },
  
  // 文字过载
  TEXT_OVERFLOW: {
    id: 'text_overflow',
    description: 'More than 6 bullet points per slide',
    detection: (slide) => slide.bullets.length > 6,
    fix: 'Split into multiple slides'
  },
  
  // 对比缺失
  NO_COMPARISON: {
    id: 'no_comparison',
    description: 'Claims made without data support',
    detection: (slide) => slide.hasClaims && !slide.hasData,
    fix: 'Add chart or statistics'
  }
};

// 在 QA 中集成
function checkFailureModes(slideSpecs) {
  const issues = [];
  
  for (const slide of slideSpecs) {
    for (const mode of Object.values(FAILURE_MODES)) {
      if (mode.detection(slide)) {
        issues.push({
          slide: slide.id,
          mode: mode.id,
          description: mode.description,
          fix: mode.fix
        });
      }
    }
  }
  
  return issues;
}
```

#### 实现难点

| 难点 | 解决方案 | 风险评估 |
|------|---------|---------|
| 设计风格的专业度 | 参考实际品牌 CSS 实现 | 中 |
| 数据可视化复杂度 | 复用 chart.js 或 echarts | 高 |
| 失败模式的准确性 | 基于真实用户反馈训练 | 中 |

---

### 2.3 超越 presenton

#### 现有差距

| 维度 | presenton | AWE | 差距 |
|------|-----------|-----|------|
| 社区规模 | 9.3k Stars | 待建立 | 大 |
| Web UI | ✅ Next.js | ❌ CLI only | 大 |
| 多平台 | Web + Desktop | CLI only | 中 |
| MCP 集成 | ✅ 内置 | ❌ | 中 |
| 模板导入 | ✅ PPTX→Design System | ✅ 模板分析 | 小 |
| 迭代速度 | 2408 commits | 待积累 | 大 |

#### 超越方案

| 方案 | 实现难度 | 投入时间 | 优先级 |
|------|---------|---------|--------|
| **增强模板分析** | 中 | 2 周 | P0 |
| **MCP 支持** | 中 | 1 周 | P1 |
| **本地模型支持** | 高 | 1 月 | P2 |
| **Web UI** | 高 | 2 月 | P3 |

##### 具体实施

**1. 增强模板分析**

```javascript
// 在 template-analyzer 中增强
async function analyzeTemplate(templatePath) {
  const baseAnalysis = await extractTemplateInfo(templatePath);
  
  // 新增: 设计系统提取
  const designSystem = {
    colors: baseAnalysis.colors,
    fonts: baseAnalysis.fonts,
    spacing: extractSpacingRules(baseAnalysis),
    borderRadius: extractBorderRadius(baseAnalysis),
    shadows: extractShadows(baseAnalysis),
    grid: extractGridSystem(baseAnalysis)
  };
  
  // 新增: 组件库提取
  const components = {
    slides: extractSlideTypes(baseAnalysis),
    shapes: extractShapeLibrary(baseAnalysis),
    icons: extractIconLibrary(baseAnalysis)
  };
  
  return {
    ...baseAnalysis,
    designSystem,
    components,
    metadata: {
      sourceFile: templatePath,
      analyzedAt: new Date().toISOString(),
      version: '1.0'
    }
  };
}

function extractGridSystem(template) {
  // 从 master slides 提取网格系统
  return {
    columns: 12,
    gutter: 24,
    margins: {
      top: 72,
      bottom: 72,
      left: 72,
      right: 72
    }
  };
}
```

**2. MCP 支持**

```javascript
// 新增: packages/mcp-server/src/index.js
const { Server } = require('@modelcontextprotocol/sdk/server');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio');

const server = new Server({
  name: 'awe-presentation',
  version: '1.0.0'
}, {
  name: 'AWE Presentation OS',
  version: '1.0.0'
});

// 注册工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_presentation',
        description: 'Generate a presentation from markdown',
        inputSchema: {
          type: 'object',
          properties: {
            markdown: { type: 'string', description: 'Source markdown' },
            template: { type: 'string', description: 'Template path' },
            style: { type: 'string', description: 'Style preference' }
          }
        }
      },
      {
        name: 'preview_outline',
        description: 'Preview presentation outline',
        inputSchema: {
          type: 'object',
          properties: {
            markdown: { type: 'string' }
          }
        }
      }
    ]
  };
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

#### 实现难点

| 难点 | 解决方案 | 风险评估 |
|------|---------|---------|
| 模板分析的深度 | 借鉴现成库 + 自定义规则 | 中 |
| MCP 协议复杂度 | 使用官方 SDK | 低 |
| 本地模型支持 | 集成 Ollama/LM Studio | 高 |

---

### 2.4 超越 presentation-ai

#### 现有差距

| 维度 | presentation-ai | AWE | 差距 |
|------|-----------------|-----|------|
| Web UI | ✅ Next.js | ❌ CLI | 大 |
| 本地模型 | ✅ Ollama | ❌ | 中 |
| API 接口 | ✅ REST | ❌ | 中 |
| 主题系统 | 38 种 | 3 种 | 大 |
| 模板导入 | ✅ PPTX 导入 | ✅ 模板分析 | 小 |

#### 超越方案

| 方案 | 实现难度 | 投入时间 | 优先级 |
|------|---------|---------|--------|
| **添加 API 接口** | 低 | 1 周 | P0 |
| **本地模型支持** | 高 | 1 月 | P1 |
| **Web UI** | 高 | 2 月 | P2 |

##### 具体实施

**1. API 接口**

```javascript
// 新增: packages/api-server/src/index.js
const express = require('express');
const cors = require('cors');
const { runPipeline } = require('../presentation-pipeline/src/pipeline.js');

const app = express();
app.use(cors());
app.use(express.json());

// 生成 PPT
app.post('/api/generate', async (req, res) => {
  try {
    const { markdown, options = {} } = req.body;
    const result = await runPipeline(markdown, options);
    
    res.json({
      success: true,
      slideCount: result.slideCount,
      outline: result.deckPlan,
      downloadUrl: `/api/download/${result.id}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 大纲预览
app.get('/api/preview/:id', async (req, res) => {
  // ...
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
```

#### 实现难点

| 难点 | 解决方案 | 风险评估 |
|------|---------|---------|
| API 状态管理 | 内存 + Redis 可选 | 低 |
| 本地模型集成 | Ollama Python SDK | 高 |
| Web UI 开发 | Next.js + Tailwind | 高 |

---

### 2.5 超越 slideforge

#### 现有差距

| 维度 | slideforge | AWE | 差距 |
|------|-----------|-----|------|
| 极简性 | 单文件 CLI | Monorepo | 小 |
| 自动布局 | ✅ 规则推断 | ⚠️ 部分 | 中 |
| 测试覆盖 | ❌ | 96 tests | AWE 优 |
| 品牌系统 | ❌ | ✅ | AWE 优 |
| 模板分析 | ❌ | ✅ | AWE 优 |

#### 超越方案

| 方案 | 实现难度 | 投入时间 | 优先级 |
|------|---------|---------|--------|
| **增强自动布局** | 低 | 3 天 | P0 |
| **添加极简模式** | 低 | 1 周 | P1 |

##### 具体实施

**1. 增强自动布局**

```javascript
// 在 theme-layout/src/auto-detect.js 中增强
function detectAutoLayout(slideSpec) {
  const { bullets, charts, images, hasTitle } = slideSpec;
  
  // 原有规则
  if (bullets.length >= 2 && hasTitle) {
    return 'title-and-bullets';
  }
  
  // 新增: 多图表布局
  if (charts.length >= 2) {
    return 'multi-chart';
  }
  
  // 新增: 对比布局
  if (bullets.length === 2 && bullets[0].length > 3 && bullets[1].length > 3) {
    return 'comparison';
  }
  
  // 新增: 流程布局
  if (bullets.every((b, i) => /^\d+/.test(b))) {
    return 'process';
  }
  
  // 默认
  return 'title-and-bullets';
}
```

**2. 极简模式**

```javascript
// 新增: packages/cli/src/simple-mode.js
function simpleMode(markdown) {
  // 纯 Markdown → PPTX，无需任何配置
  const result = runPipeline(markdown, {
    style: 'minimal-modern',
    autoLayout: true,
    noPreview: true
  });
  
  return result;
}

// CLI 命令
// awe simple input.md
```

#### 实现难点

| 难点 | 解决方案 | 风险评估 |
|------|---------|---------|
| 自动布局规则 | 基于现有规则扩展 | 低 |
| 极简模式兼容性 | 使用默认配置 | 低 |

---

## 三、综合优先级与资源分配

### 3.1 优先级矩阵

| 功能 | 用户价值 | 实现难度 | 投入时间 | 优先级 |
|------|---------|---------|---------|--------|
| 阶段化确认流程 | ⭐⭐⭐⭐⭐ | 中 | 2 周 | P0 |
| API 接口 | ⭐⭐⭐⭐ | 低 | 1 周 | P0 |
| 增强设计风格 | ⭐⭐⭐⭐⭐ | 中 | 1 月 | P0 |
| 个人风格库 | ⭐⭐⭐ | 低 | 1 周 | P1 |
| 演讲稿增强 | ⭐⭐⭐ | 低 | 3 天 | P1 |
| 排版专业度 | ⭐⭐⭐⭐ | 低 | 1 周 | P1 |
| 失败模式目录 | ⭐⭐⭐ | 中 | 2 周 | P2 |
| 本地模型支持 | ⭐⭐⭐⭐ | 高 | 1 月 | P2 |
| Web UI | ⭐⭐⭐⭐ | 高 | 2 月 | P3 |

### 3.2 资源估算

| 阶段 | 功能 | 时间 | 人力 |
|------|------|------|------|
| Phase 1 (2 周) | 阶段化确认 + API + 排版 | 2 周 | 1 人 |
| Phase 2 (4 周) | 设计风格增强 + 个人风格库 | 4 周 | 1 人 |
| Phase 3 (6 周) | 本地模型 + 失败模式 | 6 周 | 1 人 |
| Phase 4 (8 周) | Web UI + 数据可视化 | 8 周 | 2 人 |

### 3.3 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 设计风格的专业度不足 | 高 | 聘请设计顾问，参考实际品牌 CSS |
| 本地模型集成复杂度 | 中 | 使用成熟 SDK，分阶段实现 |
| Web UI 开发周期长 | 高 | MVP 先行，迭代优化 |
| 社区建设困难 | 中 | 先开源核心功能，积累用户 |

---

## 四、结论

### 4.1 核心竞争力

AWE 的核心竞争力在于 **模板驱动 + 确定性生成 + 品牌系统**，这是与所有竞品最大的差异。

### 4.2 超越路径

1. **短期 (2 周)**: 阶段化确认 + API 接口 + 排版专业度
2. **中期 (2 月)**: 设计风格增强 + 个人风格库 + 失败模式
3. **长期 (6 月)**: 本地模型 + Web UI + 数据可视化

### 4.3 建议

- **不追求全面超越**: 保持差异化定位 (开发者工具 vs 商业 SaaS)
- **借力开源**: MCP 协议、Ollama、python-pptx 等成熟方案
- **社区驱动**: 先积累核心用户，再扩展功能
