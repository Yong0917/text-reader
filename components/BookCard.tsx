'use client';

import { BookFile } from '@/lib/db';

interface BookCardProps {
  book: BookFile;
  progress: number;
  index: number;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

const EXT_STYLES: Record<string, { spine: string; badge: string; label: string }> = {
  EPUB: { spine: 'bg-[#3d8b7a]', badge: 'bg-[#e8f4f1] text-[#2d6b5e]', label: 'EPUB' },
  PDF:  { spine: 'bg-[#b85c5c]', badge: 'bg-[#f9eded] text-[#8b3030]', label: 'PDF' },
  MD:   { spine: 'bg-[#7b6abf]', badge: 'bg-[#f0eef9] text-[#5a4a9a]', label: 'MD' },
  TXT:  { spine: 'bg-[#6b8abf]', badge: 'bg-[#eef2f9] text-[#3a5a8a]', label: 'TXT' },
};

function getExtStyle(ext: string) {
  return EXT_STYLES[ext] ?? EXT_STYLES.TXT;
}

function formatDate(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return new Date(ts).toLocaleDateString('ko-KR');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function BookCard({ book, progress, index, onOpen, onDelete }: BookCardProps) {
  const ext = book.name.split('.').pop()?.toUpperCase() ?? 'TXT';
  const style = getExtStyle(ext);
  const nameWithoutExt = book.name.replace(/\.[^/.]+$/, '');

  return (
    <div
      className="animate-fade-in-up relative bg-white rounded-2xl overflow-hidden flex active:scale-[0.985] transition-transform duration-150"
      style={{
        animationDelay: `${index * 0.06}s`,
        boxShadow: '0 1px 3px rgba(26,23,20,0.06), 0 4px 16px rgba(26,23,20,0.04)',
      }}
      onClick={() => onOpen(book.id)}
    >
      {/* 책 등 (Spine) */}
      <div className={`w-1 shrink-0 ${style.spine}`} />

      {/* 내용 */}
      <div className="flex-1 px-4 py-4 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {/* 파일 형식 뱃지 */}
            <span className={`inline-block text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-md mb-1.5 ${style.badge}`}>
              {style.label}
            </span>
            {/* 제목 */}
            <p className="font-medium text-[#1a1714] leading-snug line-clamp-2 text-[15px]">
              {nameWithoutExt}
            </p>
            {/* 메타 */}
            <p className="text-xs text-[#a09388] mt-1">
              {formatSize(book.size)}<span className="mx-1.5 opacity-40">·</span>{formatDate(book.lastReadAt)}
            </p>
          </div>

          {/* 삭제 */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(book.id); }}
            className="shrink-0 w-7 h-7 flex items-center justify-center text-[#d0c8c0] hover:text-[#e07070] transition-colors mt-0.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 진행률 */}
        <div className="mt-3 flex items-center gap-2.5">
          <div className="flex-1 h-[2px] bg-[#f0ece4] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${style.spine}`}
              style={{ width: `${progress}%`, opacity: progress > 0 ? 1 : 0 }}
            />
          </div>
          <span className="text-[11px] text-[#a09388] shrink-0 tabular-nums w-8 text-right">
            {progress > 0 ? `${Math.round(progress)}%` : '―'}
          </span>
        </div>
      </div>
    </div>
  );
}
