#!/usr/bin/env node

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  buildDesktopLaunchers,
  buildMacLauncher,
  buildWindowsLauncher,
  parseArgs,
} = require("../scripts/build-desktop-app.js");

const ROOT_DIR = path.join(__dirname, "..");
const TEST_OUTPUT_DIR = path.join(ROOT_DIR, "fixtures", "m12-23", "test-output");
const APP_NAME = "Presentation OS Delivery Studio";

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assertExists(filePath) {
  assert(fs.existsSync(filePath), `${filePath} should exist`);
}

test("parseArgs supports platform, output directory, and port", () => {
  const parsed = parseArgs([
    "node",
    "scripts/build-desktop-app.js",
    "--platform",
    "windows",
    "--output-dir",
    "/tmp/presentation-os-desktop",
    "--port",
    "9300",
  ]);
  assert.strictEqual(parsed.platform, "windows");
  assert.strictEqual(parsed.outputDir, "/tmp/presentation-os-desktop");
  assert.strictEqual(parsed.port, 9300);
});

test("buildMacLauncher contains dry-run and Studio startup behavior", () => {
  const script = buildMacLauncher({ repoRoot: ROOT_DIR, port: 9200 });
  assert(script.includes("PRESENTATION_OS_DRY_RUN"));
  assert(script.includes("delivery-studio.js"));
  assert(script.includes("nohup"));
  assert(script.includes('open "$APP_URL"'));
});

test("buildWindowsLauncher contains dry-run and portable startup behavior", () => {
  const script = buildWindowsLauncher({ repoRoot: ROOT_DIR, port: 9200 });
  assert(script.includes("PRESENTATION_OS_DRY_RUN"));
  assert(script.includes("Run Studio Server.cmd"));
  assert(script.includes('start "" "%APP_URL%"'));
  assert(script.includes("where node"));
});

test("buildDesktopLaunchers creates macOS .app and Windows portable folder", () => {
  fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  const result = buildDesktopLaunchers({
    appName: APP_NAME,
    outputDir: TEST_OUTPUT_DIR,
    platform: "all",
    port: 9301,
    repoRoot: ROOT_DIR,
  });

  assert.strictEqual(result.artifacts.length, 2);
  const mac = result.artifacts.find((artifact) => artifact.platform === "macos");
  const win = result.artifacts.find((artifact) => artifact.platform === "windows");
  assert(mac);
  assert(win);

  assertExists(path.join(mac.path, "Contents", "Info.plist"));
  assertExists(mac.executablePath);
  assertExists(path.join(mac.path, "Contents", "Resources", "README.txt"));

  const mode = fs.statSync(mac.executablePath).mode;
  assert(mode & 0o111, "macOS launcher should be executable");

  assertExists(win.executablePath);
  assertExists(win.serverPath);
  assertExists(path.join(win.path, "README-WINDOWS.txt"));
});

test("generated macOS launcher dry-run reports repo, port, and URL", () => {
  fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  const result = buildDesktopLaunchers({
    appName: APP_NAME,
    outputDir: TEST_OUTPUT_DIR,
    platform: "macos",
    port: 9302,
    repoRoot: ROOT_DIR,
  });
  const mac = result.artifacts[0];

  if (process.platform !== "darwin" && !fs.existsSync("/bin/zsh")) {
    const script = fs.readFileSync(mac.executablePath, "utf8");
    assert(script.includes("platform=macos"));
    assert(script.includes(`REPO_ROOT="\${PRESENTATION_OS_ROOT:-${ROOT_DIR}}"`));
    assert(script.includes('PORT="${PRESENTATION_OS_PORT:-9302}"'));
    assert(script.includes('APP_URL="http://localhost:$PORT"'));
    return;
  }

  const run = spawnSync(mac.executablePath, [], {
    env: { ...process.env, PRESENTATION_OS_DRY_RUN: "1" },
    encoding: "utf8",
  });
  assert.strictEqual(run.status, 0);
  assert(run.stdout.includes("platform=macos"));
  assert(run.stdout.includes(`repo=${ROOT_DIR}`));
  assert(run.stdout.includes("port=9302"));
  assert(run.stdout.includes("url=http://localhost:9302"));
});

test("generated Windows launcher dry-run is present for Windows users", () => {
  fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  const result = buildDesktopLaunchers({
    appName: APP_NAME,
    outputDir: TEST_OUTPUT_DIR,
    platform: "windows",
    port: 9303,
    repoRoot: ROOT_DIR,
  });
  const win = result.artifacts[0];
  const launcher = fs.readFileSync(win.executablePath, "utf8");
  const server = fs.readFileSync(win.serverPath, "utf8");
  const readme = fs.readFileSync(path.join(win.path, "README-WINDOWS.txt"), "utf8");

  assert(launcher.includes("platform=windows"));
  assert(launcher.includes("port=%PORT%"));
  assert(launcher.includes("PRESENTATION_OS_ROOT"));
  assert(server.includes("delivery-studio.js"));
  assert(readme.includes("Install Node.js"));
  assert(readme.includes("Double-click"));
});

test("build script CLI creates requested platform only", () => {
  fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  const result = spawnSync(
    process.execPath,
    [
      path.join(ROOT_DIR, "scripts", "build-desktop-app.js"),
      "--platform",
      "windows",
      "--output-dir",
      TEST_OUTPUT_DIR,
      "--port",
      "9304",
    ],
    { cwd: ROOT_DIR, encoding: "utf8" },
  );

  assert.strictEqual(result.status, 0);
  assert(result.stdout.includes("Built windows"));
  assertExists(
    path.join(TEST_OUTPUT_DIR, `${APP_NAME} Windows`, "Start Presentation OS Delivery Studio.cmd"),
  );
  assert(
    !fs.existsSync(path.join(TEST_OUTPUT_DIR, `${APP_NAME}.app`)),
    "macOS app should not be built for --platform windows",
  );
});

(async () => {
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.fn();
      passed += 1;
      console.log(`PASS ${t.name}`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${t.name}`);
      console.error(err.stack || err.message);
    }
  }

  console.log("");
  console.log(`M12.23 Desktop App Launcher tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
