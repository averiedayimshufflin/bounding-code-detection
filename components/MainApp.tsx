'use client';

import { useCallback, useMemo, useState } from 'react';
import type {
  AppStatus,
  PageResult,
  OCREngine,
  ProcessingConfig,
} from '@/types';
import FileUpload from './FileUpload';
import ProgressIndicator from './ProgressIndicator';
import PageViewer from './PageViewer';
import DetectionSidebar from './DetectionSidebar';
import { loadPDF, renderPage } from '@/lib/pdfProcessor';
import {
  runTesseractOCR,
  runOCRSpaceAPI,
  terminateTesseract,
} from '@/lib/ocrProcessor';
import { AlertCircle, Settings, X } from 'lucide-react';

const DEFAULT_CONFIG: ProcessingConfig = {
  ocrEngine: 'ocrspace',
  renderScale: 2,
  debugMode: false,
};

function parseTargetCodes(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,\n\r\t ]+/)
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  );
}

export default function MainApp() {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [pdfName, setPdfName] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [currentProcessingPage, setCurrentProcessingPage] = useState(0);
  const [pages, setPages] = useState<PageResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ProcessingConfig>(DEFAULT_CONFIG);

  const [targetCodeInput, setTargetCodeInput] = useState('');

  const targetCodes = useMemo(
    () => parseTargetCodes(targetCodeInput),
    [targetCodeInput],
  );

  // Viewer state
  const [viewerPage, setViewerPage] = useState(1);
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(
    null,
  );
  const [showSettings, setShowSettings] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (targetCodes.length === 0) {
        setStatus('error');
        setError('Type at least one code to search for.');
        return;
      }

      setStatus('loading-pdf');
      setPdfName(file.name);
      setError(null);
      setPages([]);
      setViewerPage(1);
      setSelectedDetectionId(null);

      try {
        const pdfDoc = await loadPDF(file);

        const numPages: number = pdfDoc.numPages;
        setTotalPages(numPages);
        setStatus('processing');

        const processedPages: PageResult[] = [];

        for (let i = 1; i <= numPages; i++) {
          setCurrentProcessingPage(i);

          const t0 = performance.now();

          // 1. Render PDF page to canvas / data URL
          const rendered = await renderPage(pdfDoc, i, config.renderScale);

          // 2. OCR
          let ocrResult: Awaited<ReturnType<typeof runTesseractOCR>>;

          if (config.ocrEngine === 'tesseract') {
            ocrResult = await runTesseractOCR(
              rendered.dataUrl,
              i,
              targetCodes,
            );
          } else {
            ocrResult = await runOCRSpaceAPI(
              rendered.dataUrl,
              i,
              targetCodes,
            );
          }

          const pageResult: PageResult = {
            pageNumber: i,
            imageDataUrl: rendered.dataUrl,
            width: rendered.width,
            height: rendered.height,
            detections: ocrResult.detections,
            allWords: ocrResult.allWords,
            processingTimeMs: performance.now() - t0,
          };

          processedPages.push(pageResult);

          // Update pages incrementally so the UI can show partial results.
          setPages([...processedPages]);
        }

        // Clean up Tesseract worker after processing.
        if (config.ocrEngine === 'tesseract') {
          await terminateTesseract();
        }

        setStatus('complete');
        setViewerPage(1);
      } catch (err) {
        console.error('[MainApp] Processing failed:', err);
        setStatus('error');
        setError(
          err instanceof Error ? err.message : 'An unexpected error occurred.',
        );
      }
    },
    [config, targetCodes],
  );

  const handleReset = () => {
    setStatus('idle');
    setPages([]);
    setError(null);
    setPdfName('');
    setTotalPages(0);
    setCurrentProcessingPage(0);
    setViewerPage(1);
    setSelectedDetectionId(null);
    setTargetCodeInput('');
  };

  const handleDetectionClick = (id: string) => {
    setSelectedDetectionId((prev) => (prev === id ? null : id));

    // Also jump to the page of this detection if needed.
    const det = pages.flatMap((p) => p.detections).find((d) => d.id === id);

    if (!det) return;

    const detectionPage =
      (det as { page?: number; pageNumber?: number }).page ??
      (det as { page?: number; pageNumber?: number }).pageNumber;

    if (detectionPage && detectionPage !== viewerPage) {
      setViewerPage(detectionPage);
    }
  };

  // ---- Render ----

  if (status === 'idle') {
    return (
      <div className="relative">
        {/* Settings cog */}
        <button
          onClick={() => setShowSettings((value) => !value)}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors z-10"
          aria-label="Open scan settings"
        >
          <Settings size={18} />
        </button>

        {showSettings && (
          <SettingsPanel
            config={config}
            onChange={setConfig}
            onClose={() => setShowSettings(false)}
          />
        )}

        <FileUpload
          onFile={handleFile}
          targetCodeInput={targetCodeInput}
          targetCodes={targetCodes}
          onTargetCodeInputChange={setTargetCodeInput}
        />
      </div>
    );
  }

  if (status === 'loading-pdf' || status === 'processing') {
    return (
      <ProgressIndicator
  status={status}
  pdfName={pdfName}
  currentPage={currentProcessingPage}
  totalPages={totalPages}
  ocrEngine={config.ocrEngine}
/>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            <AlertCircle size={20} className="shrink-0" />
            <div>
              <p className="font-medium">Processing failed</p>
              <p className="text-sm mt-0.5 text-red-400/70">{error}</p>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl bg-gray-900 border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors text-sm font-medium"
          >
            ↩ Try again
          </button>
        </div>
      </div>
    );
  }

  // status === 'complete'
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 flex flex-col h-full overflow-hidden border-r border-gray-800">
        <DetectionSidebar
          pages={pages}
          currentPage={viewerPage}
          onPageChange={setViewerPage}
          selectedDetectionId={selectedDetectionId}
          onDetectionClick={handleDetectionClick}
          debugMode={false}
          onDebugToggle={() => {}}
          pdfName={pdfName}
          onReset={handleReset}
        />
      </div>

      {/* Main viewer */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <PageViewer
          pages={pages}
          currentPage={viewerPage}
          onPageChange={setViewerPage}
          selectedDetectionId={selectedDetectionId}
          onDetectionClick={handleDetectionClick}
          debugMode={config.debugMode}
        />
      </main>
    </div>
  );
}

// ---- Settings panel ----

function SettingsPanel({
  config,
  onChange,
  onClose,
}: {
  config: ProcessingConfig;
  onChange: (config: ProcessingConfig) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-14 right-4 z-20 w-72 rounded-2xl bg-gray-900 border border-gray-700 p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Scan settings</h3>

        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300"
          aria-label="Close scan settings"
        >
          <X size={15} />
        </button>
      </div>

      {/* OCR Engine */}
      <label className="block mb-4">
        <span className="text-xs text-gray-500 mb-1.5 block">OCR Engine</span>

        <div className="grid grid-cols-2 gap-2">
          {(['tesseract', 'ocrspace'] as OCREngine[]).map((engine) => (
            <button
              key={engine}
              type="button"
              onClick={() => onChange({ ...config, ocrEngine: engine })}
              className={`
                py-2 rounded-lg text-xs font-medium border transition-colors
                ${
                  config.ocrEngine === engine
                    ? 'bg-red-500/15 border-red-500/40 text-red-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }
              `}
            >
              {engine === 'tesseract' ? '🧠 Tesseract' : '☁️ OCR.space'}
            </button>
          ))}
        </div>

        {config.ocrEngine === 'ocrspace' && (
          <p className="text-[11px] text-yellow-600 mt-1.5">
            Requires OCR_SPACE_API_KEY in .env.local
          </p>
        )}
      </label>

      {/* Render scale */}
      <label className="block mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-xs text-gray-500">Render scale</span>
          <span className="text-xs text-gray-300 font-mono">
            {config.renderScale}×
          </span>
        </div>

        <input
          type="range"
          min="1.5"
          max="4"
          step="0.5"
          value={config.renderScale}
          onChange={(event) =>
            onChange({
              ...config,
              renderScale: parseFloat(event.target.value),
            })
          }
          className="w-full accent-red-500"
        />

        <p className="text-[11px] text-gray-700 mt-1">
          Higher = better OCR, slower & more memory
        </p>
      </label>
    </div>
  );
}