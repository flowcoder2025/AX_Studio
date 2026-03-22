import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/claude/client';

export async function GET() {
  const connected = await isAuthenticated();
  return NextResponse.json({
    authenticated: connected,
    method: 'cli',
    detail: connected ? 'Claude Code CLI (Max 구독)' : 'Claude CLI를 찾을 수 없습니다',
  });
}
