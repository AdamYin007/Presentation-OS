const fs = require("fs");
const path = require("path");

const root = process.cwd();

module.exports = function sprint() {
  const sprintFile = path.join(root, "docs", "sprint.md");
  if (!fs.existsSync(sprintFile)) {
    console.log("❌ docs/sprint.md not found. Create it first.");
    process.exit(1);
  }

  const raw = fs.readFileSync(sprintFile, "utf8");

  function findBlock(content, title) {
    const idx = content.indexOf(`## ${title}`);
    if (idx === -1) return [];
    const from = content.substring(idx);
    const lines = from.split("\n");
    let result = [];
    for (let i = 0; i < lines.length; i++) {
      if (i === 0) {
        result.push(lines[i]);
        continue;
      }
      const m = lines[i].match(/^##\s+/);
      if (m) break;
      result.push(lines[i]);
    }
    return result;
  }

  console.log(
    "=== AWE Sprint — " +
      new Date().toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      }) +
      " ===",
  );
  console.log("");

  console.log("--- 今日任务 ---");
  findBlock(raw, "Today").forEach((l) => console.log(l));
  console.log("");

  console.log("--- 验收标准 ---");
  findBlock(raw, "Acceptance").forEach((l) => console.log(l));
  console.log("");

  console.log("--- 建议 Agent 分工 ---");
  findBlock(raw, "Agents").forEach((l) => console.log(l));
  console.log("");

  console.log("完整计划: docs/sprint.md");
  process.exit(0);
};
