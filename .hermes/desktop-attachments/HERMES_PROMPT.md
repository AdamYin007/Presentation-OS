你是一个专业的乐谱符号识别助手。我将给你10批从乐谱中裁剪出来的音符头部图像，你需要对每一批进行分类标注。请按顺序依次处理 S01 到 S10，不要跳步。

## 批次列表

需要处理的批次如下：
- hermes_batches/S01/ （120张图）
- hermes_batches/S02/ （120张图）
- hermes_batches/S03/ （120张图）
- hermes_batches/S04/ （120张图）
- hermes_batches/S05/ （57张图）
- hermes_batches/S06/ （120张图）
- hermes_batches/S07/ （120张图）
- hermes_batches/S08/ （120张图）
- hermes_batches/S09/ （120张图）
- hermes_batches/S10/ （120张图）

## 任务说明

对每个批次执行以下步骤：

1. 读取 `hermes_batches/SXX/batch_manifest.json` 文件，了解该批次的元数据（包括每个裁剪图的 filename、x/y 坐标、置信度等信息）
2. 逐一查看 `hermes_batches/SXX/` 目录下的所有 PNG 裁剪图
3. 对每张图进行视觉分析，判断其所属的类别

其中 SXX 为 S01 到 S10，请严格按此顺序处理。

## 分类体系（7 类，必须选其一）

1. **notehead_filled** — 实心符头。包括四分音符、八分音符、十六分音符等的实心符头部分。特征是黑色填充的椭圆形。

2. **notehead_open** — 空心符头。包括二分音符、全音符的空心符头。特征是白色内部、黑色边框的椭圆形。

3. **rest** — 休止符。包括四分休止符、八分休止符、全休止符等。形状各异，通常不是椭圆形。

4. **clef** — 谱号。包括高音谱号（G clef）、低音谱号（F clef）、中音谱号（C clef）等。

5. **barline** — 小节线。垂直的线条，可能包含重复线（双竖线）。

6. **accidental** — 变音记号。包括升号（♯）、降号（♭）、还原号（♮）。

7. **other** — 无法明确分类的杂项。如果图像模糊、被截断严重、或包含多个符号重叠导致无法判断，归为此类，并在 reason 字段中说明原因。

## 判断指南（重要）

请参考以下视觉特征帮助判断：

- **notehead_filled** vs **notehead_open**：仔细看符头内部。如果符头内部是纯黑/实心，选 notehead_filled；如果符头内部是白色/透明、只有黑色边框，选 notehead_open。这是最常见的混淆。
- **accidental**：符号不是椭圆形。升号（♯）由两条竖线和两条斜线组成十字形；降号（♭）像一个小的花体b；还原号（♮）像一个竖杆加上下两个斜角。
- **barline**：纯垂直线条，没有椭圆形的主体。可能是单线、双线或重复线。
- **clef**：大符号，占据多行五线谱空间。高音谱号像一个花体的G，低音谱号有两个点夹着一条曲线。
- **rest**：不是椭圆形的符号。四分休止符像一个歪斜的"7"；八分休止符像一个带圆点的斜杠；全休止符是一个放在五线谱第四线下方的实心矩形块；二分之一休止符是挂在第三线上的空心矩形块。

## 输出要求

请严格按以下 JSON 格式输出结果，不要添加任何其他文字说明：

```json
{
  "batches": [
    {
      "sample_id": "S01",
      "total_images": 120,
      "results": [
        {
          "filename": "S01_S01_L1_bagatelle_000_x218_y661_c0.857.png",
          "predicted_label": "notehead_filled",
          "confidence_description": "高",
          "reason": "清晰的实心符头，带符干"
        }
      ]
    },
    {
      "sample_id": "S02",
      "total_images": 120,
      "results": [...]
    }
  ]
}
```

每个批次都必须包含，按 S01~S10 顺序排列。

## 注意事项

- 每张裁剪图只对应一个符号，不要尝试区分符干、符尾等其他元素
- 如果图像不够清晰或无法确定类别，选择 `other` 并在 reason 中说明
- `confidence_description` 基于你对图像的视觉判断：高=清晰可辨，中=基本可辨但有歧义，低=模糊或残缺
- 确保输出的 JSON 是合法的，可以被 `json.loads()` 解析
- 必须覆盖所有10个批次中 batch_manifest.json 列出的所有条目，不能遗漏任何一张图
- 必须按 S01→S10 的顺序处理，每个批次处理完再继续下一个
- 特别注意区分 notehead_filled 和 notehead_open，以及 accidental 和 barline

现在开始处理，从 S01 开始。
