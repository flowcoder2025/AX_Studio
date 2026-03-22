// Kling API Client — image-to-video generation

const KLING_API_URL = process.env.KLING_API_URL || 'https://api.klingai.com/v1';
const KLING_API_KEY = process.env.KLING_API_KEY || '';

interface KlingGenerateRequest {
  model_name?: string;
  image: string;        // base64 or URL
  prompt: string;
  negative_prompt?: string;
  duration?: '5' | '10';
  cfg_scale?: number;
  mode?: 'std' | 'pro';
  aspect_ratio?: '16:9' | '9:16' | '1:1';
}

interface KlingTaskResponse {
  task_id: string;
  task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
}

interface KlingResultResponse {
  task_id: string;
  task_status: string;
  task_result?: {
    videos: { url: string; duration: number }[];
  };
}

export class KlingClient {
  private apiKey: string;

  constructor() {
    this.apiKey = KLING_API_KEY;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Kling API key not configured. Set KLING_API_KEY in .env.local');
    }

    const res = await fetch(`${KLING_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Kling API error: ${res.status} ${err}`);
    }

    return res.json();
  }

  // Submit image-to-video generation task
  async generateVideo(params: KlingGenerateRequest): Promise<KlingTaskResponse> {
    const body = {
      model_name: params.model_name || 'kling-v1.6',
      input: {
        image_url: params.image,
      },
      prompt: params.prompt,
      negative_prompt: params.negative_prompt || '',
      duration: params.duration || '5',
      cfg_scale: params.cfg_scale || 0.5,
      mode: params.mode || 'std',
      aspect_ratio: params.aspect_ratio || '1:1',
    };

    const data = await this.request('/videos/image2video', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      task_id: data.data?.task_id || data.task_id,
      task_status: 'submitted',
    };
  }

  // Check task status
  async getTaskStatus(taskId: string): Promise<KlingResultResponse> {
    const data = await this.request(`/videos/image2video/${taskId}`);
    return {
      task_id: taskId,
      task_status: data.data?.task_status || data.task_status,
      task_result: data.data?.task_result,
    };
  }

  // Wait for video generation to complete (polling)
  async waitForVideo(taskId: string, timeoutMs = 600000, pollIntervalMs = 5000): Promise<string> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const result = await this.getTaskStatus(taskId);

      if (result.task_status === 'succeed' && result.task_result?.videos?.[0]?.url) {
        return result.task_result.videos[0].url;
      }

      if (result.task_status === 'failed') {
        throw new Error(`Kling video generation failed for task ${taskId}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Kling video generation timed out after ${timeoutMs / 1000}s`);
  }

  // Download video from URL to local file
  async downloadVideo(videoUrl: string, outputPath: string): Promise<string> {
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`Failed to download video: ${res.status}`);

    const fs = await import('fs/promises');
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
    return outputPath;
  }

  // Full pipeline: submit → wait → download
  async generateAndDownload(
    params: KlingGenerateRequest,
    outputPath: string
  ): Promise<string> {
    const task = await this.generateVideo(params);
    const videoUrl = await this.waitForVideo(task.task_id);
    return this.downloadVideo(videoUrl, outputPath);
  }

  // Health check
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      await this.request('/models');
      return true;
    } catch {
      return false;
    }
  }
}

export const kling = new KlingClient();
