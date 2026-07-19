# M12.23 Desktop App Launcher MVP

## Goal

M12.23 turns the local Delivery Studio into a desktop-style product entrypoint without adding a heavyweight desktop framework. The generated launchers start the existing local Studio server and open the browser UI.

This milestone is intentionally a launcher MVP, not a full Electron/Tauri application.

## Build Commands

Build both macOS and Windows launchers:

```bash
npm run desktop:build
```

Build macOS only:

```bash
npm run desktop:build:macos
```

Build Windows only:

```bash
npm run desktop:build:windows
```

Generated artifacts are written under:

```text
dist/
```

## macOS User Flow

Build:

```bash
npm run desktop:build:macos
```

Open:

```bash
open "dist/Presentation OS Delivery Studio.app"
```

The app starts the local Studio server and opens:

```text
http://localhost:9200
```

Generated jobs are stored locally under:

```text
deliverables/studio/
```

## Windows User Flow

Build the Windows portable launcher:

```bash
npm run desktop:build:windows
```

Give Windows users the generated folder:

```text
dist/Presentation OS Delivery Studio Windows/
```

Windows prerequisites:

- Node.js installed from `https://nodejs.org/`
- The Presentation OS repo/package folder available on the machine

User action:

```text
Double-click "Start Presentation OS Delivery Studio.cmd"
```

The launcher starts the local Studio server and opens:

```text
http://localhost:9200
```

If the repo folder is moved, set:

```cmd
set PRESENTATION_OS_ROOT=C:\path\to\Presentation-OS
```

Then run the launcher again.

## Configuration

Both launchers support environment overrides:

```text
PRESENTATION_OS_ROOT
PRESENTATION_OS_PORT
PRESENTATION_OS_STUDIO_DIR
PRESENTATION_OS_NODE
```

Dry-run mode for tests and diagnostics:

```text
PRESENTATION_OS_DRY_RUN=1
```

## Commercial Positioning

This is the fastest desktop commercialization bridge:

- Non-technical users get a double-click entrypoint.
- The existing Studio UI remains the product surface.
- The existing one-command commercial PPT pipeline remains the source of truth.
- No large desktop dependency is introduced before validating demand.
- Windows users can use the product now through a portable launcher.

## Not Yet Included

The launcher MVP does not include:

- Signed installers
- Auto-update
- Native embedded WebView
- Offline bundled Node runtime
- License activation
- Windows `.exe`

Those belong in the next commercialization milestone after the product flow is validated.

## Validation

Focused checker:

```bash
npm run check:m12-23-desktop-app-launcher
```

Full validation:

```bash
npm run check
npm run check:all
```
