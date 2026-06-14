# How to build the VSIX package

Step-by-step guide to package the **O10-FileLens** extension and install it in VS Code.

> Author: **Orenji10**

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ installed
- `npm` available in the terminal
- VS Code installed

---

## Step 1 — Install `vsce`

`vsce` is Microsoft's official CLI to package VS Code extensions.

```powershell
npm install -g @vscode/vsce
```

Verify the installation:

```powershell
vsce --version
```

---

## Step 2 — Install the project dependencies

In the project root (`file-size-hover/`):

```powershell
npm install
```

---

## Step 3 — Check the `publisher` in `package.json`

The `publisher` field in [package.json](package.json) is set to `"Orenji10"`. `vsce` requires a real value — it can be any identifier without spaces (it does not need to be a Marketplace account for local use).

```json
"publisher": "Orenji10"
```

> To publish to the Marketplace later, the `publisher` must match your account ID on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage).

---

## Step 4 — Compile the TypeScript

The `vscode:prepublish` script already does this automatically during packaging, but you can compile manually to check for errors beforehand:

```powershell
npm run compile
```

This generates the JavaScript files in `out/` from [src/extension.ts](src/extension.ts).

---

## Step 5 — Build the `.vsix` file

```powershell
vsce package
```

`vsce` will:
1. Run `npm run compile` via the `vscode:prepublish` script
2. Package everything (except `node_modules`, test `out/`, etc.)
3. Generate the file: `o10-filelens-1.1.1.vsix` in the project root

---

## Step 6 — Install the `.vsix` in VS Code

### Via command line

```powershell
code --install-extension o10-filelens-1.1.1.vsix
```

### Via the VS Code UI

1. Open the **Extensions** panel (`Ctrl+Shift+X`)
2. Click the `···` menu (top-right corner of the panel)
3. Select **Install from VSIX...**
4. Navigate to the `o10-filelens-1.1.1.vsix` file and confirm

---

## Step 7 — Verify the installation

1. Restart VS Code (or reload the window with `Ctrl+Shift+P` → `Developer: Reload Window`)
2. Open the **Extensions** panel and search for **O10-FileLens**
3. The extension should appear as installed and active

---

## Command summary

```powershell
# 1. Install vsce (once)
npm install -g @vscode/vsce

# 2. Prepare the project
npm install

# 3. Package
vsce package

# 4. Install
code --install-extension o10-filelens-1.1.1.vsix
```

---

## Bump the version before repackaging

Edit the `version` field in [package.json](package.json) following semver (`MAJOR.MINOR.PATCH`) before generating a new `.vsix`. The generated file name will reflect the new version automatically.

---

## Development workflow (without repackaging on every change)

During development, there is no need to generate a `.vsix` on every iteration. VS Code supports an **Extension Development Host** mode that loads the extension directly from source.

### Option A — Debug via F5 (recommended)

1. Open the `file-size-hover/` folder in VS Code (`File → Open Folder`)
2. Press `F5` (or `Run → Start Debugging`)

VS Code will:
- Run the `npm: compile` task automatically (defined in [.vscode/launch.json](.vscode/launch.json))
- Open a **second window** of VS Code with the extension loaded (Extension Development Host)

To test changes:
1. Edit the source in [src/extension.ts](src/extension.ts)
2. In the **Extension Development Host** window, press `Ctrl+Shift+P` → `Developer: Reload Window`
3. The reloaded extension reflects the changes

### Option B — Watch mode (continuous compilation)

Start the compiler in watch mode in a separate terminal:

```powershell
npm run watch
```

TypeScript will recompile automatically on every saved file. Combine it with `F5` for fast reload:

1. `npm run watch` running in the terminal
2. `F5` to open the Extension Development Host
3. Edit and save → `Ctrl+Shift+P` → `Developer: Reload Window` in the dev window

> **Tip:** The `npm: watch` task is also configured in [.vscode/tasks.json](.vscode/tasks.json) — you can start it via `Ctrl+Shift+P` → `Tasks: Run Task` → `npm: watch`.

---

## Publish a new version (full cycle)

When development is complete and you want to distribute the updated version:

### 1. Bump the version

Edit `version` in [package.json](package.json):

```json
"version": "1.2.0"
```

Follow semver: `MAJOR.MINOR.PATCH`
- `PATCH` — bug fix with no behavior change
- `MINOR` — new backward-compatible feature
- `MAJOR` — breaking change

### 2. Repackage

```powershell
vsce package
```

Generates `o10-filelens-1.2.0.vsix` in the project root.

### 3. Reinstall in VS Code

Uninstall the previous version first (optional, but avoids cache conflicts):

```powershell
# Uninstall the old version
code --uninstall-extension Orenji10.o10-filelens

# Install the new one
code --install-extension o10-filelens-1.2.0.vsix
```

Or via the UI: **Extensions** → `···` → **Install from VSIX...**

### 4. Verify

Reload the window (`Ctrl+Shift+P` → `Developer: Reload Window`) and confirm the version in **Extensions** → **O10-FileLens** → **Details** tab.
