// Claude CLI Proxy Client — uses local Claude Code CLI (Max subscription)

import { spawn } from 'child_process';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const CLAUDE_CLI = process.env.CLAUDE_CLI_PATH || 'claude';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | { type: string; [key: string]: any }[];
}

export interface ClaudeResponse {
  id: string;
  content: { type: string; text?: string }[];
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

export async function sendMessage(
  messages: ClaudeMessage[],
  options?: { system?: string; model?: string; maxTokens?: number }
): Promise<ClaudeResponse> {
  // Build user prompt from messages
  const userParts: string[] = [];
  for (const msg of messages) {
    const text = typeof msg.content === 'string'
      ? msg.content
      : msg.content.map(c => c.text || JSON.stringify(c)).join('\n');
    userParts.push(text);
  }
  const userPrompt = userParts.join('\n\n');

  const args = [
    '--print',
    '--output-format', 'json',
    '--max-turns', '1',
  ];

  if (options?.system) {
    args.push('--append-system-prompt', options.system);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(CLAUDE_CLI, args, {
      timeout: 120000,
      env: { ...process.env, LANG: 'en_US.UTF-8' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    // Pass prompt via stdin to avoid shell escaping issues
    child.stdin.write(userPrompt);
    child.stdin.end();

    child.on('close', (code) => {
      const output = stdout.trim();
      if (output) {
        try {
          const result = JSON.parse(output);
          resolve({
            id: result.session_id || `cli-${Date.now()}`,
            content: [{ type: 'text', text: result.result || '' }],
            model: result.model || 'claude-cli',
            usage: {
              input_tokens: result.usage?.input_tokens || 0,
              output_tokens: result.usage?.output_tokens || 0,
            },
          });
          return;
        } catch {
          // Non-JSON output — use raw text
          resolve({
            id: `cli-${Date.now()}`,
            content: [{ type: 'text', text: output }],
            model: 'claude-cli',
            usage: { input_tokens: 0, output_tokens: 0 },
          });
          return;
        }
      }
      reject(new Error(`Claude CLI error (exit ${code}): ${stderr || 'no output'}`));
    });

    child.on('error', (err) => {
      reject(new Error(`Claude CLI spawn error: ${err.message}`));
    });
  });
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(CLAUDE_CLI, ['--version'], {
      timeout: 5000,
    });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}
