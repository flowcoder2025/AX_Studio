// ComfyUI API Client — communicates with local ComfyUI server on port 8000

import WebSocket from 'ws';
import { v4 as uuid } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

const COMFYUI_URL = process.env.COMFYUI_URL || 'http://127.0.0.1:8000';
const COMFYUI_WS = process.env.COMFYUI_WS || 'ws://127.0.0.1:8000/ws';

export interface ComfyUIPrompt {
  prompt: Record<string, any>;
  client_id?: string;
}

export interface QueueResponse {
  prompt_id: string;
  number: number;
}

export interface GenerationResult {
  promptId: string;
  images: { filename: string; subfolder: string; type: string }[];
  videos?: { filename: string; subfolder: string; type: string }[];
}

export class ComfyUIClient {
  private clientId: string;

  constructor() {
    this.clientId = uuid();
  }

  // Queue a workflow prompt
  async queuePrompt(workflow: Record<string, any>): Promise<QueueResponse> {
    const res = await fetch(`${COMFYUI_URL}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: workflow,
        client_id: this.clientId,
      }),
    });

    if (!res.ok) {
      throw new Error(`ComfyUI queue failed: ${res.status} ${await res.text()}`);
    }

    return res.json();
  }

  // Upload an image to ComfyUI
  async uploadImage(imagePath: string, subfolder?: string): Promise<{ name: string; subfolder: string }> {
    const imageBuffer = await fs.readFile(imagePath);
    const filename = path.basename(imagePath);

    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer]), filename);
    if (subfolder) formData.append('subfolder', subfolder);
    formData.append('overwrite', 'true');

    const res = await fetch(`${COMFYUI_URL}/upload/image`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`ComfyUI upload failed: ${res.status}`);
    }

    return res.json();
  }

  // Wait for generation to complete via WebSocket
  async waitForCompletion(promptId: string): Promise<GenerationResult> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${COMFYUI_WS}?clientId=${this.clientId}`);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('ComfyUI generation timeout (5min)'));
      }, 300000);

      ws.on('message', async (data) => {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'executed' && msg.data?.prompt_id === promptId) {
          clearTimeout(timeout);
          ws.close();

          // Fetch the output images
          const history = await this.getHistory(promptId);
          resolve(history);
        }

        if (msg.type === 'execution_error' && msg.data?.prompt_id === promptId) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error(`ComfyUI execution error: ${JSON.stringify(msg.data)}`));
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  // Get generation history/results
  async getHistory(promptId: string): Promise<GenerationResult> {
    const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
    const history = await res.json();

    const outputs = history[promptId]?.outputs || {};
    const images: GenerationResult['images'] = [];
    const videos: GenerationResult['videos'] = [];

    for (const nodeOutput of Object.values(outputs) as any[]) {
      if (nodeOutput.images) {
        images.push(...nodeOutput.images);
      }
      if (nodeOutput.gifs || nodeOutput.videos) {
        videos.push(...(nodeOutput.gifs || nodeOutput.videos || []));
      }
    }

    return { promptId, images, videos };
  }

  // Download output image from ComfyUI
  async downloadOutput(filename: string, subfolder: string, type: string): Promise<Buffer> {
    const params = new URLSearchParams({ filename, subfolder, type });
    const res = await fetch(`${COMFYUI_URL}/view?${params}`);

    if (!res.ok) {
      throw new Error(`ComfyUI download failed: ${res.status}`);
    }

    return Buffer.from(await res.arrayBuffer());
  }

  // Load a workflow JSON template
  async loadWorkflow(workflowName: string): Promise<Record<string, any>> {
    const workflowPath = path.join(
      process.cwd(), 'src', 'lib', 'comfyui', 'workflows', `${workflowName}.json`
    );
    const content = await fs.readFile(workflowPath, 'utf-8');
    return JSON.parse(content);
  }

  // Check if ComfyUI server is running
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${COMFYUI_URL}/system_stats`);
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const comfyui = new ComfyUIClient();
