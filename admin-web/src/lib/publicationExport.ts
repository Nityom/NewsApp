import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import type { Publication } from '../types/publication';

export interface ExportProgress {
  current: number;
  total: number;
  status: string;
}

/**
 * Ensures all images inside an element are fully loaded before capturing
 */
async function waitForImagesToLoad(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      if (img.complete && img.naturalWidth > 0) return;
      if (typeof img.decode === 'function') {
        try {
          await img.decode();
          return;
        } catch {
          // fallback to load listener if decode fails
        }
      }
      return new Promise<void>((resolve) => {
        const timer = setTimeout(() => resolve(), 2500);
        img.addEventListener('load', () => {
          clearTimeout(timer);
          resolve();
        }, { once: true });
        img.addEventListener('error', () => {
          clearTimeout(timer);
          resolve();
        }, { once: true });
      });
    })
  );
}

/**
 * Downloads a single page as a high-resolution PNG image (ideal for WhatsApp / Social media)
 */
export async function exportPageAsImage(
  elementOrId: HTMLElement | string,
  fileName: string = 'publication-page.png'
): Promise<void> {
  const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) throw new Error('Preview element not found');

  if (document.fonts) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch {
      // ignore font loading error
    }
  }

  await waitForImagesToLoad(element);

  const canvas = await html2canvas(element, {
    scale: 2, // High resolution (300 DPI equivalent)
    useCORS: true,
    allowTaint: false, // Must be false so toDataURL never throws SecurityError
    backgroundColor: '#fffdf5',
    logging: false,
    width: 595,
    height: 842,
    scrollX: 0,
    scrollY: 0,
    x: 0,
    y: 0,
    windowWidth: 595,
    windowHeight: 842,
  });

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  link.href = dataUrl;
  link.click();
}

/**
 * Generates and downloads a complete multi-page A4 PDF booklet
 */
export async function exportBookletPDF(
  publication: Publication,
  renderPageFunction: (pageIndex: number) => Promise<HTMLElement | null>,
  onProgress?: (progress: ExportProgress) => void
): Promise<void> {
  const total = publication.pages.length;
  if (total === 0) throw new Error('Publication has no pages');

  if (document.fonts) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch {
      // ignore
    }
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < total; i++) {
    const page = publication.pages[i];
    onProgress?.({
      current: i + 1,
      total,
      status: `Generating: Page ${i + 1} of ${total} (${page.title || 'Page'})...`,
    });

    const element = await renderPageFunction(i);
    if (!element) {
      console.warn(`Could not find render element for page ${i + 1}`);
      continue;
    }

    // Wait for images inside element to be loaded
    await waitForImagesToLoad(element);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#fffdf5',
      logging: false,
      width: 595,
      height: 842,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      windowWidth: 595,
      windowHeight: 842,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    // A4 dimensions are 210mm x 297mm
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }

  onProgress?.({
    current: total,
    total,
    status: 'Saving PDF document...',
  });

  const sanitizedTitle = (publication.title || 'Publication').replace(/[/\\?%*:|"<>]/g, '-');
  pdf.save(`${sanitizedTitle}.pdf`);
}
