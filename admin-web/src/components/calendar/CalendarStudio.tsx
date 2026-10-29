import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  Image as ImageIcon,
  Layers,
  Plus,
  RefreshCw,
  Sliders,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  CalendarAdElement,
  CalendarAdPlacement,
  CalendarMonth,
  CalendarProject,
} from '../../types/calendar';
import { ENGLISH_MONTHS } from '../../types/calendar';
import {
  deleteCalendar,
  duplicateCalendar,
  getAllCalendars,
  saveCalendar,
} from '../../lib/calendarStorage';
import {
  exportCalendarMonthAsImage,
  exportCalendarMonthAsPdf,
  exportFullCalendarAsPdf,
  type CalendarExportProgress,
} from '../../lib/calendarExport';
import {
  readImageFileAsDataUrl,
  renderPdfPagesToImages,
} from '../../lib/calendarPdfParser';
import { CalendarSheet } from './CalendarSheet';
import { CalendarListModal } from './CalendarListModal';

export const CalendarStudio: React.FC = () => {
  const [calendars, setCalendars] = useState<CalendarProject[]>([]);
  const [activeCalendar, setActiveCalendar] = useState<CalendarProject | null>(null);
  const [activeMonthIndex, setActiveMonthIndex] = useState<number>(0);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(0.85);
  const [isListModalOpen, setIsListModalOpen] = useState<boolean>(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState<boolean>(false);
  const [pdfExtractionStatus, setPdfExtractionStatus] = useState<string>('');

  // UI Navigation & Dropdown State
  const [inspectorTab, setInspectorTab] = useState<'ads' | 'layout'>('ads');
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState<boolean>(false);
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState<boolean>(false);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<CalendarExportProgress | null>(null);
  const [stagingMonth, setStagingMonth] = useState<CalendarMonth | null>(null);

  const stagingContainerRef = useRef<HTMLDivElement>(null);

  const loadCalendars = React.useCallback(async () => {
    try {
      const list = await getAllCalendars();
      setCalendars(list);
      if (list.length > 0) {
        setActiveCalendar((prev) => (prev ? list.find((c) => c.id === prev.id) || list[0] : list[0]));
      }
    } catch (err) {
      console.error('Failed to load calendars:', err);
    }
  }, []);

  useEffect(() => {
    void loadCalendars();
  }, [loadCalendars]);

  const handleDuplicateCalendar = async (id: string) => {
    const cloned = await duplicateCalendar(id);
    if (cloned) {
      await loadCalendars();
      setActiveCalendar(cloned);
      setActiveMonthIndex(0);
      setSelectedAdId(null);
    }
  };

  const handleDeleteCalendar = async (id: string) => {
    if (confirm('Delete this calendar project? This cannot be undone.')) {
      await deleteCalendar(id);
      await loadCalendars();
      if (activeCalendar?.id === id) {
        const remaining = calendars.filter((c) => c.id !== id);
        setActiveCalendar(remaining[0] || null);
        setActiveMonthIndex(0);
        setSelectedAdId(null);
      }
    }
  };

  const handleCreateNewCalendar = async () => {
    const title = prompt('Enter Calendar Title:', 'Education News Calendar 2026') || 'New Calendar 2026';
    const newCal: CalendarProject = {
      id: `cal_${Date.now()}`,
      title,
      year: 2026,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      months: ENGLISH_MONTHS.map((monthName, idx) => ({
        id: `m_${Date.now()}_${idx}`,
        monthIndex: idx,
        monthName,
        backgroundImageUrl: '',
        ads: [],
        outerBorderWidth: 160,
        outerBorderHeight: 80,
        showLeftBorder: true,
        showRightBorder: true,
        showTopBorder: true,
        showBottomBorder: true,
      })),
    };

    await saveCalendar(newCal);
    await loadCalendars();
    setActiveCalendar(newCal);
    setActiveMonthIndex(0);
  };

  // Active Month & Active Ad Helpers
  const currentMonth = activeCalendar?.months[activeMonthIndex] || null;
  const selectedAd = currentMonth?.ads.find((a) => a.id === selectedAdId) || null;

  const updateCurrentMonth = (updater: (prev: CalendarMonth) => CalendarMonth) => {
    if (!activeCalendar || !currentMonth) return;
    const updatedMonth = updater(currentMonth);
    const updatedMonths = [...activeCalendar.months];
    updatedMonths[activeMonthIndex] = updatedMonth;

    const updatedCal: CalendarProject = {
      ...activeCalendar,
      months: updatedMonths,
      updatedAt: Date.now(),
    };

    setActiveCalendar(updatedCal);
    void saveCalendar(updatedCal);
  };

  // 1-Click Preset Border Ad Adders
  const handleAddPresetAd = (type: CalendarAdPlacement, zone: 'inner' | 'outer' = 'inner') => {
    if (!currentMonth) return;

    const hasLeft = currentMonth.showLeftBorder ?? (currentMonth.outerBorderWidth === undefined || currentMonth.outerBorderWidth > 0);
    const hasRight = currentMonth.showRightBorder ?? (currentMonth.outerBorderWidth === undefined || currentMonth.outerBorderWidth > 0);
    const hasTop = currentMonth.showTopBorder ?? (currentMonth.outerBorderHeight === undefined || currentMonth.outerBorderHeight > 0);
    const hasBottom = currentMonth.showBottomBorder ?? (currentMonth.outerBorderHeight === undefined || currentMonth.outerBorderHeight > 0);

    const bLeft = hasLeft ? (currentMonth.outerBorderLeft ?? currentMonth.outerBorderWidth ?? 160) : 0;
    const bRight = hasRight ? (currentMonth.outerBorderRight ?? currentMonth.outerBorderWidth ?? 160) : 0;
    const bTop = hasTop ? (currentMonth.outerBorderTop ?? currentMonth.outerBorderHeight ?? 80) : 0;
    const bBottom = hasBottom ? (currentMonth.outerBorderBottom ?? currentMonth.outerBorderHeight ?? 80) : 0;

    const totalW = 595 + bLeft + bRight;
    const totalH = 842 + bTop + bBottom;

    let coords = { x: 50, y: 50, width: 200, height: 100, label: 'Ad Banner' };

    if (zone === 'outer') {
      switch (type) {
        case 'top_banner':
          coords = { x: 0, y: 0, width: totalW, height: bTop > 0 ? bTop : 80, label: 'Top Border Ad' };
          break;
        case 'bottom_strip':
          coords = {
            x: 0,
            y: totalH - (bBottom > 0 ? bBottom : 80),
            width: totalW,
            height: bBottom > 0 ? bBottom : 80,
            label: 'Bottom Border Ad',
          };
          break;
        case 'left_column':
          coords = { x: 0, y: bTop, width: bLeft > 0 ? bLeft : 160, height: 842, label: 'Left Column Ad' };
          break;
        case 'right_column':
          coords = {
            x: bLeft + 595,
            y: bTop,
            width: bRight > 0 ? bRight : 160,
            height: 842,
            label: 'Right Column Ad',
          };
          break;
        default:
          coords = {
            x: 10,
            y: 10,
            width: bLeft > 0 ? bLeft - 20 : 140,
            height: 120,
            label: 'Outer Border Ad',
          };
          break;
      }
    } else {
      switch (type) {
        case 'top_banner':
          coords = { x: 0, y: 0, width: 595, height: 75, label: 'Top Masthead Banner' };
          break;
        case 'right_column':
          coords = { x: 450, y: 140, width: 145, height: 220, label: 'Right Sidebar Ad' };
          break;
        case 'left_column':
          coords = { x: 0, y: 140, width: 145, height: 220, label: 'Left Sidebar Ad' };
          break;
        case 'bottom_strip':
          coords = { x: 0, y: 670, width: 595, height: 172, label: 'Bottom Strip Ad' };
          break;
        case 'empty_cell':
          coords = { x: 75, y: 220, width: 115, height: 90, label: 'Empty Grid Cell Ad' };
          break;
        case 'custom':
        default:
          coords = { x: 180, y: 350, width: 240, height: 140, label: 'Custom Sponsor Ad' };
          break;
      }
    }

    const newAd: CalendarAdElement = {
      id: `ad_${Date.now()}`,
      x: coords.x,
      y: coords.y,
      width: coords.width,
      height: coords.height,
      label: coords.label,
      imageUrl: '',
      fit: 'fill',
      placementType: type,
      zone,
      zIndex: zone === 'outer' ? 30 : 20,
    };

    updateCurrentMonth((m) => ({
      ...m,
      ads: [...m.ads, newAd],
    }));

    setSelectedAdId(newAd.id);
  };

  // Update Ad Coordinates (from react-rnd drag & resize)
  const handleUpdateAdCoords = (
    adId: string,
    coords: { x: number; y: number; width: number; height: number }
  ) => {
    updateCurrentMonth((m) => ({
      ...m,
      ads: m.ads.map((ad) => (ad.id === adId ? { ...ad, ...coords } : ad)),
    }));
  };

  // Delete Ad
  const handleDeleteAd = (adId: string) => {
    updateCurrentMonth((m) => ({
      ...m,
      ads: m.ads.filter((ad) => ad.id !== adId),
    }));
    if (selectedAdId === adId) {
      setSelectedAdId(null);
    }
  };

  // Upload or Add Multiple Ad Images for Auto-Scrolling Slideshow
  const handleUploadAdImages = async (e: React.ChangeEvent<HTMLInputElement>, adId: string) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    try {
      const files = Array.from(fileList);
      const dataUrls = await Promise.all(files.map(readImageFileAsDataUrl));

      updateCurrentMonth((m) => ({
        ...m,
        ads: m.ads.map((ad) => {
          if (ad.id !== adId) return ad;
          const currentImages = (ad.images && ad.images.length > 0)
            ? ad.images
            : (ad.imageUrl ? [ad.imageUrl] : []);
          const updated = [...currentImages, ...dataUrls];
          return {
            ...ad,
            images: updated,
            imageUrl: updated[0] || ad.imageUrl,
            scrollInterval: ad.scrollInterval ?? 3.5,
            scrollMode: ad.scrollMode ?? 'carousel',
            label: ad.label || files[0].name.replace(/\.[^/.]+$/, ''),
          };
        }),
      }));
    } catch (err) {
      console.error('Failed to read ad image(s):', err);
      alert('Could not read the uploaded ad image file(s).');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveAdImage = (adId: string, imageIndex: number) => {
    updateCurrentMonth((m) => ({
      ...m,
      ads: m.ads.map((ad) => {
        if (ad.id !== adId) return ad;
        const currentList = (ad.images && ad.images.length > 0)
          ? ad.images
          : (ad.imageUrl ? [ad.imageUrl] : []);
        const filtered = currentList.filter((_, idx) => idx !== imageIndex);
        return {
          ...ad,
          images: filtered,
          imageUrl: filtered[0] || '',
        };
      }),
    }));
  };

  const handleSetAdAutoScroll = (
    adId: string,
    updates: { scrollInterval?: number; scrollMode?: 'carousel' | 'marquee' }
  ) => {
    updateCurrentMonth((m) => ({
      ...m,
      ads: m.ads.map((ad) => (ad.id === adId ? { ...ad, ...updates } : ad)),
    }));
  };


  // Unified File Upload Handler for Current Month Background
  const handleUploadFile = async (file: File) => {
    if (!activeCalendar || !currentMonth) return;

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      // PDF: extract first page for this month
      try {
        setIsExtractingPdf(true);
        setPdfExtractionStatus('Rendering PDF page for this month...');
        const pages = await renderPdfPagesToImages(file);
        if (pages.length > 0) {
          updateCurrentMonth((m) => ({
            ...m,
            backgroundImageUrl: pages[0],
          }));
        } else {
          alert('No pages found in the uploaded PDF.');
        }
      } catch (err: any) {
        console.error('PDF extraction error:', err);
        alert('Failed to extract page from PDF: ' + (err?.message || 'Check PDF file'));
      } finally {
        setIsExtractingPdf(false);
      }
    } else {
      // Direct image
      try {
        const dataUrl = await readImageFileAsDataUrl(file);
        updateCurrentMonth((m) => ({
          ...m,
          backgroundImageUrl: dataUrl,
        }));
      } catch (err: any) {
        console.error('Image read error:', err);
        alert('Failed to read image file: ' + (err?.message || 'Check image format'));
      }
    }
  };

  // Upload Background for Current Month via Input
  const handleUploadMonthBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleUploadFile(file);
    }
    e.target.value = '';
  };

  // Auto-Extract ALL 12 Months from a Multi-Page PDF
  const handleImportFullCalendarPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCalendar) return;

    try {
      setIsExtractingPdf(true);
      setPdfExtractionStatus('Processing 12-month PDF...');

      const pageImages = await renderPdfPagesToImages(file, (curr, tot) => {
        setPdfExtractionStatus(`Extracting page ${curr} of ${tot}...`);
      });

      if (pageImages.length === 0) {
        alert('No pages found in the PDF.');
        return;
      }

      // Map each extracted page to months
      const updatedMonths = activeCalendar.months.map((m, idx) => {
        if (idx < pageImages.length) {
          return {
            ...m,
            backgroundImageUrl: pageImages[idx],
          };
        }
        return m;
      });

      const updatedCal: CalendarProject = {
        ...activeCalendar,
        months: updatedMonths,
        updatedAt: Date.now(),
      };

      setActiveCalendar(updatedCal);
      await saveCalendar(updatedCal);
      alert(`Successfully imported ${Math.min(pageImages.length, 12)} calendar pages!`);
    } catch (err) {
      console.error('Failed to import full calendar PDF:', err);
      alert('Could not extract pages from PDF.');
    } finally {
      setIsExtractingPdf(false);
      setPdfExtractionStatus('');
    }
  };

  // Pre-load default Bhalerao PDF from public directory with 1 click
  const handleLoadSampleBhaleraoPdf = async () => {
    if (!activeCalendar) return;
    try {
      setIsExtractingPdf(true);
      setPdfExtractionStatus('Loading Bhalerao Calendar A4.pdf from library...');
      const response = await fetch('/bhalerao calender A4.pdf');
      const buffer = await response.arrayBuffer();

      const pageImages = await renderPdfPagesToImages(buffer, (curr, tot) => {
        setPdfExtractionStatus(`Rendering Bhalerao page ${curr} of ${tot}...`);
      });

      const updatedMonths = activeCalendar.months.map((m, idx) => {
        if (idx < pageImages.length) {
          return {
            ...m,
            backgroundImageUrl: pageImages[idx],
          };
        }
        return m;
      });

      const updatedCal: CalendarProject = {
        ...activeCalendar,
        title: 'Bhalerao Calendar 2026',
        months: updatedMonths,
        updatedAt: Date.now(),
      };

      setActiveCalendar(updatedCal);
      await saveCalendar(updatedCal);
      alert(`Loaded all 12 months from Bhalerao Calendar PDF!`);
    } catch (err) {
      console.error('Failed to load sample PDF:', err);
      alert('Could not load sample PDF.');
    } finally {
      setIsExtractingPdf(false);
      setPdfExtractionStatus('');
    }
  };

  // Export Single Month PNG
  const handleExportMonthPng = async () => {
    if (!currentMonth) return;
    try {
      setIsExporting(true);
      setExportProgress({ current: 1, total: 1, status: `Rendering ${currentMonth.monthName} image...` });
      setStagingMonth(currentMonth);

      // Allow staging render to mount
      await new Promise((r) => setTimeout(r, 400));
      await exportCalendarMonthAsImage('calendar-export-stage-sheet', `${activeCalendar?.title || 'Calendar'}_${currentMonth.monthName}_2026.png`);
    } catch (err) {
      console.error('PNG export failed:', err);
      alert('Failed to export calendar image.');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      setStagingMonth(null);
    }
  };

  // Export Single Month PDF
  const handleExportMonthPdf = async () => {
    if (!currentMonth) return;
    try {
      setIsExporting(true);
      setExportProgress({ current: 1, total: 1, status: `Generating ${currentMonth.monthName} PDF...` });
      setStagingMonth(currentMonth);

      await new Promise((r) => setTimeout(r, 400));
      await exportCalendarMonthAsPdf('calendar-export-stage-sheet', `${activeCalendar?.title || 'Calendar'}_${currentMonth.monthName}_2026.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to export calendar PDF.');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      setStagingMonth(null);
    }
  };

  // Export Full 12 Months Multi-Page PDF
  const handleExportAll12MonthsPdf = async () => {
    if (!activeCalendar) return;
    try {
      setIsExporting(true);
      setExportProgress({ current: 0, total: activeCalendar.months.length, status: 'Starting multi-month PDF export...' });

      await exportFullCalendarAsPdf(
        activeCalendar,
        async (month) => {
          setStagingMonth(month);
          await new Promise((r) => setTimeout(r, 450));
          const el = document.getElementById('calendar-export-stage-sheet');
          if (!el) throw new Error('Staging element not found');
          return el;
        },
        (progress) => setExportProgress(progress),
        `${activeCalendar.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Full_2026.pdf`
      );
    } catch (err) {
      console.error('Full PDF export error:', err);
      alert('Failed to export 12-month PDF.');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      setStagingMonth(null);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-stone-100 overflow-hidden select-none">
      {/* ========================================================
          TOP HEADER & TOOLBAR
          ======================================================== */}
      <header className="bg-white border-b border-stone-200 px-4 py-2 flex items-center justify-between shadow-2xs shrink-0 z-30">
        {/* Left: Branding & Calendar Switcher */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
            <CalendarDays size={18} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsListModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-stone-100 transition-colors group cursor-pointer border border-transparent hover:border-stone-200"
              title="Click to switch or manage previous calendars"
            >
              <span className="text-sm font-black text-stone-900 group-hover:text-red-600 transition-colors">
                {activeCalendar?.title || 'Calendar Studio'}
              </span>
              <ChevronDown size={14} className="text-stone-400 group-hover:text-stone-700 transition-colors" />
            </button>

            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200/80">
              A4 Print
            </span>
          </div>
        </div>

        {/* Center: Clean Zoom Pill */}
        <div className="flex items-center bg-stone-100/90 rounded-lg p-0.5 border border-stone-200/80 shadow-2xs">
          <button
            type="button"
            className="p-1 text-stone-600 hover:text-stone-900 hover:bg-white rounded transition-colors cursor-pointer"
            onClick={() => setScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(2))))}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[11px] font-bold text-stone-700 px-2 min-w-[42px] text-center select-none">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className="p-1 text-stone-600 hover:text-stone-900 hover:bg-white rounded transition-colors cursor-pointer"
            onClick={() => setScale((s) => Math.min(1.6, Number((s + 0.1).toFixed(2))))}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            className="p-1 text-stone-600 hover:text-stone-900 hover:bg-white rounded transition-colors ml-0.5 cursor-pointer"
            onClick={() => setScale(0.85)}
            title="Reset to 85%"
          >
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Right: Actions (Public Link, Import dropdown, Export dropdown, New, Delete) */}
        <div className="flex items-center gap-2 relative">
          {/* Public Link Button */}
          {activeCalendar && (
            <a
              href={`/calendar/${activeCalendar.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="pub-btn pub-btn-secondary text-xs text-blue-700 border-blue-200 hover:bg-blue-50 py-1.5 px-3 flex items-center gap-1.5 font-bold"
              title="Open Public Calendar link for readers & sponsors"
            >
              <ExternalLink size={13} />
              <span>Public Link</span>
            </a>
          )}

          {/* Import Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsImportDropdownOpen((v) => !v);
                setIsExportDropdownOpen(false);
              }}
              className="pub-btn pub-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-semibold"
            >
              <Upload size={13} />
              <span>Import</span>
              <ChevronDown size={12} />
            </button>

            {isImportDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsImportDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <label className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer">
                    <Upload size={14} className="text-red-600 shrink-0" />
                    <div>
                      <div className="font-bold text-stone-800">Upload 12-Month PDF</div>
                      <div className="text-[10px] text-stone-400">Extracts 12 pages automatically</div>
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        setIsImportDropdownOpen(false);
                        handleImportFullCalendarPdf(e);
                      }}
                      disabled={isExtractingPdf}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setIsImportDropdownOpen(false);
                      handleLoadSampleBhaleraoPdf();
                    }}
                    disabled={isExtractingPdf}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                  >
                    <FileText size={14} className="text-amber-600 shrink-0" />
                    <div>
                      <div className="font-bold text-stone-800">Load Bhalerao 2026</div>
                      <div className="text-[10px] text-stone-400">Sample 12-page calendar</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsExportDropdownOpen((v) => !v);
                setIsImportDropdownOpen(false);
              }}
              className="pub-btn pub-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold shadow-xs"
              disabled={isExporting}
            >
              <Download size={13} />
              <span>Export</span>
              <ChevronDown size={12} />
            </button>

            {isExportDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsExportDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportDropdownOpen(false);
                      handleExportAll12MonthsPdf();
                    }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-red-50 hover:text-red-900 cursor-pointer transition-colors"
                  >
                    <Download size={14} className="text-red-600 shrink-0" />
                    <div>
                      <div className="font-bold text-stone-900">Full 12-Month PDF</div>
                      <div className="text-[10px] text-stone-400">Combined high-res document</div>
                    </div>
                  </button>

                  <div className="h-px bg-stone-100 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportDropdownOpen(false);
                      handleExportMonthPdf();
                    }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                  >
                    <FileDown size={14} className="text-stone-600 shrink-0" />
                    <div>
                      <div className="font-bold text-stone-800">Month PDF ({currentMonth?.monthName})</div>
                      <div className="text-[10px] text-stone-400">Single A4 printable page</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportDropdownOpen(false);
                      handleExportMonthPng();
                    }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                  >
                    <ImageIcon size={14} className="text-stone-600 shrink-0" />
                    <div>
                      <div className="font-bold text-stone-800">Month Image (PNG)</div>
                      <div className="text-[10px] text-stone-400">High-res picture file</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* New Calendar */}
          <button
            type="button"
            className="pub-btn pub-btn-secondary text-xs py-1.5 px-2.5"
            onClick={handleCreateNewCalendar}
            title="Create a new calendar project"
          >
            <Plus size={14} />
          </button>

          {/* Delete Calendar */}
          {activeCalendar && (
            <button
              type="button"
              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              onClick={() => handleDeleteCalendar(activeCalendar.id)}
              title="Delete this calendar project"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </header>

      {/* ========================================================
          MONTH SELECTOR TABS (12 MONTHS)
          ======================================================== */}
      <nav className="bg-white border-b border-stone-200 px-3 py-1.5 flex items-center justify-between shrink-0 z-20">
        <button
          type="button"
          onClick={() => {
            setActiveMonthIndex((i) => Math.max(0, i - 1));
            setSelectedAdId(null);
          }}
          disabled={activeMonthIndex === 0}
          className="p-1 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer shrink-0"
          title="Previous Month"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1 overflow-x-auto mx-2 scrollbar-none py-0.5">
          {activeCalendar?.months.map((month, idx) => {
            const isActive = activeMonthIndex === idx;
            const hasBg = Boolean(month.backgroundImageUrl);
            const adCount = month.ads.length;

            return (
              <button
                key={month.id}
                type="button"
                onClick={() => {
                  setActiveMonthIndex(idx);
                  setSelectedAdId(null);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 font-semibold'
                }`}
              >
                <span>{month.monthName.slice(0, 3)}</span>
                {hasBg && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-300' : 'bg-emerald-500'}`}
                    title="Background page ready"
                  />
                )}
                {adCount > 0 && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-white/25 text-white' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {adCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveMonthIndex((i) => Math.min(11, i + 1));
            setSelectedAdId(null);
          }}
          disabled={activeMonthIndex === 11}
          className="p-1 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer shrink-0"
          title="Next Month"
        >
          <ChevronRight size={16} />
        </button>
      </nav>

      {/* ========================================================
          WORKSPACE BODY: WORKSPACE CANVAS & INSPECTOR SIDEBAR
          ======================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. Main Canvas Area */}
        <div className="flex-1 overflow-auto p-8 flex flex-col items-center justify-start relative bg-stone-100/90">
          {/* The Calendar Sheet Page Canvas */}
          {currentMonth ? (
            <div className="relative transition-transform duration-100 ease-out mb-24">
              <CalendarSheet
                month={currentMonth}
                scale={scale}
                interactive={true}
                selectedAdId={selectedAdId}
                onSelectAdId={setSelectedAdId}
                onUpdateAd={handleUpdateAdCoords}
                onDeleteAd={handleDeleteAd}
                onUploadFile={handleUploadFile}
                onUploadBackground={handleUploadMonthBackground}
              />
            </div>
          ) : (
            <div className="text-stone-400 text-sm mt-20">Select a month to start editing</div>
          )}

          {/* Floating Bottom Quick Placement Dock */}
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur shadow-xl border border-stone-200/90 rounded-full px-3.5 py-2 flex items-center gap-2 max-w-2xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 pl-1 hidden sm:inline">
              Place Ad:
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 transition-colors cursor-pointer"
                onClick={() => handleAddPresetAd('top_banner', 'outer')}
                title="Add ad across top outside border"
              >
                Top Border
              </button>
              <button
                type="button"
                className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 transition-colors cursor-pointer"
                onClick={() => handleAddPresetAd('bottom_strip', 'outer')}
                title="Add ad across bottom outside border"
              >
                Bottom Border
              </button>
              <button
                type="button"
                className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 transition-colors cursor-pointer"
                onClick={() => handleAddPresetAd('left_column', 'outer')}
                title="Add ad on left outside column"
              >
                Left Col
              </button>
              <button
                type="button"
                className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 transition-colors cursor-pointer"
                onClick={() => handleAddPresetAd('right_column', 'outer')}
                title="Add ad on right outside column"
              >
                Right Col
              </button>
            </div>

            <div className="h-4 w-px bg-stone-200 mx-0.5" />

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/80 transition-colors cursor-pointer"
                onClick={() => handleAddPresetAd('empty_cell', 'inner')}
                title="Add ad in date cell"
              >
                Date Cell
              </button>
              <button
                type="button"
                className="px-2.5 py-1 text-xs font-bold rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition-colors cursor-pointer"
                onClick={() => handleAddPresetAd('custom', 'inner')}
                title="Free draggable ad box"
              >
                + Free Box
              </button>
            </div>
          </div>
        </div>

        {/* 2. Right Inspector Sidebar */}
        <aside className="w-80 bg-white border-l border-stone-200 flex flex-col shrink-0 shadow-lg z-20 h-full overflow-hidden">
          {selectedAd ? (
            <div className="p-3.5 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-stone-800 m-0">
                  Ad Inspector
                </h2>
                <span className="text-[11px] text-stone-500">
                  {selectedAd.label || 'Selected Sponsor Banner'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAdId(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
                title="Close Inspector"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="border-b border-stone-200 bg-stone-50/60 p-1 flex items-center shrink-0">
              <button
                type="button"
                onClick={() => setInspectorTab('ads')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  inspectorTab === 'ads'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Layers size={13} />
                <span>Ads ({currentMonth?.ads.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('layout')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  inspectorTab === 'layout'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Sliders size={13} />
                <span>Page & Borders</span>
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 pb-16">
            {selectedAd ? (
              <>
                {/* Selected Ad Details */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700 block">Ad Label / Name</label>
                  <input
                    type="text"
                    className="pub-input text-xs"
                    value={selectedAd.label || ''}
                    onChange={(e) => {
                      const newLabel = e.target.value;
                      updateCurrentMonth((m) => ({
                        ...m,
                        ads: m.ads.map((ad) =>
                          ad.id === selectedAd.id ? { ...ad, label: newLabel } : ad
                        ),
                      }));
                    }}
                    placeholder="e.g. Mangala Furniture Ad"
                  />
                </div>

                {/* Multi-Image Ad Manager & Auto-Scroll Setup */}
                <div className="space-y-2.5 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <ImageIcon size={13} className="text-red-600" />
                      <span>
                        Ad Images ({((selectedAd.images && selectedAd.images.length > 0) ? selectedAd.images : (selectedAd.imageUrl ? [selectedAd.imageUrl] : [])).length})
                      </span>
                    </label>
                    <span className="text-[10px] text-stone-500 font-semibold">
                      Auto-scrolls on public link
                    </span>
                  </div>

                  {/* Thumbnails of all uploaded images */}
                  {(() => {
                    const currentImgList = (selectedAd.images && selectedAd.images.length > 0)
                      ? selectedAd.images
                      : (selectedAd.imageUrl ? [selectedAd.imageUrl] : []);

                    return (
                      <div className="space-y-2">
                        {currentImgList.length === 0 ? (
                          <div className="h-24 bg-white rounded-lg border border-dashed border-stone-300 p-2 flex flex-col items-center justify-center text-center">
                            <Upload size={18} className="text-stone-400 mb-1" />
                            <span className="text-xs font-semibold text-stone-600">No ad artwork uploaded</span>
                            <span className="text-[10px] text-stone-400">Upload 1 or multiple sponsor banners</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-0.5">
                            {currentImgList.map((src, idx) => (
                              <div
                                key={idx}
                                className="relative h-20 bg-white rounded-lg border border-stone-200 p-1 flex items-center justify-center overflow-hidden group shadow-2xs"
                              >
                                <img
                                  src={src}
                                  alt={`Slide ${idx + 1}`}
                                  className="max-h-full max-w-full object-contain"
                                />
                                <span className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                                  #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAdImage(selectedAd.id, idx)}
                                  className="absolute top-1 right-1 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                                  title="Remove this image"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Upload More Images Button (supports selecting multiple!) */}
                        <label className="pub-btn pub-btn-secondary w-full text-center cursor-pointer text-xs justify-center font-bold">
                          <Plus size={13} /> {currentImgList.length > 0 ? 'Add More Images (Auto-scrolls)' : 'Upload Ad Image(s)'}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleUploadAdImages(e, selectedAd.id)}
                          />
                        </label>
                      </div>
                    );
                  })()}

                  {/* Auto-Scroll Controls if multiple images are present */}
                  {(((selectedAd.images && selectedAd.images.length > 0) ? selectedAd.images : (selectedAd.imageUrl ? [selectedAd.imageUrl] : [])).length > 1) && (
                    <div className="pt-2 border-t border-stone-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-stone-700">Auto-Scroll Animation</span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                          Active
                        </span>
                      </div>

                      {/* Mode selector: Carousel vs Marquee */}
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          className={`py-1 px-1.5 text-xs font-bold rounded border transition-colors ${
                            (selectedAd.scrollMode || 'carousel') === 'carousel'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                          onClick={() => handleSetAdAutoScroll(selectedAd.id, { scrollMode: 'carousel' })}
                        >
                          Carousel (Fade)
                        </button>
                        <button
                          type="button"
                          className={`py-1 px-1.5 text-xs font-bold rounded border transition-colors ${
                            selectedAd.scrollMode === 'marquee'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                          onClick={() => handleSetAdAutoScroll(selectedAd.id, { scrollMode: 'marquee' })}
                        >
                          Continuous Glide
                        </button>
                      </div>

                      {/* Speed selector */}
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[10px] text-stone-500 font-semibold">Change Speed:</span>
                        <div className="flex items-center gap-1">
                          {[2, 3.5, 5, 8].map((sec) => (
                            <button
                              key={sec}
                              type="button"
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-colors ${
                                (selectedAd.scrollInterval ?? 3.5) === sec
                                  ? 'bg-red-600 text-white border-red-600'
                                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                              }`}
                              onClick={() => handleSetAdAutoScroll(selectedAd.id, { scrollInterval: sec })}
                            >
                              {sec}s
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sizing & Fit Mode */}
                <div className="pub-control-group pt-1">
                  <label className="text-xs font-bold text-stone-700">Scaling & Aspect Fit</label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      className={`pub-btn text-xs py-1 px-1.5 justify-center ${(selectedAd.fit || 'fill') === 'fill' ? 'pub-btn-primary' : 'pub-btn-secondary'}`}
                      onClick={() => {
                        updateCurrentMonth((m) => ({
                          ...m,
                          ads: m.ads.map((ad) =>
                            ad.id === selectedAd.id ? { ...ad, fit: 'fill' } : ad
                          ),
                        }));
                      }}
                      title="Stretch edge-to-edge to fill slot"
                    >
                      Fill
                    </button>
                    <button
                      type="button"
                      className={`pub-btn text-xs py-1 px-1.5 justify-center ${selectedAd.fit === 'cover' ? 'pub-btn-primary' : 'pub-btn-secondary'}`}
                      onClick={() => {
                        updateCurrentMonth((m) => ({
                          ...m,
                          ads: m.ads.map((ad) =>
                            ad.id === selectedAd.id ? { ...ad, fit: 'cover' } : ad
                          ),
                        }));
                      }}
                      title="Crop overflow to fill slot"
                    >
                      Cover
                    </button>
                    <button
                      type="button"
                      className={`pub-btn text-xs py-1 px-1.5 justify-center ${selectedAd.fit === 'contain' ? 'pub-btn-primary' : 'pub-btn-secondary'}`}
                      onClick={() => {
                        updateCurrentMonth((m) => ({
                          ...m,
                          ads: m.ads.map((ad) =>
                            ad.id === selectedAd.id ? { ...ad, fit: 'contain' } : ad
                          ),
                        }));
                      }}
                      title="Fit inside without cropping"
                    >
                      Contain
                    </button>
                  </div>
                </div>

                {/* Quick Border Snap Shortcuts */}
                <div className="pub-control-group pt-1">
                  <label className="text-xs font-bold text-stone-700">Snap to Border</label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                      type="button"
                      className="pub-btn pub-btn-secondary text-[11px] justify-center"
                      onClick={() =>
                        handleUpdateAdCoords(selectedAd.id, {
                          x: 0,
                          y: 0,
                          width: 595,
                          height: 75,
                        })
                      }
                    >
                      📌 Top Border
                    </button>
                    <button
                      type="button"
                      className="pub-btn pub-btn-secondary text-[11px] justify-center"
                      onClick={() =>
                        handleUpdateAdCoords(selectedAd.id, {
                          x: 450,
                          y: 140,
                          width: 145,
                          height: 220,
                        })
                      }
                    >
                      📑 Right Border
                    </button>
                    <button
                      type="button"
                      className="pub-btn pub-btn-secondary text-[11px] justify-center"
                      onClick={() =>
                        handleUpdateAdCoords(selectedAd.id, {
                          x: 0,
                          y: 670,
                          width: 595,
                          height: 172,
                        })
                      }
                    >
                      🔻 Bottom Border
                    </button>
                    <button
                      type="button"
                      className="pub-btn pub-btn-secondary text-[11px] justify-center"
                      onClick={() =>
                        handleUpdateAdCoords(selectedAd.id, {
                          x: 75,
                          y: 220,
                          width: 115,
                          height: 90,
                        })
                      }
                    >
                      🔲 Date Cell Slot
                    </button>
                  </div>
                </div>

                {/* Manual Coords Inputs */}
                <div className="pub-control-group pt-1">
                  <label className="text-xs font-bold text-stone-700">Dimensions (px)</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-500 block">Width</span>
                      <input
                        type="number"
                        className="pub-input text-xs"
                        value={selectedAd.width}
                        onChange={(e) =>
                          handleUpdateAdCoords(selectedAd.id, {
                            x: selectedAd.x,
                            y: selectedAd.y,
                            width: parseInt(e.target.value, 10) || 50,
                            height: selectedAd.height,
                          })
                        }
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Height</span>
                      <input
                        type="number"
                        className="pub-input text-xs"
                        value={selectedAd.height}
                        onChange={(e) =>
                          handleUpdateAdCoords(selectedAd.id, {
                            x: selectedAd.x,
                            y: selectedAd.y,
                            width: selectedAd.width,
                            height: parseInt(e.target.value, 10) || 30,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                  <button
                    type="button"
                    className="pub-btn pub-btn-danger text-xs flex items-center gap-1.5"
                    onClick={() => handleDeleteAd(selectedAd.id)}
                  >
                    <Trash2 size={13} /> Delete Ad
                  </button>
                  <button
                    type="button"
                    className="pub-btn pub-btn-secondary text-xs"
                    onClick={() => setSelectedAdId(null)}
                  >
                    Deselect
                  </button>
                </div>
              </>
            ) : inspectorTab === 'ads' ? (
              /* TAB 1: ADS ON THIS MONTH */
              <div className="space-y-4">
                {/* Place New Ad Quick Action */}
                <div className="space-y-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="text-[11px] font-black uppercase tracking-wider text-stone-700 block">
                    Add Sponsor Ad
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      className="pub-btn pub-btn-secondary text-xs py-1.5 justify-center hover:border-amber-400 hover:text-amber-900"
                      onClick={() => handleAddPresetAd('top_banner', 'outer')}
                    >
                      Top Border
                    </button>
                    <button
                      type="button"
                      className="pub-btn pub-btn-secondary text-xs py-1.5 justify-center hover:border-amber-400 hover:text-amber-900"
                      onClick={() => handleAddPresetAd('bottom_strip', 'outer')}
                    >
                      Bottom Border
                    </button>
                    <button
                      type="button"
                      className="pub-btn pub-btn-secondary text-xs py-1.5 justify-center hover:border-amber-400 hover:text-amber-900"
                      onClick={() => handleAddPresetAd('left_column', 'outer')}
                    >
                      Left Column
                    </button>
                    <button
                      type="button"
                      className="pub-btn pub-btn-secondary text-xs py-1.5 justify-center hover:border-amber-400 hover:text-amber-900"
                      onClick={() => handleAddPresetAd('right_column', 'outer')}
                    >
                      Right Column
                    </button>
                    <button
                      type="button"
                      className="pub-btn pub-btn-secondary text-xs py-1.5 justify-center hover:border-blue-400 hover:text-blue-900"
                      onClick={() => handleAddPresetAd('empty_cell', 'inner')}
                    >
                      Empty Date Cell
                    </button>
                    <button
                      type="button"
                      className="pub-btn pub-btn-secondary text-xs py-1.5 justify-center hover:border-blue-400 hover:text-blue-900"
                      onClick={() => handleAddPresetAd('custom', 'inner')}
                    >
                      + Free Box
                    </button>
                  </div>
                </div>

                {/* List of placed ads */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-700">
                      Placed Ads ({currentMonth?.ads.length || 0})
                    </span>
                    <span className="text-[10px] text-stone-400">Click to edit</span>
                  </div>

                  {currentMonth?.ads.length === 0 ? (
                    <div className="text-xs text-stone-400 py-6 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200 space-y-1">
                      <div className="font-semibold text-stone-600">No ads on this month</div>
                      <div className="text-[11px]">Click any preset above or the bottom dock to place an ad</div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {currentMonth?.ads.map((ad, idx) => {
                        const img = (ad.images && ad.images.length > 0) ? ad.images[0] : ad.imageUrl;
                        return (
                          <div
                            key={ad.id}
                            onClick={() => setSelectedAdId(ad.id)}
                            className="flex items-center justify-between p-2 rounded-xl border border-stone-200 hover:border-red-500 hover:bg-red-50/20 cursor-pointer text-xs transition-colors group bg-white shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden shrink-0">
                                {img ? (
                                  <img src={img} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="font-bold text-[10px] text-stone-400">#{idx + 1}</span>
                                )}
                              </div>
                              <div className="truncate">
                                <span className="font-bold text-stone-900 block truncate">
                                  {ad.label || `Sponsor Ad #${idx + 1}`}
                                </span>
                                <span className="text-[10px] text-stone-400 uppercase font-semibold">
                                  {ad.zone === 'outer' ? `Border (${ad.placementType || 'side'})` : 'Inside Calendar'}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="text-stone-300 hover:text-red-600 p-1 rounded transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAd(ad.id);
                              }}
                              title="Delete ad"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* TAB 2: PAGE & BORDERS */
              <div className="space-y-4">
                {/* Month Background Settings */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700 block">
                    Month Calendar Background
                  </label>

                  {currentMonth?.backgroundImageUrl ? (
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                      <div className="h-28 bg-white rounded-lg border border-stone-200 overflow-hidden flex items-center justify-center">
                        <img
                          src={currentMonth.backgroundImageUrl}
                          alt="Month Background"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex gap-2">
                        <label className="pub-btn pub-btn-secondary flex-1 text-center cursor-pointer text-xs justify-center font-semibold">
                          <Upload size={13} /> Replace
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={handleUploadMonthBackground}
                          />
                        </label>
                        <button
                          type="button"
                          className="pub-btn pub-btn-danger text-xs px-2.5"
                          onClick={() =>
                            updateCurrentMonth((m) => ({
                              ...m,
                              backgroundImageUrl: '',
                            }))
                          }
                          title="Remove Background"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-stone-300 hover:border-red-600 rounded-xl cursor-pointer bg-stone-50 hover:bg-red-50/20 text-xs font-semibold text-stone-700 transition-colors text-center">
                      <Upload size={18} className="text-red-600" />
                      <span>Upload Page (PDF or Image)</span>
                      <span className="text-[10px] text-stone-400">PNG, JPG, or PDF page</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={handleUploadMonthBackground}
                      />
                    </label>
                  )}
                </div>

                {/* Outer White Columns & Border Settings */}
                <div className="space-y-3 pt-3 border-t border-stone-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-800 block">
                      White Columns & Ad Margins
                    </label>
                    <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-extrabold border border-red-200">
                      Poster Frame
                    </span>
                  </div>

                  {/* Border Enable/Disable Checkboxes */}
                  <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
                      Active Ad Borders:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-stone-800">
                        <input
                          type="checkbox"
                          checked={
                            currentMonth?.showLeftBorder ??
                            (currentMonth?.outerBorderWidth === undefined || currentMonth.outerBorderWidth > 0)
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            updateCurrentMonth((m) => ({
                              ...m,
                              showLeftBorder: checked,
                              outerBorderWidth: checked ? (m.outerBorderWidth || 160) : m.outerBorderWidth,
                            }));
                          }}
                          className="rounded accent-red-600 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Left Column</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-stone-800">
                        <input
                          type="checkbox"
                          checked={
                            currentMonth?.showRightBorder ??
                            (currentMonth?.outerBorderWidth === undefined || currentMonth.outerBorderWidth > 0)
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            updateCurrentMonth((m) => ({
                              ...m,
                              showRightBorder: checked,
                              outerBorderWidth: checked ? (m.outerBorderWidth || 160) : m.outerBorderWidth,
                            }));
                          }}
                          className="rounded accent-red-600 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Right Column</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-stone-800">
                        <input
                          type="checkbox"
                          checked={
                            currentMonth?.showTopBorder ??
                            (currentMonth?.outerBorderHeight === undefined || currentMonth.outerBorderHeight > 0)
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            updateCurrentMonth((m) => ({
                              ...m,
                              showTopBorder: checked,
                              outerBorderHeight: checked ? (m.outerBorderHeight || 80) : m.outerBorderHeight,
                            }));
                          }}
                          className="rounded accent-red-600 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Top Ad Strip</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-stone-800">
                        <input
                          type="checkbox"
                          checked={
                            currentMonth?.showBottomBorder ??
                            (currentMonth?.outerBorderHeight === undefined || currentMonth.outerBorderHeight > 0)
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            updateCurrentMonth((m) => ({
                              ...m,
                              showBottomBorder: checked,
                              outerBorderHeight: checked ? (m.outerBorderHeight || 80) : m.outerBorderHeight,
                            }));
                          }}
                          className="rounded accent-red-600 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Bottom Ad Strip</span>
                      </label>
                    </div>
                  </div>

                  {/* Sliding Bar: White Column Width */}
                  <div className="space-y-1.5 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800">
                        White Columns Width
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="40"
                          max="400"
                          step="5"
                          className="w-16 px-1.5 py-0.5 text-xs text-right font-mono font-bold bg-white border border-stone-300 rounded"
                          value={currentMonth?.outerBorderWidth ?? 160}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            updateCurrentMonth((m) => ({ ...m, outerBorderWidth: val }));
                          }}
                        />
                        <span className="text-xs text-stone-500 font-bold">px</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="60"
                      max="360"
                      step="5"
                      className="w-full range-slider-red cursor-pointer"
                      style={{ accentColor: '#dc2626' }}
                      value={currentMonth?.outerBorderWidth ?? 160}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateCurrentMonth((m) => ({
                          ...m,
                          outerBorderWidth: val,
                          showLeftBorder: true,
                          showRightBorder: true,
                        }));
                      }}
                    />

                    {/* Quick Width Buttons */}
                    <div className="grid grid-cols-4 gap-1 pt-1">
                      {[120, 160, 220, 300].map((w) => (
                        <button
                          key={w}
                          type="button"
                          className={`py-0.5 px-1 text-[10px] font-bold rounded border transition-colors cursor-pointer ${
                            (currentMonth?.outerBorderWidth ?? 160) === w
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                          onClick={() =>
                            updateCurrentMonth((m) => ({
                              ...m,
                              outerBorderWidth: w,
                              showLeftBorder: true,
                              showRightBorder: true,
                            }))
                          }
                        >
                          {w}px
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sliding Bar: Top / Bottom Strips Height */}
                  <div className="space-y-1.5 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800">
                        Top & Bottom Strips Height
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="20"
                          max="250"
                          step="5"
                          className="w-16 px-1.5 py-0.5 text-xs text-right font-mono font-bold bg-white border border-stone-300 rounded"
                          value={currentMonth?.outerBorderHeight ?? 80}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            updateCurrentMonth((m) => ({ ...m, outerBorderHeight: val }));
                          }}
                        />
                        <span className="text-xs text-stone-500 font-bold">px</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="40"
                      max="220"
                      step="5"
                      className="w-full range-slider-red cursor-pointer"
                      style={{ accentColor: '#dc2626' }}
                      value={currentMonth?.outerBorderHeight ?? 80}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateCurrentMonth((m) => ({
                          ...m,
                          outerBorderHeight: val,
                          showTopBorder: true,
                          showBottomBorder: true,
                        }));
                      }}
                    />

                    {/* Quick Height Buttons */}
                    <div className="grid grid-cols-4 gap-1 pt-1">
                      {[60, 80, 110, 150].map((h) => (
                        <button
                          key={h}
                          type="button"
                          className={`py-0.5 px-1 text-[10px] font-bold rounded border transition-colors cursor-pointer ${
                            (currentMonth?.outerBorderHeight ?? 80) === h
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                          onClick={() =>
                            updateCurrentMonth((m) => ({
                              ...m,
                              outerBorderHeight: h,
                              showTopBorder: true,
                              showBottomBorder: true,
                            }))
                          }
                        >
                          {h}px
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                      type="button"
                      className="pub-btn pub-btn-secondary text-[11px] justify-center"
                      onClick={() => {
                        updateCurrentMonth((m) => ({
                          ...m,
                          showLeftBorder: true,
                          showRightBorder: true,
                          showTopBorder: false,
                          showBottomBorder: false,
                          outerBorderWidth: 180,
                        }));
                      }}
                      title="White advertisement columns on left and right sides"
                    >
                      Side Columns
                    </button>
                    <button
                      type="button"
                      className="pub-btn pub-btn-secondary text-[11px] justify-center"
                      onClick={() => {
                        updateCurrentMonth((m) => ({
                          ...m,
                          showLeftBorder: true,
                          showRightBorder: true,
                          showTopBorder: true,
                          showBottomBorder: true,
                          outerBorderWidth: 160,
                          outerBorderHeight: 80,
                        }));
                      }}
                      title="Full poster frame with columns and top/bottom strips"
                    >
                      All 4 Borders
                    </button>
                    <button
                      type="button"
                      className="pub-btn pub-btn-secondary text-[11px] justify-center"
                      onClick={() => {
                        updateCurrentMonth((m) => ({
                          ...m,
                          showLeftBorder: false,
                          showRightBorder: false,
                          showTopBorder: true,
                          showBottomBorder: true,
                          outerBorderHeight: 90,
                        }));
                      }}
                      title="Top and bottom banner strips only"
                    >
                      Top & Bottom
                    </button>
                    <button
                      type="button"
                      className="pub-btn pub-btn-secondary text-[11px] justify-center"
                      onClick={() => {
                        updateCurrentMonth((m) => ({
                          ...m,
                          showLeftBorder: false,
                          showRightBorder: false,
                          showTopBorder: false,
                          showBottomBorder: false,
                        }));
                      }}
                      title="No outer border margins (calendar page only)"
                    >
                      Disable Borders
                    </button>
                  </div>

                  {/* Apply to all 12 months */}
                  <button
                    type="button"
                    className="pub-btn pub-btn-primary w-full text-xs justify-center shadow-xs"
                    onClick={() => {
                      if (!activeCalendar || !currentMonth) return;
                      const bw = currentMonth.outerBorderWidth ?? 160;
                      const bh = currentMonth.outerBorderHeight ?? 80;
                      const showL = currentMonth.showLeftBorder ?? true;
                      const showR = currentMonth.showRightBorder ?? true;
                      const showT = currentMonth.showTopBorder ?? true;
                      const showB = currentMonth.showBottomBorder ?? true;

                      const updatedMonths = activeCalendar.months.map((m) => ({
                        ...m,
                        outerBorderWidth: bw,
                        outerBorderHeight: bh,
                        showLeftBorder: showL,
                        showRightBorder: showR,
                        showTopBorder: showT,
                        showBottomBorder: showB,
                      }));
                      const updatedCal = { ...activeCalendar, months: updatedMonths, updatedAt: Date.now() };
                      setActiveCalendar(updatedCal);
                      void saveCalendar(updatedCal);
                      alert(`Applied column width (${bw}px) and border settings to all 12 months!`);
                    }}
                  >
                    Apply Settings to All 12 Months
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>


      {/* ========================================================
          HIDDEN STAGING ELEMENT FOR HIGH-RESOLUTION PDF / PNG EXPORT
          ======================================================== */}
      <div
        id="calendar-export-stage-container"
        ref={stagingContainerRef}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 595,
          height: 842,
          pointerEvents: 'none',
          zIndex: 40,
          opacity: stagingMonth ? 1 : 0,
          visibility: stagingMonth ? 'visible' : 'hidden',
          backgroundColor: '#ffffff',
        }}
      >
        {stagingMonth && (
          <CalendarSheet
            id="calendar-export-stage-sheet"
            month={stagingMonth}
            scale={1}
            interactive={false}
          />
        )}
      </div>

      {/* ========================================================
          EXPORT / EXTRACTION PROGRESS MODAL
          ======================================================== */}
      {(isExporting || isExtractingPdf) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4 border border-stone-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto animate-spin">
              <RefreshCw size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 m-0">
                {isExtractingPdf ? 'Processing PDF' : 'Generating Export'}
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                {isExtractingPdf
                  ? pdfExtractionStatus || 'Please wait while pages are being extracted...'
                  : exportProgress?.status || 'Please wait...'}
              </p>
            </div>
            {exportProgress && exportProgress.total > 1 && (
              <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-red-600 h-2 transition-all duration-300"
                  style={{
                    width: `${Math.round((exportProgress.current / exportProgress.total) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          CALENDAR LIST / PREVIOUS CALENDARS MODAL
          ======================================================== */}
      <CalendarListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        calendars={calendars}
        activeCalendarId={activeCalendar?.id || null}
        onSelectCalendar={(cal) => {
          setActiveCalendar(cal);
          setActiveMonthIndex(0);
          setSelectedAdId(null);
        }}
        onCreateNew={handleCreateNewCalendar}
        onDuplicate={handleDuplicateCalendar}
        onDelete={handleDeleteCalendar}
      />
    </div>
  );
};
