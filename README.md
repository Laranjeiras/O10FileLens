# O10-FileLens

VS Code extension that shows the file size in the **Explorer hover tooltip** and in the editor hover.

> Author: **Orenji10**

## Features

- **Explorer tooltip**: Hover over any file or folder in the side panel to see detailed information.
- **Editor hover**: Hover over the code of an open file to see its size and dates.

## Development setup

```bash
npm install
npm run compile
```

Then press `F5` in VS Code to open a new window with the extension active.

## Package for installation

```bash
npm install -g @vscode/vsce
vsce package
```

This generates a `.vsix` file that can be installed via:
**Extensions → ... → Install from VSIX**
