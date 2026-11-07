import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileImage,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Link2,
  Newspaper,
  Palette,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Scissors,
  Trash2,
  Undo2,
  Upload,
  User,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarStudio } from '../components/calendar/CalendarStudio';
import { AdPresetModal } from '../components/publications/AdPresetModal';
import { PublicationPageSheet } from '../components/publications/PublicationPageSheet';
import { RichTextEditor } from '../components/RichTextEditor';
import { exportBookletPDF, exportPageAsImage, type ExportProgress } from '../lib/publicationExport';
import { api } from '../lib/api';
import {
  deletePublication,
  duplicatePublication,
  getAllPublications,
  getPublication,
  savePublication,
} from '../lib/publicationsStorage';
import { syncAllPublications, syncPublicationToCloud } from '../lib/publicationsSync';
import { uploadImage } from '../lib/upload';
import type { PageType, Publication, PublicationPage } from '../types/publication';

const stripHtml = (html?: string) => {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').trim();
};

export function PublicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentSection = searchParams.get('tab') === 'calendar' ? 'calendar' : 'publications';
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePublication, setActivePublication] = useState<Publication | null>(null);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'matter' | 'ad' | 'header'>('matter');
  const [canvasZoom, setCanvasZoom] = useState<number>(0.85);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  // Global Publication Info Settings from Convex
  const publicationSettings = useQuery(api.settings.getPublicationInfo, {});
  const updatePublicationSettings = useMutation(api.settings.updatePublicationInfo);

  // Sync details from global Settings into active publication
  const handleSyncFromSettings = () => {
    if (!activePublication) return;
    setActivePublication({
      ...activePublication,
      masterHeader: {
        ...activePublication.masterHeader,
        year: publicationSettings?.year || activePublication.masterHeader.year || '3',
        issueNumber: publicationSettings?.issueNumber || activePublication.masterHeader.issueNumber || '38',
        price: publicationSettings?.price || activePublication.masterHeader.price || 'निःशुल्क',
      },
    });
    if (activePage && publicationSettings?.pageLabel) {
      updateActivePage((prev) => ({
        ...prev,
        pageLabel: publicationSettings.pageLabel,
      }));
    }
    setSaveStatus('✔ Synced details from Settings');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  // Push current publication's strip details to global Settings
  const handleSaveToSettings = async () => {
    if (!activePublication) return;
    try {
      setSaveStatus('Saving to Settings...');
      await updatePublicationSettings({
        info: {
          year: activePublication.masterHeader.year || '3',
          issueNumber: activePublication.masterHeader.issueNumber || '38',
          price: activePublication.masterHeader.price || 'निःशुल्क',
          pageLabel: activePage?.pageLabel || '1',
        },
      });
      setSaveStatus('✔ Global Settings updated!');
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (err) {
      console.error('Failed to update Settings:', err);
      setSaveStatus('❌ Failed to update Settings');
      setTimeout(() => setSaveStatus(''), 2500);
    }
  };

  // Undo / Redo History Stack
  const [historyPast, setHistoryPast] = useState<{ pub: Publication; pageIndex: number }[]>([]);
  const [historyFuture, setHistoryFuture] = useState<{ pub: Publication; pageIndex: number }[]>([]);
  const lastHistorySnapshotTime = useRef<number>(0);

  const pushHistory = (currentPub?: Publication, currentIdx?: number, force = false) => {
    const pubToSave = currentPub || activePublication;
    if (!pubToSave) return;
    const now = Date.now();
    if (force || now - lastHistorySnapshotTime.current > 800) {
      setHistoryPast((prev) => [
        ...prev.slice(-30),
        { pub: JSON.parse(JSON.stringify(pubToSave)), pageIndex: currentIdx ?? activePageIndex },
      ]);
      setHistoryFuture([]);
      lastHistorySnapshotTime.current = now;
    }
  };

  const handleUndo = () => {
    if (historyPast.length === 0 || !activePublication) return;
    const previous = historyPast[historyPast.length - 1];
    const newPast = historyPast.slice(0, -1);
    setHistoryFuture((prev) => [
      ...prev,
      { pub: JSON.parse(JSON.stringify(activePublication)), pageIndex: activePageIndex },
    ]);
    setHistoryPast(newPast);
    setActivePublication(previous.pub);
    if (typeof previous.pageIndex === 'number' && previous.pageIndex < previous.pub.pages.length) {
      setActivePageIndex(previous.pageIndex);
    }
    setSaveStatus('Undo successful');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleRedo = () => {
    if (historyFuture.length === 0 || !activePublication) return;
    const next = historyFuture[historyFuture.length - 1];
    const newFuture = historyFuture.slice(0, -1);
    setHistoryPast((prev) => [
      ...prev,
      { pub: JSON.parse(JSON.stringify(activePublication)), pageIndex: activePageIndex },
    ]);
    setHistoryFuture(newFuture);
    setActivePublication(next.pub);
    if (typeof next.pageIndex === 'number' && next.pageIndex < next.pub.pages.length) {
      setActivePageIndex(next.pageIndex);
    }
    setSaveStatus('Redo successful');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activePublication) return;
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (isInput) return;

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'PageUp' || (e.altKey && e.key === 'ArrowUp')) {
        e.preventDefault();
        setActivePageIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'PageDown' || (e.altKey && e.key === 'ArrowDown')) {
        e.preventDefault();
        setActivePageIndex((prev) => Math.min(activePublication.pages.length - 1, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePublication, historyPast, historyFuture, activePageIndex]);

  // Hidden print render container for PDF compilation
  const [printRenderIndex, setPrintRenderIndex] = useState<number | null>(null);

  useEffect(() => {
    // 1. Instant local load
    loadPublications().then(() => {
      // 2. Background sync with Convex & Cloudinary without deleting on-device storage
      syncAllPublications()
        .then((result) => {
          if (result.publications.length > 0) {
            setPublications(result.publications);
          }
        })
        .catch((err) => {
          console.log('Background cloud sync skipped or offline:', err);
        });
    });
  }, []);

  const loadPublications = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const list = await getAllPublications();
      setPublications(list);
    } catch (err) {
      console.error('Failed to load publications:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleSyncCloud = async () => {
    setSyncing(true);
    setSyncStatus('Syncing with Convex & Cloudinary...');
    try {
      const result = await syncAllPublications((status) => setSyncStatus(status));
      setPublications(result.publications);
      if (result.errors.length > 0) {
        setSyncStatus(`⚠️ Synced: ${result.errors[0]}`);
      } else {
        setSyncStatus(`☁️ All ${result.publications.length} publications synced!`);
      }
    } catch (err: any) {
      setSyncStatus(`⚠️ Offline: ${err?.message || 'Sync failed'}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus(''), 4500);
    }
  };

  const handleOpenEditor = async (pubId: string) => {
    const pub = await getPublication(pubId);
    if (pub) {
      setActivePublication({
        ...pub,
        pages: pub.pages.map((page) => {
          const cleanTitle = page.title.replace(/\s*\(Continued\)\s*$/g, '').trim();
          return cleanTitle === page.title
            ? page
            : { ...page, title: cleanTitle, subtitle: undefined };
        }),
      });
      setActivePageIndex(0);
      setSelectedElementId(null);
    }
  };

  const handleCreateNew = async () => {
    const newPub: Publication = {
      id: `pub_${Date.now()}`,
      title: 'New Publication Booklet',
      category: 'Special Edition',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pageOrientation: 'portrait',
      pageSize: 'A4',
      masterHeader: {
        publicationName: 'Education News',
        tagline: 'Family Companion',
        editionTitle: 'Special Edition',
        headerImageUrl: '/logoBanner.jpeg',
        cityLocation: 'Wardha',
        issueDate: 'October 2026',
        themeColor: 'festive-red',
        primaryColor: '#bd3029',
        secondaryColor: '#f0d928',
        year: publicationSettings?.year || '3',
        issueNumber: publicationSettings?.issueNumber || '38',
        volumeDate: new Date().toLocaleDateString('en-GB'),
        price: publicationSettings?.price || 'निःशुल्क',
        showYellowStrip: true,
        showPageNumbers: true,
      },
      pages: [
        {
          id: `p_cover_${Date.now()}`,
          pageNumber: 1,
          type: 'cover',
          title: 'Special Edition',
          subtitle: 'Cover Page',
          greetingText: '',
          content: '',
          fontSize: 16,
          lineHeight: 1.6,
          textAlign: 'center',
          featureImagePosition: 'hero',
          decorativeBorder: true,
          ad: { type: 'none' },
        },
        {
          id: `p_inner_${Date.now()}_2`,
          pageNumber: 2,
          type: 'inner',
          title: 'Article / Main Story',
          content: `Write your article or devotional verses here.\n\nText is formatted for clean printing and digital sharing.\n\n❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖\n\nYou can attach illustrations and banner advertisements anytime.`,
          fontSize: 14.5,
          lineHeight: 1.65,
          textAlign: 'center',
          featureImagePosition: 'right',
          decorativeBorder: true,
          ad: { type: 'none' },
        },
      ],
    };

    await savePublication(newPub);
    await loadPublications();
    setActivePublication(newPub);
    setActivePageIndex(0);
  };

  const handleDuplicate = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const cloned = await duplicatePublication(id);
    if (cloned) {
      await loadPublications();
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Delete this publication booklet?')) {
      await deletePublication(id);
      await loadPublications();
      if (activePublication?.id === id) {
        setActivePublication(null);
      }
    }
  };

  const handleSaveActivePub = async () => {
    if (!activePublication) return;
    setSaveStatus('Saving to device...');
    try {
      await savePublication(activePublication);
      setSaveStatus('Syncing to Cloud (Convex & Cloudinary)...');
      const syncedPub = await syncPublicationToCloud(activePublication, (msg) => setSaveStatus(msg));
      setActivePublication(syncedPub);
      setSaveStatus('☁️ Saved & Synced to Cloud!');
    } catch (err: any) {
      console.warn('Cloud sync error, local copy saved:', err);
      setSaveStatus('💾 Saved locally on device');
    }
    await loadPublications(false);
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Page Operations
  const activePage = activePublication?.pages[activePageIndex] || null;

  const sourceContinuationPage = activePage
    ? activePublication?.pages.find((p) => p.continuationPageId === activePage.id)
    : undefined;
  const targetContinuationPage = activePage?.continuationPageId
    ? activePublication?.pages.find((p) => p.id === activePage.continuationPageId)
    : undefined;

  const updateActivePage = (updater: (prev: PublicationPage) => PublicationPage) => {
    if (!activePublication || !activePage) return;
    pushHistory();
    const updatedPages = [...activePublication.pages];
    updatedPages[activePageIndex] = updater(activePage);

    setActivePublication({
      ...activePublication,
      pages: updatedPages,
      updatedAt: Date.now(),
    });
  };

  const splitContentForContinuation = (page: PublicationPage) => {
    if (!page.content || !page.content.trim()) {
      return { firstPage: '', nextPage: '' };
    }

    // If HTML paragraphs exist, split cleanly at paragraph boundaries (</p>)
    if (page.content.includes('</p>')) {
      const parts = page.content.split('</p>').map((p) => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        const mid = Math.ceil(parts.length / 2);
        const firstPage = parts.slice(0, mid).map((p) => (p.endsWith('>') ? p : `${p}</p>`)).join('');
        const nextPage = parts.slice(mid).map((p) => (p.endsWith('>') ? p : `${p}</p>`)).join('');
        return { firstPage, nextPage };
      }
    }

    const fontSize = page.fontSize || 14;
    const lineHeight = page.lineHeight || 1.6;
    const charactersPerLine = Math.max(12, Math.floor(500 / (fontSize * 0.55)));
    const linesPerPage = Math.max(4, Math.floor(500 / (fontSize * lineHeight)));
    const maxCharacters = charactersPerLine * linesPerPage;
    if (page.content.length <= maxCharacters) {
      return { firstPage: page.content, nextPage: '' };
    }

    const splitAt = page.content.lastIndexOf(' ', maxCharacters);
    const boundary = splitAt > maxCharacters * 0.65 ? splitAt : maxCharacters;
    return {
      firstPage: page.content.slice(0, boundary).trimEnd(),
      nextPage: page.content.slice(boundary).trimStart(),
    };
  };

  const handleScissorCut = (firstPart: string, nextPart: string) => {
    if (!activePublication || !activePage) return;

    const plainNext = nextPart.replace(/<[^>]*>/g, '').trim();
    if (!plainNext) {
      setSaveStatus('⚠️ Place cursor or select text to cut to the next page.');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    // Force snapshot to history so user can Undo instantly!
    pushHistory(activePublication, activePageIndex, true);

    const currentPageIndex = activePageIndex;
    const currentPages = [...activePublication.pages];
    let targetIndex = -1;

    // 1. If activePage already has a linked continuation page, use that
    if (activePage.continuationPageId) {
      const idx = currentPages.findIndex((p) => p.id === activePage.continuationPageId);
      if (idx >= 0) {
        targetIndex = idx;
      }
    }

    // 2. If not yet linked, check if an existing inner page immediately follows
    if (targetIndex === -1 && currentPageIndex + 1 < currentPages.length) {
      const nextPage = currentPages[currentPageIndex + 1];
      if (nextPage.type !== 'cover') {
        targetIndex = currentPageIndex + 1;
      }
    }

    // Comprehensive format inheritance: Ensure target page matches activePage EXACTLY
    const formatProps: Partial<PublicationPage> = {
      type: 'inner',
      title: activePage.title,
      titleColor: activePage.titleColor,
      titleAlign: activePage.titleAlign,
      subtitle: activePage.subtitle,
      subtitleColor: activePage.subtitleColor,
      subtitleAlign: activePage.subtitleAlign,
      fontSize: activePage.fontSize || 14.5,
      lineHeight: activePage.lineHeight || 1.65,
      textAlign: activePage.textAlign || (activePage.title?.includes('आरती') ? 'center' : 'justify'),
      reporterName: activePage.reporterName,
      reporterMode: activePage.reporterMode,
      reporterNameSize: activePage.reporterNameSize,
      reporterNameColor: activePage.reporterNameColor,
      reporterNameAlign: activePage.reporterNameAlign,
      reporterX: activePage.reporterX,
      reporterY: activePage.reporterY,
      reporterWidth: activePage.reporterWidth,
      reporterHeight: activePage.reporterHeight,
      decorativeBorder: activePage.decorativeBorder,
      isSplitPage: activePage.isSplitPage,
      splitDirection: activePage.splitDirection,
      featureImagePosition: activePage.featureImagePosition,
      customHeaderTitle: activePage.customHeaderTitle,
      customHeaderRight: activePage.customHeaderRight,
      section2Title: activePage.section2Title,
      section2TitleColor: activePage.section2TitleColor,
      section2TitleAlign: activePage.section2TitleAlign,
      section2Subtitle: activePage.section2Subtitle,
      section2SubtitleColor: activePage.section2SubtitleColor,
      section2SubtitleAlign: activePage.section2SubtitleAlign,
      section2ReporterName: activePage.section2ReporterName,
      section2ReporterMode: activePage.section2ReporterMode,
      section2ReporterNameSize: activePage.section2ReporterNameSize,
      section2ReporterNameColor: activePage.section2ReporterNameColor,
      section2ReporterNameAlign: activePage.section2ReporterNameAlign,
      section2ReporterX: activePage.section2ReporterX,
      section2ReporterY: activePage.section2ReporterY,
      section2ReporterWidth: activePage.section2ReporterWidth,
      section2ReporterHeight: activePage.section2ReporterHeight,
    };

    let targetPageId = '';

    if (targetIndex >= 0) {
      // Update existing page with matching format and continued story content
      const existingPage = currentPages[targetIndex];
      targetPageId = existingPage.id;
      currentPages[targetIndex] = {
        ...existingPage,
        ...formatProps,
        content: nextPart,
        continuationFromPageId: activePage.id,
      };
    } else {
      // Create a new inner page immediately after current page with identical format
      targetIndex = currentPageIndex + 1;
      targetPageId = `p_page_${Date.now()}_${targetIndex + 1}`;
      const newContinuationPage: PublicationPage = {
        id: targetPageId,
        pageNumber: targetIndex + 1,
        ...formatProps,
        content: nextPart,
        fontSize: activePage.fontSize || 14.5,
        lineHeight: activePage.lineHeight || 1.65,
        textAlign: activePage.textAlign || (activePage.title?.includes('आरती') ? 'center' : 'justify'),
        title: activePage.title,
        type: 'inner',
        ad: { type: 'none' },
        continuationFromPageId: activePage.id,
      };
      currentPages.splice(targetIndex, 0, newContinuationPage);
    }

    // Update source page with firstPart and continuation link
    currentPages[currentPageIndex] = {
      ...currentPages[currentPageIndex],
      content: firstPart,
      continueOnNextPage: true,
      continuationPageId: targetPageId,
    };

    // Re-number all pages sequentially
    currentPages.forEach((p, idx) => {
      p.pageNumber = idx + 1;
    });

    setActivePublication({
      ...activePublication,
      pages: currentPages,
      updatedAt: Date.now(),
    });

    // CRUCIAL: Immediately switch the user to the continuation page so it never disappears!
    setActivePageIndex(targetIndex);

    setSaveStatus(`✂️ Story cut! Remaining text placed on Page ${targetIndex + 1}.`);
    setTimeout(() => setSaveStatus(''), 4500);
  };

  const handleMergeBack = (sourcePage: PublicationPage) => {
    if (!activePublication) return;
    pushHistory(activePublication, activePageIndex, true);

    const continuationId = sourcePage.continuationPageId;
    const continuation = continuationId
      ? activePublication.pages.find((page) => page.id === continuationId)
      : undefined;

    const restoredContent =
      continuation && continuation.content.trim()
        ? `${sourcePage.content}\n${continuation.content}`.trim()
        : sourcePage.content;

    // Only delete the page if booklet has > 4 pages AND it was an auto-created continuation page
    const shouldDeletePage =
      continuationId &&
      activePublication.pages.length > 4 &&
      continuation?.id.startsWith('p_page_');

    const pages = shouldDeletePage
      ? activePublication.pages.filter((page) => page.id !== continuationId)
      : activePublication.pages.map((page) =>
          page.id === continuationId
            ? { ...page, content: '', continuationFromPageId: undefined }
            : page
        );

    const updated = pages.map((page) =>
      page.id === sourcePage.id
        ? {
            ...page,
            content: restoredContent,
            continueOnNextPage: false,
            continuationPageId: undefined,
            continuationSourceContent: undefined,
          }
        : page
    );

    updated.forEach((page, index) => {
      page.pageNumber = index + 1;
    });

    setActivePublication({ ...activePublication, pages: updated });

    const sourceIdx = updated.findIndex((page) => page.id === sourcePage.id);
    if (sourceIdx >= 0) {
      setActivePageIndex(sourceIdx);
    }
    setSaveStatus(`Merged back into Page ${sourcePage.pageNumber}.`);
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleContinueOnNextPageChange = (enabled: boolean) => {
    if (!activePublication || !activePage) return;
    if (!enabled) {
      handleMergeBack(activePage);
      return;
    }

    const { firstPage, nextPage } = splitContentForContinuation(activePage);
    handleScissorCut(firstPage, nextPage);
  };

  const handleAddPage = () => {
    if (!activePublication) return;
    pushHistory(activePublication, activePageIndex, true);
    const newPageNum = activePublication.pages.length + 1;
    const newPage: PublicationPage = {
      id: `p_page_${Date.now()}_${newPageNum}`,
      pageNumber: newPageNum,
      type: 'inner',
      title: `Page ${newPageNum}`,
      content: `Enter text, verses, or article content for page ${newPageNum}.\n\n❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖ ❖\n\nAdd advertisements or illustrations as needed.`,
      fontSize: 14.5,
      lineHeight: 1.65,
      textAlign: 'center',
      featureImagePosition: 'right',
      decorativeBorder: true,
      ad: { type: 'none' },
    };

    const updatedPages = [...activePublication.pages, newPage];
    updatedPages.forEach((p, idx) => {
      p.pageNumber = idx + 1;
    });

    setActivePublication({
      ...activePublication,
      pages: updatedPages,
    });
    setActivePageIndex(updatedPages.length - 1);
  };

  const handleDeletePage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activePublication) return;
    if (activePublication.pages.length <= 1) {
      alert('A publication must have at least one page.');
      return;
    }
    if (confirm(`Delete page ${index + 1}?`)) {
      pushHistory(activePublication, activePageIndex, true);
      const updated = activePublication.pages.filter((_, i) => i !== index);
      updated.forEach((p, idx) => {
        p.pageNumber = idx + 1;
      });
      setActivePublication({ ...activePublication, pages: updated });
      if (activePageIndex >= updated.length) {
        setActivePageIndex(Math.max(0, updated.length - 1));
      }
    }
  };

  const handleMovePage = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activePublication) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= activePublication.pages.length) return;

    pushHistory(activePublication, activePageIndex, true);
    const pages = [...activePublication.pages];
    const temp = pages[index];
    pages[index] = pages[targetIdx];
    pages[targetIdx] = temp;

    pages.forEach((p, idx) => {
      p.pageNumber = idx + 1;
    });

    setActivePublication({ ...activePublication, pages });
    setActivePageIndex(targetIdx);
  };

  const handleDuplicatePage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activePublication) return;
    pushHistory(activePublication, activePageIndex, true);
    const source = activePublication.pages[index];
    const cloned: PublicationPage = {
      ...source,
      id: `p_page_${Date.now()}_copy`,
      title: `${source.title} (Copy)`,
      pageNumber: index + 2,
    };

    const pages = [...activePublication.pages];
    pages.splice(index + 1, 0, cloned);
    pages.forEach((p, idx) => {
      p.pageNumber = idx + 1;
    });

    setActivePublication({ ...activePublication, pages });
    setActivePageIndex(index + 1);
  };

  // Image Upload Handlers
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'feature' | 'ad' | 'logo'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Instant local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (target === 'feature') {
        updateActivePage((prev) => ({
          ...prev,
          featureImageUrl: base64,
          featureImagePosition: 'free',
          featureImageX: prev.featureImageX ?? (prev.type === 'cover' ? 60 : 380),
          featureImageY: prev.featureImageY ?? (prev.type === 'cover' ? 110 : 110),
          featureImageWidth: prev.featureImageWidth ?? (prev.type === 'cover' ? 475 : 180),
          featureImageHeight: prev.featureImageHeight ?? (prev.type === 'cover' ? 440 : 220),
        }));
      } else if (target === 'ad') {
        updateActivePage((prev) => ({
          ...prev,
          ad: { type: 'image', imageUrl: base64, name: file.name, fit: 'fill' },
        }));
      } else if (target === 'logo') {
        if (activePublication) {
          setActivePublication({
            ...activePublication,
            masterHeader: {
              ...activePublication.masterHeader,
              centerLogoUrl: base64,
            },
          });
        }
      }
    };
    reader.readAsDataURL(file);

    // 2. Background cloud upload
    setSaveStatus('Uploading image to cloud...');
    const folder =
      target === 'logo'
        ? 'education-news/publications/logos'
        : target === 'ad'
        ? 'education-news/publications/ads'
        : 'education-news/publications/features';

    uploadImage(file, folder)
      .then((cloudUrl) => {
        if (target === 'feature') {
          updateActivePage((prev) => ({ ...prev, featureImageUrl: cloudUrl }));
        } else if (target === 'ad') {
          updateActivePage((prev) => ({
            ...prev,
            ad: { ...prev.ad, imageUrl: cloudUrl },
          }));
        } else if (target === 'logo') {
          setActivePublication((prev) =>
            prev
              ? {
                  ...prev,
                  masterHeader: {
                    ...prev.masterHeader,
                    centerLogoUrl: cloudUrl,
                  },
                }
              : null
          );
        }
        setSaveStatus('☁️ Image uploaded to cloud!');
        setTimeout(() => setSaveStatus(''), 2500);
      })
      .catch((err) => {
        console.warn('Background image upload to cloud failed, local preview preserved:', err);
        setSaveStatus('💾 Image saved locally on device');
        setTimeout(() => setSaveStatus(''), 2500);
      });
  };

  // Extra Freeform Canvas Ad Image
  const handleAddCanvasAdImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const newElemId = `elem_ad_${Date.now()}`;

    // 1. Instant local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newElem = {
        id: newElemId,
        type: 'ad_image' as const,
        imageUrl: base64,
        x: 60,
        y: 350,
        width: 475,
        height: 160,
        label: 'Ad Banner',
      };
      updateActivePage((prev) => ({
        ...prev,
        canvasElements: [...(prev.canvasElements || []), newElem],
      }));
      setSelectedElementId(newElemId);
      setActiveTab('ad');
    };
    reader.readAsDataURL(file);

    // 2. Background cloud upload
    setSaveStatus('Uploading ad image to cloud...');
    uploadImage(file, 'education-news/publications/canvas')
      .then((cloudUrl) => {
        updateActivePage((prev) => ({
          ...prev,
          canvasElements: (prev.canvasElements || []).map((elem) =>
            elem.id === newElemId ? { ...elem, imageUrl: cloudUrl } : elem
          ),
        }));
        setSaveStatus('☁️ Ad image uploaded to cloud!');
        setTimeout(() => setSaveStatus(''), 2500);
      })
      .catch((err) => {
        console.warn('Background canvas ad upload failed, local preview preserved:', err);
        setSaveStatus('💾 Image saved locally on device');
        setTimeout(() => setSaveStatus(''), 2500);
      });
  };

  // Single-page image export
  const handleExportPNG = async () => {
    if (!activePublication || !activePage) return;
    try {
      setExportProgress({ current: 1, total: 1, status: 'Generating PNG image...' });
      setPrintRenderIndex(activePageIndex);
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (document.fonts) {
        try {
          await Promise.race([
            document.fonts.ready,
            new Promise((r) => setTimeout(r, 1200)),
          ]);
        } catch {
          // ignore font delay
        }
      }

      const filename = `${activePublication?.title || 'Publication'}-Page-${activePage?.pageNumber || activePageIndex + 1}.png`;
      await exportPageAsImage('pub-export-offscreen-sheet', filename);
    } catch (err) {
      alert(`Failed to export page image: ${err instanceof Error ? err.message : String(err)}`);
      console.error('PNG export error:', err);
    } finally {
      setPrintRenderIndex(null);
      setExportProgress(null);
    }
  };

  // Multi-page PDF export
  const handleExportFullPDF = async () => {
    if (!activePublication) return;
    try {
      await exportBookletPDF(
        activePublication,
        async (pageIdx) => {
          setPrintRenderIndex(pageIdx);
          await new Promise((resolve) => setTimeout(resolve, 250));
          if (document.fonts) {
            try {
              await Promise.race([
                document.fonts.ready,
                new Promise((r) => setTimeout(r, 800)),
              ]);
            } catch {
              // ignore font delay
            }
          }
          return document.getElementById('pub-export-offscreen-sheet');
        },
        (prog) => setExportProgress(prog)
      );
    } catch (err) {
      alert(`Failed to generate PDF booklet: ${err instanceof Error ? err.message : String(err)}`);
      console.error('PDF export error:', err);
    } finally {
      setPrintRenderIndex(null);
      setExportProgress(null);
    }
  };

  // ========================================================
  // RENDER DASHBOARD LIST VIEW
  // ========================================================
  if (!activePublication) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        {/* Top-Level Section Tabs: Booklets vs Calendar Studio */}
        <div className="flex items-center gap-2 border-b border-stone-200 bg-white px-6 pt-2 pb-0 shrink-0 shadow-xs z-10">
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${currentSection === 'publications'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
          >
            <Newspaper size={17} />
            <span>Booklets & Special Editions</span>
          </button>
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'calendar' })}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${currentSection === 'calendar'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
          >
            <CalendarDays size={17} />
            <span>Calendar Studio</span>
            <span className="bg-red-100 text-red-700 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-red-200">
              New
            </span>
          </button>
        </div>

        {/* Active Section Content */}
        {currentSection === 'calendar' ? (
          <div className="flex-1 overflow-hidden">
            <CalendarStudio />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="pub-dashboard-container">
              <div className="pub-dash-header">
                <div>
                  <h1 className="text-xl font-bold text-stone-900 m-0">Publications & Special Booklets</h1>
                  <p className="text-sm text-stone-600 m-0 mt-1">
                    Create daily booklets, magazines, and special print editions. Manage pages, advertisements, and content locally.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {syncStatus && (
                    <span className="text-xs text-stone-600 font-medium px-2.5 py-1 bg-stone-100 rounded-md border border-stone-200">
                      {syncStatus}
                    </span>
                  )}
                  <button
                    type="button"
                    className="pub-btn pub-btn-outline flex items-center gap-1.5 text-xs text-sky-700 border-sky-300 hover:bg-sky-50"
                    onClick={handleSyncCloud}
                    disabled={syncing}
                    title="Sync on-device publications with Convex Cloud & Cloudinary"
                  >
                    <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                    <span>{syncing ? 'Syncing...' : 'Sync with Cloud'}</span>
                  </button>
                  <span className="pub-badge-local" title="Saved locally on this device & synced with Convex cloud">
                    <HardDrive size={13} /> On-Device + Cloud
                  </span>
                  <button
                    type="button"
                    className="pub-btn pub-btn-outline"
                    onClick={() => setIsAdModalOpen(true)}
                  >
                    <Palette size={15} /> Ad Library
                  </button>
                  <button
                    type="button"
                    className="pub-btn pub-btn-primary"
                    onClick={handleCreateNew}
                  >
                    <Plus size={16} /> Create Publication
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="app-loading">Loading publications...</div>
              ) : (
                <div className="pub-dash-grid">
                  {publications.map((pub) => {
                    const coverPage = pub.pages[0];
                    return (
                      <div key={pub.id} className="pub-dash-card" onClick={() => handleOpenEditor(pub.id)}>
                        <div className="pub-dash-card-preview">
                          <div className="text-center w-[90%]">
                            <span className="text-[11px] text-red-900 font-extrabold block">
                              {pub.masterHeader.tagline || 'Family Companion'}
                            </span>
                            <h2 className="font-serif text-[22px] text-red-700 font-bold my-1 truncate">
                              {pub.masterHeader.publicationName || 'Education News'}
                            </h2>
                            <div className="inline-block bg-yellow-400 text-red-950 px-3 py-0.5 rounded-full text-xs font-extrabold shadow-sm">
                              {pub.masterHeader.editionTitle || 'Special Edition'}
                            </div>
                          </div>
                          {coverPage?.featureImageUrl && (
                            <img
                              src={coverPage.featureImageUrl}
                              alt="Cover"
                              className="max-h-[70px] object-contain mt-2 rounded"
                            />
                          )}
                        </div>

                        <div className="pub-dash-card-body">
                          <h3 className="pub-dash-card-title">{pub.title}</h3>
                          <div className="pub-dash-card-meta">
                            <span>📄 {pub.pages.length} Pages</span>
                            <span>•</span>
                            <span>📍 {pub.masterHeader.cityLocation}</span>
                            <span>•</span>
                            <span>📅 {pub.masterHeader.issueDate}</span>
                          </div>

                          <div className="pub-dash-card-actions">
                            <button
                              type="button"
                              className="pub-btn pub-btn-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditor(pub.id);
                              }}
                            >
                              Edit Publication
                            </button>

                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                className="pub-thumb-btn"
                                title="Duplicate"
                                onClick={(e) => handleDuplicate(pub.id, e)}
                              >
                                <Copy size={16} />
                              </button>
                              <button
                                type="button"
                                className="pub-thumb-btn danger"
                                title="Delete"
                                onClick={(e) => handleDelete(pub.id, e)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <AdPresetModal
                isOpen={isAdModalOpen}
                onClose={() => setIsAdModalOpen(false)}
                onSelectAd={() => { }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // RENDER VISUAL STUDIO EDITOR VIEW
  // ========================================================
  const printRenderPage =
    printRenderIndex !== null ? activePublication.pages[printRenderIndex] : null;

  return (
    <div className="pub-studio-container">
      {/* Top Action Bar */}
      <header className="pub-studio-topbar">
        <div className="pub-studio-title-block">
          <button
            type="button"
            className="pub-btn pub-btn-secondary"
            onClick={() => {
              handleSaveActivePub();
              setActivePublication(null);
            }}
          >
            <ArrowLeft size={16} /> All Publications
          </button>

          <input
            type="text"
            className="pub-input font-bold text-sm w-[280px]"
            value={activePublication.title}
            onChange={(e) =>
              setActivePublication({ ...activePublication, title: e.target.value })
            }
          />



          {saveStatus && (
            <span className="text-xs text-emerald-600 font-semibold">
              ✔ {saveStatus}
            </span>
          )}
        </div>

        <div className="pub-studio-actions">
          {/* Undo / Redo Studio Buttons */}
          <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-md border border-stone-200">
            <button
              type="button"
              className="pub-btn pub-btn-ghost px-2.5 py-1 text-xs flex items-center gap-1 disabled:opacity-35 disabled:cursor-not-allowed text-stone-700 hover:text-stone-900 font-medium"
              onClick={handleUndo}
              disabled={historyPast.length === 0}
              title="Undo (Ctrl+Z / Cmd+Z)"
            >
              <Undo2 size={14} /> Undo
            </button>
            <button
              type="button"
              className="pub-btn pub-btn-ghost px-2.5 py-1 text-xs flex items-center gap-1 disabled:opacity-35 disabled:cursor-not-allowed text-stone-700 hover:text-stone-900 font-medium"
              onClick={handleRedo}
              disabled={historyFuture.length === 0}
              title="Redo (Ctrl+Y / Cmd+Shift+Z)"
            >
              <Redo2 size={14} /> Redo
            </button>
          </div>

          <button
            type="button"
            className="pub-btn pub-btn-outline"
            onClick={() => setCanvasZoom((prev) => Math.min(1.2, prev + 0.1))}
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            className="pub-btn pub-btn-outline"
            onClick={() => setCanvasZoom((prev) => Math.max(0.4, prev - 0.1))}
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            type="button"
            className="pub-btn pub-btn-outline"
            onClick={() => setCanvasZoom(0.85)}
            title="Fit to Screen"
          >
            85%
          </button>

          <button
            type="button"
            className="pub-btn pub-btn-secondary"
            onClick={handleExportPNG}
            title="Export Current Page as Image for WhatsApp"
          >
            <FileImage size={16} /> Export Page (PNG)
          </button>

          <button
            type="button"
            className="pub-btn pub-btn-primary"
            onClick={handleExportFullPDF}
            title="Download Complete Booklet as Multi-Page PDF"
          >
            <Download size={16} /> Download PDF ({activePublication.pages.length} Pages)
          </button>

          <button
            type="button"
            className="pub-btn pub-btn-secondary bg-emerald-700 hover:bg-emerald-800 text-white"
            onClick={handleSaveActivePub}
          >
            <Check size={16} /> Save Changes
          </button>
        </div>
      </header>

      {/* Sleek Compact Centered Export Progress Modal */}
      {exportProgress && (
        <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200/90 w-full max-w-[280px] p-5 text-center flex flex-col items-center">
            {/* Spinning Loader Ring with Download Icon */}
            <div className="relative w-12 h-12 flex items-center justify-center mb-3">
              <div className="absolute inset-0 rounded-full border-[3px] border-stone-100 border-t-red-600 animate-spin" />
              <Download size={20} className="text-red-700" />
            </div>

            <h4 className="m-0 text-sm font-bold text-stone-900 tracking-tight">
              {exportProgress.total > 1 ? 'Generating PDF...' : 'Exporting Image...'}
            </h4>

            <p className="m-0 mt-1 text-xs text-stone-500 font-medium truncate max-w-full">
              {exportProgress.status}
            </p>

            {/* Slim Modern Progress Bar */}
            <div className="w-full mt-3.5 flex items-center gap-2.5">
              <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.max(5, (exportProgress.current / exportProgress.total) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[11px] font-semibold text-stone-600 font-mono shrink-0">
                {exportProgress.total > 1
                  ? `${exportProgress.current}/${exportProgress.total}`
                  : `${Math.round((exportProgress.current / exportProgress.total) * 100)}%`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace (Thumbnails | Sheet Viewport | Inspector) */}
      <div className="pub-studio-workspace">
        {/* ================= LEFT PAGES STRIP ================= */}
        <aside className="pub-pages-strip">
          <div className="pub-strip-header">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 m-0">
              Pages ({activePublication.pages.length})
            </h3>
            <button
              type="button"
              className="pub-thumb-btn"
              onClick={handleAddPage}
              title="Add New Page"
            >
              <Plus size={16} />
            </button>
          </div>

          {activePublication.pages.map((p, idx) => (
            <div
              key={p.id}
              className={`pub-page-thumb-card ${idx === activePageIndex ? 'active' : ''}`}
              onClick={() => setActivePageIndex(idx)}
            >
              <div className="pub-thumb-badge">
                <span>Page {p.pageNumber}</span>
                <span className={`pub-thumb-type-tag ${p.type}`}>
                  {p.type === 'cover' ? 'Cover' : p.type === 'back' ? 'Back' : 'Inner'}
                </span>
              </div>

              <div className="pub-thumb-preview-mini">
                <div className="pub-mini-header" />
                {p.isSplitPage ? (
                  p.splitDirection === 'vertical' ? (
                    <>
                      <div className="pub-mini-title">{stripHtml(p.title) || 'Story 1'}</div>
                      <div className="pub-mini-lines">
                        <div className="pub-mini-line w-4/5" />
                        <div className="pub-mini-line w-11/12" />
                      </div>
                      <div className="border-b border-dashed border-red-300 my-1" />
                      <div className="pub-mini-title">{stripHtml(p.section2Title) || 'Story 2'}</div>
                      <div className="pub-mini-lines">
                        <div className="pub-mini-line w-3/4" />
                        <div className="pub-mini-line w-5/6" />
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-1 flex-1 w-full overflow-hidden mt-0.5">
                      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                        <div className="pub-mini-title truncate text-[9px]">{stripHtml(p.title) || 'Story 1'}</div>
                        <div className="pub-mini-lines">
                          <div className="pub-mini-line w-full" />
                          <div className="pub-mini-line w-4/5" />
                          <div className="pub-mini-line w-3/4" />
                        </div>
                      </div>
                      <div className="w-[1px] border-r border-dashed border-red-300 self-stretch shrink-0" />
                      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                        <div className="pub-mini-title truncate text-[9px]">{stripHtml(p.section2Title) || 'Story 2'}</div>
                        <div className="pub-mini-lines">
                          <div className="pub-mini-line w-full" />
                          <div className="pub-mini-line w-4/5" />
                          <div className="pub-mini-line w-3/4" />
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <>
                    <div className="pub-mini-title">{stripHtml(p.title) || 'Untitled Page'}</div>
                    <div className="pub-mini-lines">
                      <div className="pub-mini-line w-4/5" />
                      <div className="pub-mini-line w-11/12" />
                      <div className="pub-mini-line w-3/4" />
                      <div className="pub-mini-line w-5/6" />
                    </div>
                  </>
                )}
                {p.ad?.imageUrl && (
                  <div className="pub-mini-ad">
                    Ad Banner
                  </div>
                )}
              </div>

              <div className="pub-thumb-actions">
                <button
                  type="button"
                  className="pub-thumb-btn"
                  title="Move Up"
                  disabled={idx === 0}
                  onClick={(e) => handleMovePage(idx, 'up', e)}
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  className="pub-thumb-btn"
                  title="Move Down"
                  disabled={idx === activePublication.pages.length - 1}
                  onClick={(e) => handleMovePage(idx, 'down', e)}
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  type="button"
                  className="pub-thumb-btn"
                  title="Duplicate Page"
                  onClick={(e) => handleDuplicatePage(idx, e)}
                >
                  <Copy size={13} />
                </button>
                <button
                  type="button"
                  className="pub-thumb-btn danger"
                  title="Delete Page"
                  onClick={(e) => handleDeletePage(idx, e)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          <button type="button" className="pub-add-page-btn" onClick={handleAddPage}>
            <Plus size={16} /> Add New Page
          </button>
        </aside>

        {/* ================= CENTER SHEET VIEWPORT ================= */}
        <main className="pub-canvas-viewport">
          <div className="pub-canvas-controls">
            <button
              type="button"
              className="p-1 -ml-1 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
              disabled={activePageIndex === 0}
              title={`Previous Page (Page ${activePageIndex})`}
              aria-label="Previous Page"
            >
              <ChevronUp size={15} />
            </button>
            <span className="font-bold text-stone-800">
              Page {activePageIndex + 1} of {activePublication.pages.length}
            </span>
            <button
              type="button"
              className="p-1 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              onClick={() => setActivePageIndex((prev) => Math.min(activePublication.pages.length - 1, prev + 1))}
              disabled={activePageIndex === activePublication.pages.length - 1}
              title={`Next Page (Page ${activePageIndex + 2})`}
              aria-label="Next Page"
            >
              <ChevronDown size={15} />
            </button>
            <span className="text-stone-300">•</span>
            <span className="text-stone-600">
              {activePage?.type === 'cover'
                ? 'Front Cover'
                : activePage?.type === 'back'
                  ? 'Back Cover'
                  : 'Inner Page'}
            </span>
          </div>

          {activePage && (
            <PublicationPageSheet
              id="pub-live-sheet"
              page={activePage}
              masterHeader={activePublication.masterHeader}
              totalPages={activePublication.pages.length}
              settings={publicationSettings}
              scale={canvasZoom}
              interactive={true}
              selectedElementId={selectedElementId}
              onSelectElementId={(id) => {
                setSelectedElementId(id);
                if (id === 'feature_image' || id === 'reporter_name' || id === 'section2_reporter_name') {
                  setActiveTab('matter');
                } else if (id === 'main_ad' || id?.startsWith('elem_ad_')) {
                  setActiveTab('ad');
                }
              }}
              onUpdateElement={(type, coords, elemId) => {
                if (type === 'feature_image') {
                  updateActivePage((prev) => ({
                    ...prev,
                    featureImagePosition: 'free',
                    featureImageX: coords.x,
                    featureImageY: coords.y,
                    featureImageWidth: coords.width,
                    featureImageHeight: coords.height,
                  }));
                } else if (type === 'main_ad') {
                  updateActivePage((prev) => ({
                    ...prev,
                    adMode: 'free',
                    adX: coords.x,
                    adY: coords.y,
                    adWidth: coords.width,
                    adHeight: coords.height,
                  }));
                } else if (type === 'reporter_name') {
                  updateActivePage((prev) => ({
                    ...prev,
                    reporterX: coords.x,
                    reporterY: coords.y,
                    reporterWidth: coords.width,
                    reporterHeight: coords.height,
                  }));
                } else if (type === 'section2_reporter_name') {
                  updateActivePage((prev) => ({
                    ...prev,
                    section2ReporterX: coords.x,
                    section2ReporterY: coords.y,
                    section2ReporterWidth: coords.width,
                    section2ReporterHeight: coords.height,
                  }));
                } else if (type === 'canvas_element' && elemId) {
                  updateActivePage((prev) => ({
                    ...prev,
                    canvasElements: (prev.canvasElements || []).map((el) =>
                      el.id === elemId ? { ...el, ...coords } : el
                    ),
                  }));
                }
              }}
              onDeleteElement={(elemId) => {
                if (elemId === 'reporter_name') {
                  updateActivePage((prev) => ({
                    ...prev,
                    reporterName: '',
                    reporterX: undefined,
                    reporterY: undefined,
                    reporterWidth: undefined,
                    reporterHeight: undefined,
                  }));
                } else if (elemId === 'section2_reporter_name') {
                  updateActivePage((prev) => ({
                    ...prev,
                    section2ReporterName: '',
                    section2ReporterX: undefined,
                    section2ReporterY: undefined,
                    section2ReporterWidth: undefined,
                    section2ReporterHeight: undefined,
                  }));
                } else {
                  updateActivePage((prev) => ({
                    ...prev,
                    canvasElements: (prev.canvasElements || []).filter((el) => el.id !== elemId),
                  }));
                }
                if (selectedElementId === elemId) setSelectedElementId(null);
              }}
            />
          )}

        </main>

        {/* ================= RIGHT INSPECTOR PANEL ================= */}
        <aside className="pub-inspector-panel">
          <div className="pub-inspector-tabs">
            <button
              type="button"
              className={`pub-inspector-tab ${activeTab === 'matter' ? 'active' : ''}`}
              onClick={() => setActiveTab('matter')}
            >
              <FileText size={14} /> Content
            </button>
            <button
              type="button"
              className={`pub-inspector-tab ${activeTab === 'ad' ? 'active' : ''}`}
              onClick={() => setActiveTab('ad')}
            >
              <ImageIcon size={14} /> Advertisement
            </button>
            <button
              type="button"
              className={`pub-inspector-tab ${activeTab === 'header' ? 'active' : ''}`}
              onClick={() => setActiveTab('header')}
            >
              <Palette size={14} /> Header & Theme
            </button>
          </div>

          <div className="pub-inspector-body">
            {/* TAB 1: CONTENT */}
            {activePage && activeTab === 'matter' && (
              <>
                {sourceContinuationPage && (
                  <div className="p-2.5 bg-amber-50/90 border border-amber-300 rounded-lg flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-amber-950 flex items-center gap-1.5">
                      <Link2 size={13} className="text-amber-700" />
                      Continued from Page {sourceContinuationPage.pageNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const sIdx = activePublication?.pages.findIndex((p) => p.id === sourceContinuationPage.id) ?? -1;
                          if (sIdx >= 0) setActivePageIndex(sIdx);
                        }}
                        className="text-xs text-amber-900 font-bold hover:underline"
                      >
                        👈 Page {sourceContinuationPage.pageNumber}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMergeBack(sourceContinuationPage)}
                        className="text-[11px] text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded font-medium"
                      >
                        Merge Back
                      </button>
                    </div>
                  </div>
                )}
                <div className="pub-control-group">
                  <label>Page Type</label>
                  <select
                    className="pub-select"
                    value={activePage.type}
                    onChange={(e) =>
                      updateActivePage((prev) => ({
                        ...prev,
                        type: e.target.value as PageType,
                      }))
                    }
                  >
                    <option value="inner">Standard Inner Page</option>
                    <option value="cover">Front Cover Page</option>
                    <option value="back">Back Cover Page</option>
                  </select>
                </div>

                {/* Frontpage Yellow Strip Quick Customizer */}
                {(activePage.type === 'cover' || activePageIndex === 0) && (
                  <div className="rounded-lg border border-yellow-400 bg-yellow-50/80 p-3 shadow-xs mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-yellow-950 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-600 inline-block" />
                        Frontpage Yellow Strip (नोंदणी पट्टी)
                      </span>
                      <div className="flex items-center gap-1.5">
                        {publicationSettings && (
                          <button
                            type="button"
                            onClick={handleSyncFromSettings}
                            className="text-[10px] text-amber-900 bg-yellow-200/90 hover:bg-yellow-300 px-1.5 py-0.5 rounded font-semibold border border-yellow-400 flex items-center gap-1 cursor-pointer"
                            title="Sync वर्ष, अंक, पृष्ठ, मूल्य from Settings"
                          >
                            <RefreshCw size={10} /> Sync Settings
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveTab('header')}
                          className="text-[11px] text-yellow-800 hover:text-yellow-950 font-semibold underline"
                        >
                          All Settings ➔
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">वर्ष (Year)</label>
                        <input
                          type="text"
                          className="pub-input text-xs"
                          placeholder="3"
                          value={activePublication.masterHeader.year ?? '3'}
                          onChange={(e) =>
                            setActivePublication({
                              ...activePublication,
                              masterHeader: {
                                ...activePublication.masterHeader,
                                year: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">अंक (Issue)</label>
                        <input
                          type="text"
                          className="pub-input text-xs"
                          placeholder="38"
                          value={activePublication.masterHeader.issueNumber ?? '38'}
                          onChange={(e) =>
                            setActivePublication({
                              ...activePublication,
                              masterHeader: {
                                ...activePublication.masterHeader,
                                issueNumber: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">दिनांक (Date)</label>
                        <input
                          type="text"
                          className="pub-input text-xs"
                          placeholder="7/11/2026"
                          value={activePublication.masterHeader.volumeDate ?? activePublication.masterHeader.issueDate ?? '7/11/2026'}
                          onChange={(e) =>
                            setActivePublication({
                              ...activePublication,
                              masterHeader: {
                                ...activePublication.masterHeader,
                                volumeDate: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">मूल्य (Price)</label>
                        <input
                          type="text"
                          className="pub-input text-xs"
                          placeholder="निःशुल्क"
                          value={activePublication.masterHeader.price ?? 'निःशुल्क'}
                          onChange={(e) =>
                            setActivePublication({
                              ...activePublication,
                              masterHeader: {
                                ...activePublication.masterHeader,
                                price: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="p-1.5 bg-[#ffe600] border-y border-black text-center text-[10.5px] font-bold text-black select-none truncate">
                      {activePublication.masterHeader.customStripText?.trim() ||
                        `वर्ष : ${activePublication.masterHeader.year || '3'} | अंक : ${activePublication.masterHeader.issueNumber || '38'} | पृष्ठ : ${activePage.pageLabel || activePage.pageNumber || 1} | दिनांक ${activePublication.masterHeader.volumeDate || activePublication.masterHeader.issueDate || '7/11/2026'} | मूल्य : ${activePublication.masterHeader.price || 'निःशुल्क'}`}
                    </div>
                  </div>
                )}

                {/* Page Number / Custom Label for this page */}
                <div className="pub-control-group mb-3">
                  <label className="flex items-center justify-between">
                    <span>Page Number / Label (पृष्ठ क्रमांक)</span>
                    <span className="text-[10px] text-stone-400">Page {activePageIndex + 1} of {activePublication.pages.length}</span>
                  </label>
                  <input
                    type="text"
                    className="pub-input text-xs"
                    placeholder={`पृष्ठ : ${activePageIndex + 1}`}
                    value={activePage.pageLabel ?? ''}
                    onChange={(e) => updateActivePage((prev) => ({ ...prev, pageLabel: e.target.value }))}
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5">
                    Custom label for this page (e.g. "पृष्ठ : {activePageIndex + 1}"). Leave empty for default.
                  </span>
                </div>

                {/* Split Page Checkbox Card (for Inner & Back Pages) */}
                {activePage.type !== 'cover' && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50/70 hover:bg-amber-50/90 p-3 shadow-sm transition-colors mb-3">
                    <label className="!flex !flex-row !items-center !justify-start gap-2.5 cursor-pointer select-none m-0">
                      <input
                        type="checkbox"
                        checked={Boolean(activePage.isSplitPage)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          updateActivePage((prev) => ({
                            ...prev,
                            isSplitPage: checked,
                            section2Title: prev.section2Title || 'Story 2 / Headline 2',
                            section2Content: prev.section2Content ?? '',
                          }));
                        }}
                        className="w-4 h-4 rounded accent-red-700 cursor-pointer shrink-0 m-0 !w-4 !h-4"
                      />
                      <span className="font-bold text-stone-900 text-[13px] flex items-center gap-2 flex-1">
                        Divide Page in 2
                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          2 Stories
                        </span>
                      </span>
                    </label>

                    <p className="mt-1 ml-6.5 text-[11px] text-stone-600 leading-normal m-0 pl-0.5">
                      Divide this page into two separate stories with 2 headings and 2 contents on the same page.
                    </p>

                    {activePage.isSplitPage && (
                      <div className="mt-2.5 pt-2.5 border-t border-amber-200/80">
                        <span className="text-[11px] font-bold text-stone-700 block mb-1.5">
                          Arrangement:
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={`pub-btn flex-1 text-xs py-1.5 px-2 ${(activePage.splitDirection === 'horizontal' || !activePage.splitDirection)
                                ? 'pub-btn-primary'
                                : 'pub-btn-secondary'
                              }`}
                            onClick={() => updateActivePage((prev) => ({ ...prev, splitDirection: 'horizontal' }))}
                          >
                            ◫ Horizontal (Side-by-Side)
                          </button>
                          <button
                            type="button"
                            className={`pub-btn flex-1 text-xs py-1.5 px-2 ${activePage.splitDirection === 'vertical'
                                ? 'pub-btn-primary'
                                : 'pub-btn-secondary'
                              }`}
                            onClick={() => updateActivePage((prev) => ({ ...prev, splitDirection: 'vertical' }))}
                          >
                            ⬓ Vertical (Top & Bottom)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activePage.isSplitPage ? (
                  <div className="space-y-4">
                    {/* ===== STORY 1 ===== */}
                    <div className="p-3 bg-red-50/50 border border-red-200 rounded-lg space-y-3">
                      <div className="flex items-center justify-between border-b border-red-200/60 pb-1.5">
                        <span className="font-bold text-xs text-red-800 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-mono">1</span>
                          {(activePage.splitDirection === 'horizontal' || !activePage.splitDirection)
                            ? 'Story 1 (Left Column)'
                            : 'Story 1 (Top Section)'}
                        </span>
                      </div>

                      {/* Story 1 Heading / Title */}
                      <div className="pub-control-group">
                        <label className="text-xs font-semibold text-stone-700 mb-1 block">Heading 1 / Title</label>
                        <RichTextEditor
                          value={activePage.title}
                          onChange={(title) => updateActivePage((prev) => ({ ...prev, title }))}
                          placeholder="e.g. Primary Story / Morning News"
                          variant="title"
                          toolbarPosition="top"
                          minHeight={42}
                        />
                      </div>

                      {/* Story 1 Subtitle */}
                      <div className="pub-control-group">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <label className="text-xs font-semibold text-stone-700 m-0">Subtitle 1 (Optional)</label>
                          <div className="flex items-center bg-stone-100 p-0.5 rounded border border-stone-200">
                            {(['left', 'center', 'right'] as const).map((align) => (
                              <button
                                key={align}
                                type="button"
                                className={`p-1 rounded transition-all ${(activePage.subtitleAlign || 'center') === align
                                    ? 'bg-white shadow text-amber-900 font-bold'
                                    : 'text-stone-400 hover:text-stone-700'
                                  }`}
                                onClick={() => updateActivePage((prev) => ({ ...prev, subtitleAlign: align }))}
                                title={`Align ${align}`}
                              >
                                {align === 'left' ? <AlignLeft size={12} /> : align === 'center' ? <AlignCenter size={12} /> : <AlignRight size={12} />}
                              </button>
                            ))}
                          </div>
                        </div>
                        <RichTextEditor
                          value={activePage.subtitle || ''}
                          onChange={(subtitle) => updateActivePage((prev) => ({ ...prev, subtitle }))}
                          placeholder="e.g. Special Report"
                          variant="subtitle"
                          toolbarPosition="top"
                          minHeight={38}
                        />
                      </div>

                      {/* Story 1 Content */}
                      <div className="pub-control-group">
                        <label>Story 1 Content</label>
                        <div className="pub-symbols-bar">
                          {['॥', '।।', '!', '❖', '✿', '★', 'ॐ'].map((sym) => (
                            <button
                              key={sym}
                              type="button"
                              className="pub-symbol-chip"
                              onClick={() =>
                                updateActivePage((prev) => ({
                                  ...prev,
                                  content: `${prev.content} ${sym}`,
                                }))
                              }
                            >
                              {sym}
                            </button>
                          ))}
                        </div>
                        <RichTextEditor
                          value={activePage.content}
                          onChange={(content) =>
                            updateActivePage((prev) => ({ ...prev, content }))
                          }
                          placeholder="Type story 1 content here..."
                          minHeight={150}
                          toolbarPosition="bottom"
                          onCutToNextPage={handleScissorCut}
                          onUndo={handleUndo}
                          onRedo={handleRedo}
                          canUndo={historyPast.length > 0}
                          canRedo={historyFuture.length > 0}
                        />
                      </div>

                      {/* Story 1 Reporter Name */}
                      <div
                        className={`p-3 rounded-lg space-y-2.5 transition-all ${selectedElementId === 'reporter_name'
                            ? 'bg-blue-50/70 border-2 border-blue-400 ring-2 ring-blue-100 shadow-sm'
                            : 'bg-white/80 border border-red-200'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5 m-0">
                            <User size={13} className="text-red-700" />
                            Reporter 1 Name (बातमीदार / प्रतिनिधी)
                          </label>
                          <span className="text-[11px] text-stone-500 font-medium">
                            Size: {activePage.reporterNameSize || 12}px
                          </span>
                        </div>
                        <input
                          type="text"
                          className="pub-input text-xs"
                          placeholder="e.g. विशेष प्रतिनिधी / राहुल शर्मा"
                          value={activePage.reporterName || ''}
                          onChange={(e) => updateActivePage((prev) => ({ ...prev, reporterName: e.target.value }))}
                        />

                        {/* Story 1 Drag & Positioning Option */}
                        <div className="pt-1 border-t border-red-100">
                          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                            Layout & Drag Option
                          </label>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              className={`pub-btn flex-1 text-xs py-1.5 flex items-center justify-center gap-1 ${(activePage.reporterMode || 'free') === 'free'
                                  ? 'pub-btn-primary'
                                  : 'pub-btn-secondary'
                                }`}
                              onClick={() => {
                                setSelectedElementId('reporter_name');
                                updateActivePage((prev) => ({
                                  ...prev,
                                  reporterMode: 'free',
                                  reporterX: prev.reporterX ?? 75,
                                  reporterY: prev.reporterY ?? 740,
                                }));
                              }}
                            >
                              ✋ Canva Free Drag
                            </button>
                            <button
                              type="button"
                              className={`pub-btn flex-1 text-xs py-1.5 flex items-center justify-center gap-1 ${activePage.reporterMode === 'bottom'
                                  ? 'pub-btn-primary'
                                  : 'pub-btn-secondary'
                                }`}
                              onClick={() => {
                                updateActivePage((prev) => ({ ...prev, reporterMode: 'bottom' }));
                                if (selectedElementId === 'reporter_name') setSelectedElementId(null);
                              }}
                            >
                              ⬇ Fixed Bottom
                            </button>
                          </div>

                          {(activePage.reporterMode || 'free') === 'free' && (
                            <div className="flex items-center justify-between bg-sky-50 border border-sky-200 text-sky-800 text-[11px] px-2 py-1 rounded mt-1.5">

                              <button
                                type="button"
                                className="text-[10px] font-bold text-sky-900 bg-sky-200/90 hover:bg-sky-300 px-1.5 py-0.5 rounded transition-colors"
                                onClick={() => setSelectedElementId('reporter_name')}
                              >
                                🎯 Focus on Canvas
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Size, Alignment, Color toolbar */}
                        <div className="flex items-center justify-between gap-3 pt-1 border-t border-red-100">
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-[10px] text-stone-500 font-medium whitespace-nowrap">Size</span>
                            <input
                              type="range"
                              min={9}
                              max={20}
                              step={0.5}
                              value={activePage.reporterNameSize || 12}
                              onChange={(e) => updateActivePage((prev) => ({ ...prev, reporterNameSize: parseFloat(e.target.value) }))}
                              className="w-full accent-red-700 h-1.5"
                            />
                          </div>
                          <div className="flex items-center gap-0.5 bg-stone-100 p-0.5 rounded border border-stone-200">
                            {(['left', 'center', 'right'] as const).map((align) => (
                              <button
                                key={align}
                                type="button"
                                className={`p-1 rounded text-xs transition-all ${(activePage.reporterNameAlign || 'right') === align
                                    ? 'bg-white text-red-900 font-bold shadow-sm'
                                    : 'text-stone-400 hover:text-stone-700'
                                  }`}
                                onClick={() => updateActivePage((prev) => ({ ...prev, reporterNameAlign: align }))}
                                title={`Align ${align}`}
                              >
                                {align === 'left' ? <AlignLeft size={12} /> : align === 'center' ? <AlignCenter size={12} /> : <AlignRight size={12} />}
                              </button>
                            ))}
                          </div>
                          <label className="relative w-4 h-4 rounded-full border border-stone-300 overflow-hidden cursor-pointer shrink-0" title="Color">
                            <input
                              type="color"
                              value={activePage.reporterNameColor || '#57534e'}
                              onChange={(e) => updateActivePage((prev) => ({ ...prev, reporterNameColor: e.target.value }))}
                              className="absolute -top-2 -left-2 w-8 h-8 cursor-pointer opacity-0"
                            />
                            <span className="block w-full h-full rounded-full" style={{ backgroundColor: activePage.reporterNameColor || '#57534e' }} />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* ===== STORY 2 ===== */}
                    <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg space-y-3">
                      <div className="flex items-center justify-between border-b border-amber-200/60 pb-1.5">
                        <span className="font-bold text-xs text-amber-800 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-amber-700 text-white flex items-center justify-center text-[10px] font-mono">2</span>
                          {(activePage.splitDirection === 'horizontal' || !activePage.splitDirection)
                            ? 'Story 2 (Right Column)'
                            : 'Story 2 (Bottom Section)'}
                        </span>
                      </div>

                      {/* Story 2 Heading / Title */}
                      <div className="pub-control-group">
                        <label className="text-xs font-semibold text-stone-700 mb-1 block">Heading 2 / Title</label>
                        <RichTextEditor
                          value={activePage.section2Title || ''}
                          onChange={(section2Title) => updateActivePage((prev) => ({ ...prev, section2Title }))}
                          placeholder="e.g. Secondary Story / Community News"
                          variant="title"
                          toolbarPosition="top"
                          minHeight={42}
                        />
                      </div>

                      {/* Story 2 Subtitle */}
                      <div className="pub-control-group">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <label className="text-xs font-semibold text-stone-700 m-0">Subtitle 2 (Optional)</label>
                          <div className="flex items-center bg-stone-100 p-0.5 rounded border border-stone-200">
                            {(['left', 'center', 'right'] as const).map((align) => (
                              <button
                                key={align}
                                type="button"
                                className={`p-1 rounded transition-all ${(activePage.section2SubtitleAlign || 'center') === align
                                    ? 'bg-white shadow text-amber-900 font-bold'
                                    : 'text-stone-400 hover:text-stone-700'
                                  }`}
                                onClick={() => updateActivePage((prev) => ({ ...prev, section2SubtitleAlign: align }))}
                                title={`Align ${align}`}
                              >
                                {align === 'left' ? <AlignLeft size={12} /> : align === 'center' ? <AlignCenter size={12} /> : <AlignRight size={12} />}
                              </button>
                            ))}
                          </div>
                        </div>
                        <RichTextEditor
                          value={activePage.section2Subtitle || ''}
                          onChange={(section2Subtitle) => updateActivePage((prev) => ({ ...prev, section2Subtitle }))}
                          placeholder="e.g. Wardha Edition"
                          variant="subtitle"
                          toolbarPosition="top"
                          minHeight={38}
                        />
                      </div>

                      {/* Story 2 Content */}
                      <div className="pub-control-group">
                        <label>Story 2 Content</label>
                        <div className="pub-symbols-bar">
                          {['॥', '।।', '!', '❖', '✿', '★', 'ॐ'].map((sym) => (
                            <button
                              key={sym}
                              type="button"
                              className="pub-symbol-chip"
                              onClick={() =>
                                updateActivePage((prev) => ({
                                  ...prev,
                                  section2Content: `${prev.section2Content || ''} ${sym}`,
                                }))
                              }
                            >
                              {sym}
                            </button>
                          ))}
                        </div>
                        <RichTextEditor
                          value={activePage.section2Content || ''}
                          onChange={(section2Content) =>
                            updateActivePage((prev) => ({ ...prev, section2Content }))
                          }
                          placeholder="Type story 2 content here..."
                          minHeight={150}
                          toolbarPosition="bottom"
                          onUndo={handleUndo}
                          onRedo={handleRedo}
                          canUndo={historyPast.length > 0}
                          canRedo={historyFuture.length > 0}
                        />
                      </div>

                      {/* Story 2 Reporter Name */}
                      <div
                        className={`p-3 rounded-lg space-y-2.5 transition-all ${selectedElementId === 'section2_reporter_name'
                            ? 'bg-blue-50/70 border-2 border-blue-400 ring-2 ring-blue-100 shadow-sm'
                            : 'bg-white/80 border border-amber-200'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 m-0">
                            <User size={13} className="text-amber-700" />
                            Reporter 2 Name (बातमीदार / प्रतिनिधी)
                          </label>
                          <span className="text-[11px] text-stone-500 font-medium">
                            Size: {activePage.section2ReporterNameSize || 12}px
                          </span>
                        </div>
                        <input
                          type="text"
                          className="pub-input text-xs"
                          placeholder="e.g. विशेष प्रतिनिधी / राहुल शर्मा"
                          value={activePage.section2ReporterName || ''}
                          onChange={(e) => updateActivePage((prev) => ({ ...prev, section2ReporterName: e.target.value }))}
                        />

                        {/* Story 2 Drag & Positioning Option */}
                        <div className="pt-1 border-t border-amber-100">
                          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                            Layout & Drag Option
                          </label>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              className={`pub-btn flex-1 text-xs py-1.5 flex items-center justify-center gap-1 ${(activePage.section2ReporterMode || 'free') === 'free'
                                  ? 'pub-btn-primary'
                                  : 'pub-btn-secondary'
                                }`}
                              onClick={() => {
                                setSelectedElementId('section2_reporter_name');
                                updateActivePage((prev) => ({
                                  ...prev,
                                  section2ReporterMode: 'free',
                                  section2ReporterX: prev.section2ReporterX ?? 365,
                                  section2ReporterY: prev.section2ReporterY ?? 740,
                                }));
                              }}
                            >
                              ✋ Canva Free Drag
                            </button>
                            <button
                              type="button"
                              className={`pub-btn flex-1 text-xs py-1.5 flex items-center justify-center gap-1 ${activePage.section2ReporterMode === 'bottom'
                                  ? 'pub-btn-primary'
                                  : 'pub-btn-secondary'
                                }`}
                              onClick={() => {
                                updateActivePage((prev) => ({ ...prev, section2ReporterMode: 'bottom' }));
                                if (selectedElementId === 'section2_reporter_name') setSelectedElementId(null);
                              }}
                            >
                              ⬇ Fixed Bottom
                            </button>
                          </div>

                          {(activePage.section2ReporterMode || 'free') === 'free' && (
                            <div className="flex items-center justify-between bg-sky-50 border border-sky-200 text-sky-800 text-[11px] px-2 py-1 rounded mt-1.5">

                              <button
                                type="button"
                                className="text-[10px] font-bold text-sky-900 bg-sky-200/90 hover:bg-sky-300 px-1.5 py-0.5 rounded transition-colors"
                                onClick={() => setSelectedElementId('section2_reporter_name')}
                              >
                                🎯 Focus on Canvas
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Size, Alignment, Color toolbar */}
                        <div className="flex items-center justify-between gap-3 pt-1 border-t border-amber-100">
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-[10px] text-stone-500 font-medium whitespace-nowrap">Size</span>
                            <input
                              type="range"
                              min={9}
                              max={20}
                              step={0.5}
                              value={activePage.section2ReporterNameSize || 12}
                              onChange={(e) => updateActivePage((prev) => ({ ...prev, section2ReporterNameSize: parseFloat(e.target.value) }))}
                              className="w-full accent-amber-700 h-1.5"
                            />
                          </div>
                          <div className="flex items-center gap-0.5 bg-stone-100 p-0.5 rounded border border-stone-200">
                            {(['left', 'center', 'right'] as const).map((align) => (
                              <button
                                key={align}
                                type="button"
                                className={`p-1 rounded text-xs transition-all ${(activePage.section2ReporterNameAlign || 'right') === align
                                    ? 'bg-white text-amber-900 font-bold shadow-sm'
                                    : 'text-stone-400 hover:text-stone-700'
                                  }`}
                                onClick={() => updateActivePage((prev) => ({ ...prev, section2ReporterNameAlign: align }))}
                                title={`Align ${align}`}
                              >
                                {align === 'left' ? <AlignLeft size={12} /> : align === 'center' ? <AlignCenter size={12} /> : <AlignRight size={12} />}
                              </button>
                            ))}
                          </div>
                          <label className="relative w-4 h-4 rounded-full border border-stone-300 overflow-hidden cursor-pointer shrink-0" title="Color">
                            <input
                              type="color"
                              value={activePage.section2ReporterNameColor || '#57534e'}
                              onChange={(e) => updateActivePage((prev) => ({ ...prev, section2ReporterNameColor: e.target.value }))}
                              className="absolute -top-2 -left-2 w-8 h-8 cursor-pointer opacity-0"
                            />
                            <span className="block w-full h-full rounded-full" style={{ backgroundColor: activePage.section2ReporterNameColor || '#57534e' }} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Page Headline / Title */}
                    <div className="pub-control-group">
                      <label className="text-xs font-semibold text-stone-700 mb-1 block">Page Title / Headline</label>
                      <RichTextEditor
                        value={activePage.title}
                        onChange={(title) => updateActivePage((prev) => ({ ...prev, title }))}
                        placeholder="e.g. Daily Aarti Collection / Main News"
                        variant="title"
                        toolbarPosition="top"
                        minHeight={42}
                      />
                    </div>

                    {/* Page Subtitle */}
                    <div className="pub-control-group">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <label className="text-xs font-semibold text-stone-700 m-0">Page Subtitle (Optional)</label>
                        <div className="flex items-center bg-stone-100 p-0.5 rounded border border-stone-200">
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <button
                              key={align}
                              type="button"
                              className={`p-1 rounded transition-all ${(activePage.subtitleAlign || 'center') === align
                                  ? 'bg-white shadow text-amber-900 font-bold'
                                  : 'text-stone-400 hover:text-stone-700'
                                }`}
                              onClick={() => updateActivePage((prev) => ({ ...prev, subtitleAlign: align }))}
                              title={`Align ${align}`}
                            >
                              {align === 'left' ? <AlignLeft size={12} /> : align === 'center' ? <AlignCenter size={12} /> : <AlignRight size={12} />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <RichTextEditor
                        value={activePage.subtitle || ''}
                        onChange={(subtitle) => updateActivePage((prev) => ({ ...prev, subtitle }))}
                        placeholder="e.g. Devotional Special / Wardha Edition"
                        variant="subtitle"
                        toolbarPosition="top"
                        minHeight={38}
                      />
                    </div>

                    {activePage.type === 'cover' && (
                      <div className="pub-control-group">
                        <label>Greeting Banner / Ribbon</label>
                        <input
                          type="text"
                          className="pub-input"
                          placeholder="e.g. Warm Greetings & Best Wishes"
                          value={activePage.greetingText || ''}
                          onChange={(e) =>
                            updateActivePage((prev) => ({
                              ...prev,
                              greetingText: e.target.value,
                            }))
                          }
                        />
                      </div>
                    )}

                    <div className="pub-control-group">
                      <label>
                        <span>Article / Verse Text</span>
                        <span className="text-[11px] text-stone-500 font-normal">
                          Font: {activePage.fontSize}px
                        </span>
                      </label>
                      <div className="pub-symbols-bar">
                        {['॥', '।।', '!', '❖', '✿', '★', 'ॐ'].map((sym) => (
                          <button
                            key={sym}
                            type="button"
                            className="pub-symbol-chip"
                            onClick={() =>
                              updateActivePage((prev) => ({
                                ...prev,
                                content: `${prev.content} ${sym}`,
                              }))
                            }
                          >
                            {sym}
                          </button>
                        ))}
                      </div>
                      <RichTextEditor
                        value={activePage.content}
                        onChange={(content) =>
                          updateActivePage((prev) => ({ ...prev, content }))
                        }
                        placeholder="Type verses, article text, or news matter here..."
                        minHeight={220}
                        toolbarPosition="bottom"
                        onCutToNextPage={handleScissorCut}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        canUndo={historyPast.length > 0}
                        canRedo={historyFuture.length > 0}
                      />
                    </div>

                    {/* Single Story Reporter Name */}
                    <div
                      className={`p-3 rounded-lg space-y-2.5 transition-all ${selectedElementId === 'reporter_name'
                          ? 'bg-blue-50/70 border-2 border-blue-400 ring-2 ring-blue-100 shadow-sm'
                          : 'bg-stone-50 border border-stone-200'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5 m-0">
                          <User size={13} className="text-stone-500" />
                          Reporter Name / Byline (बातमीदार / प्रतिनिधी)
                        </label>
                        <span className="text-[11px] text-stone-500 font-medium">
                          Size: {activePage.reporterNameSize || 12}px
                        </span>
                      </div>
                      <input
                        type="text"
                        className="pub-input text-xs"
                        placeholder="e.g. विशेष प्रतिनिधी / राहुल शर्मा"
                        value={activePage.reporterName || ''}
                        onChange={(e) => updateActivePage((prev) => ({ ...prev, reporterName: e.target.value }))}
                      />

                      {/* Drag & Positioning Option */}
                      <div className="pt-1 border-t border-stone-200/60">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                          Layout & Drag Option
                        </label>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            className={`pub-btn flex-1 text-xs py-1.5 flex items-center justify-center gap-1 ${(activePage.reporterMode || 'free') === 'free'
                                ? 'pub-btn-primary'
                                : 'pub-btn-ghost border border-stone-200'
                              }`}
                            onClick={() => {
                              updateActivePage((prev) => ({ ...prev, reporterMode: 'free' }));
                              setSelectedElementId('reporter_name');
                            }}
                          >
                            ✋ Canva Free Drag
                          </button>
                          <button
                            type="button"
                            className={`pub-btn flex-1 text-xs py-1.5 flex items-center justify-center gap-1 ${activePage.reporterMode === 'bottom'
                                ? 'pub-btn-primary'
                                : 'pub-btn-ghost border border-stone-200'
                              }`}
                            onClick={() => updateActivePage((prev) => ({ ...prev, reporterMode: 'bottom' }))}
                          >
                            ⬇ Fixed Bottom
                          </button>
                        </div>

                        {(activePage.reporterMode || 'free') === 'free' && (
                          <div className="flex items-center justify-between bg-sky-50 border border-sky-200 text-sky-800 text-[11px] px-2 py-1 rounded mt-1.5">

                            <button
                              type="button"
                              className="text-[10px] font-bold text-sky-900 bg-sky-200/90 hover:bg-sky-300 px-1.5 py-0.5 rounded transition-colors"
                              onClick={() => setSelectedElementId('reporter_name')}
                            >
                              🎯 Focus on Canvas
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Size, Alignment, Color toolbar */}
                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-stone-200/60">
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-[10px] text-stone-500 font-medium whitespace-nowrap">Size</span>
                          <input
                            type="range"
                            min={9}
                            max={20}
                            step={0.5}
                            value={activePage.reporterNameSize || 12}
                            onChange={(e) => updateActivePage((prev) => ({ ...prev, reporterNameSize: parseFloat(e.target.value) }))}
                            className="w-full accent-amber-700 h-1.5"
                          />
                        </div>
                        <div className="flex items-center gap-0.5 bg-white p-0.5 rounded border border-stone-200">
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <button
                              key={align}
                              type="button"
                              className={`p-1 rounded text-xs transition-all ${(activePage.reporterNameAlign || 'right') === align
                                  ? 'bg-amber-100 text-amber-900 font-bold'
                                  : 'text-stone-400 hover:text-stone-700'
                                }`}
                              onClick={() => updateActivePage((prev) => ({ ...prev, reporterNameAlign: align }))}
                              title={`Align ${align}`}
                            >
                              {align === 'left' ? <AlignLeft size={12} /> : align === 'center' ? <AlignCenter size={12} /> : <AlignRight size={12} />}
                            </button>
                          ))}
                        </div>
                        <label className="relative w-4 h-4 rounded-full border border-stone-300 overflow-hidden cursor-pointer shrink-0" title="Reporter text color">
                          <input
                            type="color"
                            value={activePage.reporterNameColor || '#57534e'}
                            onChange={(e) => updateActivePage((prev) => ({ ...prev, reporterNameColor: e.target.value }))}
                            className="absolute -top-2 -left-2 w-8 h-8 cursor-pointer opacity-0"
                          />
                          <span
                            className="block w-full h-full rounded-full"
                            style={{ backgroundColor: activePage.reporterNameColor || '#57534e' }}
                          />
                        </label>
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="pub-control-group">
                    <label>Font Size ({activePage.fontSize}px)</label>
                    <input
                      type="range"
                      min={11}
                      max={22}
                      step={0.5}
                      value={activePage.fontSize}
                      onChange={(e) =>
                        updateActivePage((prev) => ({
                          ...prev,
                          fontSize: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="pub-control-group">
                    <label>Line Spacing ({activePage.lineHeight})</label>
                    <input
                      type="range"
                      min={1.2}
                      max={2.2}
                      step={0.05}
                      value={activePage.lineHeight}
                      onChange={(e) =>
                        updateActivePage((prev) => ({
                          ...prev,
                          lineHeight: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="pub-control-group">
                  <label>Text Alignment</label>
                  <div className="flex gap-1.5">
                    {(['center', 'left', 'justify'] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        className={`pub-btn flex-1 ${activePage.textAlign === align ? 'pub-btn-primary' : 'pub-btn-secondary'}`}
                        onClick={() => updateActivePage((prev) => ({ ...prev, textAlign: align }))}
                      >
                        {align === 'center' ? 'Center' : align === 'left' ? 'Left' : 'Justify'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50/70 text-xs font-semibold text-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer m-0">
                      <input
                        type="checkbox"
                        checked={Boolean(activePage.continueOnNextPage)}
                        onChange={(e) => handleContinueOnNextPageChange(e.target.checked)}
                        className="accent-red-700"
                      />
                      <span>Continue content on next page</span>
                    </label>
                    {activePage.continueOnNextPage && targetContinuationPage && (
                      <button
                        type="button"
                        onClick={() => {
                          const cIdx = activePublication?.pages.findIndex((p) => p.id === targetContinuationPage.id) ?? -1;
                          if (cIdx >= 0) setActivePageIndex(cIdx);
                        }}
                        className="text-xs text-amber-900 font-bold hover:underline"
                      >
                        👉 Page {targetContinuationPage.pageNumber}
                      </button>
                    )}
                  </div>
                  <div className="text-[11px] font-normal text-stone-600 bg-white/80 p-2 rounded border border-amber-200/80 flex items-center gap-1.5">
                    <Scissors size={13} className="text-red-600 shrink-0" />
                    <span>
                      Place your cursor inside the article text and click the <strong>✂️ Cut to Next Page</strong> button in the editor toolbar to cut and bring the rest to the next page.
                    </span>
                  </div>
                </div>

                {/* Feature Image Section */}
                <div className="border-t border-stone-200 pt-3 mt-1">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-stone-900 m-0">Feature Illustration / Deity</label>
                    {activePage.featureImageUrl && (
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline font-semibold"
                        onClick={() =>
                          updateActivePage((prev) => ({
                            ...prev,
                            featureImageUrl: undefined,
                            featureImageX: undefined,
                            featureImageY: undefined,
                          }))
                        }
                      >
                        Remove Image
                      </button>
                    )}
                  </div>

                  {activePage.featureImageUrl ? (
                    <div className="flex items-center gap-3 p-2 border border-stone-200 rounded-lg bg-stone-50">
                      <img
                        src={activePage.featureImageUrl}
                        alt="Feature"
                        className="w-16 h-16 object-contain bg-white rounded border border-stone-200"
                      />
                      <div className="flex-1 min-w-0">
                        <label className="pub-btn pub-btn-secondary w-full text-center cursor-pointer text-xs">
                          Replace Image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'feature')}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-stone-300 hover:border-red-600 rounded-lg cursor-pointer bg-stone-50 hover:bg-red-50/20 text-xs font-semibold text-stone-700 transition-colors">
                      <Upload size={14} /> Upload Feature Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'feature')}
                      />
                    </label>
                  )}

                  {activePage.featureImageUrl && (
                    <div className="pub-control-group mt-3">
                      <label>Image Layout & Positioning</label>
                      <div className="flex gap-1.5">
                        {(['right', 'center', 'free'] as const).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            className={`pub-btn flex-1 ${(activePage.featureImagePosition === pos || (pos === 'free' && activePage.featureImageX !== undefined))
                                ? 'pub-btn-primary'
                                : 'pub-btn-secondary'
                              }`}
                            onClick={() => {
                              if (pos === 'free') {
                                setSelectedElementId('feature_image');
                                updateActivePage((prev) => ({
                                  ...prev,
                                  featureImagePosition: 'free',
                                  featureImageX: prev.featureImageX ?? 380,
                                  featureImageY: prev.featureImageY ?? 110,
                                  featureImageWidth: prev.featureImageWidth ?? 180,
                                  featureImageHeight: prev.featureImageHeight ?? 220,
                                }));
                              } else {
                                updateActivePage((prev) => ({
                                  ...prev,
                                  featureImagePosition: pos,
                                  featureImageX: undefined,
                                  featureImageY: undefined,
                                }));
                              }
                            }}
                          >
                            {pos === 'free' ? 'Canva Free Drag' : pos === 'right' ? 'Float Right' : 'Centered'}
                          </button>
                        ))}
                      </div>
                      <span className="text-[11px] text-sky-700 bg-sky-50 p-2 rounded mt-1.5 block">
                        💡 <strong>Canva mode:</strong> Click on the image on the sheet to freely move and resize using handle points.
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TAB 2: ADVERTISEMENT (IMAGES ONLY) */}
            {activePage && activeTab === 'ad' && (
              <>
                {/* Main Advertisement Banner */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-stone-900 m-0">Page Advertisement Banner</label>
                    <button
                      type="button"
                      className="pub-btn pub-btn-secondary text-xs"
                      onClick={() => setIsAdModalOpen(true)}
                    >
                      <Palette size={13} /> Saved Banners
                    </button>
                  </div>

                  {activePage.ad?.imageUrl ? (
                    <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2.5">
                      <div className="h-24 bg-white rounded border border-stone-200 p-1 flex items-center justify-center overflow-hidden">
                        <img
                          src={activePage.ad.imageUrl}
                          alt="Banner"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      {/* Banner Scaling / Fit Mode */}
                      <div className="pub-control-group pt-1">
                        <label className="text-[11px] font-bold text-stone-700">Banner Sizing & Fit</label>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            className={`pub-btn text-xs py-1 px-1.5 justify-center ${(activePage.ad?.fit || 'fill') === 'fill' ? 'pub-btn-primary' : 'pub-btn-secondary'}`}
                            onClick={() =>
                              updateActivePage((prev) => ({
                                ...prev,
                                ad: { ...prev.ad, fit: 'fill' },
                              }))
                            }
                            title="Stretch edge-to-edge to fill the full bottom slot"
                          >
                            Fill Width
                          </button>
                          <button
                            type="button"
                            className={`pub-btn text-xs py-1 px-1.5 justify-center ${activePage.ad?.fit === 'cover' ? 'pub-btn-primary' : 'pub-btn-secondary'}`}
                            onClick={() =>
                              updateActivePage((prev) => ({
                                ...prev,
                                ad: { ...prev.ad, fit: 'cover' },
                              }))
                            }
                            title="Crop edges to fill slot without stretching"
                          >
                            Cover
                          </button>
                          <button
                            type="button"
                            className={`pub-btn text-xs py-1 px-1.5 justify-center ${activePage.ad?.fit === 'contain' ? 'pub-btn-primary' : 'pub-btn-secondary'}`}
                            onClick={() =>
                              updateActivePage((prev) => ({
                                ...prev,
                                ad: { ...prev.ad, fit: 'contain' },
                              }))
                            }
                            title="Keep aspect ratio inside slot"
                          >
                            Contain
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="pub-btn pub-btn-secondary flex-1 text-center cursor-pointer text-xs">
                          <Upload size={13} /> Change Image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'ad')}
                          />
                        </label>
                        <button
                          type="button"
                          className="pub-btn pub-btn-danger text-xs"
                          onClick={() =>
                            updateActivePage((prev) => ({
                              ...prev,
                              ad: { type: 'none', imageUrl: undefined },
                            }))
                          }
                        >
                          Remove Ad
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-stone-300 hover:border-red-600 rounded-lg cursor-pointer bg-stone-50 hover:bg-red-50/20 text-xs font-semibold text-stone-700 transition-colors">
                        <Upload size={15} /> Upload Banner Image (PNG, JPG)
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'ad')}
                        />
                      </label>

                      <div className="flex items-center gap-2 text-stone-400 text-xs my-1">
                        <div className="flex-1 h-px bg-stone-200" />
                        <span>OR</span>
                        <div className="flex-1 h-px bg-stone-200" />
                      </div>

                      <input
                        type="text"
                        className="pub-input text-xs"
                        placeholder="Paste banner image URL here..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const url = (e.target as HTMLInputElement).value.trim();
                            if (url) {
                              updateActivePage((prev) => ({
                                ...prev,
                                ad: { type: 'image', imageUrl: url, fit: 'fill' },
                              }));
                            }
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Bottom Strip Height (when in fixed bottom mode) */}
                  {activePage.adMode !== 'free' && (
                    <div className="pub-control-group">
                      <div className="flex justify-between items-center text-xs">
                        <label className="m-0">Bottom Banner Height</label>
                        <span className="font-semibold text-stone-700">{activePage.adHeight || 175}px</span>
                      </div>
                      <input
                        type="range"
                        min="80"
                        max="320"
                        step="5"
                        value={activePage.adHeight || 175}
                        onChange={(e) =>
                          updateActivePage((prev) => ({
                            ...prev,
                            adHeight: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full accent-red-600"
                      />
                    </div>
                  )}

                  {/* Ad Placement Mode */}
                  <div className="pub-control-group pt-2">
                    <label>Placement Mode</label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className={`pub-btn flex-1 ${activePage.adMode !== 'free' && activePage.ad?.type !== 'none' ? 'pub-btn-primary' : 'pub-btn-secondary'}`}
                        onClick={() =>
                          updateActivePage((prev) => ({
                            ...prev,
                            adMode: 'bottom',
                            ad: { ...prev.ad, type: 'image' },
                          }))
                        }
                      >
                        Fixed Bottom Strip
                      </button>
                      <button
                        type="button"
                        className={`pub-btn flex-1 ${activePage.adMode === 'free' ? 'pub-btn-primary' : 'pub-btn-secondary'}`}
                        onClick={() => {
                          setSelectedElementId('main_ad');
                          updateActivePage((prev) => ({
                            ...prev,
                            adMode: 'free',
                            ad: { ...prev.ad, type: 'image' },
                            adX: prev.adX ?? 14,
                            adY: prev.adY ?? 645,
                            adWidth: prev.adWidth ?? 567,
                            adHeight: prev.adHeight ?? 180,
                          }));
                        }}
                      >
                        Canva Free Drag
                      </button>
                    </div>
                  </div>
                </div>

                {/* Additional Canvas Ad Images */}
                <div className="border-t border-stone-200 pt-3 mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-stone-900 m-0">Additional Ad Images</label>
                    <label className="pub-btn pub-btn-secondary text-xs cursor-pointer">
                      <Plus size={13} /> Add Ad Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAddCanvasAdImage}
                      />
                    </label>
                  </div>
                  <span className="text-[11px] text-stone-500 block leading-tight">
                    Add multiple sponsor banners anywhere on the page and resize them like in Canva.
                  </span>
                </div>
              </>
            )}

            {/* TAB 3: HEADER & THEME */}
            {activeTab === 'header' && (
              <>
                <div className="pub-control-group">
                  <label>Publication Name (Masthead)</label>
                  <input
                    type="text"
                    className="pub-input"
                    value={activePublication.masterHeader.publicationName}
                    onChange={(e) =>
                      setActivePublication({
                        ...activePublication,
                        masterHeader: {
                          ...activePublication.masterHeader,
                          publicationName: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="pub-control-group">
                  <label>Header Tagline</label>
                  <input
                    type="text"
                    className="pub-input"
                    value={activePublication.masterHeader.tagline}
                    onChange={(e) =>
                      setActivePublication({
                        ...activePublication,
                        masterHeader: {
                          ...activePublication.masterHeader,
                          tagline: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="pub-control-group">
                  <label>Edition / Booklet Title</label>
                  <input
                    type="text"
                    className="pub-input"
                    value={activePublication.masterHeader.editionTitle}
                    onChange={(e) =>
                      setActivePublication({
                        ...activePublication,
                        masterHeader: {
                          ...activePublication.masterHeader,
                          editionTitle: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="pub-control-group">
                    <label>City / Location</label>
                    <input
                      type="text"
                      className="pub-input"
                      value={activePublication.masterHeader.cityLocation}
                      onChange={(e) =>
                        setActivePublication({
                          ...activePublication,
                          masterHeader: {
                            ...activePublication.masterHeader,
                            cityLocation: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="pub-control-group">
                    <label>Issue Date / Month</label>
                    <input
                      type="text"
                      className="pub-input"
                      value={activePublication.masterHeader.issueDate}
                      onChange={(e) =>
                        setActivePublication({
                          ...activePublication,
                          masterHeader: {
                            ...activePublication.masterHeader,
                            issueDate: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                {/* Yellow Masthead Strip Configuration */}
                <div className="pub-control-card border border-yellow-300 bg-yellow-50/70 rounded-lg p-3 my-2">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-yellow-200">
                    <span className="font-bold text-xs text-yellow-950 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-600 inline-block" />
                      Frontpage Yellow Strip (नोंदणी पट्टी)
                    </span>
                    <div className="flex items-center gap-2">
                      {publicationSettings && (
                        <button
                          type="button"
                          onClick={handleSyncFromSettings}
                          title="Apply global Settings values for वर्ष, अंक, पृष्ठ, मूल्य"
                          className="text-[11px] text-amber-900 bg-yellow-200/90 hover:bg-yellow-300 px-2 py-0.5 rounded font-semibold flex items-center gap-1 border border-yellow-400 cursor-pointer"
                        >
                          <RefreshCw size={11} /> Sync from Settings
                        </button>
                      )}
                      <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activePublication.masterHeader.showYellowStrip !== false}
                          onChange={(e) =>
                            setActivePublication({
                              ...activePublication,
                              masterHeader: {
                                ...activePublication.masterHeader,
                                showYellowStrip: e.target.checked,
                              },
                            })
                          }
                        />
                        <span>Show on Frontpage</span>
                      </label>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-600 mb-2">
                    Appears directly beneath the header masthead on the front page only.
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="pub-control-group">
                      <label>वर्ष (Year / Volume)</label>
                      <input
                        type="text"
                        className="pub-input text-xs"
                        placeholder="3"
                        value={activePublication.masterHeader.year ?? '3'}
                        onChange={(e) =>
                          setActivePublication({
                            ...activePublication,
                            masterHeader: {
                              ...activePublication.masterHeader,
                              year: e.target.value,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="pub-control-group">
                      <label>अंक (Issue Number)</label>
                      <input
                        type="text"
                        className="pub-input text-xs"
                        placeholder="38"
                        value={activePublication.masterHeader.issueNumber ?? '38'}
                        onChange={(e) =>
                          setActivePublication({
                            ...activePublication,
                            masterHeader: {
                              ...activePublication.masterHeader,
                              issueNumber: e.target.value,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="pub-control-group">
                      <label>दिनांक (Date)</label>
                      <input
                        type="text"
                        className="pub-input text-xs"
                        placeholder="7/11/2026"
                        value={activePublication.masterHeader.volumeDate ?? activePublication.masterHeader.issueDate ?? '7/11/2026'}
                        onChange={(e) =>
                          setActivePublication({
                            ...activePublication,
                            masterHeader: {
                              ...activePublication.masterHeader,
                              volumeDate: e.target.value,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="pub-control-group">
                      <label>मूल्य (Price)</label>
                      <input
                        type="text"
                        className="pub-input text-xs"
                        placeholder="निःशुल्क"
                        value={activePublication.masterHeader.price ?? 'निःशुल्क'}
                        onChange={(e) =>
                          setActivePublication({
                            ...activePublication,
                            masterHeader: {
                              ...activePublication.masterHeader,
                              price: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="pub-control-group mt-2">
                    <label className="text-[11px] text-stone-600">Custom Strip Text Override (Optional)</label>
                    <input
                      type="text"
                      className="pub-input text-xs"
                      placeholder="Leave blank to use formatted values above"
                      value={activePublication.masterHeader.customStripText ?? ''}
                      onChange={(e) =>
                        setActivePublication({
                          ...activePublication,
                          masterHeader: {
                            ...activePublication.masterHeader,
                            customStripText: e.target.value,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="mt-2 p-1.5 bg-[#ffe600] border-y border-black text-center text-[10.5px] font-bold text-black select-none truncate">
                    {activePublication.masterHeader.customStripText?.trim() ||
                      `वर्ष : ${activePublication.masterHeader.year || '3'} | अंक : ${activePublication.masterHeader.issueNumber || '38'} | पृष्ठ : 1 | दिनांक ${activePublication.masterHeader.volumeDate || activePublication.masterHeader.issueDate || '7/11/2026'} | मूल्य : ${activePublication.masterHeader.price || 'निःशुल्क'}`}
                  </div>

                  {/* Two-way Connection Bar with Global Settings */}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-yellow-200 text-xs bg-yellow-100/70 -mx-3 -mb-3 p-2.5 rounded-b-lg">
                    <span className="text-[11px] text-yellow-950 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600 inline-block" />
                      Settings: वर्ष {publicationSettings?.year || '—'} | अंक {publicationSettings?.issueNumber || '—'} | पृष्ठ {publicationSettings?.pageLabel || '1'} | मूल्य {publicationSettings?.price || '—'}
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveToSettings}
                      title="Save these publication values as the new global defaults in Settings"
                      className="text-[11px] text-stone-800 hover:text-stone-950 bg-white hover:bg-yellow-50 border border-yellow-400 px-2 py-0.5 rounded font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Save size={11} /> Save to Settings
                    </button>
                  </div>
                </div>

                {/* Page Numbering Controls */}
                <div className="pub-control-card border border-stone-200 bg-stone-50/70 rounded-lg p-3 my-2">
                  <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-stone-200">
                    <span className="font-bold text-xs text-stone-900">Page Numbering (पृष्ठ क्रमांक)</span>
                    <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePublication.masterHeader.showPageNumbers !== false}
                        onChange={(e) =>
                          setActivePublication({
                            ...activePublication,
                            masterHeader: {
                              ...activePublication.masterHeader,
                              showPageNumbers: e.target.checked,
                            },
                          })
                        }
                      />
                      <span>Show on all pages</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Displays पृष्ठ : 1 on frontpage yellow strip, and running page numbers on all inner & back pages (in running sub-header and footer).
                  </p>
                </div>

                <div className="pub-control-group">
                  <label>Header Emblem / Logo</label>
                  {activePublication.masterHeader.centerLogoUrl ? (
                    <div className="flex gap-2.5 items-center">
                      <img
                        src={activePublication.masterHeader.centerLogoUrl}
                        alt="Logo"
                        className="w-9 h-9 rounded-full object-contain border border-stone-200"
                      />
                      <button
                        type="button"
                        className="pub-btn pub-btn-danger text-xs"
                        onClick={() =>
                          setActivePublication({
                            ...activePublication,
                            masterHeader: {
                              ...activePublication.masterHeader,
                              centerLogoUrl: undefined,
                            },
                          })
                        }
                      >
                        Remove Logo
                      </button>
                    </div>
                  ) : (
                    <label className="pub-btn pub-btn-secondary text-center cursor-pointer text-xs">
                      <Upload size={14} /> Upload Header Logo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                      />
                    </label>
                  )}
                </div>

                <div className="pub-control-group pt-1">
                  <label>Decorative Outer Print Border</label>
                  <button
                    type="button"
                    className={`pub-btn ${activePage?.decorativeBorder !== false ? 'pub-btn-primary' : 'pub-btn-secondary'}`}
                    onClick={() =>
                      updateActivePage((prev) => ({
                        ...prev,
                        decorativeBorder: !prev.decorativeBorder,
                      }))
                    }
                  >
                    {activePage?.decorativeBorder !== false
                      ? '✔ Double Gold Print Border Active'
                      : 'Border Hidden'}
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      <AdPresetModal
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
        onSelectAd={(selectedAd) => {
          if (activePage) {
            updateActivePage((prev) => ({
              ...prev,
              ad: { ...selectedAd, fit: selectedAd.fit || 'fill' },
            }));
          }
        }}
      />

      {/* Staging Render Target for PDF & PNG Generation (Hidden behind modal backdrop during export) */}
      <div
        id="pub-export-stage-container"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 595,
          minWidth: 595,
          maxWidth: 595,
          height: 842,
          minHeight: 842,
          maxHeight: 842,
          overflow: 'visible',
          pointerEvents: 'none',
          zIndex: 40,
          opacity: printRenderPage ? 1 : 0,
          visibility: printRenderPage ? 'visible' : 'hidden',
          backgroundColor: '#fffdf5',
        }}
      >
        {printRenderPage && (
          <PublicationPageSheet
            id="pub-export-offscreen-sheet"
            page={printRenderPage}
            masterHeader={activePublication.masterHeader}
            totalPages={activePublication.pages.length}
            settings={publicationSettings}
            scale={1}
            interactive={false}
          />
        )}
      </div>
    </div>
  );
}
