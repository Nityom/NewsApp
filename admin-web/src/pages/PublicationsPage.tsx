import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  Check,
  Copy,
  Download,
  FileImage,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Newspaper,
  Palette,
  Plus,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { PageType, Publication, PublicationPage } from '../types/publication';
import {
  deletePublication,
  duplicatePublication,
  getAllPublications,
  getPublication,
  savePublication,
} from '../lib/publicationsStorage';
import { exportBookletPDF, exportPageAsImage, type ExportProgress } from '../lib/publicationExport';
import { PublicationPageSheet } from '../components/publications/PublicationPageSheet';
import { AdPresetModal } from '../components/publications/AdPresetModal';
import { CalendarStudio } from '../components/calendar/CalendarStudio';

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

  // Hidden print render container for PDF compilation
  const [printRenderIndex, setPrintRenderIndex] = useState<number | null>(null);

  useEffect(() => {
    loadPublications();
  }, []);

  const loadPublications = async () => {
    setLoading(true);
    try {
      const list = await getAllPublications();
      setPublications(list);
    } catch (err) {
      console.error('Failed to load publications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditor = async (pubId: string) => {
    const pub = await getPublication(pubId);
    if (pub) {
      setActivePublication(pub);
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
        cityLocation: 'Wardha',
        issueDate: 'October 2026',
        themeColor: 'festive-red',
        primaryColor: '#bd3029',
        secondaryColor: '#f0d928',
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
    setSaveStatus('Saving changes...');
    await savePublication(activePublication);
    await loadPublications();
    setSaveStatus('Saved successfully!');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  // Page Operations
  const activePage = activePublication?.pages[activePageIndex] || null;

  const updateActivePage = (updater: (prev: PublicationPage) => PublicationPage) => {
    if (!activePublication || !activePage) return;
    const updatedPages = [...activePublication.pages];
    updatedPages[activePageIndex] = updater(activePage);

    setActivePublication({
      ...activePublication,
      pages: updatedPages,
      updatedAt: Date.now(),
    });
  };

  const handleAddPage = () => {
    if (!activePublication) return;
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
  };

  // Extra Freeform Canvas Ad Image
  const handleAddCanvasAdImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newElemId = `elem_ad_${Date.now()}`;
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
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              currentSection === 'publications'
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
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              currentSection === 'calendar'
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
                  <span className="pub-badge-local">
                    <HardDrive size={13} /> Local Storage
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
                onSelectAd={() => {}}
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
                <div className="pub-mini-title">{p.title || 'Untitled Page'}</div>
                <div className="pub-mini-lines">
                  <div className="pub-mini-line w-4/5" />
                  <div className="pub-mini-line w-11/12" />
                  <div className="pub-mini-line w-3/4" />
                  <div className="pub-mini-line w-5/6" />
                </div>
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
            <span>
              Page {activePageIndex + 1} of {activePublication.pages.length}
            </span>
            <span>•</span>
            <span>
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
              scale={canvasZoom}
              interactive={true}
              selectedElementId={selectedElementId}
              onSelectElementId={(id) => {
                setSelectedElementId(id);
                if (id === 'feature_image') {
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
                updateActivePage((prev) => ({
                  ...prev,
                  canvasElements: (prev.canvasElements || []).filter((el) => el.id !== elemId),
                }));
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

                <div className="pub-control-group">
                  <label>Page Title</label>
                  <input
                    type="text"
                    className="pub-input"
                    placeholder="e.g. Daily Aarti Collection"
                    value={activePage.title}
                    onChange={(e) =>
                      updateActivePage((prev) => ({ ...prev, title: e.target.value }))
                    }
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
                  <textarea
                    className="pub-textarea"
                    rows={9}
                    placeholder="Type verses, article text, or news matter here..."
                    value={activePage.content}
                    onChange={(e) =>
                      updateActivePage((prev) => ({ ...prev, content: e.target.value }))
                    }
                  />
                </div>

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
                            className={`pub-btn flex-1 ${
                              (activePage.featureImagePosition === pos || (pos === 'free' && activePage.featureImageX !== undefined))
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
          height: 842,
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
            scale={1}
            interactive={false}
          />
        )}
      </div>
    </div>
  );
}
