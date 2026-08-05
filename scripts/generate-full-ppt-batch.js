#!/usr/bin/env node
/**
 * Batch Image Generation with Long Timeout
 * Generates images one by one with proper timeout handling
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { generateImagePptx, generateImagePrompt, STYLE_PRESETS } = require("../packages/image-ppt/src/index.js");

async function main() {
  const markdownPath = "/tmp/bingli-presentation.md";
  const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");

  console.log("=== Batch Image Generation (No Time Limit) ===\n");
  console.log("This will take 10-20 minutes...");
  console.log("");

  // Read markdown content
  const markdownInput = fs.readFileSync(markdownPath, "utf8");

  // Template colors
  const templateColors = [
    "#17406D", "#0F6FC6", "#009DD9", "#0BD0D9",
    "#10CF9B", "#7CCA62", "#A5C249", "#F49100"
  ];

  // Generate slide specs manually (simplified)
  const slideSpecs = [
    {
      id: "slide-001",
      type: "cover",
      title: "沈阳医学院附属中心医院",
      keyMessage: "数智病理科建设方案",
      body: ["项目背景", "建设目标", "技术方案"],
      speakerNotes: "封面页",
    },
    {
      id: "slide-002",
      type: "agenda",
      title: "Agenda",
      keyMessage: "汇报提纲",
      body: ["项目背景与需求", "建设目标与方案", "技术架构设计", "实施计划与预期效益"],
      speakerNotes: "议程页",
    },
    {
      id: "slide-003",
      type: "content",
      title: "项目背景",
      keyMessage: "提升病理诊断效率与准确性",
      body: ["传统病理诊断效率低", "诊断准确性依赖医生经验", "远程会诊能力不足"],
      speakerNotes: "背景分析",
    },
    {
      id: "slide-004",
      type: "content",
      title: "建设目标",
      keyMessage: "打造数智化病理科",
      body: ["全流程数字化", "AI 辅助诊断", "远程会诊平台", "科研数据资产化"],
      speakerNotes: "建设目标",
    },
    {
      id: "slide-005",
      type: "content",
      title: "技术方案",
      keyMessage: "四大核心技术模块",
      body: ["数字病理扫描仪", "AI 辅助诊断系统", "远程会诊平台", "数据安全管理"],
      speakerNotes: "技术方案",
    },
    {
      id: "slide-006",
      type: "content",
      title: "数字病理扫描仪",
      keyMessage: "高分辨率全切片成像",
      body: ["20x-40x 物镜", "全自动扫描", "30 秒/切片", "支持多种染色"],
      speakerNotes: "扫描仪技术",
    },
    {
      id: "slide-007",
      type: "content",
      title: "AI 辅助诊断系统",
      keyMessage: "深度学习辅助诊断",
      body: ["宫颈癌筛查", "乳腺癌诊断", "前列腺癌检测", "细胞学分析"],
      speakerNotes: "AI 诊断系统",
    },
    {
      id: "slide-008",
      type: "content",
      title: "远程会诊平台",
      keyMessage: "连接基层与上级医院",
      body: ["实时协作诊断", "疑难病例讨论", "继续教育学习", "质控管理"],
      speakerNotes: "远程会诊",
    },
    {
      id: "slide-009",
      type: "content",
      title: "预期效益",
      keyMessage: "多维度价值提升",
      body: ["诊断效率提升 50%", "诊断准确率提升 20%", "远程会诊覆盖 10+ 医院", "科研数据资产化"],
      speakerNotes: "预期效益",
    },
    {
      id: "slide-010",
      type: "end",
      title: "Thank You",
      keyMessage: "感谢聆听",
      body: ["联系我们", "谢谢！"],
      speakerNotes: "结束页",
    },
  ];

  // Generate prompts for all slides
  const style = "business-professional";
  const styleConfig = STYLE_PRESETS[style];

  console.log(`Generating ${slideSpecs.length} image prompts...`);
  const prompts = slideSpecs.map((spec, index) => {
    const prompt = generateImagePrompt(spec, style, {
      templateColors,
      primaryColor: templateColors[0],
      accentColor: templateColors[2],
    });
    return {
      slideIndex: index,
      slideId: spec.id,
      prompt,
      spec,
    };
  });

  // Generate images with proper timeout
  console.log("\nGenerating images (this may take 10-20 minutes)...");
  const results = [];

  for (let i = 0; i < prompts.length; i++) {
    const item = prompts[i];
    console.log(`\n[${i + 1}/${prompts.length}] Generating: ${item.spec.title}`);

    try {
      const startTime = Date.now();
      const imageUrl = await generateImage(item.prompt, {
        apiKey: "sk-ZPKHbfCEgowGUKtTNfVGqBe34f7iBL61uokAiHOnqdjcpwxe",
        api: "agnes-image-2.1-flash",
        size: "1792x1024",
      });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (imageUrl) {
        const outputPath = path.join(outputDir, `${item.slideId}.jpg`);
        await downloadImage(imageUrl, outputPath);
        results.push({ ...item, imageUrl, localPath: outputPath, status: "success", elapsed });
        console.log(`  ✓ Success (${elapsed}s) - Saved to ${outputPath}`);
      } else {
        results.push({ ...item, status: "error", error: "No image URL" });
        console.log(`  ✗ Failed - No image URL`);
      }
    } catch (error) {
      results.push({ ...item, status: "error", error: error.message });
      console.log(`  ✗ Error: ${error.message}`);
    }

    // Add delay between requests
    if (i < prompts.length - 1) {
      console.log("  Waiting 3 seconds...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Generate PPTX
  console.log("\nGenerating PPTX...");
  const pptxPath = await generatePptx(results, outputDir);
  console.log(`\n✅ PPTX saved to: ${pptxPath}`);

  // Summary
  const successCount = results.filter(r => r.status === "success").length;
  console.log(`\n=== Summary ===`);
  console.log(`Total: ${results.length} slides`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${results.length - successCount}`);
}

async function generateImage(prompt, options) {
  const response = await fetch(options.apiKey ? 
    "https://apihub.agnes-ai.cn/v1/images/generations" : 
    "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${options.apiKey || process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: options.api === "agnes-image-2.1-flash" ? "agnes-image-2.1-flash" : "dall-e-3",
        prompt,
        n: 1,
        size: options.size || "1792x1024",
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data?.[0]?.url;
}

async function downloadImage(imageUrl, outputPath) {
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  return outputPath;
}

async function generatePptx(results, outputDir) {
  const PptxGenJS = require("pptxgenjs");
  const pptx = new PptxGenJS();
  const templateColors = ["#17406D", "#0F6FC6", "#009DD9", "#0BD0D9", "#10CF9B", "#7CCA62", "#A5C249", "#F49100"];

  pptx.author = "AWE Presentation-OS";
  pptx.title = "沈阳医学院附属中心医院数智病理科建设方案";

  for (const result of results) {
    if (result.status !== "success" || !result.localPath) continue;

    const slide = pptx.addSlide();
    slide.background = { url: result.localPath };

    const spec = result.spec;

    // Add text overlay
    slide.addText(spec.title || "", {
      x: 0.5, y: 0.5, w: 9, h: 1,
      fontSize: 44, fontFace: "Arial",
      color: templateColors[0], bold: true, align: "left",
    });

    slide.addText(spec.keyMessage || "", {
      x: 0.5, y: 1.8, w: 9, h: 0.8,
      fontSize: 24, fontFace: "Arial",
      color: templateColors[2], align: "left",
    });

    if (spec.body && Array.isArray(spec.body) && spec.body.length > 0) {
      slide.addText(spec.body.slice(0, 5), {
        x: 0.5, y: 2.8, w: 9, h: 3,
        fontSize: 18, fontFace: "Arial",
        color: templateColors[0], align: "left", valign: "top",
      });
    }

    if (spec.speakerNotes) {
      slide.notes = spec.speakerNotes;
    }
  }

  const pptxPath = path.join(outputDir, "presentation.pptx");
  await pptx.writeFile({ fileName: pptxPath });
  return pptxPath;
}

main().catch(console.error);
