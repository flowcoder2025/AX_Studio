import type { Metadata } from 'next';
import Sidebar from '@/components/ui/Sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'AX Studio — 이커머스 자동화 상세페이지',
  description: '이커머스 상세페이지를 자동으로 생성하는 AX 솔루션',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-ax-surface min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
