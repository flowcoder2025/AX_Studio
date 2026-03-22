'use client';

interface MobileFrameProps {
  children: React.ReactNode;
  title?: string;
}

export default function MobileFrame({ children, title }: MobileFrameProps) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-200 overflow-hidden shadow-sm">
      {/* Status bar */}
      <div className="h-6 bg-gray-50 flex items-center justify-between px-5">
        <span className="text-[10px] text-gray-400">9:41</span>
        <div className="flex gap-1">
          <div className="w-3 h-1.5 rounded-sm bg-gray-300" />
          <div className="w-3 h-1.5 rounded-sm bg-gray-300" />
          <div className="w-4 h-1.5 rounded-sm bg-gray-300" />
        </div>
      </div>

      {/* Header */}
      {title && (
        <div className="h-10 border-b border-gray-100 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-600">{title}</span>
        </div>
      )}

      {/* Content */}
      <div className="max-h-[80vh] overflow-y-auto">
        {children}
      </div>

      {/* Home indicator */}
      <div className="h-6 flex items-center justify-center">
        <div className="w-28 h-1 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}
