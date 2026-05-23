import { NextRequest, NextResponse } from 'next/server';
console.log('[OCR] /api/ocr called');
console.log('[OCR] Has OCR_SPACE_API_KEY:', Boolean(process.env.OCR_SPACE_API_KEY));
/**
 * POST /api/ocr
 *
 * Body: { base64Image: string, pageNumber: number }
 * Returns: { words: Array<{ text, bbox, confidence }>, pageNumber }
 *
 * Requires: OCR_SPACE_API_KEY env variable.
 * Free API key at https://ocr.space/ocrapi/freekey
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.OCR_SPACE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'OCR_SPACE_API_KEY is not configured. Add it to your .env.local file. ' +
          'Get a free key at https://ocr.space/ocrapi/freekey',
      },
      { status: 400 },
    );
  }

  let base64Image: string;
  let pageNumber: number;

  try {
    const body = await request.json();
    base64Image = body.base64Image;
    pageNumber = body.pageNumber ?? 1;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const formData = new FormData();
  formData.append('base64Image', `data:image/png;base64,${base64Image}`);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'true');  // Required to get word-level bboxes
  formData.append('detectOrientation', 'false');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2'); // Engine 2 handles small/printed text better

  let ocrData: any;
console.log('[OCR] Sending request to OCR.space');
  try {
    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { apikey: apiKey },
      body: formData,
    });
    ocrData = await ocrResponse.json();
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to contact OCR.space: ${String(err)}` },
      { status: 502 },
    );
  }

  if (ocrData?.IsErroredOnProcessing) {
    return NextResponse.json(
      { error: ocrData.ErrorMessage ?? 'OCR.space processing error' },
      { status: 422 },
    );
  }

  // Parse OCR.space word overlay format into our normalised word schema.
  const words: Array<{
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    confidence: number;
  }> = [];

  const parsedResult = ocrData?.ParsedResults?.[0];
  const lines = parsedResult?.TextOverlay?.Lines ?? [];

  for (const line of lines) {
    for (const word of line.Words ?? []) {
      if (!word.WordText?.trim()) continue;
      words.push({
        text: word.WordText,
        bbox: {
          x0: Math.round(word.Left),
          y0: Math.round(word.Top),
          x1: Math.round(word.Left + word.Width),
          y1: Math.round(word.Top + word.Height),
        },
        confidence: parsedResult?.MeanConfidence ?? 90,
      });
    }
  }

  console.log(
    `[OCR.space] Page ${pageNumber}: ${words.length} words extracted`,
    words.map((w) => w.text),
  );

  return NextResponse.json({ words, pageNumber });
}
