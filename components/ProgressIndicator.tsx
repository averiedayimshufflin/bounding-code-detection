'use client';

import { Loader2 } from 'lucide-react';
import type { OCREngine } from '@/types';

interface Props {
  currentPage: number;
  totalPages: number;
  pdfName: string;
  status: 'loading-pdf' | 'processing';
ocrEngine?: OCREngine;
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
      ? 'Loading PDF'
      : currentPage === 0
        ? `Starting OCR for ${totalPages} pages`
        : `Processed ${currentPage} of ${totalPages} pages`;

  const tip =
    ocrEngine === 'tesseract'
      ? 'OCR is running locally in your browser. The first scan may take longer while Tesseract warms up.'
      : 'OCR.space requests are running through the server route.';

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
            <Loader2 size={23} className="animate-spin" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-slate-500">
              {pdfName}
            </p>
            <p className="font-semibold text-slate-950">{message}</p>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between font-mono text-xs text-slate-500">
          <span>
            {status === 'processing' && totalPages > 0
              ? `${currentPage} / ${totalPages} complete`
              : 'Initialising'}
          </span>
          <span>{percent}%</span>
        </div>

        <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          {tip}
        </p>
      </div>
    </div>
  );
}