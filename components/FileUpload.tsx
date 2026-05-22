'use client';

import { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileText, AlertCircle } from 'lucide-react';

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

  const handleFile = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file.');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError('File is too large. Maximum size is 50 MB.');
        return;
      }
      if (targetCodes.length === 0) {
        setError('Type at least one code to search for.');
        return;
      }
      setError(null);
      onFile(file);
    },
    [onFile, targetCodes.length],
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
  const onDragLeave = () => setIsDragging(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-mono text-red-400 tracking-widest uppercase">
            Plan OCR
          </span>
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">
          Plan Code Scanner
        </h1>
        <p className="mt-3 text-gray-400 max-w-md mx-auto text-sm leading-relaxed">
          Type the codes you want to find, upload a PDF, and the scanner draws
          bounding boxes around each OCR match.
        </p>
      </div>

      {/* Code entry */}
      <div className="mb-6 max-w-xl w-full">
        <label htmlFor="target-codes" className="block">
          <span className="text-xs text-gray-500 uppercase tracking-widest mb-2 block font-mono">
            Codes to find
          </span>
          <textarea
            id="target-codes"
            value={targetCodeInput}
            onChange={(e) => onTargetCodeInputChange(e.target.value)}
            rows={3}
            placeholder="Enter codes to search for"
            className="w-full resize-none rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-sm text-white font-mono placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {targetCodes.length > 0 ? (
            targetCodes.map((code) => (
              <span
                key={code}
                className="px-2.5 py-1 rounded-md bg-gray-800 border border-gray-700 text-xs font-mono text-gray-300"
              >
                {code}
              </span>
            ))
          ) : (
            <span className="text-xs text-red-400">
              Type at least one code before uploading.
            </span>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`
          relative w-full max-w-xl rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragging
            ? 'border-red-500 bg-red-500/8 scale-[1.01]'
            : 'border-gray-700 bg-gray-900/50 hover:border-gray-500 hover:bg-gray-900'}
        `}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <div className="flex flex-col items-center justify-center gap-4 px-8 py-14">
          <div
            className={`
              p-4 rounded-2xl transition-colors duration-200
              ${isDragging ? 'bg-red-500/20' : 'bg-gray-800'}
            `}
          >
            <UploadCloud
              size={32}
              className={isDragging ? 'text-red-400' : 'text-gray-400'}
            />
          </div>

          <div className="text-center">
            <p className="text-white font-medium">
              {isDragging ? 'Drop your PDF here' : 'Drag & drop your PDF'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              or{' '}
              <span className="text-red-400 hover:text-red-300 underline underline-offset-2">
                browse files
              </span>
            </p>
            <p className="text-gray-600 text-xs mt-3">PDF · Max 50 MB · Multi-page supported</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm max-w-xl w-full">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Features */}
      <div className="mt-10 grid grid-cols-3 gap-4 max-w-xl w-full">
        {[
          { icon: FileText, label: 'Multi-page', sub: 'Every page scanned' },
          { icon: UploadCloud, label: 'Free OCR', sub: 'No API key needed' },
          { icon: AlertCircle, label: 'Debug mode', sub: 'Inspect all words' },
        ].map(({ icon: Icon, label, sub }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-gray-900 border border-gray-800"
          >
            <Icon size={18} className="text-gray-500" />
            <p className="text-white text-xs font-medium">{label}</p>
            <p className="text-gray-600 text-xs text-center">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
