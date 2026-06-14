# O10-FileLens

VS Code extension that shows the file size in the **Explorer hover tooltip** and in the editor hover.

> Author: **Orenji10**

## Features

- **Explorer tooltip**: Hover over any file or folder in the side panel to see detailed information.
- **Editor hover**: Hover over the code of an open file to see its size and dates.
- **Token IA Count**: For text files, the tooltip and hover also show the **character count** and an **estimated Claude token count** (`~N`). The estimate is a zero-dependency heuristic — Anthropic ships no offline tokenizer — so treat it as a budgeting guide, not an exact count. Binary files show `—`; files above the size limit show `large file`.

## Settings

| Setting | Default | Description |
|---|---|---|
| `o10-filelens.tokenCount.enabled` | `true` | Toggle the character + token count. When off, only size/dates are shown. |
| `o10-filelens.tokenCount.charsPerToken` | `3.5` | Average characters per token for the estimate. Lower = higher token count. |
| `o10-filelens.tokenCount.maxFileSizeKB` | `1024` | Files larger than this are not read for token estimation. |

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
