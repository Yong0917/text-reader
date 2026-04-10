'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { BookFile, saveProgress, getProgress } from '@/lib/db';

interface PdfReaderViewProps {
  book: BookFile;
  onBack: () => void;
}

interface PageEntry {
  index: number;       // 1-based
  rendered: boolean;
}

export default function PdfReaderView({ book, onBack }: PdfReaderViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBar, setShowBar] = useState(true);
  const barTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);
  const renderingRef = useRef<Set<number>>(new Set());
  const initialScrollDone = useRef(false);

  // PDF 로드 및 페이지 렌더링
  useEffect(() => {
    if (!book.pdfData) return;

    let cancelled = false;

    async function loadPdf() {
      const pdfjsLib = await import('pdfjs-dist');
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }

      const pdf = await pdfjsLib.getDocument({ data: book.pdfData!.slice(0) }).promise;
      if (cancelled) return;

      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      canvasRefs.current = new Array(pdf.numPages).fill(null);

      // 초기 스크롤 위치 복원
      const prog = await getProgress(book.id);
      if (prog?.scrollRatio && !initialScrollDone.current && scrollRef.current) {
        // 렌더링 후 복원 (useEffect에서 처리)
        initialScrollDone.current = false; // 렌더링 대기
      }
    }

    loadPdf();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.pdfData]);

  // 초기 스크롤 복원 (totalPages 세팅 후)
  useEffect(() => {
    if (!totalPages || initialScrollDone.current) return;

    getProgress(book.id).then((prog) => {
      if (!prog?.scrollRatio || !scrollRef.current) return;
      // 약간의 지연 후 복원 (DOM 렌더링 대기)
      setTimeout(() => {
        if (!scrollRef.current) return;
        const maxScroll = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;
        scrollRef.current.scrollTop = prog.scrollRatio! * maxScroll;
        initialScrollDone.current = true;
      }, 100);
    });
  }, [totalPages, book.id]);

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current) return;
    if (renderingRef.current.has(pageNum)) return;
    const canvas = canvasRefs.current[pageNum - 1];
    if (!canvas) return;
    // 이미 렌더링된 경우 스킵
    if (canvas.dataset.rendered === 'true') return;

    renderingRef.current.add(pageNum);
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const dpr = window.devicePixelRatio || 1;
      const containerWidth = scrollRef.current?.clientWidth ?? window.innerWidth;
      const viewport = page.getViewport({ scale: 1 });
      const scale = (containerWidth / viewport.width) * dpr;
      const scaledViewport = page.getViewport({ scale });

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.width = `${scaledViewport.width / dpr}px`;
      canvas.style.height = `${scaledViewport.height / dpr}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      canvas.dataset.rendered = 'true';
    } finally {
      renderingRef.current.delete(pageNum);
    }
  }, []);

  // Intersection Observer로 화면에 보이는 페이지만 렌더링
  useEffect(() => {
    if (!totalPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = parseInt((entry.target as HTMLElement).dataset.page ?? '0', 10);
            if (pageNum > 0) {
              renderPage(pageNum);
              // 인접 페이지 미리 렌더링
              if (pageNum > 1) renderPage(pageNum - 1);
              if (pageNum < totalPages) renderPage(pageNum + 1);
            }
          }
        }
      },
      { rootMargin: '200px 0px', threshold: 0 }
    );

    const containers = scrollRef.current?.querySelectorAll('[data-page]');
    containers?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [totalPages, renderPage]);

  const persistProgress = useCallback(() => {
    if (!scrollRef.current || !totalPages) return;
    const el = scrollRef.current;
    const maxScroll = Math.max(el.scrollHeight - el.clientHeight, 0);
    const scrollRatio = maxScroll > 0 ? el.scrollTop / maxScroll : 0;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveProgress(book.id, el.scrollTop, el.scrollHeight, scrollRatio);
    }, 500);
  }, [book.id, totalPages]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !totalPages) return;
    const el = scrollRef.current;

    // 현재 페이지 계산
    const pageHeight = el.scrollHeight / totalPages;
    const page = Math.min(totalPages, Math.max(1, Math.floor(el.scrollTop / pageHeight) + 1));
    setCurrentPage(page);

    persistProgress();
  }, [totalPages, persistProgress]);

  const handleTap = useCallback(() => {
    setShowBar((prev) => !prev);
    if (barTimer.current) clearTimeout(barTimer.current);
    barTimer.current = setTimeout(() => setShowBar(false), 3000);
  }, []);

  useEffect(() => {
    barTimer.current = setTimeout(() => setShowBar(false), 3000);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') persistProgress();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', persistProgress);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', persistProgress);
      if (barTimer.current) clearTimeout(barTimer.current);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      persistProgress();
    };
  }, [persistProgress]);

  const handleBackClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    persistProgress();
    // saveProgress가 debounce되어 있으므로 즉시 저장
    if (scrollRef.current && totalPages) {
      const el = scrollRef.current;
      const maxScroll = Math.max(el.scrollHeight - el.clientHeight, 0);
      const scrollRatio = maxScroll > 0 ? el.scrollTop / maxScroll : 0;
      await saveProgress(book.id, el.scrollTop, el.scrollHeight, scrollRatio);
    }
    onBack();
  }, [book.id, onBack, persistProgress, totalPages]);

  const readProgress = totalPages > 0 ? ((currentPage - 1) / Math.max(totalPages - 1, 1)) * 100 : 0;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#404040]">

      {/* 세로 진행률 표시줄 */}
      <div className="fixed right-0 top-0 bottom-0 z-20 w-[2px] pointer-events-none">
        <div className="w-full bg-black/10" style={{ height: '100%' }} />
        <div
          className="absolute top-0 left-0 right-0 transition-all duration-500"
          style={{ height: `${readProgress}%`, background: '#4a8f7a', opacity: 0.6 }}
        />
      </div>

      {/* 상단 바 */}
      <div
        className={`fixed top-0 left-0 right-0 z-30 transition-transform duration-300 safe-top ${
          showBar ? 'translate-y-0' : '-translate-y-full'
        } bg-[#1a1a1a]/90 backdrop-blur-sm border-b border-white/10`}
      >
        <div className="flex items-center gap-1 px-3 py-2.5">
          <button
            onClick={handleBackClick}
            className="p-2.5 rounded-xl active:scale-90 transition-transform text-white/80"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <p className="flex-1 text-sm font-medium truncate px-1 text-white/80">
            {book.name.replace(/\.[^/.]+$/, '')}
          </p>
          <span className="text-xs tabular-nums text-white/50 mr-1">
            {totalPages > 0 ? `${currentPage} / ${totalPages}` : '로딩 중...'}
          </span>
        </div>
      </div>

      {/* PDF 스크롤 영역 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
        onClick={handleTap}
      >
        <div className="flex flex-col items-center gap-2 py-4 pt-16">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              data-page={pageNum}
              className="w-full flex justify-center"
              style={{ maxWidth: '100vw' }}
            >
              <canvas
                ref={(el) => { canvasRefs.current[pageNum - 1] = el; }}
                className="shadow-lg"
                style={{ display: 'block', maxWidth: '100%' }}
              />
            </div>
          ))}
          {totalPages === 0 && (
            <div className="flex items-center justify-center h-screen text-white/50 text-sm">
              PDF를 불러오는 중...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
