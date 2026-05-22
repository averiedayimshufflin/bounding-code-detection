import { createWorker, PSM } from 'tesseract.js';

type BBox = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

type OCRWord = {
  text: string;
  normalizedText: string;
  confidence: number;
  bbox: BBox;
  page: number;
  pageNumber: number;
  isMatch: boolean;
};

type Detection = {
  id: string;
  code: string;
  rawText: string;
  confidence: number;
  bbox: BBox;
  page: number;
  pageNumber: number;
};

type OCRResult = {
  detections: Detection[];
  allWords: OCRWord[];
};

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<TesseractWorker> | null = null;

function normalizeOCRText(value: string): string {
  let text = value
    .toUpperCase()
    .trim()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, '');

  // Common lighting-plan OCR fixes.
  // LFI  -> LF1
  // LFIO -> LF10
  // LF7X -> LF7-X
  if (text.startsWith('LF')) {
    let suffix = text.slice(2);

    suffix = suffix
      .replace(/[|]/g, 'I')
      .replace(/I/g, '1')
      .replace(/O/g, '0')
      .replace(/[–—−]/g, '-');

    text = `LF${suffix}`;

    const lfDashXMatch = text.match(/^LF(\d{1,2})-?X$/);
    if (lfDashXMatch) {
      text = `LF${lfDashXMatch[1]}-X`;
    }
  }

  return text;
}

function makeTargetSet(targetCodes: string[]): Set<string> {
  return new Set(
    targetCodes
      .map((code) => normalizeOCRText(code))
      .filter(Boolean),
  );
}

function getBBoxFromWord(word: any): BBox | null {
  const bbox = word.bbox ?? word.BoundingBox ?? word;

  const x0 = Number(bbox.x0 ?? bbox.left ?? bbox.Left ?? bbox.x ?? 0);
  const y0 = Number(bbox.y0 ?? bbox.top ?? bbox.Top ?? bbox.y ?? 0);

  const width = Number(bbox.width ?? bbox.Width ?? 0);
  const height = Number(bbox.height ?? bbox.Height ?? 0);

  const x1 = Number(
    bbox.x1 ?? bbox.right ?? bbox.Right ?? (width ? x0 + width : x0),
  );

  const y1 = Number(
    bbox.y1 ?? bbox.bottom ?? bbox.Bottom ?? (height ? y0 + height : y0),
  );

  if (!Number.isFinite(x0) || !Number.isFinite(y0)) return null;
  if (!Number.isFinite(x1) || !Number.isFinite(y1)) return null;
  if (x1 <= x0 || y1 <= y0) return null;

  return { x0, y0, x1, y1 };
}

function unionBBox(words: OCRWord[]): BBox {
  return {
    x0: Math.min(...words.map((word) => word.bbox.x0)),
    y0: Math.min(...words.map((word) => word.bbox.y0)),
    x1: Math.max(...words.map((word) => word.bbox.x1)),
    y1: Math.max(...words.map((word) => word.bbox.y1)),
  };
}

function averageConfidence(words: OCRWord[]): number {
  if (words.length === 0) return 0;

  return words.reduce((sum, word) => sum + word.confidence, 0) / words.length;
}

function makeDetectionId(
  pageNumber: number,
  code: string,
  bbox: BBox,
  index: number,
): string {
  return [
    'det',
    pageNumber,
    code,
    Math.round(bbox.x0),
    Math.round(bbox.y0),
    Math.round(bbox.x1),
    Math.round(bbox.y1),
    index,
  ].join('-');
}

function buildOCRResult(
  words: OCRWord[],
  pageNumber: number,
  targetCodes: string[],
): OCRResult {
  const targetSet = makeTargetSet(targetCodes);

  const allWords = words.map((word) => ({
    ...word,
    isMatch: targetSet.has(word.normalizedText),
  }));

  const detections: Detection[] = [];
  const seen = new Set<string>();

  const addDetection = (
    code: string,
    rawText: string,
    confidence: number,
    bbox: BBox,
  ) => {
    const key = [
      code,
      Math.round(bbox.x0),
      Math.round(bbox.y0),
      Math.round(bbox.x1),
      Math.round(bbox.y1),
    ].join('|');

    if (seen.has(key)) return;

    seen.add(key);

    detections.push({
      id: makeDetectionId(pageNumber, code, bbox, detections.length),
      code,
      rawText,
      confidence,
      bbox,
      page: pageNumber,
      pageNumber,
    });
  };

  // Single-word matches: LF1, LF2, A1, S3, etc.
  for (const word of allWords) {
    if (targetSet.has(word.normalizedText)) {
      addDetection(
        word.normalizedText,
        word.text,
        word.confidence,
        word.bbox,
      );
    }
  }

  // Multi-word matches: OCR may split "LF1" into "LF" + "1",
  // or "LF7-X" into "LF7" + "X".
  for (let i = 0; i < allWords.length; i++) {
    for (let span = 2; span <= 3; span++) {
      const group = allWords.slice(i, i + span);
      if (group.length !== span) continue;

      const joinedNoSpace = group.map((word) => word.text).join('');
      const joinedSpace = group.map((word) => word.text).join(' ');
      const joinedDash = group.map((word) => word.text).join('-');

      const candidates = [joinedNoSpace, joinedSpace, joinedDash];

      for (const candidate of candidates) {
        const normalized = normalizeOCRText(candidate);

        if (targetSet.has(normalized)) {
          addDetection(
            normalized,
            joinedSpace,
            averageConfidence(group),
            unionBBox(group),
          );
        }
      }
    }
  }

  console.log(
    `[OCR] Page ${pageNumber}: ${allWords.length} words, ${detections.length} matches`,
    detections.map((det) => det.code),
  );

  return {
    detections,
    allWords,
  };
}

async function getTesseractWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      });

      return worker;
    })();
  }

  return workerPromise;
}

export async function terminateTesseract() {
  if (!workerPromise) return;

  try {
    const worker = await workerPromise;
    await worker.terminate();
  } finally {
    workerPromise = null;
  }
}

export async function terminateWorkers() {
  await terminateTesseract();
}

export async function runTesseractOCR(
  imageDataUrl: string,
  pageNumber: number,
  targetCodes: string[] = [],
): Promise<OCRResult> {
  const worker = await getTesseractWorker();

  const result = await worker.recognize(imageDataUrl);

  const words: OCRWord[] = (result.data.words ?? [])
    .map((word: any) => {
      const text = String(word.text ?? '').trim();
      const bbox = getBBoxFromWord(word);

      if (!text || !bbox) return null;

      return {
        text,
        normalizedText: normalizeOCRText(text),
        confidence: Number(word.confidence ?? word.conf ?? 0),
        bbox,
        page: pageNumber,
        pageNumber,
        isMatch: false,
      };
    })
    .filter(Boolean) as OCRWord[];

  return buildOCRResult(words, pageNumber, targetCodes);
}

function parseOCRSpaceWords(payload: any, pageNumber: number): OCRWord[] {
  const directWords = payload.allWords ?? payload.words;

  if (Array.isArray(directWords)) {
    return directWords
      .map((word: any) => {
        const text = String(
          word.text ?? word.WordText ?? word.wordText ?? '',
        ).trim();

        const bbox = getBBoxFromWord(word);

        if (!text || !bbox) return null;

        return {
          text,
          normalizedText: normalizeOCRText(text),
          confidence: Number(
            word.confidence ?? word.Confidence ?? word.conf ?? 0,
          ),
          bbox,
          page: pageNumber,
          pageNumber,
          isMatch: false,
        };
      })
      .filter(Boolean) as OCRWord[];
  }

  const parsedResults = payload.ParsedResults ?? payload.parsedResults ?? [];
  const words: OCRWord[] = [];

  for (const result of parsedResults) {
    const lines = result.TextOverlay?.Lines ?? [];

    for (const line of lines) {
      const lineWords = line.Words ?? [];

      for (const word of lineWords) {
        const text = String(word.WordText ?? '').trim();

        if (!text) continue;

        const x0 = Number(word.Left ?? 0);
        const y0 = Number(word.Top ?? 0);
        const width = Number(word.Width ?? 0);
        const height = Number(word.Height ?? 0);

        if (width <= 0 || height <= 0) continue;

        words.push({
          text,
          normalizedText: normalizeOCRText(text),
          confidence: Number(word.Confidence ?? 0),
          bbox: {
            x0,
            y0,
            x1: x0 + width,
            y1: y0 + height,
          },
          page: pageNumber,
          pageNumber,
          isMatch: false,
        });
      }
    }
  }

  return words;
}

export async function runOCRSpaceAPI(
  imageDataUrl: string,
  pageNumber: number,
  targetCodes: string[] = [],
): Promise<OCRResult> {
  const response = await fetch('/api/ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: imageDataUrl,
      imageDataUrl,
      pageNumber,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error ??
        payload?.message ??
        `OCR.space request failed with status ${response.status}`,
    );
  }

  const words = parseOCRSpaceWords(payload, pageNumber);

  return buildOCRResult(words, pageNumber, targetCodes);
}