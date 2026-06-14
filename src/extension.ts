import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/** State of a file insight computation. */
type InsightState = 'ok' | 'binary' | 'tooLarge' | 'disabled' | 'error';

interface FileInsights {
  sizeFormatted: string;
  /** Character count of the file content; undefined when not computed. */
  chars?: number;
  /** Estimated Claude token count; undefined when not computed. */
  tokens?: number;
  state: InsightState;
}

interface TokenConfig {
  enabled: boolean;
  charsPerToken: number;
  maxFileSizeBytes: number;
}

interface CacheEntry {
  mtimeMs: number;
  size: number;
  chars: number;
  tokens: number;
}

/** Cache keyed by fsPath, invalidated on size/mtime change. Keeps Explorer fast. */
const insightCache = new Map<string, CacheEntry>();

/** Extensions that are never worth reading as text. */
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.tiff', '.svgz',
  '.zip', '.gz', '.tar', '.rar', '.7z', '.bz2', '.xz',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.o', '.obj', '.lib', '.a',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.mp3', '.wav', '.flac', '.ogg', '.mp4', '.mkv', '.avi', '.mov', '.webm',
  '.class', '.pyc', '.wasm', '.node', '.db', '.sqlite', '.dat'
]);

export function activate(context: vscode.ExtensionContext) {

  const decorationChangeEmitter = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();

  const explorerTooltipProvider = vscode.window.registerFileDecorationProvider({
    onDidChangeFileDecorations: decorationChangeEmitter.event,
    provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
      try {
        const stats = fs.statSync(uri.fsPath);

        if (stats.isFile()) {
          const insights = getFileInsights(uri.fsPath, stats);
          const lines = [
            `📄 ${path.basename(uri.fsPath)}`,
            ``,
            `Size: ${insights.sizeFormatted}`,
            `Created: ${stats.birthtime.toLocaleString('en-US')}`,
            `Modified: ${stats.mtime.toLocaleString('en-US')}`
          ];

          appendTokenLines(lines, insights, false);

          return { badge: undefined, tooltip: lines.join('\n') };
        }

        if (stats.isDirectory()) {
          const items = fs.readdirSync(uri.fsPath).length;
          const dirName = path.basename(uri.fsPath);

          const tooltip = [
            `📁 ${dirName}`,
            ``,
            `Items: ${items}`
          ].join('\n');

          return { badge: undefined, tooltip };
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
            const insights = getFileInsights(filePath, stats);
            const markdown = new vscode.MarkdownString();

            markdown.appendMarkdown(`### 📄 ${path.basename(filePath)}\n\n`);
            markdown.appendMarkdown(`**Size on disk:** \`${insights.sizeFormatted}\`\n\n`);

            const tokenLines: string[] = [];
            appendTokenLines(tokenLines, insights, true);
            for (const line of tokenLines) {
              markdown.appendMarkdown(`${line}\n\n`);
            }

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

  // Refresh the Explorer tooltip after a file is saved so token counts stay current.
  const saveListener = vscode.workspace.onDidSaveTextDocument((doc) => {
    insightCache.delete(doc.uri.fsPath);
    decorationChangeEmitter.fire(doc.uri);
  });

  context.subscriptions.push(
    explorerTooltipProvider,
    editorHoverProvider,
    saveListener,
    decorationChangeEmitter
  );
}

/**
 * Computes size + (when enabled and safe) character and Claude-token estimates for a file.
 * Results are cached per path and invalidated on size/mtime change.
 */
function getFileInsights(fsPath: string, stats: fs.Stats): FileInsights {
  const sizeFormatted = formatBytes(stats.size);
  const config = getTokenConfig();

  if (!config.enabled) {
    return { sizeFormatted, state: 'disabled' };
  }

  if (stats.size > config.maxFileSizeBytes) {
    return { sizeFormatted, state: 'tooLarge' };
  }

  const ext = path.extname(fsPath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return { sizeFormatted, state: 'binary' };
  }

  const cached = insightCache.get(fsPath);
  if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
    return { sizeFormatted, chars: cached.chars, tokens: cached.tokens, state: 'ok' };
  }

  try {
    const buffer = fs.readFileSync(fsPath);
    if (!isProbablyText(buffer)) {
      return { sizeFormatted, state: 'binary' };
    }

    const text = buffer.toString('utf8');
    const chars = countChars(text);
    const tokens = estimateTokens(text, config.charsPerToken);

    insightCache.set(fsPath, { mtimeMs: stats.mtimeMs, size: stats.size, chars, tokens });

    return { sizeFormatted, chars, tokens, state: 'ok' };
  } catch {
    return { sizeFormatted, state: 'error' };
  }
}

/** Appends the Chars/Tokens lines to an output array, formatted for tooltip or markdown. */
function appendTokenLines(out: string[], insights: FileInsights, markdown: boolean): void {
  if (insights.state === 'disabled') {
    return;
  }

  let tokenValue: string;
  switch (insights.state) {
    case 'ok':
      tokenValue = `~${formatCount(insights.tokens!)}`;
      break;
    case 'tooLarge':
      tokenValue = 'large file';
      break;
    case 'binary':
    case 'error':
    default:
      tokenValue = '—';
      break;
  }

  if (markdown) {
    if (insights.state === 'ok') {
      out.push(`**Characters:** \`${formatCount(insights.chars!)}\``);
    }
    out.push(`**Claude tokens (approx):** \`${tokenValue}\``);
  } else {
    if (insights.state === 'ok') {
      out.push(`Chars: ${formatCount(insights.chars!)}`);
    }
    out.push(`Tokens (Claude ~): ${tokenValue}`);
  }
}

function getTokenConfig(): TokenConfig {
  const cfg = vscode.workspace.getConfiguration('o10-filelens');
  const charsPerToken = cfg.get<number>('tokenCount.charsPerToken', 3.5);
  const maxFileSizeKB = cfg.get<number>('tokenCount.maxFileSizeKB', 1024);

  return {
    enabled: cfg.get<boolean>('tokenCount.enabled', true),
    charsPerToken: charsPerToken > 0 ? charsPerToken : 3.5,
    maxFileSizeBytes: Math.max(1, maxFileSizeKB) * 1024
  };
}

/** Heuristic binary detection: NUL byte within the first ~8KB means binary. */
function isProbablyText(buffer: Buffer): boolean {
  const sample = Math.min(buffer.length, 8192);
  for (let i = 0; i < sample; i++) {
    if (buffer[i] === 0) {
      return false;
    }
  }
  return true;
}

function countChars(text: string): number {
  return text.length;
}

/**
 * Estimates Claude tokens with a zero-dependency heuristic. Anthropic ships no offline
 * tokenizer, so this blends a chars-per-token ratio with a word-count floor for short text.
 */
function estimateTokens(text: string, charsPerToken: number): number {
  if (text.length === 0) {
    return 0;
  }
  const byChars = text.length / charsPerToken;
  const words = (text.match(/\S+/g) || []).length;
  const byWords = words / 0.75;
  return Math.ceil(Math.max(byChars, byWords));
}

/** Groups thousands for readability, e.g. 12480 -> "12,480". */
function formatCount(n: number): string {
  return n.toLocaleString('en-US');
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
