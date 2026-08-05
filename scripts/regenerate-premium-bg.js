#!/usr/bin/env node
/**
 * Regenerate ALL 10 backgrounds with premium design prompts.
 *
 * Design direction (from aesthetic diagnosis):
 * - Premium, elegant, minimal (高级感、极简)
 * - Soft navy-teal gradient, deep colors, NOT flat bright blue
 * - Large negative space on the LEFT for title text
 * - No text, no icons clutter, no color codes
 * - Medical-tech atmosphere: subtle depth, soft light
 */

"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const API_URL = "https://apihub.agnes-ai.cn/v1/images/generations";
const API_KEY = "sk-ZPKHbfCEgowGUKtTNfVGqBe34f7iBL61uokAiHOnqdjcpwxe";
const MODEL = "agnes-image-2.1-flash";

const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");

const BASE = "高端商务PPT背景，极简主义设计，深藏青色到深青色的柔和渐变背景（#0A2540 到 #134B6E），左上侧大面积留白用于放置文字，右下侧有极淡的医疗科技元素剪影（微距镜头光斑、抽象细胞轮廓、细线分子结构），整体氛围沉稳专业高级，光线柔和，无任何文字、字母、数字、符号、水印、颜色代码、图标。";

const slides = {
  "slide-001": { title: "封面", prompt: BASE + "封面版式：纯渐变背景+极淡的微观细胞光斑，大面积留白。" },
  "slide-002": { title: "目录", prompt: BASE + "目录版式：柔和渐变背景，右下角极淡的数字医疗网络线条。" },
  "slide-003": { title: "项目背景", prompt: BASE + "背景版式：深蓝渐变，左侧大留白，右下极淡的病理切片微距光斑。" },
  "slide-004": { title: "建设目标", prompt: BASE + "目标版式：深蓝渐变，左侧大留白，右下极淡的上升光线与细胞轮廓。" },
  "slide-005": { title: "技术方案", prompt: BASE + "方案版式：深蓝渐变，左侧大留白，右下极淡的分子结构细线。" },
  "slide-006": { title: "扫描仪", prompt: BASE + "扫描版式：深蓝渐变，左侧大留白，右下极淡的显微镜头光斑。" },
  "slide-007": { title: "AI诊断", prompt: BASE + "AI版式：深蓝渐变，左侧大留白，右下极淡的神经网络细线光点。" },
  "slide-008": { title: "远程会诊", prompt: BASE + "会诊版式：深蓝渐变，左侧大留白，右下极淡的连通节点线条。" },
  "slide-009": { title: "预期效益", prompt: BASE + "效益版式：深蓝渐变，左侧大留白，右下极淡的上升趋势细线。" },
  "slide-010": { title: "结束", prompt: BASE + "结束版式：纯渐变背景+极淡光斑，大面积留白。" },
};

function generateImage(prompt, filename) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ model: MODEL, prompt, n: 1, size: "1920x1080" });
    const req = https.request(
      API_URL,
      { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` }, timeout: 180000 },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.data && json.data[0]) {
              const url = json.data[0].url || json.data[0].b64_json;
              if (url && url.startsWith("http")) {
                https.get(url, (r2) => {
                  if (r2.statusCode !== 200) return reject(new Error("dl " + r2.statusCode));
                  const chunks = [];
                  r2.on("data", (c) => chunks.push(c));
                  r2.on("end", () => { fs.writeFileSync(filename, Buffer.concat(chunks)); resolve(filename); });
                }).on("error", reject);
              } else if (url) {
                fs.writeFileSync(filename, Buffer.from(url, "base64"));
                resolve(filename);
              } else reject(new Error("no url: " + data.slice(0, 150)));
            } else reject(new Error("bad: " + data.slice(0, 150)));
          } catch (e) { reject(new Error(e.message)); }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log("=== Regenerating premium backgrounds (all 10) ===\n");
  const ids = Object.keys(slides);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const spec = slides[id];
    const filename = path.join(outputDir, `${id}.jpg`);
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      console.log(`[${i + 1}/10] ${id} ${spec.title} (attempt ${attempt}) ...`);
      const t0 = Date.now();
      try {
        await generateImage(spec.prompt, filename);
        console.log(`  ✓ saved (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
        ok = true;
      } catch (e) {
        console.error(`  ✗ ${e.message}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log("\n=== All backgrounds regenerated ===");
}

main().catch(console.error);
