#!/usr/bin/env node
/**
 * Regenerate problem background images with NO-TEXT constraint
 *
 * Problem slides (AI drew garbled text / color codes into the image):
 *   slide-003 (乱码文字), slide-004 (版本号/颜色代码), slide-005 (颜色代码), slide-009 (颜色代码)
 *
 * Regenerates only these 4 images with a strict "no text" prompt,
 * then rebuilds the polished PPTX.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const API_URL = "https://apihub.agnes-ai.cn/v1/images/generations";
const API_KEY = "sk-ZPKHbfCEgowGUKtTNfVGqBe34f7iBL61uokAiHOnqdjcpwxe";
const MODEL = "agnes-image-2.1-flash";

const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");

const TEMPLATE_COLORS = {
  navy: "#17406D",
  blue: "#0F6FC6",
  lightBlue: "#009DD9",
  cyan: "#0BD0D9",
  green: "#10CF9B",
};

const NO_TEXT = "纯背景图，绝对不能包含任何文字、字母、数字、符号、水印或颜色代码。画面只有图形、图标和视觉元素。";

const slides = {
  "slide-003": {
    title: "项目背景",
    keyMessage: "提升病理诊断效率与准确性",
    prompt: `现代医院病理科数字医疗主题背景插画，深蓝主色调（#17406D、#0F6FC6、#009DD9），医生与病理切片、显微镜、数字化屏幕等医疗元素，简洁专业商务风格，柔和光线，高清细节。${NO_TEXT}`,
  },
  "slide-004": {
    title: "建设目标",
    keyMessage: "打造数智化病理科",
    prompt: `数字病理与人工智能主题背景，深蓝与青色渐变（#17406D、#009DD9、#0BD0D9），包含AI芯片、医疗数据、数字化流程图标，现代化科技感，简洁商务风格。${NO_TEXT}`,
  },
  "slide-005": {
    title: "技术方案",
    keyMessage: "四大核心技术模块",
    prompt: `医学科技与数字化解决方案主题背景，深蓝主色调（#17406D、#0F6FC6），包含扫描设备、AI分析、远程协作、数据安全等抽象图形元素，现代商务科技风格，干净整洁。${NO_TEXT}`,
  },
  "slide-009": {
    title: "预期效益",
    keyMessage: "多维度价值提升",
    prompt: `医疗行业效益增长与价值提升主题背景，深蓝与绿色调（#17406D、#10CF9B、#009DD9），上升图表、医疗图标、协作网络等抽象视觉元素，现代商务风格，明亮专业。${NO_TEXT}`,
  },
};

function generateImage(prompt, filename) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: MODEL,
      prompt,
      n: 1,
      size: "1920x1080",
    });

    const req = https.request(
      API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        timeout: 120000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.data && json.data[0]) {
              const url = json.data[0].url || json.data[0].b64_json;
              if (url && url.startsWith("http")) {
                downloadImage(url, filename).then(resolve).catch(reject);
              } else if (url) {
                fs.writeFileSync(filename, Buffer.from(url, "base64"));
                resolve(filename);
              } else {
                reject(new Error("No image URL in response: " + data.slice(0, 200)));
              }
            } else {
              reject(new Error("Bad response: " + data.slice(0, 200)));
            }
          } catch (e) {
            reject(new Error("JSON parse error: " + e.message + " " + data.slice(0, 200)));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    req.write(payload);
    req.end();
  });
}

function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error("Download failed: " + res.statusCode));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          fs.writeFileSync(filename, Buffer.concat(chunks));
          resolve(filename);
        });
      })
      .on("error", reject);
  });
}

async function main() {
  console.log("=== Regenerating problem slides (no-text constraint) ===\n");

  for (const [id, spec] of Object.entries(slides)) {
    const filename = path.join(outputDir, `${id}.jpg`);
    console.log(`[${id}] ${spec.title} ...`);
    const t0 = Date.now();
    try {
      await generateImage(spec.prompt, filename);
      const sec = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  ✓ saved (${sec}s): ${filename}`);
    } catch (e) {
      console.error(`  ✗ FAILED: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log("\n=== Done. Now rebuilding polished PPTX ===");
  // Rebuild PPTX using the polished generator
  const { execSync } = require("child_process");
  execSync("node scripts/generate-polished-ppt.js", { cwd: path.join(__dirname, ".."), stdio: "inherit" });
}

main().catch(console.error);
