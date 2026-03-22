'use client';

import { useState, useEffect } from 'react';

interface ClaudeStatus {
  authenticated: boolean;
  method: string;
  detail: string;
}

interface ComfyUIStatus {
  connected: boolean;
  url: string;
}

interface FFmpegStatus {
  available: boolean;
  version: string | null;
  path: string;
}

export default function ServicesPage() {
  const [claude, setClaude] = useState<ClaudeStatus | null>(null);
  const [comfyui, setComfyui] = useState<ComfyUIStatus | null>(null);
  const [ffmpeg, setFfmpeg] = useState<FFmpegStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { checkAll(); }, []);

  async function checkAll() {
    setRefreshing(true);
    const [c, cu, ff] = await Promise.all([
      fetch('/api/auth/token').then(r => r.json()).catch(() => ({ authenticated: false, method: 'cli', detail: 'API 호출 실패' })),
      fetch('/api/comfyui/status').then(r => r.json()).catch(() => ({ connected: false, url: 'http://127.0.0.1:8000' })),
      fetch('/api/ffmpeg/status').then(r => r.json()).catch(() => ({ available: false, version: null, path: 'ffmpeg' })),
    ]);
    setClaude(c);
    setComfyui(cu);
    setFfmpeg(ff);
    setRefreshing(false);
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">서비스 상태</h2>
          <p className="text-sm text-gray-500 mt-0.5">AX Studio 연동 서비스 현황</p>
        </div>
        <button
          className="btn-secondary text-sm"
          onClick={checkAll}
          disabled={refreshing}
        >
          {refreshing ? '확인 중...' : '새로고침'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Claude */}
        <ServiceCard
          name="Claude"
          connected={claude?.authenticated ?? null}
          details={[
            { label: '방식', value: claude?.method === 'cli' ? 'Claude Code CLI' : claude?.method || '-' },
            { label: '상태', value: claude?.detail || '확인 중...' },
          ]}
          disconnectedGuide={
            <div className="mt-3 p-3 bg-amber-50 rounded-lg text-xs text-amber-700 space-y-1">
              <p className="font-medium">연결 방법:</p>
              <p>1. Claude Code CLI 설치: <code className="bg-amber-100 px-1 rounded">npm install -g @anthropic-ai/claude-code</code></p>
              <p>2. 로그인: <code className="bg-amber-100 px-1 rounded">claude login</code></p>
              <p>3. Max 구독이 필요합니다 (구독 한도에서 차감)</p>
            </div>
          }
        />

        {/* ComfyUI */}
        <ServiceCard
          name="ComfyUI"
          connected={comfyui?.connected ?? null}
          details={[
            { label: 'URL', value: comfyui?.url || 'http://127.0.0.1:8000' },
            { label: '상태', value: comfyui?.connected ? '정상 연결' : '미연결 — 이미지/영상 생성 불가' },
          ]}
          disconnectedGuide={
            <div className="mt-3 p-3 bg-amber-50 rounded-lg text-xs text-amber-700 space-y-1">
              <p className="font-medium">연결 방법:</p>
              <p>1. ComfyUI 디렉토리에서 실행:</p>
              <p><code className="bg-amber-100 px-1 rounded">python main.py --listen 0.0.0.0 --port 8000</code></p>
              <p>2. 필요 커스텀 노드: BRIA RMBG 2.0, Zero123Plus, IP-Adapter, RIFE</p>
              <p className="text-amber-500 mt-1">* ComfyUI 없이도 카피 생성은 정상 동작합니다</p>
            </div>
          }
        />

        {/* FFmpeg */}
        <ServiceCard
          name="FFmpeg"
          connected={ffmpeg?.available ?? null}
          details={[
            { label: '버전', value: ffmpeg?.version || '-' },
            { label: '경로', value: ffmpeg?.path || 'ffmpeg' },
            { label: '상태', value: ffmpeg?.available ? '정상 감지' : '미감지 — 영상 후처리 불가' },
          ]}
          disconnectedGuide={
            <div className="mt-3 p-3 bg-amber-50 rounded-lg text-xs text-amber-700 space-y-1">
              <p className="font-medium">설치 방법:</p>
              <p>1. <a href="https://ffmpeg.org/download.html" target="_blank" className="underline">ffmpeg.org</a>에서 Windows 빌드 다운로드</p>
              <p>2. 시스템 PATH에 등록 또는 <code className="bg-amber-100 px-1 rounded">.env.local</code>에 경로 설정:</p>
              <p><code className="bg-amber-100 px-1 rounded">FFMPEG_PATH=C:/path/to/ffmpeg.exe</code></p>
            </div>
          }
        />
      </div>

      {/* Summary */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-600">서비스 역할:</p>
        <p><strong>Claude CLI</strong> — 제품 분석, 카피 생성, 블록 추천 (필수)</p>
        <p><strong>ComfyUI</strong> — 이미지 생성/배경제거, 영상 소스 생성 (선택, 없으면 카피만 생성)</p>
        <p><strong>FFmpeg</strong> — 영상 후처리/합성/텍스트 오버레이 (선택, 없으면 영상 건너뜀)</p>
      </div>
    </div>
  );
}

function ServiceCard({
  name, connected, details, disconnectedGuide,
}: {
  name: string;
  connected: boolean | null;
  details: { label: string; value: string }[];
  disconnectedGuide: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            connected === null ? 'bg-gray-300 animate-pulse' : connected ? 'bg-green-500' : 'bg-red-400'
          }`} />
          <span className="text-base font-medium">{name}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          connected === null ? 'bg-gray-100 text-gray-400' :
          connected ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
        }`}>
          {connected === null ? '확인 중' : connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="mt-3 space-y-1">
        {details.map((d, i) => (
          <div key={i} className="flex text-xs">
            <span className="text-gray-400 w-16 flex-shrink-0">{d.label}</span>
            <span className="text-gray-600">{d.value}</span>
          </div>
        ))}
      </div>

      {connected === false && disconnectedGuide}
    </div>
  );
}
