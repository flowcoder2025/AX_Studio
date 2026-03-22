'use client';

import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [claudeConnected, setClaudeConnected] = useState(false);
  const [comfyuiConnected, setComfyuiConnected] = useState(false);
  const [ffmpegConnected, setFfmpegConnected] = useState(false);

  useEffect(() => {
    checkServices();
  }, []);

  async function checkServices() {
    try {
      const res = await fetch('/api/comfyui/status');
      const data = await res.json();
      setComfyuiConnected(data.connected);
    } catch { setComfyuiConnected(false); }

    try {
      const res = await fetch('/api/auth/token');
      const data = await res.json();
      setClaudeConnected(data.authenticated);
    } catch { setClaudeConnected(false); }

    try {
      const res = await fetch('/api/ffmpeg/status');
      const data = await res.json();
      setFfmpegConnected(data.available);
    } catch { setFfmpegConnected(false); }
  }

  return (
    <div className="p-8 max-w-5xl">
      <h2 className="text-2xl font-semibold mb-1">대시보드</h2>
      <p className="text-sm text-gray-500 mb-8">AX Studio 서비스 현황 및 빠른 시작</p>

      {/* Service Status */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatusCard
          name="Claude"
          status={claudeConnected}
          detail="CLI (Max 구독)"
        />
        <StatusCard
          name="ComfyUI"
          status={comfyuiConnected}
          detail="port 8000"
        />
        <StatusCard
          name="FFmpeg"
          status={ffmpegConnected}
          detail="로컬 설치"
        />
      </div>

      {/* Quick Start */}
      <h3 className="text-lg font-medium mb-4">새 프로젝트</h3>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <ModeCard
          mode="A"
          title="간편 입력"
          description="제품 이미지 + 간단 정보만 넣으면 전체 상세페이지 자동 생성"
          href="/projects?mode=simple"
        />
        <ModeCard
          mode="B"
          title="상세 입력"
          description="스펙시트(엑셀) + 이미지로 정밀한 상세페이지 생성"
          href="/projects?mode=detailed"
        />
        <ModeCard
          mode="C"
          title="URL 리메이크"
          description="기존 상세페이지 URL을 입력하면 리디자인 + 영상 추가"
          href="/projects?mode=remake"
        />
      </div>

      {/* Recent Projects */}
      <h3 className="text-lg font-medium mb-4">최근 프로젝트</h3>
      <div className="card">
        <p className="text-sm text-gray-400 text-center py-8">
          아직 프로젝트가 없습니다. 위에서 새 프로젝트를 시작해보세요.
        </p>
      </div>
    </div>
  );
}

function StatusCard({
  name, status, detail,
}: {
  name: string;
  status: boolean;
  detail: string;
}) {
  return (
    <a href="/services" className="card flex items-center justify-between hover:border-gray-300 transition-colors">
      <div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-500' : 'bg-red-400'}`} />
          <span className="text-sm font-medium">{name}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1 ml-4">{detail}</p>
      </div>
      {status ? (
        <span className="badge badge-green">Connected</span>
      ) : (
        <span className="text-xs text-red-400">설정 필요</span>
      )}
    </a>
  );
}

function ModeCard({
  mode, title, description, href,
}: {
  mode: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a href={href} className="card hover:border-ax-primary/30 transition-colors group">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-semibold">
          {mode}
        </span>
        <span className="text-sm font-medium group-hover:text-ax-primary transition-colors">
          {title}
        </span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </a>
  );
}
