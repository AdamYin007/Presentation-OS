#!/usr/bin/env node
/** Retry single slide regeneration with longer timeout. */
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const API_URL = "https://apihub.agnes-ai.cn/v1/images/generations";
const API_KEY = "sk-ZPKHbfCEgowGUKtTNfVGqBe34f7iBL61uokAiHOnqdjcpwxe";
const MODEL = "agnes-image-2.1-flash";

const outputDir = path.join(__dirname, "..", "deliverables", "bingli-presentation-image");

const NO_TEXT = "纯背景图，绝对不能包含任何文字、字母、数字、符号、水印或颜色代码。画面只有图形、图标和视觉元素。";

const prompts = {
  "slide-003": `现代医院病理科数字医疗主题背景插画，深蓝主色调（#17406D、#0F6FC6、#009DD9），医生与病理切片、显微镜、数字化屏幕等医疗元素，简洁专业商务风格，柔和光线，高清细节。${NO_TEXT}`,
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
  for (const [id, prompt] of Object.entries(prompts)) {
    const filename = path.join(outputDir, `${id}.jpg`);
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`[${id}] attempt ${attempt} ...`);
      try {
        await generateImage(prompt, filename);
        console.log(`  ✓ saved: ${filename}`);
        return;
      } catch (e) {
        console.error(`  ✗ ${e.message}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    console.error(`[${id}] FAILED after 3 attempts`);
  }
}

main().catch(console.error);
