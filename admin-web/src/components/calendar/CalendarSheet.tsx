import React, { useEffect, useState } from 'react';
import type { CalendarAdElement, CalendarMonth } from '../../types/calendar';
import { DraggableResizableBox } from '../publications/DraggableResizableBox';
import { Upload } from 'lucide-react';

/** A4 dimensions in px at 96dpi / CSS px */
export const A4_W = 595;
export const A4_H = 842;

interface CalendarSheetProps {
  month: CalendarMonth;
  scale?: number;
  interactive?: boolean;
  selectedAdId?: string | null;
  onSelectAdId?: (id: string | null) => void;
  onUpdateAd?: (
    id: string,
    coords: { x: number; y: number; width: number; height: number }
  ) => void;
  onDeleteAd?: (id: string) => void;
  onUploadBackground?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadFile?: (file: File) => void;
  id?: string;
}

export const CalendarSheet: React.FC<CalendarSheetProps> = ({
  month,
  scale = 1,
  interactive = true,
  selectedAdId = null,
  onSelectAdId,
  onUpdateAd,
  onDeleteAd,
  onUploadBackground,
  onUploadFile,
  id,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Checkbox awareness with fallback to outerBorderWidth/outerBorderHeight
  const hasLeft = month.showLeftBorder ?? (month.outerBorderWidth === undefined || month.outerBorderWidth > 0);
  const hasRight = month.showRightBorder ?? (month.outerBorderWidth === undefined || month.outerBorderWidth > 0);
  const hasTop = month.showTopBorder ?? (month.outerBorderHeight === undefined || month.outerBorderHeight > 0);
  const hasBottom = month.showBottomBorder ?? (month.outerBorderHeight === undefined || month.outerBorderHeight > 0);

  const bLeft = hasLeft ? (month.outerBorderLeft ?? month.outerBorderWidth ?? 160) : 0;
  const bRight = hasRight ? (month.outerBorderRight ?? month.outerBorderWidth ?? 160) : 0;
  const bTop = hasTop ? (month.outerBorderTop ?? month.outerBorderHeight ?? 80) : 0;
  const bBottom = hasBottom ? (month.outerBorderBottom ?? month.outerBorderHeight ?? 80) : 0;

  const innerAds = month.ads.filter((a) => !a.zone || a.zone === 'inner');
  const outerAds = month.ads.filter((a) => a.zone === 'outer');

  // Full canvas size including active outer borders
  const totalW = A4_W + bLeft + bRight;
  const totalH = A4_H + bTop + bBottom;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (onUploadFile) {
        onUploadFile(file);
      } else if (onUploadBackground) {
        const syntheticEvent = {
          target: { files: e.dataTransfer.files, value: '' },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onUploadBackground(syntheticEvent);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onUploadFile) {
        onUploadFile(file);
      } else if (onUploadBackground) {
        onUploadBackground(e);
      }
    }
    e.target.value = '';
  };

  return (
    <div
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center',
        width: totalW,
        height: totalH,
        flexShrink: 0,
      }}
    >
      {/* ============================================================
          OUTER POSTER FRAME — Pure white border columns with ads
          The calendar sits in the center between these outer white columns!
          ============================================================ */}
      <div
        id={id}
        className="relative select-none bg-white shadow-2xl box-border border border-stone-200"
        style={{ width: totalW, height: totalH }}
        onClick={() => {
          if (interactive) onSelectAdId?.(null);
        }}
      >
        {/* TOP outer border strip (white) */}
        {bTop > 0 && (
          <div
            className="absolute left-0 top-0 bg-white border-b border-stone-200 flex items-center justify-center pointer-events-none"
            style={{ width: totalW, height: bTop }}
          >
            <img
              src="/logoBanner.jpeg"
              alt="Education News"
              className="w-full h-full object-fill bg-yellow-300"
            />
            {interactive && (
              <span className="absolute text-[10px] uppercase font-bold tracking-wider text-stone-400 select-none opacity-0">
                Top Ad Strip ({bTop}px)
              </span>
            )}
          </div>
        )}

        {/* BOTTOM outer border strip (white) */}
        {bBottom > 0 && (
          <div
            className="absolute left-0 bg-white border-t border-stone-200 flex items-center justify-center pointer-events-none"
            style={{ left: 0, top: bTop + A4_H, width: totalW, height: bBottom }}
          >
            {interactive && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 select-none">
                Bottom Ad Strip ({bBottom}px)
              </span>
            )}
          </div>
        )}

        {/* LEFT white column for ads */}
        {bLeft > 0 && (
          <div
            className="absolute left-0 bg-white border-r border-stone-200 flex flex-col items-center justify-center pointer-events-none"
            style={{ left: 0, top: bTop, width: bLeft, height: A4_H }}
          >
            {interactive && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 -rotate-90 select-none whitespace-nowrap">
                Left White Column ({bLeft}px)
              </span>
            )}
          </div>
        )}

        {/* RIGHT white column for ads */}
        {bRight > 0 && (
          <div
            className="absolute bg-white border-l border-stone-200 flex flex-col items-center justify-center pointer-events-none"
            style={{ left: bLeft + A4_W, top: bTop, width: bRight, height: A4_H }}
          >
            {interactive && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 rotate-90 select-none whitespace-nowrap">
                Right White Column ({bRight}px)
              </span>
            )}
          </div>
        )}

        {/* ============================================================
            INNER CALENDAR PAGE — Sits centered inside the outer white columns
            ============================================================ */}
        <div
          className="absolute overflow-hidden bg-white shadow-sm border border-stone-300"
          style={{ left: bLeft, top: bTop, width: A4_W, height: A4_H }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Background image or Empty drop area */}
          {month.backgroundImageUrl ? (
            <img
              src={month.backgroundImageUrl}
              crossOrigin={month.backgroundImageUrl.startsWith('data:') ? undefined : 'anonymous'}
              alt={month.monthName}
              className="absolute inset-0 w-full h-full pointer-events-none select-none z-[1]"
              style={{ objectFit: 'fill' }}
              draggable={false}
            />
          ) : (
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-[1] transition-colors border-2 border-dashed ${
                isDraggingOver
                  ? 'border-red-500 bg-red-50/60'
                  : 'border-stone-300 bg-gradient-to-b from-stone-50 to-stone-100'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleFileDrop}
            >
              <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2 shadow-xs">
                <Upload size={24} />
              </div>
              <h3 className="text-sm font-bold text-stone-800 m-0 mb-1">
                No background for {month.monthName}
              </h3>
              <p className="text-[11px] text-stone-500 max-w-xs mb-3">
                Upload a calendar page image or import from the 12-month PDF.
              </p>
              {interactive && (
                <>
                  <label className="pub-btn pub-btn-primary text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-sm">
                    <Upload size={14} /> Upload Page Image
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleInputChange}
                    />
                  </label>
                  <p className="text-[10px] text-stone-400 mt-2">
                    or drag & drop your image/PDF directly here
                  </p>
                </>
              )}
            </div>
          )}

          {/* 2. Inner Ads Layer (overlaid inside the calendar page) */}
          <div className="absolute inset-0 z-[10] pointer-events-auto">
            {innerAds.map((ad: CalendarAdElement) => {
              const fit = ad.fit ?? 'fill';
              const isSelected = selectedAdId === ad.id;
              return (
                <DraggableResizableBox
                  key={ad.id}
                  id={ad.id}
                  x={ad.x}
                  y={ad.y}
                  width={ad.width}
                  height={ad.height}
                  scale={scale}
                  interactive={interactive}
                  isSelected={isSelected}
                  label={ad.label ?? 'Inner Ad'}
                  onSelect={() => onSelectAdId?.(ad.id)}
                  onChange={(coords) => onUpdateAd?.(ad.id, coords)}
                  onDelete={() => onDeleteAd?.(ad.id)}
                  zIndex={ad.zIndex ?? 20}
                >
                  <AdContent ad={ad} fit={fit} interactive={interactive} />
                </DraggableResizableBox>
              );
            })}
          </div>
        </div>

        {/* ============================================================
            OUTER ADS LAYER — Draggable in the outer border margins
            ============================================================ */}
        <div className="absolute inset-0 z-[20] pointer-events-none">
          {outerAds.map((ad: CalendarAdElement) => {
            const fit = ad.fit ?? 'fill';
            const isSelected = selectedAdId === ad.id;
            return (
              <DraggableResizableBox
                key={ad.id}
                id={ad.id}
                x={ad.x}
                y={ad.y}
                width={ad.width}
                height={ad.height}
                scale={scale}
                interactive={interactive}
                isSelected={isSelected}
                label={ad.label ?? 'Outer Ad'}
                onSelect={() => onSelectAdId?.(ad.id)}
                onChange={(coords) => onUpdateAd?.(ad.id, coords)}
                onDelete={() => onDeleteAd?.(ad.id)}
                zIndex={ad.zIndex ?? 30}
              >
                <AdContent ad={ad} fit={fit} interactive={interactive} />
              </DraggableResizableBox>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/** Shared ad content renderer with Multi-Image Auto-Scroll */
interface AdContentProps {
  ad: CalendarAdElement;
  fit: string;
  interactive?: boolean;
}

const AdContent: React.FC<AdContentProps> = ({ ad, fit, interactive = false }) => {
  const images = (ad.images && ad.images.length > 0)
    ? ad.images
    : (ad.imageUrl ? [ad.imageUrl] : []);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-scroll on public link (when not in editor)
  useEffect(() => {
    if (images.length <= 1 || interactive) return;

    const intervalSec = Math.max(1, ad.scrollInterval ?? 3.5);
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, intervalSec * 1000);

    return () => clearInterval(timer);
  }, [images.length, interactive, ad.scrollInterval]);

  const activeIdx = images.length > 0 ? (currentIndex % images.length) : 0;

  if (images.length === 0) {
    return (
      <div className="w-full h-full border border-dashed border-red-400 bg-red-50/70 flex flex-col items-center justify-center p-2 text-center text-red-700">
        <span className="text-[10px] font-bold uppercase tracking-wider">Empty Ad Slot</span>
        <span className="text-[9px] text-stone-500">Upload single or multi-slide ads</span>
      </div>
    );
  }

  // Marquee mode (continuous glide)
  if (ad.scrollMode === 'marquee' && !interactive && images.length > 1) {
    const isVertical = ad.height > ad.width * 1.4;
    return (
      <div className="w-full h-full overflow-hidden flex items-center justify-center bg-transparent relative">
        <div
          className={`flex ${isVertical ? 'flex-col animate-marquee-vertical' : 'flex-row animate-marquee-horizontal'} gap-2 w-full h-full items-center`}
        >
          {images.concat(images).map((src, i) => (
            <img
              key={i}
              src={src}
              crossOrigin={src.startsWith('data:') ? undefined : 'anonymous'}
              alt={`${ad.label ?? 'Ad'} slide ${i + 1}`}
              className="block select-none shrink-0"
              style={{
                width: isVertical ? '100%' : 'auto',
                height: isVertical ? 'auto' : '100%',
                maxHeight: '100%',
                objectFit: fit === 'contain' ? 'contain' : fit === 'cover' ? 'cover' : 'fill',
              }}
              draggable={false}
            />
          ))}
        </div>
      </div>
    );
  }

  // Carousel mode (Smooth auto-scroll cross-fade)
  return (
    <div className="w-full h-full overflow-hidden flex items-center justify-center bg-transparent relative group">
      {images.map((src, i) => {
        const isActive = i === activeIdx;
        return (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex items-center justify-center ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
          >
            <img
              src={src}
              crossOrigin={src.startsWith('data:') ? undefined : 'anonymous'}
              alt={`${ad.label ?? 'Ad'} slide ${i + 1}`}
              className="block select-none"
              style={{
                width: fit === 'contain' ? 'auto' : '100%',
                height: fit === 'contain' ? 'auto' : '100%',
                maxWidth: fit === 'contain' ? '100%' : undefined,
                maxHeight: fit === 'contain' ? '100%' : undefined,
                objectFit: fit === 'contain' ? 'contain' : fit === 'cover' ? 'cover' : 'fill',
              }}
              draggable={false}
            />
          </div>
        );
      })}

      {/* Multiple images indicator & slide badges */}
      {images.length > 1 && (
        <>
          <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded-full z-20 pointer-events-none">
            {images.map((_, i) => (
              <span
                key={i}
                className={`w-1 h-1 rounded-full transition-all ${
                  i === activeIdx ? 'bg-white scale-125' : 'bg-white/40'
                }`}
              />
            ))}
          </div>

          {interactive && (
            <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-20 pointer-events-auto flex items-center gap-1">
              <span>{activeIdx + 1}/{images.length}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
                }}
                className="hover:text-red-300 px-0.5 font-bold cursor-pointer"
                title="Previous slide preview"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev + 1) % images.length);
                }}
                className="hover:text-red-300 px-0.5 font-bold cursor-pointer"
                title="Next slide preview"
              >
                ▶
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
