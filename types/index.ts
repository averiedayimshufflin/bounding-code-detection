export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OCRWord {
  text: string;
  normalizedText: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface Detection {
  id: string;
  code: string;
  page: number;
  bbox: BoundingBox;
  confidence: number;
  rawText: string;
}

export interface CodeSummary {
  code: string;
  totalCount: number;
  pages: Array<{ page: number; count: number }>;
}

export interface PageResult {
  pageNumber: number;
  imageDataUrl: string;
  width: number;
  height: number;
  detections: Detection[];
  allWords: OCRWord[];
  processingTimeMs: number;
}

export type OCREngine = 'tesseract' | 'ocrspace';

export interface ProcessingConfig {
  ocrEngine: OCREngine;
  renderScale: number;
  debugMode: boolean;
}

export type AppStatus =
  | 'idle'
  | 'loading-pdf'
  | 'processing'
  | 'complete'
  | 'error';
