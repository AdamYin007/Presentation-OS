#!/usr/bin/env node
/**
 * Presentation OS Delivery Studio
 *
 * Local-only HTTP wrapper for the existing one-command PPTX delivery pipeline.
 * The server never shells out through a command string; it invokes Node with an
 * argv array so user input cannot become shell syntax.
 */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { getBuiltInProfiles, loadProfile } = require("../packages/brand-profiles/src/index.js");
const { BUILTINS } = require("../packages/brand-profiles/src/builtins.js");

const ROOT_DIR = path.join(__dirname, "..");
const DEFAULT_STUDIO_DIR = path.join(ROOT_DIR, "deliverables", "studio");
const DEFAULT_PORT = 9200;
const MAX_BODY_SIZE = 500 * 1024;
const VALID_STYLES = ["minimal-modern", "business-consulting", "academic-clean"];
const REQUIRED_ARTIFACTS = [
  "output.pptx",
  "COMMERCIAL-VERDICT.md",
  "machine-report.json",
];

function parseCliArgs(argv = process.argv) {
  const options = { port: Number.parseInt(process.env.PORT || String(DEFAULT_PORT), 10), studioDir: DEFAULT_STUDIO_DIR };

  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--port" && argv[i + 1]) {
      options.port = Number.parseInt(argv[++i], 10);
    } else if (argv[i] === "--studio-dir" && argv[i + 1]) {
      options.studioDir = path.resolve(argv[++i]);
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      options.help = true;
    }
  }

  if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
    throw new Error("Invalid --port value.");
  }

  return options;
}

function usage() {
  return `Usage: node scripts/delivery-studio.js [--port 9200] [--studio-dir ./deliverables/studio]

Starts a local-only browser UI for Presentation OS PPTX delivery.
Open http://localhost:9200 after starting the server.`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload, null, 2));
}

function generateJobId(now = new Date()) {
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${time}-${suffix}`;
}

function collectBody(req, maxBytes = MAX_BODY_SIZE) {
  return new Promise((resolve, reject) => {
    let body = "";
    let tooLarge = false;

    req.on("data", (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (Buffer.byteLength(body) > maxBytes) {
        tooLarge = true;
        reject(Object.assign(new Error("Request body too large."), { statusCode: 413 }));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!tooLarge) resolve(body);
    });

    req.on("error", reject);
  });
}

function validateRequest(input) {
  const markdown = typeof input.markdown === "string" ? input.markdown.trim() : "";
  const style = input.style || "minimal-modern";
  const title = typeof input.title === "string" && input.title.trim() ? input.title.trim() : null;
  const profileCandidate = input.customBrandProfilePath || input.brandProfile || null;
  const brandProfile = typeof profileCandidate === "string" && profileCandidate.trim() ? profileCandidate.trim() : null;

  if (!markdown) {
    return { error: "Markdown input is required and must be non-empty." };
  }

  if (!VALID_STYLES.includes(style)) {
    return { error: `Invalid style. Must be one of: ${VALID_STYLES.join(", ")}.` };
  }

  if (brandProfile) {
    try {
      loadProfile(brandProfile);
    } catch (err) {
      return { error: `Invalid brand profile: ${err.message}` };
    }
  }

  return { markdown, style, title, brandProfile };
}

function readMachineReport(jobDir) {
  const reportPath = path.join(jobDir, "machine-report.json");
  if (!fs.existsSync(reportPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(reportPath, "utf8"));
  } catch {
    return null;
  }
}

function collectArtifacts(jobDir) {
  if (!fs.existsSync(jobDir)) return {};

  return Object.fromEntries(
    fs.readdirSync(jobDir)
      .filter((name) => !name.startsWith("."))
      .sort()
      .map((name) => [name, path.join(jobDir, name)])
  );
}

function runDeliverPptx({ markdown, style, title, brandProfile, jobDir }) {
  return new Promise((resolve, reject) => {
    const inputPath = path.join(jobDir, "input.md");
    fs.writeFileSync(inputPath, markdown + "\n", "utf8");

    const args = [
      path.join(ROOT_DIR, "scripts", "deliver-pptx.js"),
      inputPath,
      jobDir,
      "--style",
      style,
      "--json",
    ];

    if (title) args.push("--title", title);
    if (brandProfile) args.push("--brand-profile", brandProfile);

    const child = spawn(process.execPath, args, {
      cwd: ROOT_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(Object.assign(new Error("Delivery timed out after 120 seconds."), { statusCode: 504 }));
    }, 120000);

    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      const artifacts = collectArtifacts(jobDir);
      const requiredArtifactsExist = REQUIRED_ARTIFACTS.every((name) => fs.existsSync(path.join(jobDir, name)));

      if ((code === 0 || code === 1) && requiredArtifactsExist) {
        resolve({ code, stdout, stderr, artifacts, machineReport: readMachineReport(jobDir) });
        return;
      }

      reject(Object.assign(new Error(stderr.trim() || stdout.trim() || `deliver-pptx exited with code ${code}`), {
        statusCode: 500,
        exitCode: code,
        stdout,
        stderr,
      }));
    });
  });
}

async function runStudioDelivery(input, options = {}) {
  const studioDir = options.studioDir || DEFAULT_STUDIO_DIR;
  const validation = validateRequest(input);
  if (validation.error) {
    return { statusCode: 400, payload: { status: "error", error: validation.error } };
  }

  ensureDir(studioDir);
  const jobId = generateJobId();
  const jobDir = path.join(studioDir, jobId);
  ensureDir(jobDir);

  try {
    const result = await runDeliverPptx({ ...validation, jobDir });
    const report = result.machineReport || {};
    return {
      statusCode: 200,
      payload: {
        status: "ok",
        jobId,
        jobDir,
        artifacts: result.artifacts,
        summary: {
          style: validation.style,
          brandProfile: validation.brandProfile,
          title: validation.title,
          exitCode: result.code,
          overallVerdict: report.overallVerdict || null,
          gateResults: report.gateResults || null,
        },
      },
    };
  } catch (err) {
    return {
      statusCode: err.statusCode || 500,
      payload: {
        status: "error",
        error: err.message,
        jobId,
        jobDir,
        exitCode: err.exitCode,
      },
    };
  }
}

function buildHtmlUI() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Presentation OS Delivery Studio</title>
  <style>
    :root { color-scheme: dark; --bg:#10131a; --panel:#181c25; --line:#2b3140; --text:#eef2f7; --muted:#9aa3b2; --accent:#4f7cff; --ok:#31c48d; --err:#f05252; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; display: grid; grid-template-rows: auto 1fr auto; }
    header, footer { padding: 14px 22px; background: var(--panel); border-color: var(--line); }
    header { border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    h1 { margin: 0; font-size: 18px; }
    .badge { margin-left: 10px; padding: 2px 8px; border-radius: 999px; background: var(--accent); font-size: 11px; }
    main { display: grid; grid-template-columns: minmax(360px, 1fr) minmax(360px, 1fr); min-height: 0; }
    section { min-height: 0; display: flex; flex-direction: column; }
    section + section { border-left: 1px solid var(--line); }
    .bar { padding: 11px 16px; background: var(--panel); border-bottom: 1px solid var(--line); color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .form { padding: 16px; display: flex; flex-direction: column; gap: 12px; min-height: 0; flex: 1; }
    label { display: grid; gap: 6px; font-size: 13px; color: var(--muted); }
    textarea, input, select { width: 100%; border: 1px solid var(--line); background: #111620; color: var(--text); border-radius: 8px; padding: 10px 12px; font: inherit; }
    textarea { min-height: 280px; flex: 1; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; line-height: 1.5; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    button { border: 0; border-radius: 8px; background: var(--accent); color: white; padding: 12px 14px; font-weight: 700; cursor: pointer; }
    button:disabled { opacity: .55; cursor: wait; }
    pre { margin: 0; padding: 16px; overflow: auto; white-space: pre-wrap; word-break: break-word; flex: 1; color: var(--muted); }
    .status { border-top: 1px solid var(--line); background: var(--panel); padding: 10px 16px; color: var(--muted); font-size: 12px; }
    .ok { color: var(--ok); } .err { color: var(--err); }
    footer { border-top: 1px solid var(--line); text-align: center; color: var(--muted); font-size: 12px; }
    @media (max-width: 820px) { main { grid-template-columns: 1fr; } section + section { border-left: 0; border-top: 1px solid var(--line); } }
  </style>
</head>
<body>
  <header>
    <h1>Presentation OS Delivery Studio<span class="badge">Local MVP</span></h1>
    <span>Paste markdown · choose style/profile · generate PPTX</span>
  </header>
  <main>
    <section>
      <div class="bar">Input</div>
      <div class="form">
        <label>Markdown
          <textarea id="markdown"># Quarterly Business Review

## Executive Summary
- Revenue grew 18% quarter over quarter
- Enterprise conversion improved after onboarding changes
- Renewal risk is concentrated in two customer segments

## Recommended Actions
- Prioritize onboarding automation
- Expand executive reporting
- Run retention playbooks for at-risk accounts</textarea>
        </label>
        <div class="row">
          <label>Title
            <input id="title" placeholder="Optional title override">
          </label>
          <label>Style
            <select id="style">
              ${VALID_STYLES.map((style) => `<option value="${style}">${style}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="row">
          <label>Built-in Brand Profile
            <select id="brandProfile"><option value="">None</option></select>
          </label>
          <label>Custom Profile JSON Path
            <input id="customBrandProfilePath" placeholder="/absolute/path/to/profile.json">
          </label>
        </div>
        <button id="deliverButton">Generate PPTX</button>
      </div>
    </section>
    <section>
      <div class="bar">Result</div>
      <pre id="output">Ready.</pre>
      <div class="status" id="status">Local server ready</div>
    </section>
  </main>
  <footer>Local-only · Uses the existing Presentation OS one-command delivery pipeline · No cloud upload</footer>
  <script>
    const output = document.getElementById("output");
    const status = document.getElementById("status");
    const button = document.getElementById("deliverButton");
    const profileSelect = document.getElementById("brandProfile");

    function setStatus(text, cls) {
      status.textContent = text;
      status.className = "status " + (cls || "");
    }

    async function loadProfiles() {
      const response = await fetch("/api/profiles");
      const data = await response.json();
      for (const profile of data.profiles || []) {
        const option = document.createElement("option");
        option.value = profile.id;
        option.textContent = profile.name + " (" + profile.id + ")";
        profileSelect.appendChild(option);
      }
    }

    async function deliver() {
      const markdown = document.getElementById("markdown").value;
      const title = document.getElementById("title").value;
      const style = document.getElementById("style").value;
      const brandProfile = profileSelect.value;
      const customBrandProfilePath = document.getElementById("customBrandProfilePath").value;

      button.disabled = true;
      setStatus("Generating...", "");
      output.textContent = "Running Presentation OS pipeline...";

      try {
        const response = await fetch("/api/deliver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown, title, style, brandProfile, customBrandProfilePath }),
        });
        const data = await response.json();
        output.textContent = JSON.stringify(data, null, 2);
        setStatus(response.ok ? "Complete" : "Failed", response.ok ? "ok" : "err");
      } catch (err) {
        output.textContent = err.message;
        setStatus("Request failed", "err");
      } finally {
        button.disabled = false;
      }
    }

    button.addEventListener("click", deliver);
    loadProfiles().catch((err) => { output.textContent = "Profile load failed: " + err.message; });
  </script>
</body>
</html>`;
}

function profileList() {
  return getBuiltInProfiles().map((id) => ({
    id,
    name: BUILTINS[id].name,
    description: BUILTINS[id].description,
  }));
}

function createServer(options = {}) {
  const studioDir = options.studioDir || DEFAULT_STUDIO_DIR;

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(buildHtmlUI());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/profiles") {
      json(res, 200, { styles: VALID_STYLES, profiles: profileList() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/deliver") {
      try {
        const body = await collectBody(req);
        let input;
        try {
          input = JSON.parse(body || "{}");
        } catch {
          json(res, 400, { status: "error", error: "Invalid JSON body." });
          return;
        }

        const result = await runStudioDelivery(input, { studioDir });
        json(res, result.statusCode, result.payload);
      } catch (err) {
        json(res, err.statusCode || 500, { status: "error", error: err.message });
      }
      return;
    }

    json(res, 404, { status: "error", error: "Not found." });
  });
}

function startServer(options = {}) {
  ensureDir(options.studioDir || DEFAULT_STUDIO_DIR);
  const server = createServer(options);
  const port = options.port ?? DEFAULT_PORT;

  server.listen(port, "127.0.0.1", () => {
    const address = server.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    console.log(`Presentation OS Delivery Studio: http://localhost:${actualPort}`);
    console.log(`Jobs: ${options.studioDir || DEFAULT_STUDIO_DIR}`);
  });

  return server;
}

if (require.main === module) {
  try {
    const options = parseCliArgs(process.argv);
    if (options.help) {
      console.log(usage());
      process.exit(0);
    }
    const server = startServer(options);
    process.on("SIGINT", () => {
      server.close(() => process.exit(0));
    });
  } catch (err) {
    console.error(err.message);
    console.error(usage());
    process.exit(2);
  }
}

module.exports = {
  VALID_STYLES,
  buildHtmlUI,
  collectArtifacts,
  createServer,
  generateJobId,
  parseCliArgs,
  profileList,
  runStudioDelivery,
  startServer,
  validateRequest,
};
