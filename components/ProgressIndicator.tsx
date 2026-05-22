'use client';

import { Loader2 } from 'lucide-react';
import type { OCREngine } from '@/types';

interface Props {
  currentPage: number;
  totalPages: number;
  pdfName: string;
  status: 'loading-pdf' | 'processing';
  ocrEngine: OCREngine;
}

export default function ProgressIndicator({
  currentPage,
  totalPages,
  pdfName,
  status,
  ocrEngine,
}: Props) {
  const percent =
    status === 'loading-pdf'
      ? 0
      : totalPages > 0
      ? Math.round((currentPage / totalPages) * 100)
      : 0;

  const message =
    status === 'loading-pdf'
      ? 'Loading PDF…'
      : currentPage === 0
      ? `Starting OCR for ${totalPages} pages…`
      : `Processed ${currentPage} of ${totalPages} pages`;

  const tip =
    ocrEngine === 'tesseract'
      ? 'OCR runs locally in your browser with parallel workers.'
      : 'OCR.space pages are queued in parallel through the server route.';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-2xl bg-gray-900 border border-gray-800">
            <Loader2 size={28} className="text-red-400 animate-spin" />
          </div>
        </div>

        {/* File name */}
        <p className="text-center text-gray-500 text-xs font-mono mb-1 truncate">
          {pdfName}
        </p>

        {/* Status message */}
        <p className="text-center text-white font-medium mb-6">{message}</p>

        {/* Progress bar */}
        <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Percent */}
        <div className="flex justify-between mt-2 text-xs text-gray-600 font-mono">
          <span>
            {status === 'processing' && totalPages > 0
              ? `${currentPage} / ${totalPages} complete`
              : 'Initialising…'}
          </span>
          <span>{percent}%</span>
        </div>

        {/* Tip */}
        <p className="mt-8 text-center text-gray-700 text-xs">
          {tip}
        </p>
      </div>
    </div>
  );
}
