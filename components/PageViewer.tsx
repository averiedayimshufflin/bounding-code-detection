'use client';

import { useEffect, useRef, useState } from 'react';
import type { PageResult, Detection } from '@/types';
import { codeColour } from '@/lib/textNormalizer';
import { ChevronLeft, ChevronRight, Bug, Minus, Plus, RotateCcw } from 'lucide-react';

interface Props {
  pages: PageResult[];
  currentPage: number;
  onPageChange: (n: number) => void;
  selectedDetectionId: string | null;
  onDetectionClick: (id: string) => void;
  debugMode: boolean;
}

export default function PageViewer({
  pages,
  currentPage,
  onPageChange,
  selectedDetectionId,
  onDetectionClick,
  debugMode,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [fitZoom, setFitZoom] = useState(1);
  const [zoom, setZoom] = useState(1);

  const page = pages.find((p) => p.pageNumber === currentPage);
  const totalPages = pages.length;

  const totalDetections = pages.reduce(
    (sum, p) => sum + p.detections.length,
    0,
  );

  useEffect(() => {
    const updateFitZoom = () => {
      if (!viewerRef.current || !page) return;

      const container = viewerRef.current;
      const availableWidth = container.clientWidth - 48;
      const availableHeight = container.clientHeight - 48;

      const scale = Math.min(
        availableWidth / page.width,
        availableHeight / page.height,
        1,
      );

      setFitZoom(scale);
      setZoom(scale);
    };

    updateFitZoom();

    window.addEventListener('resize', updateFitZoom);
    return () => window.removeEventListener('resize', updateFitZoom);
  }, [page]);

  if (!page) return null;

  const prev = () => onPageChange(Math.max(1, currentPage - 1));
  const next = () => onPageChange(Math.min(totalPages, currentPage + 1));

  const zoomOut = () => setZoom((value) => Math.max(fitZoom, value - 0.25));
  const zoomIn = () => setZoom((value) => Math.min(8, value + 0.25));
  const resetZoom = () => setZoom(fitZoom);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="flex flex-col h-full min-w-0 bg-white text-zinc-900">
      {/* Page controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-orange-100 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="text-sm text-zinc-500 font-mono tabular-nums">
            Page{' '}
            <span className="text-zinc-950 font-semibold">{currentPage}</span>
            {' / '}
            {totalPages}
          </span>

          <button
            onClick={next}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center rounded-lg border border-orange-200 bg-orange-50 overflow-hidden">
            <button
              onClick={zoomOut}
              disabled={zoom <= fitZoom}
              className="p-1.5 text-zinc-600 hover:text-orange-700 hover:bg-orange-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Zoom out"
            >
              <Minus size={14} />
            </button>

            <button
              onClick={resetZoom}
              className="min-w-14 px-2 py-1.5 text-zinc-700 hover:text-orange-700 hover:bg-orange-100 font-mono transition-colors"
              title="Fit to page"
            >
              {zoomPercent}%
            </button>

            <button
              onClick={zoomIn}
              disabled={zoom >= 8}
              className="p-1.5 text-zinc-600 hover:text-orange-700 hover:bg-orange-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Zoom in"
            >
              <Plus size={14} />
            </button>

            <button
              onClick={resetZoom}
              disabled={zoom === fitZoom}
              className="p-1.5 text-zinc-600 hover:text-orange-700 hover:bg-orange-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-orange-200"
              title="Fit to page"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-mono border border-orange-200">
            {totalDetections} detection
            {totalDetections !== 1 ? 's' : ''}
          </span>

          {debugMode && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-mono border border-amber-200">
              <Bug size={11} />
              debug
            </span>
          )}

          <span className="text-zinc-400 font-mono">
            {(page.processingTimeMs / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Page thumbnail strip */}
      <div className="flex gap-2 px-4 py-2 border-b border-orange-100 overflow-x-auto shrink-0 bg-orange-50/60">
        {pages.map((p) => (
          <button
            key={p.pageNumber}
            onClick={() => onPageChange(p.pageNumber)}
            className={`
              relative shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-150 bg-white
              ${
                p.pageNumber === currentPage
                  ? 'border-orange-500 shadow-[0_0_14px_rgba(249,115,22,0.35)]'
                  : 'border-orange-100 opacity-70 hover:opacity-100 hover:border-orange-300'
              }
            `}
            style={{ width: 52, height: 68 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.imageDataUrl}
              alt={`Page ${p.pageNumber}`}
              className="h-full w-full object-cover"
            />

            {p.detections.length > 0 && (
              <div className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-orange-500 text-white text-[9px] font-bold leading-none">
                {p.detections.length > 9 ? '9+' : p.detections.length}
              </div>
            )}

            <div className="absolute bottom-0 inset-x-0 flex items-center justify-center py-0.5 bg-white/85 border-t border-orange-100">
              <span className="text-[9px] text-zinc-700 font-mono">
                {p.pageNumber}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Main page image with SVG bounding-box overlay */}
      <div
        ref={viewerRef}
        className="flex-1 min-w-0 overflow-auto bg-orange-50/40 p-6 flex justify-center items-start"
      >
        <div
          className="relative page-enter rounded-lg overflow-hidden shrink-0 bg-white shadow-xl border border-orange-100"
          style={{
            width: page.width * zoom,
            height: page.height * zoom,
            minWidth: page.width * zoom,
          }}
        >
          {/* PDF image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.imageDataUrl}
            alt={`Plan page ${page.pageNumber}`}
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
            }}
          />

          {/* SVG overlay */}
          <svg
            className="absolute inset-0"
            width={page.width * zoom}
            height={page.height * zoom}
            viewBox={`0 0 ${page.width} ${page.height}`}
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {page.detections.map((det: Detection) => {
              const isActive =
                det.id === selectedDetectionId || det.id === hoveredId;

              const colour = codeColour(det.code);

              const w = det.bbox.x1 - det.bbox.x0;
              const h = det.bbox.y1 - det.bbox.y0;

const pad = Math.max(6, h * 0.4);
              return (
                <g
                  key={det.id}
                  className="cursor-pointer"
                  onClick={() => onDetectionClick(det.id)}
                  onMouseEnter={() => setHoveredId(det.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <rect
                    x={det.bbox.x0 - pad}
                    y={det.bbox.y0 - pad}
                    width={w + pad * 2}
                    height={h + pad * 2}
                    fill={isActive ? `${colour}30` : `${colour}12`}
                    stroke={colour}
                    strokeWidth={isActive ? 4 : 3}
                    rx={4}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}