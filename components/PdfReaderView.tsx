'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { BookFile, saveProgress, getProgress } from '@/lib/db';

interface PdfReaderViewProps {
  book: BookFile;
  onBack: () => void;
}

export default function PdfReaderView({ book, onBack }: PdfReaderViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBar, setShowBar] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const zoomRef = useRef(1.0);
  const barTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);
  const renderingRef = useRef<Set<number>>(new Set());
  const initialScrollDone = useRef(false);
  const pinchActiveRef = useRef(false);
  const dragPanRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });

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

      const prog = await getProgress(book.id);
      if (prog?.scrollRatio && !initialScrollDone.current && scrollRef.current) {
        initialScrollDone.current = false;
      }
    }

    loadPdf();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.pdfData]);

  // 초기 스크롤 복원
  useEffect(() => {
    if (!totalPages || initialScrollDone.current) return;

    getProgress(book.id).then((prog) => {
      if (!prog?.scrollRatio || !scrollRef.current) return;
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
    if (canvas.dataset.rendered === 'true') return;

    renderingRef.current.add(pageNum);
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const dpr = window.devicePixelRatio || 1;
      const containerWidth = scrollRef.current?.clientWidth ?? window.innerWidth;
      const viewport = page.getViewport({ scale: 1 });
      const scale = (containerWidth / viewport.width) * dpr * zoomRef.current;
      const scaledViewport = page.getViewport({ scale });

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.width = `${scaledViewport.width / dpr}px`;
      canvas.style.height = `${scaledViewport.height / dpr}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      canvas.dataset.rendered = 'true';
      canvas.dataset.renderedZoom = String(zoomRef.current);
    } finally {
      renderingRef.current.delete(pageNum);
    }
  }, []);

  // 줌 변경 시 모든 캔버스 재렌더링
  useEffect(() => {
    if (!totalPages) return;

    canvasRefs.current.forEach((canvas) => {
      if (canvas) canvas.dataset.rendered = 'false';
    });
    renderingRef.current.clear();

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    for (let i = 1; i <= totalPages; i++) {
      const container = scrollEl.querySelector(`[data-page="${i}"]`);
      if (!container) continue;
      const rect = container.getBoundingClientRect();
      if (rect.bottom > -200 && rect.top < window.innerHeight + 200) {
        renderPage(i);
        if (i > 1) renderPage(i - 1);
        if (i < totalPages) renderPage(i + 1);
      }
    }
  }, [zoomLevel, totalPages, renderPage]);

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

  // 핀치 줌 터치 이벤트
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let startDist: number | null = null;
    let startZoom = 1;
    let currentPinchZoom = 1;

    const getDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = getDistance(e.touches);
        startZoom = zoomRef.current;
        currentPinchZoom = startZoom;
        pinchActiveRef.current = true;
        dragPanRef.current.active = false;
        dragPanRef.current.moved = true;
      } else if (e.touches.length === 1 && zoomRef.current > 1) {
        dragPanRef.current = {
          active: true,
          moved: false,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          startScrollLeft: el.scrollLeft,
          startScrollTop: el.scrollTop,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist !== null) {
        e.preventDefault();
        const dist = getDistance(e.touches);
        const ratio = dist / startDist;
        currentPinchZoom = Math.min(4, Math.max(0.5, startZoom * ratio));
        zoomRef.current = currentPinchZoom;
        // CSS transform으로 즉각적인 시각 피드백
        if (contentRef.current) {
          const relativeScale = currentPinchZoom / startZoom;
          contentRef.current.style.transform = `scale(${relativeScale})`;
          contentRef.current.style.transformOrigin = 'top center';
        }
        return;
      }

      if (e.touches.length === 1 && dragPanRef.current.active && zoomRef.current > 1) {
        const dx = e.touches[0].clientX - dragPanRef.current.startX;
        const dy = e.touches[0].clientY - dragPanRef.current.startY;

        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          dragPanRef.current.moved = true;
          pinchActiveRef.current = true;
        }

        e.preventDefault();
        el.scrollLeft = dragPanRef.current.startScrollLeft - dx;
        el.scrollTop = dragPanRef.current.startScrollTop - dy;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2 && startDist !== null) {
        startDist = null;
        // CSS transform 제거 후 실제 스케일로 재렌더링
        if (contentRef.current) {
          contentRef.current.style.transform = '';
          contentRef.current.style.transformOrigin = '';
        }
        const snapped = Math.round(currentPinchZoom * 10) / 10;
        zoomRef.current = snapped;
        setZoomLevel(snapped);
        setTimeout(() => { pinchActiveRef.current = false; }, 100);
        dragPanRef.current.active = false;
        return;
      }

      if (e.touches.length === 0) {
        dragPanRef.current.active = false;
        if (dragPanRef.current.moved) {
          setTimeout(() => {
            pinchActiveRef.current = false;
            dragPanRef.current.moved = false;
          }, 100);
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const changeZoom = useCallback((delta: number) => {
    const newZoom = Math.round(Math.min(4, Math.max(0.5, zoomRef.current + delta)) * 10) / 10;
    zoomRef.current = newZoom;
    setZoomLevel(newZoom);
  }, []);

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

    const pageHeight = el.scrollHeight / totalPages;
    const page = Math.min(totalPages, Math.max(1, Math.floor(el.scrollTop / pageHeight) + 1));
    setCurrentPage(page);

    persistProgress();
  }, [totalPages, persistProgress]);

  const handleTap = useCallback(() => {
    if (pinchActiveRef.current) return;
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
    if (scrollRef.current && totalPages) {
      const el = scrollRef.current;
      const maxScroll = Math.max(el.scrollHeight - el.clientHeight, 0);
      const scrollRatio = maxScroll > 0 ? el.scrollTop / maxScroll : 0;
      await saveProgress(book.id, el.scrollTop, el.scrollHeight, scrollRatio);
    }
    onBack();
  }, [book.id, onBack, persistProgress, totalPages]);

  const readProgress = totalPages > 0 ? ((currentPage - 1) / Math.max(totalPages - 1, 1)) * 100 : 0;
  const zoomPercent = Math.round(zoomLevel * 100);

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

          {/* 줌 컨트롤 */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); changeZoom(-0.25); }}
              className="p-2 rounded-lg active:scale-90 transition-transform text-white/70 hover:text-white/90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
              </svg>
            </button>
            <span className="text-xs tabular-nums text-white/50 w-9 text-center">
              {zoomPercent}%
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); changeZoom(0.25); }}
              className="p-2 rounded-lg active:scale-90 transition-transform text-white/70 hover:text-white/90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          <span className="text-xs tabular-nums text-white/50 mr-1">
            {totalPages > 0 ? `${currentPage} / ${totalPages}` : '로딩 중...'}
          </span>
        </div>
      </div>

      {/* PDF 스크롤 영역 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
        onClick={handleTap}
        style={{ touchAction: zoomLevel > 1 ? 'none' : 'manipulation' }}
      >
        <div
          ref={contentRef}
          className="flex flex-col items-center gap-2 py-4 pt-16"
          style={{
            width: zoomLevel > 1 ? 'fit-content' : '100%',
            minWidth: '100%',
            margin: '0 auto',
          }}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              data-page={pageNum}
              className="flex justify-center"
            >
              <canvas
                ref={(el) => { canvasRefs.current[pageNum - 1] = el; }}
                className="shadow-lg"
                style={{ display: 'block' }}
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
