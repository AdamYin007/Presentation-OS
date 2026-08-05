#!/usr/bin/env node
/**
 * Regenerate backgrounds with STRICT 45/55 split composition:
 * - LEFT 45%: clean deep-navy gradient zone, EMPTY (for title text)
 * - RIGHT 55%: single medical-tech visual motif, minimal, premium
 */

"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const API_URL = "https://apihub.agnes-ai.cn/v1/images/generations";
const API_KEY = "sk-ZPKHbfCEgowGUKtTNfVGqBe34f7iBL61uokAiHOnqdjcpwxe";
const MODEL = "agnes-image-2.1-flash";

const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");

const BASE = "高端商务PPT背景图，16:9横版。构图规则：画面左侧45%区域必须是干净的深藏青色到中蓝的柔和渐变（#0A2540→#134B6E→#1E5E8E），完全空白无任何元素，专用于放置标题文字；画面右侧55%区域放置一个单一的极简医疗科技视觉元素（柔和微距光斑/抽象细胞轮廓/细线分子结构，透明度低、大面积留白），整体沉稳高级、光线柔和。绝对禁止任何文字、字母、数字、符号、水印、颜色代码、图标、多个元素堆砌。";

const slides = {
  "slide-001": "封面版式：右侧一个极淡的圆形微距细胞光斑，其余留白。",
  "slide-002": "目录版式：右侧极淡的数字医疗网络细线节点。",
  "slide-003": "背景版式：右侧极淡的病理切片微距光斑。",
  "slide-004": "目标版式：右侧极淡的上升光线与细胞轮廓。",
  "slide-005": "方案版式：右侧极淡的分子结构细线。",
  "slide-006": "扫描版式：右侧极淡的显微镜头光斑。",
  "slide-007": "AI版式：右侧极淡的神经网络细线光点。",
  "slide-008": "会诊版式：右侧极淡的连通节点线条。",
  "slide-009": "效益版式：右侧极淡的上升趋势细线。",
  "slide-010": "结束版式：右侧极淡的单点光斑。",
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
  console.log("=== Regenerating backgrounds with 45/55 split ===\n");
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
