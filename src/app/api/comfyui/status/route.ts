import { NextResponse } from 'next/server';
import { comfyui } from '@/lib/comfyui/client';

export async function GET() {
  const healthy = await comfyui.healthCheck();
  return NextResponse.json({
    connected: healthy,
    url: process.env.COMFYUI_URL || 'http://127.0.0.1:8000',
  });
}
