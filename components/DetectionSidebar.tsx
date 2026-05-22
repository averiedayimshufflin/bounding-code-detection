'use client';

import { useMemo, useState } from 'react';
import type { PageResult, Detection } from '@/types';
import { codeColour } from '@/lib/textNormalizer';
import { List, BarChart2, ChevronRight } from 'lucide-react';

interface Props {
  pages: PageResult[];
  currentPage: number;
  onPageChange: (n: number) => void;
  selectedDetectionId: string | null;
  onDetectionClick: (id: string) => void;
  debugMode: boolean;
  onDebugToggle: () => void;
  pdfName: string;
  targetCodes: string[];
  onReset: () => void;
}

type Tab = 'by-page' | 'summary';

export default function DetectionSidebar({
  pages,
  currentPage,
  onPageChange,
  selectedDetectionId,
  onDetectionClick,
  debugMode,
  onDebugToggle,
  pdfName,
  targetCodes,
  onReset,
}: Props) {
  const [tab, setTab] = useState<Tab>('by-page');

  // All detections across all pages
  const allDetections = useMemo(
    () => pages.flatMap((p) => p.detections),
    [pages],
  );

  // Summary: code → { total, pages }
  const summary = useMemo(() => {
    const map = new Map<string, { total: number; pages: Map<number, number> }>();
    for (const det of allDetections) {
      if (!map.has(det.code)) map.set(det.code, { total: 0, pages: new Map() });
      const entry = map.get(det.code)!;
      entry.total += 1;
      entry.pages.set(det.page, (entry.pages.get(det.page) ?? 0) + 1);
    }
    return map;
  }, [allDetections]);

  const totalDetections = allDetections.length;
  const pagesWithDetections = pages.filter((p) => p.detections.length > 0).length;

  return (
    <aside className="flex flex-col h-full bg-gray-950 border-r border-gray-800">
      {/* Branding header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-red-400 font-mono tracking-widest uppercase">
            Code Scanner
          </span>
        </div>
        <p
          className="text-xs text-gray-500 truncate"
          title={pdfName}
        >
          {pdfName}
        </p>

        {/* Stats row */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: 'Detections', value: totalDetections },
            { label: 'Pages hit', value: pagesWithDetections },
            { label: 'Unique codes', value: summary.size },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col items-center rounded-lg bg-gray-900 py-2 px-1"
            >
              <span className="text-lg font-bold text-white tabular-nums leading-tight">
                {value}
              </span>
              <span className="text-[10px] text-gray-600 mt-0.5 text-center leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 shrink-0">
        {(
          [
            { id: 'by-page', label: 'By page', Icon: List },
            { id: 'summary', label: 'Summary', Icon: BarChart2 },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px
              ${tab === id
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'}
            `}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        {tab === 'by-page' ? (
          <ByPageTab
            pages={pages}
            currentPage={currentPage}
            onPageChange={onPageChange}
            selectedDetectionId={selectedDetectionId}
            onDetectionClick={onDetectionClick}
          />
        ) : (
          <SummaryTab
            summary={summary}
            targetCodes={targetCodes}
            onPageChange={onPageChange}
          />
        )}
      </div>

      {/* Footer controls */}
      <div className="px-4 py-3 border-t border-gray-800 shrink-0 flex items-center gap-2">
        <button
          onClick={onDebugToggle}
          className={`
            flex-1 py-2 rounded-lg text-xs font-medium transition-colors border
            ${debugMode
              ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
              : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'}
          `}
        >
          {debugMode ? '🔍 Debug ON' : '🔍 Debug'}
        </button>

        <button
          onClick={onReset}
          className="flex-1 py-2 rounded-lg text-xs font-medium border border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-gray-300 transition-colors"
        >
          ↩ New PDF
        </button>
      </div>
    </aside>
  );
}

// ---------- By-page tab ----------

function ByPageTab({
  pages,
  currentPage,
  onPageChange,
  selectedDetectionId,
  onDetectionClick,
}: {
  pages: PageResult[];
  currentPage: number;
  onPageChange: (n: number) => void;
  selectedDetectionId: string | null;
  onDetectionClick: (id: string) => void;
}) {
  if (pages.every((p) => p.detections.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-48 px-4 text-center">
        <p className="text-gray-600 text-sm">No target codes detected</p>
        <p className="text-gray-700 text-xs mt-1">
          Try enabling debug mode to see raw OCR words.
        </p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {pages.map((page) => (
        <div key={page.pageNumber}>
          {/* Page header */}
          <button
            onClick={() => onPageChange(page.pageNumber)}
            className={`
              w-full flex items-center justify-between px-4 py-2 text-left transition-colors
              ${page.pageNumber === currentPage ? 'bg-gray-900' : 'hover:bg-gray-900/50'}
            `}
          >
            <div className="flex items-center gap-2">
              <ChevronRight
                size={13}
                className={`transition-transform text-gray-500 ${
                  page.pageNumber === currentPage ? 'rotate-90' : ''
                }`}
              />
              <span className="text-xs text-gray-400 font-mono">
                Page {page.pageNumber}
              </span>
            </div>
            <span
              className={`text-xs font-mono px-1.5 py-0.5 rounded-full ${
                page.detections.length > 0
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-gray-700'
              }`}
            >
              {page.detections.length}
            </span>
          </button>

          {/* Detection rows (shown when page is current) */}
          {page.pageNumber === currentPage && page.detections.length > 0 && (
            <div className="pb-1">
              {page.detections.map((det) => (
                <DetectionRow
                  key={det.id}
                  detection={det}
                  isSelected={det.id === selectedDetectionId}
                  onClick={() => onDetectionClick(det.id)}
                />
              ))}
            </div>
          )}

          {page.pageNumber === currentPage && page.detections.length === 0 && (
            <p className="px-8 py-2 text-xs text-gray-700 italic">
              No codes on this page
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function DetectionRow({
  detection,
  isSelected,
  onClick,
}: {
  detection: Detection;
  isSelected: boolean;
  onClick: () => void;
}) {
  const colour = codeColour(detection.code);
  const { x0, y0, x1, y1 } = detection.bbox;

  return (
    <button
      onClick={onClick}
      className={`detection-row w-full text-left px-4 py-2.5 flex items-start gap-3 ${
        isSelected ? 'active' : ''
      }`}
    >
      {/* Code chip */}
      <span
        className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold"
        style={{
          backgroundColor: `${colour}25`,
          color: colour,
          border: `1px solid ${colour}40`,
        }}
      >
        {detection.code}
      </span>

      {/* Coords */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-500 font-mono leading-relaxed">
          ({x0}, {y0}) → ({x1}, {y1})
        </p>
        <p className="text-[10px] text-gray-700 font-mono mt-0.5">
          conf {detection.confidence.toFixed(0)}%
          {detection.rawText !== detection.code && (
            <span className="ml-1 text-yellow-700">
              raw: &quot;{detection.rawText}&quot;
            </span>
          )}
        </p>
      </div>
    </button>
  );
}

// ---------- Summary tab ----------

function SummaryTab({
  summary,
  targetCodes,
  onPageChange,
}: {
  summary: Map<string, { total: number; pages: Map<number, number> }>;
  targetCodes: string[];
  onPageChange: (n: number) => void;
}) {
  if (summary.size === 0) {
    return (
      <div className="flex items-center justify-center h-48 px-4 text-center">
        <p className="text-gray-600 text-sm">No detections yet</p>
      </div>
    );
  }

  const targetSet = new Set(targetCodes);
  const sorted = [
    ...targetCodes.filter((c) => summary.has(c)),
    ...Array.from(summary.keys()).filter((c) => !targetSet.has(c)).sort(),
  ].map((code) => ({
    code,
    ...summary.get(code)!,
  }));

  const maxCount = Math.max(...sorted.map((s) => s.total));

  return (
    <div className="py-3 px-4 space-y-3">
      {sorted.map(({ code, total, pages }) => {
        const colour = codeColour(code);
        const barWidth = maxCount > 0 ? (total / maxCount) * 100 : 0;

        return (
          <div key={code} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                style={{
                  color: colour,
                  backgroundColor: `${colour}20`,
                  border: `1px solid ${colour}30`,
                }}
              >
                {code}
              </span>
              <span className="text-xs text-gray-400 font-mono tabular-nums">
                {total}×
              </span>
            </div>

            {/* Bar */}
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: colour,
                }}
              />
            </div>

            {/* Pages list */}
            <div className="flex flex-wrap gap-1">
              {Array.from(pages.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([pg, cnt]) => (
                  <button
                    key={pg}
                    onClick={() => onPageChange(pg)}
                    className="text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    p.{pg}
                    {cnt > 1 ? `(×${cnt})` : ''}
                  </button>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
