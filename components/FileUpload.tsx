'use client';

import { useCallback, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Search,
  UploadCloud,
} from 'lucide-react';

interface Props {
  onFile: (file: File) => void;
  targetCodeInput: string;
  targetCodes: string[];
  onTargetCodeInputChange: (value: string) => void;
}

export default function FileUpload({
  onFile,
  targetCodeInput,
  targetCodes,
  onTargetCodeInputChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetInput = () => {
  if (inputRef.current) inputRef.current.value = '';
};

  const handleFile = useCallback(
  (file: File | null | undefined) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      resetInput();
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File is too large. Maximum size is 50 MB.');
      resetInput();
      return;
    }

    const liveTargetCodes = targetCodeInput
      .split(/[\s,]+/)
      .map((code) => code.trim())
      .filter(Boolean);

    if (liveTargetCodes.length === 0) {
      setError('Type at least one code to search for.');
      resetInput();
      return;
    }

    setError(null);
    resetInput();
    onFile(file);
  },
  [onFile, targetCodeInput],
);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile],
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  return (
    <div className="min-h-screen px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              Plan OCR
            </div>
            <h1 className="text-3xl font-semibold text-slate-950">
              Plan Code Scanner
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Enter the symbols or fixture codes you need, upload a plan PDF,
              and review the OCR bounding boxes page by page.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
            <CheckCircle2 size={15} className="text-emerald-500" />
            Local Tesseract by default
          </div>
        </header>

        <main className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-orange-500 text-white">
                <Search size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Search targets
                </h2>
                <p className="text-xs text-slate-500">
                  Separate codes with commas, spaces, or new lines.
                </p>
              </div>
            </div>

            <label htmlFor="target-codes" className="block">
              <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">
                Codes to find
              </span>
              <textarea
                id="target-codes"
                value={targetCodeInput}
                onChange={(e) => onTargetCodeInputChange(e.target.value)}
                rows={4}
                placeholder="Enter codes to search for"
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-950 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </label>

            <div className="mt-3 min-h-8">
              {targetCodes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {targetCodes.map((code) => (
                    <span
                      key={code}
                      className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 font-mono text-xs font-semibold text-orange-700"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Add at least one target code before uploading a PDF.
                </p>
              )}
            </div>

            <div
              className={`
                mt-6 cursor-pointer rounded-lg border border-dashed p-8 transition
                ${
                  isDragging
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-slate-300 bg-slate-50 hover:border-orange-300 hover:bg-orange-50/60'
                }
              `}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
  handleFile(e.target.files?.[0]);
  e.currentTarget.value = '';
}}
              />

              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-orange-500 shadow-sm ring-1 ring-slate-200">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <p className="font-medium text-slate-950">
                    {isDragging ? 'Drop your PDF here' : 'Upload plan PDF'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Drag and drop, or click to browse
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    PDF only, max 50 MB, multi-page supported
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">
              Scan workflow
            </h2>
            <div className="mt-4 space-y-3">
              {[
                {
                  icon: FileText,
                  label: 'Render pages',
                  sub: 'Each PDF page becomes a high-resolution image.',
                },
                {
                  icon: Search,
                  label: 'Run OCR',
                  sub: 'Words are matched against your typed target codes.',
                },
                {
                  icon: CheckCircle2,
                  label: 'Review boxes',
                  sub: 'Detected codes appear in the sidebar and page viewer.',
                },
              ].map(({ icon: Icon, label, sub }) => (
                <div
                  key={label}
                  className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-orange-500 ring-1 ring-slate-200">
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                      {sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <p className="text-xs font-semibold uppercase text-orange-700">
                Accuracy tip
              </p>
              <p className="mt-1 text-sm leading-5 text-orange-900">
                Use a higher render scale for small print, then zoom in after
                processing to inspect the boxes.
              </p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}