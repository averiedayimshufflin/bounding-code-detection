'use client';

// Dynamically import pdfjs-dist to avoid SSR issues.
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // Use CDN worker so we don't have to copy files or bundle workers.
    (
      pdfjsLib as typeof import('pdfjs-dist')
    ).GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  }
  return pdfjsLib;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PDFDocumentProxy = any;

/**
 * Load a PDF File and return the pdfjs document proxy.
 */
export async function loadPDF(file: File): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjs.getDocument({ data: typedArray });
  return loadingTask.promise as unknown as PDFDocumentProxy;
}

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Render a single PDF page to a canvas at the given scale.
 * Higher scale → better OCR accuracy, more memory.
 */
export async function renderPage(
  pdfDoc: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
): Promise<RenderedPage> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  await page.render({ canvasContext: ctx, viewport }).promise;

  return {
    canvas,
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}
