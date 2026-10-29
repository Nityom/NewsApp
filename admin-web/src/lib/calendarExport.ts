import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import type { CalendarMonth, CalendarProject } from '../types/calendar';

export interface CalendarExportProgress {
  current: number;
  total: number;
  status: string;
}

/**
 * Ensures all images inside the calendar sheet are loaded before capture
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
          // fallback
        }
      }
      return new Promise<void>((resolve) => {
        const timer = setTimeout(() => resolve(), 3000);
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
 * Exports a single calendar month sheet as a high-resolution PNG image
 */
export async function exportCalendarMonthAsImage(
  elementOrId: HTMLElement | string,
  fileName: string = 'calendar-month.png'
): Promise<void> {
  const element =
    typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) throw new Error('Calendar sheet element not found');

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

  await waitForImagesToLoad(element);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 5000,
  });

  const link = document.createElement('a');
  link.download = fileName;
  link.href = canvas.toDataURL('image/png', 0.95);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports a single calendar month sheet as an A4 PDF document
 */
export async function exportCalendarMonthAsPdf(
  elementOrId: HTMLElement | string,
  fileName: string = 'calendar-month.pdf'
): Promise<void> {
  const element =
    typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) throw new Error('Calendar sheet element not found');

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

  await waitForImagesToLoad(element);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 5000,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  pdf.save(fileName);
}

/**
 * Exports the entire multi-month Calendar Project as a unified A4 PDF
 */
export async function exportFullCalendarAsPdf(
  calendar: CalendarProject,
  renderMonthFn: (month: CalendarMonth) => Promise<HTMLElement>,
  onProgress?: (progress: CalendarExportProgress) => void,
  fileName: string = 'Full-Calendar-2026.pdf'
): Promise<void> {
  const total = calendar.months.length;
  if (total === 0) throw new Error('No months found to export');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  for (let i = 0; i < total; i++) {
    const month = calendar.months[i];
    onProgress?.({
      current: i + 1,
      total,
      status: `Generating page ${i + 1} of ${total}: ${month.monthName}...`,
    });

    const element = await renderMonthFn(month);
    await waitForImagesToLoad(element);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 5000,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  }

  onProgress?.({
    current: total,
    total,
    status: 'Finalizing PDF document...',
  });

  pdf.save(fileName);
}
