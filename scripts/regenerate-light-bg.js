#!/usr/bin/env node
/**
 * Regenerate backgrounds matching TEMPLATE style:
 * - White / very light background (clean medical feel)
 * - Deep navy title text zone (#17406D)
 * - Teal-green accents (#00B4D8, #40B8A0, #7CB342)
 * - Subtle medical visual at bottom-right (city skyline feel like template)
 * - NO dark full-screen backgrounds
 */

"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const API_URL = "https://apihub.agnes-ai.cn/v1/images/generations";
const API_KEY = "sk-ZPKHbfCEgowGUKtTNfVGqBe34f7iBL61uokAiHOnqdjcpwxe";
const MODEL = "agnes-image-2.1-flash";

const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");

const BASE = "高端医疗商务PPT背景图，16:9横版，浅色清爽风格。构图：页面大部分区域为纯白色/极浅蓝白渐变背景（#FFFFFF→#F0F7FB），干净明亮；底部有一条窄的图片带（现代医疗建筑/城市天际线/细胞显微摄影，深蓝#17406D色调，高度占页面15%，像模板页脚图带）；左上角有非常淡的蓝绿渐变装饰条（#00B4D8→#40B8A0，细窄竖条）。页面大面积留白用于放置深蓝色标题文字（#17406D）。绝对禁止任何文字、字母、数字、符号、水印、颜色代码。禁止深色全屏背景。";

const slides = {
  "slide-001": "封面版式：白色背景，底部通栏城市现代医疗建筑图带，左上细蓝绿竖条。",
  "slide-002": "目录版式：白色背景，底部浅蓝图带，左侧淡蓝绿圆弧色块，右上留白。",
  "slide-003": "背景版式：白色背景，底部细胞显微摄影图带。",
  "slide-004": "目标版式：白色背景，底部现代医院建筑图带。",
  "slide-005": "方案版式：白色背景，底部分子结构淡色图带。",
  "slide-006": "扫描版式：白色背景，底部病理切片扫描淡色图带。",
  "slide-007": "AI版式：白色背景，底部神经网络淡蓝图带。",
  "slide-008": "会诊版式：白色背景，底部远程医疗连接淡色图带。",
  "slide-009": "效益版式：白色背景，底部上升趋势淡蓝图带。",
  "slide-010": "结束版式：白色背景，底部极淡光斑图带。",
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
  console.log("=== Regenerating LIGHT template-style backgrounds ===\n");
  const ids = Object.keys(slides);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const filename = path.join(outputDir, `${id}.jpg`);
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      console.log(`[${i + 1}/10] ${id} (attempt ${attempt}) ...`);
      const t0 = Date.now();
      try {
        await generateImage(BASE + slides[id], filename);
        console.log(`  ✓ saved (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
        ok = true;
      } catch (e) {
        console.error(`  ✗ ${e.message}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log("\n=== Done ===");
}

main().catch(console.error);
