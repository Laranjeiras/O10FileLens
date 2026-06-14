import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

  const explorerTooltipProvider = vscode.window.registerFileDecorationProvider({
    provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
      try {
        const stats = fs.statSync(uri.fsPath);

        if (stats.isFile()) {
          const sizeFormatted = formatBytes(stats.size);
          const fileName = path.basename(uri.fsPath);

          // Tooltip as string (FileDecoration.tooltip accepts string only)
          const tooltip = [
            `📄 ${fileName}`,
            ``,
            `Size: ${sizeFormatted}`,
            `Created: ${stats.birthtime.toLocaleString('en-US')}`,
            `Modified: ${stats.mtime.toLocaleString('en-US')}`
          ].join('\n');

          return {
            badge: undefined,
            tooltip: tooltip
          };
        }

        if (stats.isDirectory()) {
          const items = fs.readdirSync(uri.fsPath).length;
          const dirName = path.basename(uri.fsPath);

          const tooltip = [
            `📁 ${dirName}`,
            ``,
            `Items: ${items}`
          ].join('\n');

          return {
            badge: undefined,
            tooltip: tooltip
          };
        }

      } catch {
        return undefined;
      }
    }
  });

  const editorHoverProvider = vscode.languages.registerHoverProvider(
    { scheme: 'file' },
    {
      provideHover(document, position, token) {
        const filePath = document.uri.fsPath;

        try {
          const stats = fs.statSync(filePath);

          if (stats.isFile()) {
            const sizeFormatted = formatBytes(stats.size);
            const markdown = new vscode.MarkdownString();

            markdown.appendMarkdown(`### 📄 ${path.basename(filePath)}\n\n`);
            markdown.appendMarkdown(`**Size on disk:** \`${sizeFormatted}\`\n\n`);
            markdown.appendMarkdown(`---\n`);
            markdown.appendMarkdown(`- **Created:** ${stats.birthtime.toLocaleString('en-US')}\n`);
            markdown.appendMarkdown(`- **Modified:** ${stats.mtime.toLocaleString('en-US')}\n`);

            return new vscode.Hover(markdown);
          }
        } catch (error) {
          // Silently ignore errors
        }

        return undefined;
      }
    }
  );

  context.subscriptions.push(explorerTooltipProvider, editorHoverProvider);
}

function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function deactivate() {}
