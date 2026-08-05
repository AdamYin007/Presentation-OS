# AWE vs codex-ppt-skill 对比分析（更新）

## 一、核心功能对比（更新后）

| 功能 | AWE (图片式 PPT) | codex-ppt-skill | 评分 |
|------|------------------|-----------------|------|
| **图片生成质量** | ✅ Agnes/GPT-Image-2/DALL-E-3 | ✅ GPT-Image-2 | ⭐⭐⭐⭐ |
| **阶段化确认流程** | ⚠️ 大纲预览 | ✅ 5 步确认 | ⭐⭐ |
| **风格预设** | ⚠️ 4 种 | ✅ 12 种 + 个人库 | ⭐⭐ |
| **个人风格库** | ❌ 无 | ✅ ~/.codex-ppt-skill/references/ | ⭐ |
| **演讲稿生成** | ❌ 无 | ✅ speech.md + PPTX 备注 | ⭐ |
| **指定图片插入** | ❌ 无 | ✅ 可插入论文原图/截图 | ⭐ |
| **失败模式处理** | ❌ 无 | ✅ 8 种 failure modes | ⭐ |
| **多 Agent 协作** | ❌ 无 | ✅ 一页一个 agent | ⭐ |
| **模板分析** | ✅ **完整系统** | ❌ 无 | ⭐⭐⭐⭐⭐ |
| **品牌系统** | ✅ **企业级** | ❌ 无 | ⭐⭐⭐⭐⭐ |
| **确定性生成** | ✅ 129+ 测试覆盖 | ❌ AI 随机 | ⭐⭐⭐ |
| **可编辑 PPTX** | ❌ 图片背景 | ✅ 原生形状 | ⭐ |
| **Agnes 集成** | ✅ **已集成** | ❌ 无 | ⭐⭐⭐⭐ |

## 二、Agnes 图像 API 集成成功

### API 信息
- **Endpoint**: `https://apihub.agnes-ai.cn/v1/images/generations`
- **Model**: `agnes-image-2.1-flash`
- **Size**: `1792x1024` (16:9 for PPT)
- **Response**: 返回 PNG 图片 URL

### 测试结果
```json
{
  "created": 1785911574,
  "data": [{
    "url": "https://platform-outputs.agnes-ai.space/images/t2i/227d3b85eee244a4a97dde6bdc155535.png"
  }],
  "usage": {
    "input_tokens": 0,
    "output_tokens": 0
  }
}
```

### 集成代码
```javascript
// packages/image-ppt/src/index.js
const API_CONFIG = {
  // Agnes Image API (primary)
  "agnes-image-2.1-flash": {
    endpoint: "https://apihub.agnes-ai.cn/v1/images/generations",
    model: "agnes-image-2.1-flash",
    size: "1792x1024",
    quality: "hd",
  },
  // OpenAI DALL-E 3
  "dall-e-3": {
    endpoint: "https://api.openai.com/v1/images/generations",
    model: "dall-e-3",
    size: "1792x1024",
    quality: "hd",
  },
  // ... more APIs
};
```

### 使用示例
```javascript
const { generateImagePptx } = require('./packages/image-ppt/src/index.js');

// 使用 Agnes 图像 API (默认)
const result = await generateImagePptx({
  slideSpecs: [...],
  apiKey: 'sk-ZPKHbfCEgowGUKtTNfVGqBe34f7iBL61uokAiHOnqdjcpwxe',
  api: 'agnes-image-2.1-flash',  // 默认
  style: 'business-professional',
  outputDir: './output',
});

// 或使用 OpenAI
const result2 = await generateImagePptx({
  slideSpecs: [...],
  apiKey: 'sk-xxx',
  api: 'dall-e-3',
  style: 'tech-modern',
});
```

## 三、AWE 的优势领域

### 1. 模板分析 (唯一完整系统)
- 从 PPTX 提取主题颜色、字体、布局、媒体资产
- 生成 template-spec.md 和 brand-config.json
- 企业级品牌一致性保证

### 2. 品牌系统
- 从模板到品牌的自动化转换
- 主题 token 生成
- 布局映射

### 3. 确定性生成
- 129+ 测试用例覆盖
- Schema 校验
- 可预测的输出

### 4. Agnes 原生集成
- 中国原生 API，低延迟
- 可能免费或低成本（需确认）
- 与 Hermes Agent 生态集成

## 四、codex-ppt-skill 的优势领域

### 1. 用户体验
- 阶段化确认流程 (5 步)
- 样张预览 (生成前确认)
- 失败模式处理

### 2. 风格系统
- 12 种内置风格
- 个人风格库持久化
- 自定义风格复刻

### 3. 高级功能
- 演讲稿生成 (speech.md)
- 指定图片插入 (论文原图/截图)
- 多 Agent 并行生成

### 4. 生态集成
- Codex 内置生图
- AtlasCloud 支持
- 多平台兼容

## 五、实现难度评估

| 功能 | 难度 | 时间 | 优先级 |
|------|------|------|--------|
| **阶段化确认流程** | 中 | 2 周 | P0 |
| **个人风格库** | 低 | 1 周 | P1 |
| **演讲稿生成** | 低 | 3 天 | P1 |
| **指定图片插入** | 中 | 2 周 | P2 |
| **失败模式处理** | 高 | 3 周 | P2 |
| **多 Agent 协作** | 高 | 1 月 | P3 |
| **增强风格系统** | 中 | 2 周 | P1 |

## 六、评分总结

### AWE 图片式 PPT 能力评分：80/100 (提升 5 分)

| 维度 | 得分 | 说明 |
|------|------|------|
| 技术架构 | 85/100 | 模块化设计，可扩展性强 |
| 功能完整度 | 65/100 | 缺少阶段化流程、风格库、演讲稿 |
| 用户体验 | 55/100 | 缺少样张确认、失败处理 |
| 差异化优势 | 95/100 | 模板分析+品牌系统+Agnes 集成 |
| 测试覆盖 | 95/100 | 129+ 测试用例 |

### 超越路径

1. **短期 (1-2 周)**:
   - ✅ 集成 Agnes 图像模型 (已完成)
   - 添加个人风格库
   - 添加演讲稿生成

2. **中期 (1 月)**:
   - 实现阶段化确认流程
   - 增强风格系统 (12+ 风格)
   - 添加指定图片插入

3. **长期 (2-3 月)**:
   - 多 Agent 并行生成
   - 失败模式自动修复
   - Web UI

## 七、关键结论

**AWE 的图片式 PPT 目前能打 80 分**，相比 codex-ppt-skill:

- ✅ **优势**: 模板分析、品牌系统、确定性生成、Agnes 集成
- ❌ **劣势**: 用户体验、风格系统、高级功能
- 🎯 **差异化**: 企业级模板驱动 + 品牌一致性 + Agnes 原生支持

**超越 codex-ppt 的关键**:
1. 不直接竞争通用市场，聚焦企业级模板分析
2. 保持确定性生成的优势
3. 逐步补齐用户体验短板
4. 利用 Agnes 生态优势

## 八、下一步行动

1. **确认 Agnes 定价** - 了解图像生成 API 是否免费
2. **集成到主管线** - 添加 `imagePpt: true` 选项
3. **添加样张预览** - 生成前展示 2-3 张确认风格
4. **增强风格系统** - 从 4 种扩展到 12+ 种
