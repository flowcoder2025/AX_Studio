'use client';

import { useState, useEffect } from 'react';

interface ServiceStatus {
  claude: boolean | null;
  comfyui: boolean | null;
  ffmpeg: boolean | null;
}

export default function Sidebar() {
  const [status, setStatus] = useState<ServiceStatus>({ claude: null, comfyui: null, ffmpeg: null });

  useEffect(() => {
    checkAll();
    const interval = setInterval(checkAll, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkAll() {
    const [claude, comfyui, ffmpeg] = await Promise.all([
      fetch('/api/auth/token').then(r => r.json()).then(d => d.authenticated).catch(() => false),
      fetch('/api/comfyui/status').then(r => r.json()).then(d => d.connected).catch(() => false),
      fetch('/api/ffmpeg/status').then(r => r.json()).then(d => d.available).catch(() => false),
    ]);
    setStatus({ claude, comfyui, ffmpeg });
  }

  return (
    <aside className="w-60 bg-white border-r border-ax-border flex flex-col">
      <div className="p-5 border-b border-ax-border">
        <h1 className="text-lg font-semibold">AX Studio</h1>
        <p className="text-xs text-gray-500 mt-0.5">이커머스 자동화 솔루션</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <NavItem href="/" label="대시보드" />
        <NavItem href="/projects" label="프로젝트" />

        <div className="pt-4 pb-2">
          <p className="px-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
            Services
          </p>
        </div>
        <ServiceNavItem href="/services" label="Claude" badge="CLI" connected={status.claude} />
        <ServiceNavItem href="/services" label="ComfyUI" badge=":8000" connected={status.comfyui} />
        <ServiceNavItem href="/services" label="FFmpeg" connected={status.ffmpeg} />
      </nav>

      <div className="p-3 border-t border-ax-border">
        <div className="px-3 py-2 text-xs text-gray-400">
          v0.1.0 — Windows Local
        </div>
      </div>
    </aside>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
    >
      {label}
    </a>
  );
}

function ServiceNavItem({
  href, label, badge, connected,
}: {
  href: string; label: string; badge?: string; connected: boolean | null;
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${
          connected === null ? 'bg-gray-300' : connected ? 'bg-green-500' : 'bg-red-400'
        }`} />
        <span>{label}</span>
      </div>
      {badge && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
          {badge}
        </span>
      )}
    </a>
  );
}
