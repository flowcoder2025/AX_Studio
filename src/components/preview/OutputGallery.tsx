'use client';
import { useState, useEffect } from 'react';

interface OutputItem {
  id: string;
  type: 'html' | 'image' | 'video';
  platform?: string;
  file_path: string;
  file_size: number;
  created_at: number;
}

export default function OutputGallery({ projectId }: { projectId: string }) {
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(res => res.json())
      .then(data => { setOutputs(data.outputs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="text-center py-8 text-sm text-gray-400">로딩 중...</div>;
  if (outputs.length === 0) return <EmptyGallery />;

  const html = outputs.filter(o => o.type === 'html');
  const images = outputs.filter(o => o.type === 'image');
  const videos = outputs.filter(o => o.type === 'video');

  return (
    <div className="space-y-6">
      {html.length > 0 && (
        <OutputSection title="HTML 상세페이지" items={html} projectId={projectId} />
      )}
      {images.length > 0 && (
        <OutputSection title="이미지 상세페이지" items={images} projectId={projectId} />
      )}
      {videos.length > 0 && (
        <OutputSection title="영상" items={videos} projectId={projectId} />
      )}
    </div>
  );
}

function OutputSection({ title, items, projectId }: { title: string; items: OutputItem[]; projectId: string }) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-2">{title}</h4>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <a
            key={item.id}
            href={`/api/output/download?id=${projectId}&type=${item.type}&platform=${item.platform || ''}`}
            className="border border-gray-200 rounded-lg hover:border-blue-300 transition-colors p-3 block"
          >
            <div className="flex items-center gap-2 mb-1">
              <TypeIcon type={item.type} />
              <span className="text-xs font-medium">
                {item.platform ? `${item.platform} 버전` : item.type.toUpperCase()}
              </span>
            </div>
            <div className="text-[10px] text-gray-400">
              {formatFileSize(item.file_size)} · {new Date(item.created_at * 1000).toLocaleString('ko')}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = { html: '🌐', image: '🖼', video: '🎬' };
  return <span className="text-sm">{icons[type] || '📄'}</span>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function EmptyGallery() {
  return (
    <div className="text-center py-12 text-sm text-gray-400">
      <p>출력 파일이 아직 없습니다</p>
      <p className="text-xs mt-1">HTML 또는 이미지를 내보내면 여기에 표시됩니다</p>
    </div>
  );
}
