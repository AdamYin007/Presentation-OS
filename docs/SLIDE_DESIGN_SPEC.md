# PPT 生成统一设计规范

## 一、大纲生成流程

```
源文档 → DeckPlan → SlideSpec[] → LayoutPlan → PPTX
```

### 1. DeckPlan 结构

```javascript
{
  deckTitle: "标题",
  narrativePattern: "叙事模式ID",
  sections: [
    {
      id: "section-id",
      title: "章节名",
      slideAllocation: 3,  // 该章节分配页数
      keyMessage: "章节核心信息",
      sourceParagraphs: [...]  // 匹配的源内容
    }
  ],
  slides: [
    {
      slideId: "slide-001",
      index: 1,
      role: "title|agenda|content|section-divider|closing",
      section: "章节名",
      objective: "目标描述",
      keyMessage: "核心信息",
      candidateVisual: "none|bar-chart|comparison|process"
    }
  ]
}
```

### 2. 大纲生成规则

#### 2.1 文档长度压缩
- **比率**: 30行/页
- **最小**: 5页
- **最大**: 40页
- **覆盖**: 通过 `intent.minSlides` / `intent.maxSlides` 可调整

#### 2.2 叙事模式选择
系统内置10种模式，也可通过 `intent.customPattern` 自定义：

```javascript
// 自定义模式示例
const customPattern = {
  id: "medical-proposal",
  name: "医疗方案",
  sections: [
    { id: "intro", title: "背景", slideAllocation: 2 },
    { id: "analysis", title: "现状分析", slideAllocation: 3 },
    { id: "solution", title: "建设方案", slideAllocation: 5 },
    { id: "budget", title: "投资预算", slideAllocation: 2 },
    { id: "timeline", title: "实施计划", slideAllocation: 2 },
  ],
  defaultSlideCount: 14,
};
```

#### 2.3 幻灯片分配
- 每节至少1页
- 根据源文档内容密度动态调整
- 关键词匹配: 章节标题 ↔ 源文档标题

### 3. 大纲预览格式

```markdown
# Presentation Outline Preview

**Title**: 数智病理科建设方案
**Pattern**: problem-insight-solution-action
**Total Slides**: 15
**Sections**: 4

---

## 背景 (2 slides)

### 1. 📝 content — 医院信息化建设现状
   **Visual**: none

### 2. 📝 content — 病理科业务痛点分析
   **Visual**: comparison

## ➡️ section-divider — 建设方案

### 3. 🔄 process — 智慧病理整体架构
   **Visual**: process

...
```

---

## 二、幻灯片设计规范

### 1. 首尾页设计

| 角色 | 布局 | 设计要点 |
|------|------|----------|
| `title` | `title-slide` | 居中标题 + 副标题，大字号(44pt)，无正文 |
| `agenda` | `agenda` | 章节列表，左侧目录，右侧可配图 |
| `closing` | `closing` | "Thank You" + 联系方式，居中布局 |

**首尾页统一规则：**
- 标题字号: 44pt (封面), 36pt (结束页)
- 副标题字号: 16-20pt
- 颜色: 使用主题主色
- 无正文项目列表

### 2. 中间页设计

| 角色 | 布局 | 设计要点 |
|------|------|----------|
| `content` | `title-and-bullets` | 标题 + 1-5个要点，左对齐 |
| `section-divider` | `section-divider` | 全页标题，居中，大字号 |
| `data-chart` | `chart-and-insight` | 图表 + 洞察文字 |
| `comparison` | `comparison` | 双栏对比 |
| `process` | `horizontal-process` | 横向流程图 |
| `table` | `table` | 数据表格 |

**中间页统一规则：**
- 标题字号: 22-28pt (根据内容密度)
- 正文字号: 14-16pt
- 最大5个要点
- 每点不超过120字符
- 标题与正文不重复

### 3. 视觉类型映射

```javascript
const ROLE_TO_VISUAL = {
  "content": "none",
  "data-chart": "bar-chart|line-chart",
  "comparison": "comparison",
  "process": "process",
  "roadmap": "timeline",
  "case-study": "image",
  "executive-summary": "metric-cards",
};
```

---

## 三、统一确认清单

### 3.1 大纲生成确认项
- [ ] 文档长度压缩规则 (30行/页, 5-40页)
- [ ] 叙事模式选择逻辑
- [ ] 幻灯片分配算法
- [ ] 关键词匹配策略
- [ ] 大纲预览格式

### 3.2 首尾页确认项
- [ ] 封面: 标题层级 (品牌名 > 产品标语 > 法律实体)
- [ ] 目录: 章节列表展示方式
- [ ] 结束页: 感谢语 + 联系方式

### 3.3 中间页确认项
- [ ] 内容页: 标题 + 要点布局
- [ ] 图表页: 可视化类型选择
- [ ] 对比页: 双栏设计
- [ ] 流程页: 步骤展示

---

## 四、Pipeline 使用示例

```javascript
const { runPipeline } = require('./packages/presentation-pipeline/src/index.js');

// 1. 基础用法
const result = await runPipeline(markdownContent, {
  style: "business-consulting",
  targetSlideCount: 15,
});

// 2. 使用大纲预览
const preview = await runPipeline(markdownContent, {
  style: "business-consulting",
  targetSlideCount: 15,
  previewOnly: true,  // 只生成大纲预览
});
console.log(preview.outline);

// 3. 使用自定义叙事模式
const result = await runPipeline(markdownContent, {
  style: "business-consulting",
  customPattern: {
    id: "medical-proposal",
    name: "医疗方案",
    sections: [
      { id: "intro", title: "背景", slideAllocation: 2 },
      { id: "solution", title: "方案", slideAllocation: 5 },
    ],
  },
});

// 4. 使用模板驱动
const templateSpec = analyzeTemplate('./template.pptx');
const result = await runPipeline(markdownContent, {
  templateSpec,
  brandConfig: convertTemplateForPipeline(templateSpec),
});
```
