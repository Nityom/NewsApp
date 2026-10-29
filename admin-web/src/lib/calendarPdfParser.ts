import * as pdfjsLib from 'pdfjs-dist';

// Set worker source using CDN to ensure no 404 or worker bundler mismatch
try {
  const version = pdfjsLib.version || '6.4.299';
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF.js worker initialization fallback:', e);
}

/**
 * Extracts each page of a PDF file as a high-resolution PNG data URL.
 * Scale of 2.0 ensures crisp text and graphics on A4 printing.
 */
export async function renderPdfPagesToImages(
  source: File | ArrayBuffer,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const arrayBuffer =
    source instanceof File ? await source.arrayBuffer() : source;

  const version = pdfjsLib.version || '6.4.299';
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/cmaps/`,
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pageImages: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(pageNum, numPages);
    const page = await pdf.getPage(pageNum);

    // Render at scale 2.0 for high resolution print quality
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    const renderContext = {
      canvasContext: ctx,
      viewport,
      canvas,
    };

    await page.render(renderContext).promise;
    pageImages.push(canvas.toDataURL('image/png', 0.95));
  }

  return pageImages;
}

/**
 * Reads a single image File (PNG, JPG, WebP) as a data URL.
 */
export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
