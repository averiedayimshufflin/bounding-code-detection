# Plan Code Scanner — OCR Bounding Boxes

A production-quality web app that scans every page of a multi-page PDF plan, detects the codes you type in using OCR, and draws precise bounding boxes over every occurrence.

![Plan Code Scanner preview](public/preview-placeholder.png)

---

## Features

- **Multi-page PDF support** — renders and processes every page, not just page 1
- **Editable target code list** — type comma-, space-, or line-separated codes before uploading
- **Parallel browser-based OCR** — Tesseract.js runs multiple workers in the browser; no data leaves your machine
- **Visual bounding boxes** — each detected code is highlighted with a labelled coloured box on the correct page
- **Smart normalisation** — corrects common OCR mistakes (`LFI→LF1`, `LFIO→LF10`, `LF7X→LF7-X`, etc.)
- **Sidebar with code summary** — see per-code counts, pages, and exact pixel coordinates
- **Debug mode** — overlay all OCR words (not just matches) in yellow for troubleshooting
- **Page thumbnail strip** — jump between pages with detection counts shown on thumbnails
- **Settings panel** — choose OCR engine, render scale, and debug mode before processing
- **Optional OCR.space** — server-side API route for higher accuracy on small/dense text

---

## Target codes

The app opens with LF fixture codes as an example, but you can replace them with any plan codes before uploading:

```text
LF1, LF2, LF7-X, A1, S3
```

---

## Quick start

### 1. Clone and install

```bash
git clone <your-repo-url> lf-ocr-app
cd lf-ocr-app
npm install --legacy-peer-deps
```

### 2. Environment variables (optional)

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Optional — only needed if you select the "OCR.space" engine in settings.
# Free key at https://ocr.space/ocrapi/freekey
OCR_SPACE_API_KEY=your_key_here
```

The app works without any env variable using Tesseract.js.

### 3. Run locally

```bash
npm run dev
# → http://localhost:3000
```

### 4. Build for production

```bash
npm run build
npm run start
```

---

## OCR engines

### Tesseract.js (default — free, no key needed)

- Runs entirely in the browser via WebAssembly
- Uses a bounded worker pool (up to 4 workers, based on CPU cores and page count)
- Uses PSM 11 (Sparse Text) mode — ideal for scattered codes on engineering plans
- Character whitelist is generated from your typed code list to reduce false positives
- Multi-page PDFs process several pages at once instead of one page at a time

### OCR.space (optional — better on tiny/dense text)

- Server-side API route at `/api/ocr`
- Uses OCR Engine 2 which handles printed small text better
- Free tier: 25 000 requests/month, 1 MB image limit
- Select "☁️ OCR.space" in the settings panel (gear icon)
- Requires `OCR_SPACE_API_KEY` in `.env.local`
- Requests are queued with bounded concurrency so multi-page plans do not wait on one page at a time

---

## Render scale

| Scale | Resolution (A1 plan ~594×841mm) | OCR quality | Speed |
|-------|----------------------------------|-------------|-------|
| 1.5×  | ~846×1191 px                    | ⚠️ OK       | Fast  |
| 2.5×  | ~1410×1985 px (**default**)     | ✅ Good     | Medium|
| 3.5×  | ~1974×2779 px                   | ✅ Great    | Slow  |
| 4×    | ~2256×3176 px                   | ✅ Best     | Slow  |

---

## OCR normalisation rules

| Raw OCR token | Normalised to |
|---------------|---------------|
| `LFI`         | `LF1`         |
| `LF\|`        | `LF1`         |
| `LFl`         | `LF1`         |
| `LFIO`        | `LF10`        |
| `LF1O`        | `LF10`        |
| `LF7X`        | `LF7-X`       |
| `LF7–X`       | `LF7-X`       |
| `LF 3`        | `LF3`         |

---

## Project structure

```
lf-ocr-app/
├── app/
│   ├── layout.tsx            Root layout
│   ├── page.tsx              Entry point
│   ├── globals.css           Tailwind + custom animations
│   └── api/ocr/route.ts     Optional OCR.space server route
├── components/
│   ├── MainApp.tsx           Orchestration, state machine
│   ├── FileUpload.tsx        Drag-and-drop upload UI
│   ├── PageViewer.tsx        PDF page + SVG bbox overlay
│   ├── DetectionSidebar.tsx  Code list, summary, controls
│   └── ProgressIndicator.tsx Processing progress bar
├── lib/
│   ├── pdfProcessor.ts       pdfjs-dist rendering helpers
│   ├── ocrProcessor.ts       Tesseract.js + OCR.space callers
│   └── textNormalizer.ts     Target code parsing, matching, and normalisation
├── types/index.ts            Shared TypeScript types
├── vercel.json               Vercel deployment config
└── .env.example              Environment variable template
```

---

## Deploying to Vercel

### Option A — Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option B — GitHub integration

1. Push your repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) → import your repo
3. Framework preset: **Next.js** (auto-detected)
4. Add environment variables in the Vercel dashboard (if using OCR.space):
   - Key: `OCR_SPACE_API_KEY`  Value: `your_key`
5. Click **Deploy**

> No special build settings needed — `vercel.json` handles everything.

---

## Troubleshooting

### "No codes detected" on a page

1. Enable **debug mode** (⚙️ → Debug ON or sidebar footer button) — you'll see yellow outlines around every word Tesseract found.
2. If few words appear, try increasing the **Render scale** to 3× or 4×.
3. If the plan has very small text, switch to the **OCR.space** engine.
4. Open the browser console — every page logs `[OCR] Page N: X words` and matched codes.

### OCR.space API errors

- Check `OCR_SPACE_API_KEY` is set correctly in `.env.local`
- Free tier images must be < 1 MB; reduce render scale to 1.5× if hitting limits
- OCR.space returns coordinates relative to the image pixel dimensions

### PDF doesn't load

- Confirm the file is a true PDF (`Content-Type: application/pdf`), not a renamed image
- Password-protected PDFs are not supported
- Very large files (> 50 MB) are blocked client-side

### Vercel timeout on large PDFs

- OCR happens **client-side** (Tesseract) — Vercel timeouts don't affect it
- The `/api/ocr` route (OCR.space only) is set to 30 s max duration in `vercel.json`

---

## Tech stack

| Layer       | Library              | Version  |
|-------------|----------------------|----------|
| Framework   | Next.js              | 14.2     |
| Language    | TypeScript           | 5        |
| Styling     | Tailwind CSS         | 3.4      |
| PDF render  | pdfjs-dist           | 3.11.174 |
| OCR (free)  | Tesseract.js         | 5.1      |
| OCR (opt.)  | OCR.space API        | —        |
| Icons       | Lucide React         | 0.400    |

---

## Licence

MIT
