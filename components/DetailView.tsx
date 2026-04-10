'use client';

import { useEffect, useState } from 'react';
import { BookFile, Bookmark, getBookmarksByFile, getProgress } from '@/lib/db';

const EXT_STYLES: Record<string, { spine: string; badge: string; label: string }> = {
  EPUB: { spine: '#3d8b7a', badge: 'bg-[#e8f4f1] text-[#2d6b5e]', label: 'EPUB' },
  PDF:  { spine: '#b85c5c', badge: 'bg-[#f9eded] text-[#8b3030]',  label: 'PDF'  },
  MD:   { spine: '#7b6abf', badge: 'bg-[#f0eef9] text-[#5a4a9a]',  label: 'MD'   },
  TXT:  { spine: '#6b8abf', badge: 'bg-[#eef2f9] text-[#3a5a8a]',  label: 'TXT'  },
};

function getExtStyle(ext: string) {
  return EXT_STYLES[ext] ?? EXT_STYLES.TXT;
}

function formatDateFull(ts: number): string {
  return new Date(ts).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return formatDateFull(ts);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

interface DetailViewProps {
  book: BookFile;
  onOpen: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export default function DetailView({ book, onOpen, onDelete, onBack }: DetailViewProps) {
  const [progress, setProgress] = useState(0);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    getProgress(book.id).then((prog) => {
      if (prog?.scrollRatio !== undefined) {
        setProgress(Math.min(100, Math.max(0, prog.scrollRatio * 100)));
      } else if (prog && prog.scrollHeight > 0) {
        const viewH = typeof window !== 'undefined' ? window.innerHeight : 800;
        const pct = Math.min(100, Math.max(0, (prog.scrollTop / (prog.scrollHeight - viewH)) * 100));
        setProgress(pct);
      }
    });
    getBookmarksByFile(book.id).then(setBookmarks);
  }, [book.id]);

  const ext = book.name.split('.').pop()?.toUpperCase() ?? 'TXT';
  const style = getExtStyle(ext);
  const nameWithoutExt = book.name.replace(/\.[^/.]+$/, '');
  const hasProgress = progress > 1;

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  const ctaLabel = progress >= 98 ? '다시 읽기' : hasProgress ? '이어 읽기' : '읽기 시작';

  const handleDelete = () => {
    if (window.confirm(`"${nameWithoutExt}"을(를) 삭제할까요?`)) {
      onDelete();
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f5ef] animate-slide-in-right">
      {/* 헤더 */}
      <div className="safe-top">
        <div className="flex items-center px-3 pt-3 pb-2">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl active:scale-90 transition-transform text-[#1a1714]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="flex-1" />
          <button
            onClick={handleDelete}
            className="p-2.5 rounded-xl active:scale-90 transition-transform text-[#c09080]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="px-6 pb-44 max-w-lg mx-auto">
        {/* 타입 뱃지 */}
        <span className={`inline-block text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md mb-3 ${style.badge}`}>
          {style.label}
        </span>

        {/* 제목 */}
        <h1 className="text-2xl font-semibold text-[#1a1714] leading-snug mb-6">
          {nameWithoutExt}
        </h1>

        {/* 진행률 카드 */}
        <div
          className="flex items-center gap-5 mb-6 px-5 py-4 bg-white rounded-2xl"
          style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.06), 0 4px 16px rgba(26,23,20,0.04)' }}
        >
          {/* 원형 진행률 */}
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r={radius} fill="none" stroke="#f0ece4" strokeWidth="5" />
              <circle
                cx="32" cy="32" r={radius}
                fill="none"
                stroke={style.spine}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums"
              style={{ color: style.spine }}
            >
              {Math.round(progress)}%
            </span>
          </div>
          <div>
            <p className="font-semibold text-[#1a1714]">
              {progress >= 98 ? '완독' : hasProgress ? '읽는 중' : '미시작'}
            </p>
            <p className="text-sm text-[#a09388] mt-0.5">
              {hasProgress
                ? progress >= 98
                  ? '끝까지 읽었어요'
                  : `전체의 ${Math.round(progress)}% 읽음`
                : '아직 읽지 않은 책'}
            </p>
          </div>
        </div>

        {/* 메타데이터 */}
        <div
          className="rounded-2xl bg-white overflow-hidden mb-6"
          style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.06), 0 4px 16px rgba(26,23,20,0.04)' }}
        >
          {[
            { label: '파일 크기', value: formatSize(book.size) },
            { label: '추가일', value: formatDateFull(book.addedAt) },
            { label: '마지막 열람', value: formatDateRelative(book.lastReadAt) },
          ].map(({ label, value }, i, arr) => (
            <div
              key={label}
              className={`flex items-center px-5 py-3.5 ${i < arr.length - 1 ? 'border-b border-[#f0ece4]' : ''}`}
            >
              <span className="text-sm text-[#a09388] w-24 shrink-0">{label}</span>
              <span className="text-sm text-[#1a1714] font-medium">{value}</span>
            </div>
          ))}
        </div>

        {/* 북마크 목록 */}
        {bookmarks.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-[#e0d8cc]" />
              <p className="text-xs text-[#a09388] shrink-0">북마크 {bookmarks.length}개</p>
              <div className="h-px flex-1 bg-[#e0d8cc]" />
            </div>
            <div className="space-y-2">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-start gap-3 px-4 py-3 bg-white rounded-xl"
                  style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.05)' }}
                >
                  <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ background: style.spine, opacity: 0.4 }} />
                  <p className="text-sm text-[#1a1714] line-clamp-2 flex-1 leading-relaxed">{bm.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 CTA */}
      <div className="fixed bottom-0 left-0 right-0 safe-bottom">
        <div className="px-5 pb-6 pt-8" style={{ background: 'linear-gradient(to top, #f8f5ef 60%, transparent)' }}>
          <button
            onClick={onOpen}
            className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold text-white text-[16px] active:scale-[0.97] transition-transform max-w-lg mx-auto"
            style={{ background: '#2c5f4e', boxShadow: '0 4px 20px rgba(44,95,78,0.35), 0 1px 4px rgba(44,95,78,0.2)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
