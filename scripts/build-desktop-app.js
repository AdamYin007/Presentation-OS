#!/usr/bin/env node
/**
 * Build desktop launchers for Presentation OS Delivery Studio.
 *
 * M12.23 deliberately avoids Electron/Tauri. The generated launchers start the
 * existing local Studio server and open the browser UI, giving users a desktop
 * entrypoint without introducing heavyweight packaging dependencies.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");
const DEFAULT_APP_NAME = "Presentation OS Delivery Studio";
const DEFAULT_OUTPUT_DIR = path.join(ROOT_DIR, "dist");
const DEFAULT_PORT = 9200;

function parseArgs(argv = process.argv) {
  const options = {
    appName: DEFAULT_APP_NAME,
    outputDir: DEFAULT_OUTPUT_DIR,
    port: Number.parseInt(process.env.PRESENTATION_OS_PORT || String(DEFAULT_PORT), 10),
    platform: "all",
    repoRoot: ROOT_DIR,
  };

  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--app-name" && argv[i + 1]) {
      options.appName = argv[++i];
    } else if (argv[i] === "--output-dir" && argv[i + 1]) {
      options.outputDir = path.resolve(argv[++i]);
    } else if (argv[i] === "--platform" && argv[i + 1]) {
      options.platform = argv[++i];
    } else if (argv[i] === "--port" && argv[i + 1]) {
      options.port = Number.parseInt(argv[++i], 10);
    } else if (argv[i] === "--repo-root" && argv[i + 1]) {
      options.repoRoot = path.resolve(argv[++i]);
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      options.help = true;
    }
  }

  if (!["all", "macos", "windows"].includes(options.platform)) {
    throw new Error("Invalid --platform value. Use all, macos, or windows.");
  }
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    throw new Error("Invalid --port value.");
  }
  if (!options.appName.trim()) {
    throw new Error("Invalid --app-name value.");
  }

  return options;
}

function usage() {
  return `Usage: node scripts/build-desktop-app.js [--platform all|macos|windows] [--output-dir ./dist] [--port 9200]

Builds desktop launchers for the local Presentation OS Delivery Studio.`;
}

function plistEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function shellEscapeSingleQuoted(value) {
  return String(value).replace(/'/g, "'\\''");
}

function shellEscapeDoubleQuoted(value) {
  return String(value).replace(/(["\\$`])/g, "\\$1");
}

function bundleIdentifier(appName) {
  return `com.presentation-os.${appName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function windowsPath(value) {
  return String(value).replace(/\//g, "\\");
}

function buildInfoPlist({ appName }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>${plistEscape(appName)}</string>
  <key>CFBundleDisplayName</key>
  <string>${plistEscape(appName)}</string>
  <key>CFBundleIdentifier</key>
  <string>${plistEscape(bundleIdentifier(appName))}</string>
  <key>CFBundleVersion</key>
  <string>1.0.0</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundleExecutable</key>
  <string>presentation-os-delivery-studio</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
</dict>
</plist>
`;
}

function buildMacLauncher({ repoRoot, port }) {
  const escapedRoot = shellEscapeDoubleQuoted(repoRoot);
  return `#!/bin/zsh
set -euo pipefail

REPO_ROOT="\${PRESENTATION_OS_ROOT:-${escapedRoot}}"
PORT="\${PRESENTATION_OS_PORT:-${port}}"
STUDIO_DIR="\${PRESENTATION_OS_STUDIO_DIR:-"\$REPO_ROOT/deliverables/studio"}"
PID_FILE="\$STUDIO_DIR/.presentation-os-studio.pid"
LOG_FILE="\$STUDIO_DIR/desktop-app.log"
APP_URL="http://localhost:\$PORT"

if [[ "\${PRESENTATION_OS_DRY_RUN:-}" == "1" ]]; then
  echo "platform=macos"
  echo "repo=\$REPO_ROOT"
  echo "port=\$PORT"
  echo "studioDir=\$STUDIO_DIR"
  echo "url=\$APP_URL"
  exit 0
fi

mkdir -p "\$STUDIO_DIR"

NODE_BIN="\${PRESENTATION_OS_NODE:-}"
if [[ -z "\$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node || true)"
fi

if [[ -z "\$NODE_BIN" ]]; then
  osascript -e 'display dialog "Node.js was not found. Install Node.js or set PRESENTATION_OS_NODE." buttons {"OK"} default button "OK"' >/dev/null 2>&1 || true
  exit 1
fi

if [[ ! -f "\$REPO_ROOT/scripts/delivery-studio.js" ]]; then
  osascript -e 'display dialog "Presentation OS repo path is invalid. Set PRESENTATION_OS_ROOT to the repo root." buttons {"OK"} default button "OK"' >/dev/null 2>&1 || true
  exit 1
fi

server_running=false
if [[ -f "\$PID_FILE" ]]; then
  PID="$(cat "\$PID_FILE" 2>/dev/null || true)"
  if [[ -n "\$PID" ]] && kill -0 "\$PID" >/dev/null 2>&1; then
    server_running=true
  fi
fi

if [[ "\$server_running" == false ]]; then
  cd "\$REPO_ROOT"
  nohup "\$NODE_BIN" "\$REPO_ROOT/scripts/delivery-studio.js" --port "\$PORT" --studio-dir "\$STUDIO_DIR" >> "\$LOG_FILE" 2>&1 &
  echo "$!" > "\$PID_FILE"
fi

for _ in {1..30}; do
  if curl -fsS "\$APP_URL/api/profiles" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

open "\$APP_URL"
`;
}

function buildWindowsLauncher({ repoRoot, port }) {
  const repo = windowsPath(repoRoot);
  return `@echo off
setlocal EnableExtensions

if "%PRESENTATION_OS_ROOT%"=="" (
  set "REPO_ROOT=${repo}"
) else (
  set "REPO_ROOT=%PRESENTATION_OS_ROOT%"
)

if "%PRESENTATION_OS_PORT%"=="" (
  set "PORT=${port}"
) else (
  set "PORT=%PRESENTATION_OS_PORT%"
)

if "%PRESENTATION_OS_STUDIO_DIR%"=="" (
  set "STUDIO_DIR=%REPO_ROOT%\\deliverables\\studio"
) else (
  set "STUDIO_DIR=%PRESENTATION_OS_STUDIO_DIR%"
)

set "APP_URL=http://localhost:%PORT%"

if "%PRESENTATION_OS_DRY_RUN%"=="1" (
  echo platform=windows
  echo repo=%REPO_ROOT%
  echo port=%PORT%
  echo studioDir=%STUDIO_DIR%
  echo url=%APP_URL%
  exit /b 0
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js from https://nodejs.org/ and run this launcher again.
  pause
  exit /b 1
)

if not exist "%REPO_ROOT%\\scripts\\delivery-studio.js" (
  echo Presentation OS repo path is invalid.
  echo Set PRESENTATION_OS_ROOT to the repo root and run again.
  pause
  exit /b 1
)

if not exist "%STUDIO_DIR%" mkdir "%STUDIO_DIR%"

start "Presentation OS Delivery Studio Server" /min "%~dp0Run Studio Server.cmd"
timeout /t 2 /nobreak >nul
start "" "%APP_URL%"
exit /b 0
`;
}

function buildWindowsServerScript() {
  return `@echo off
setlocal EnableExtensions
cd /d "%REPO_ROOT%"
node "%REPO_ROOT%\\scripts\\delivery-studio.js" --port "%PORT%" --studio-dir "%STUDIO_DIR%" >> "%STUDIO_DIR%\\desktop-app.log" 2>&1
`;
}

function buildMacApp(options) {
  const appPath = path.join(options.outputDir, `${options.appName}.app`);
  const contentsPath = path.join(appPath, "Contents");
  const macosPath = path.join(contentsPath, "MacOS");
  const resourcesPath = path.join(contentsPath, "Resources");
  const executablePath = path.join(macosPath, "presentation-os-delivery-studio");

  fs.rmSync(appPath, { recursive: true, force: true });
  fs.mkdirSync(macosPath, { recursive: true });
  fs.mkdirSync(resourcesPath, { recursive: true });
  fs.writeFileSync(path.join(contentsPath, "Info.plist"), buildInfoPlist(options), "utf8");
  fs.writeFileSync(executablePath, buildMacLauncher(options), { encoding: "utf8", mode: 0o755 });
  fs.chmodSync(executablePath, 0o755);
  fs.writeFileSync(path.join(resourcesPath, "README.txt"), [
    options.appName,
    "",
    "Double-click this app to launch the local Presentation OS Delivery Studio.",
    `Default URL: http://localhost:${options.port}`,
    "Generated PPTX jobs are saved locally under deliverables/studio.",
    "",
  ].join("\n"), "utf8");

  return { platform: "macos", path: appPath, executablePath };
}

function buildWindowsPortable(options) {
  const folderPath = path.join(options.outputDir, `${options.appName} Windows`);
  const launcherPath = path.join(folderPath, "Start Presentation OS Delivery Studio.cmd");
  const serverPath = path.join(folderPath, "Run Studio Server.cmd");

  fs.rmSync(folderPath, { recursive: true, force: true });
  fs.mkdirSync(folderPath, { recursive: true });
  fs.writeFileSync(launcherPath, buildWindowsLauncher(options), "utf8");
  fs.writeFileSync(serverPath, buildWindowsServerScript(), "utf8");
  fs.writeFileSync(path.join(folderPath, "README-WINDOWS.txt"), [
    options.appName,
    "",
    "Windows usage:",
    "1. Install Node.js from https://nodejs.org/ if it is not already installed.",
    "2. Double-click Start Presentation OS Delivery Studio.cmd.",
    `3. The launcher opens http://localhost:${options.port}.`,
    "",
    "Generated PPTX jobs are saved locally under deliverables/studio.",
    "For a moved repo, set PRESENTATION_OS_ROOT to the Presentation OS repo root.",
    "",
  ].join("\r\n"), "utf8");

  return { platform: "windows", path: folderPath, executablePath: launcherPath, serverPath };
}

function buildDesktopLaunchers(input = {}) {
  const options = {
    appName: input.appName || DEFAULT_APP_NAME,
    outputDir: input.outputDir || DEFAULT_OUTPUT_DIR,
    platform: input.platform || "all",
    port: input.port || DEFAULT_PORT,
    repoRoot: input.repoRoot || ROOT_DIR,
  };
  fs.mkdirSync(options.outputDir, { recursive: true });

  const artifacts = [];
  if (options.platform === "all" || options.platform === "macos") {
    artifacts.push(buildMacApp(options));
  }
  if (options.platform === "all" || options.platform === "windows") {
    artifacts.push(buildWindowsPortable(options));
  }

  return { outputDir: options.outputDir, artifacts };
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv);
    if (options.help) {
      console.log(usage());
      process.exit(0);
    }
    const result = buildDesktopLaunchers(options);
    for (const artifact of result.artifacts) {
      console.log(`Built ${artifact.platform}: ${artifact.path}`);
    }
  } catch (err) {
    console.error(err.message);
    console.error(usage());
    process.exit(2);
  }
}

module.exports = {
  DEFAULT_APP_NAME,
  DEFAULT_PORT,
  buildDesktopLaunchers,
  buildInfoPlist,
  buildMacApp,
  buildMacLauncher,
  buildWindowsLauncher,
  buildWindowsPortable,
  buildWindowsServerScript,
  bundleIdentifier,
  parseArgs,
};
