'use client';

import { useState } from 'react';
import type { PageResult, Detection, OCRWord } from '@/types';
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
const [zoom, setZoom] = useState(1.25);
  const page = pages.find((p) => p.pageNumber === currentPage);
  const totalPages = pages.length;

  const totalDetections = pages.reduce(
  (sum, p) => sum + p.detections.length,
  0,
);

  if (!page) return null;

  const prev = () => onPageChange(Math.max(1, currentPage - 1));
  const next = () => onPageChange(Math.min(totalPages, currentPage + 1));
  const zoomOut = () => setZoom((value) => Math.max(0.5, value - 0.25));
  const zoomIn = () => setZoom((value) => Math.min(3, value + 0.25));
const resetZoom = () => setZoom(1.25);  
const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="flex flex-col h-full">
      {/* Page controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="text-sm text-gray-400 font-mono tabular-nums">
            Page{' '}
            <span className="text-white font-medium">{currentPage}</span>
            {' / '}
            {totalPages}
          </span>

          <button
            onClick={next}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center rounded-lg border border-gray-700 bg-gray-900 overflow-hidden">
            <button
              onClick={zoomOut}
              disabled={zoom <= 0.5}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Zoom out"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={resetZoom}
              className="min-w-14 px-2 py-1.5 text-gray-300 hover:text-white hover:bg-gray-800 font-mono transition-colors"
              title="Reset zoom"
            >
              {zoomPercent}%
            </button>
            <button
              onClick={zoomIn}
              disabled={zoom >= 3}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Zoom in"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={resetZoom}
disabled={zoom === 1.25}              
className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-gray-700"
              title="Fit to page"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Detection count badge */}
          <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 font-mono border border-red-500/20">
  {totalDetections} detection
  {totalDetections !== 1 ? 's' : ''}
</span>

          {debugMode && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-400 font-mono border border-yellow-500/20">
              <Bug size={11} />
              debug
            </span>
          )}

          {/* Processing time */}
          <span className="text-gray-600 font-mono">
            {(page.processingTimeMs / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Page thumbnail strip */}
      <div className="flex gap-2 px-4 py-2 border-b border-gray-800 overflow-x-auto shrink-0 bg-gray-950">
        {pages.map((p) => (
          <button
            key={p.pageNumber}
            onClick={() => onPageChange(p.pageNumber)}
            className={`
              relative shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-150
              ${p.pageNumber === currentPage
                ? 'border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                : 'border-gray-700 opacity-60 hover:opacity-100 hover:border-gray-500'}
            `}
            style={{ width: 52, height: 68 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.imageDataUrl}
              alt={`Page ${p.pageNumber}`}
              className="h-full object-cover"
            />
            {p.detections.length > 0 && (
              <div className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                {p.detections.length > 9 ? '9+' : p.detections.length}
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 flex items-center justify-center py-0.5 bg-black/60">
              <span className="text-[9px] text-gray-300 font-mono">{p.pageNumber}</span>
            </div>
          </button>
        ))}
      </div>
      

  {/* Main page image with SVG bounding-box overlay */}
<div className="flex-1 overflow-auto bg-gray-900/40 p-6 flex justify-center items-start">  
<div className="relative page-enter shadow-2xl rounded-lg overflow-hidden shrink-0"    style={{
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
        width: page.width * zoom,
        height: page.height * zoom,
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
      {/* detections */}
      {page.detections.map((det: Detection) => {
        const isActive =
          det.id === selectedDetectionId || det.id === hoveredId;

        const colour = codeColour(det.code);

        const w = det.bbox.x1 - det.bbox.x0;
        const h = det.bbox.y1 - det.bbox.y0;

        const pad = Math.max(4, h * 0.3);

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
              strokeWidth={isActive ? 3 : 2}
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
