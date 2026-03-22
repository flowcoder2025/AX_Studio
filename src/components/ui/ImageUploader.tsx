'use client';
import { useState, useCallback } from 'react';

interface ImageUploaderProps {
  onUpload: (files: File[]) => void;
  maxFiles?: number;
  accept?: string;
}

export default function ImageUploader({ onUpload, maxFiles = 5, accept = 'image/*' }: ImageUploaderProps) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, maxFiles - previews.length);
    const newPreviews = arr.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    const updated = [...previews, ...newPreviews].slice(0, maxFiles);
    setPreviews(updated);
    onUpload(updated.map(p => p.file));
  }, [previews, maxFiles, onUpload]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index].url);
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    onUpload(updated.map(p => p.file));
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('img-file-input')?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
      >
        <p className="text-sm text-gray-500">이미지를 드래그하거나 클릭하여 업로드</p>
        <p className="text-xs text-gray-400 mt-1">최대 {maxFiles}장 · JPG, PNG, WebP</p>
        <input id="img-file-input" type="file" multiple accept={accept} className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-5 gap-2 mt-3">
          {previews.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              <button onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full text-white text-xs flex items-center justify-center hover:bg-black/70">
                ×
              </button>
              {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] bg-blue-500 text-white px-1 rounded">대표</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
