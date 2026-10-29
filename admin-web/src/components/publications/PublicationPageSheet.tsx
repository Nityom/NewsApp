import React from 'react';
import type { PageAd, PublicationMasterHeader, PublicationPage } from '../../types/publication';
import { DraggableResizableBox } from './DraggableResizableBox';

interface PublicationPageSheetProps {
  page: PublicationPage;
  masterHeader: PublicationMasterHeader;
  scale?: number;
  interactive?: boolean;
  selectedElementId?: string | null;
  onSelectElementId?: (id: string | null) => void;
  onUpdateElement?: (
    type: 'feature_image' | 'main_ad' | 'canvas_element',
    coords: { x: number; y: number; width: number; height: number },
    elementId?: string
  ) => void;
  onDeleteElement?: (elementId: string) => void;
  id?: string;
}

export const PublicationPageSheet: React.FC<PublicationPageSheetProps> = ({
  page,
  masterHeader,
  scale = 1,
  interactive = false,
  selectedElementId,
  onSelectElementId,
  onUpdateElement,
  onDeleteElement,
  id,
}) => {
  const isCover = page.type === 'cover';
  const hasAd = page.ad && page.ad.type !== 'none';

  // Feature Image Coordinates (defaults if not yet set)
  const featX = page.featureImageX ?? (isCover ? 60 : 380);
  const featY = page.featureImageY ?? (isCover ? 110 : 110);
  const featW = page.featureImageWidth ?? (isCover ? 475 : 180);
  const featH = page.featureImageHeight ?? (isCover ? 440 : 220);

  // Main Ad Coordinates (defaults if not yet set)
  const adX = page.adX ?? 14;
  const adY = page.adY ?? 645;
  const adW = page.adWidth ?? 567;
  const adH = page.adHeight ?? 180;

  const isAdFree = page.adMode === 'free';
  const isFeatureFree = page.featureImagePosition === 'free' || page.featureImageX !== undefined || !page.featureImagePosition;
  const textAreaTop = isCover ? 0 : 100;
  const textAreaBottom = isCover ? 0 : 620;
  const imageOverlapsText = !isCover
    && isFeatureFree
    && !!page.featureImageUrl
    && featY + featH > textAreaTop
    && featY < textAreaBottom;
  const imageWrap = imageOverlapsText
    ? (lineIndex: number): React.CSSProperties => {
        const lineHeight = (page.fontSize || 14) * (page.lineHeight || 1.6);
        const lineTop = textAreaTop + lineIndex * lineHeight;
        const lineBottom = lineTop + lineHeight;
        if (lineBottom <= featY || lineTop >= featY + featH) return {};

        const rightInset = Math.max(0, 595 - featX);
        const leftInset = Math.max(0, featX + featW);
        const imageCenter = featX + featW / 2;
        if (imageCenter > 297) return { marginRight: `${rightInset + 10}px` };
        if (imageCenter < 297) return { marginLeft: `${leftInset + 10}px` };
        return { marginLeft: `${Math.max(0, featX - 10)}px`, marginRight: `${Math.max(0, 595 - featX - featW - 10)}px` };
      }
    : () => ({});

  return (
    <div
      id={id}
      className={`pub-sheet-container w-[595px] h-[842px] bg-[#fffef0] shadow-2xl relative shrink-0 box-border transition-transform ${
        interactive ? 'pub-interactive' : ''
      }`}
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center',
      }}
      onClick={() => {
        if (interactive) onSelectElementId?.(null);
      }}
    >
      <div className="pub-sheet-paper w-full h-full relative overflow-hidden bg-[#fffdf5] box-border p-2">
        {/* Double Decorative Print Border */}
        {page.decorativeBorder !== false && (
          <div className="pub-print-outer-border absolute inset-[6px] border-2 border-yellow-600 pointer-events-none z-[5] after:content-[''] after:absolute after:inset-[2px] after:border after:border-yellow-500" />
        )}

        <div className="pub-page-inner w-full h-full flex flex-col relative z-[1]">
          <img
            src={masterHeader.headerImageUrl || '/logoBanner.jpeg'}
            alt={masterHeader.publicationName || 'Publication header'}
            className="w-full h-[86px] object-fill bg-yellow-300 rounded mb-1 shrink-0"
            crossOrigin="anonymous"
          />
          {/* ================= COVER PAGE ================= */}
          {isCover ? (
            <div className="pub-cover-layout flex flex-col h-full bg-gradient-to-b from-yellow-200 via-amber-50 to-white box-border">
              <div className="flex-1 flex flex-col px-2 pt-2 min-h-0 overflow-hidden">
                {/* Cover Fixed Background Art (if not free dragging) */}
                {!isFeatureFree && page.featureImageUrl && (
                  <div className="pub-cover-hero-wrap flex-none max-h-[480px] flex flex-col items-center justify-center relative overflow-hidden my-1">
                    <img
                      src={page.featureImageUrl}
                      crossOrigin={page.featureImageUrl.startsWith('data:') ? undefined : 'anonymous'}
                      alt="Cover Feature"
                      className="pub-cover-hero-img max-w-full max-h-[480px] w-auto h-auto object-contain drop-shadow-md block m-auto"
                    />
                  </div>
                )}
                {page.greetingText?.trim() && (
                  <div className="pub-cover-greeting-ribbon relative z-30 mx-auto mt-2 max-w-[90%] bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 px-6 py-1.5 rounded-md shadow-md border border-blue-400">
                    <span className="pub-greeting-text font-serif text-[18px] text-white font-extrabold tracking-wide drop-shadow">
                      {page.greetingText}
                    </span>
                  </div>
                )}
                {page.content.trim() && (
                  <div
                    className="relative z-30 flex-1 min-h-0 overflow-hidden px-3 py-2 text-stone-900 bg-white/10"
                    style={{
                      fontSize: `${page.fontSize || 16}px`,
                      lineHeight: page.lineHeight || 1.6,
                      textAlign: page.textAlign || 'center',
                    }}
                  >
                    <div
                      className="pub-cover-content-rich"
                      dangerouslySetInnerHTML={{
                        __html: page.content.includes('<')
                          ? page.content
                          : page.content
                              .split('\n')
                              .map((line) => `<p>${line.trim() || '&nbsp;'}</p>`)
                              .join(''),
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Cover Bottom Ad (if classic bottom mode) */}
              {!isAdFree && hasAd && (
                <div
                  className="pub-cover-ad-slot mt-auto border-t-2 border-yellow-600 shrink-0 box-border overflow-hidden w-full flex items-center justify-center"
                  style={{ height: `${page.adHeight || 175}px` }}
                >
                  <AdSlotRenderer ad={page.ad} interactive={interactive} />
                </div>
              )}
            </div>
          ) : (
            /* ================= INNER & BACK PAGES ================= */
            <div className="pub-inner-layout flex flex-col h-full box-border">
              {/* Page Matter / Editorial Content */}
              <div className="pub-matter-section flex-1 min-h-0 flex flex-col px-3 py-1 overflow-hidden">
                {/* Title */}
                {page.title && (
                  <h2 className="pub-matter-title font-serif text-[18px] font-black text-red-700 text-center tracking-wide leading-tight m-0 mb-1 border-b border-dashed border-red-200 pb-1">
                    {page.title}
                  </h2>
                )}

                {/* Subtitle */}
                {page.subtitle && (
                  <h3 className="pub-matter-subtitle font-serif text-[13px] font-bold text-amber-800 text-center m-0 mb-1">
                    {page.subtitle}
                  </h3>
                )}

                {/* Text Body */}
                <div className="pub-matter-body-wrap flex-1 min-h-0 relative flex flex-col overflow-hidden">
                  {/* If feature image is in fixed float mode (not free) */}
                  {!isFeatureFree && page.featureImageUrl && page.featureImagePosition === 'right' && (
                    <div
                      className="pub-matter-float-image right float-right ml-3 mb-2 max-h-[160px] overflow-hidden rounded border border-amber-300 shadow-sm"
                      style={{ width: page.featureImageWidth ? `${page.featureImageWidth}%` : '28%' }}
                    >
                      <img src={page.featureImageUrl} crossOrigin="anonymous" alt="Illustration" className="w-full h-full object-contain" />
                    </div>
                  )}

                  {!isFeatureFree && page.featureImageUrl && page.featureImagePosition === 'center' && (
                    <div
                      className="pub-matter-center-image mx-auto mb-2 max-h-[160px] overflow-hidden rounded border border-amber-300 shadow-sm"
                      style={{ width: page.featureImageWidth ? `${page.featureImageWidth}%` : '40%' }}
                    >
                      <img src={page.featureImageUrl} crossOrigin="anonymous" alt="Illustration" className="w-full h-full object-contain" />
                    </div>
                  )}

                  <div
                    className="pub-matter-text font-serif text-stone-900 overflow-hidden"
                    style={{
                      fontSize: `${page.fontSize || 14}px`,
                      lineHeight: page.lineHeight || 1.6,
                      textAlign: page.textAlign || 'center',
                    }}
                  >
                    {page.content.includes('<') ? (
                      <div
                        className="pub-rich-page-content"
                        dangerouslySetInnerHTML={{ __html: page.content }}
                      />
                    ) : page.content.split('\n').map((line, idx) => {
                      const trimmed = line.trim();
                      if (trimmed.startsWith('❖') || trimmed.startsWith('✿') || trimmed.startsWith('---')) {
                        return (
                          <div key={idx} className="pub-ornamental-divider text-center text-[14px] text-green-700 tracking-widest my-1.5 select-none">
                            {trimmed}
                          </div>
                        );
                      }
                      if (trimmed.startsWith('!!') && trimmed.endsWith('!!')) {
                        return (
                          <h4 key={idx} className="pub-inline-subheading font-serif text-[16px] font-extrabold text-red-600 text-center my-1.5">
                            {trimmed}
                          </h4>
                        );
                      }
                      return (
                        <p
                          key={idx}
                          className={trimmed === '' ? 'pub-empty-paragraph h-2' : 'pub-verse-line m-0 py-0.5 leading-relaxed font-medium'}
                          style={imageWrap(idx)}
                        >
                          {trimmed || '\u00A0'}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Advertisement Slot (if in classic fixed mode) */}
              {!isAdFree && hasAd && (
                <div
                  className="pub-inner-ad-slot mt-auto border-t-2 border-yellow-600 shrink-0 overflow-hidden flex items-center justify-center box-border w-full"
                  style={{ height: `${page.adHeight || 175}px` }}
                >
                  <AdSlotRenderer ad={page.ad} interactive={interactive} />
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              CANVA-LIKE FREEFORM DRAGGABLE & RESIZABLE ELEMENTS
              ======================================================== */}

          {/* 1. Feature / Deity Image (Free Draggable & Resizable) */}
          {page.featureImageUrl && isFeatureFree && (
            <DraggableResizableBox
              id="feature_image_box"
              x={featX}
              y={featY}
              width={featW}
              height={featH}
              scale={scale}
              interactive={interactive}
              isSelected={selectedElementId === 'feature_image'}
              label="Feature Image"
              onSelect={() => onSelectElementId?.('feature_image')}
              onChange={(coords) => onUpdateElement?.('feature_image', coords)}
              zIndex={20}
            >
              <div className="pub-draggable-image-content w-full h-full relative overflow-hidden flex items-center justify-center">
                <img
                  src={page.featureImageUrl}
                  crossOrigin={page.featureImageUrl.startsWith('data:') ? undefined : 'anonymous'}
                  alt="Feature"
                  className="pub-draggable-img-tag max-w-full max-h-full w-auto h-auto object-contain block m-auto select-none"
                  draggable={false}
                />
                {isCover && page.greetingText && (
                  <div className="pub-cover-greeting-ribbon-free absolute bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded shadow-md border border-blue-400 whitespace-nowrap">
                    <span className="pub-greeting-text font-serif text-sm font-bold">{page.greetingText}</span>
                  </div>
                )}
              </div>
            </DraggableResizableBox>
          )}

          {/* 2. Main Advertisement (when in Free Draggable Mode) */}
          {hasAd && isAdFree && (
            <DraggableResizableBox
              id="main_ad_box"
              x={adX}
              y={adY}
              width={adW}
              height={adH}
              scale={scale}
              interactive={interactive}
              isSelected={selectedElementId === 'main_ad'}
              label="Ad Banner"
              onSelect={() => onSelectElementId?.('main_ad')}
              onChange={(coords) => onUpdateElement?.('main_ad', coords)}
              zIndex={25}
            >
              <div className="w-full h-full overflow-hidden">
                <AdSlotRenderer ad={page.ad} interactive={interactive} />
              </div>
            </DraggableResizableBox>
          )}

          {/* 3. Additional Free Canvas Elements (Extra Ads & Images anywhere on the page!) */}
          {page.canvasElements?.map((elem) => (
            <DraggableResizableBox
              key={elem.id}
              id={elem.id}
              x={elem.x}
              y={elem.y}
              width={elem.width}
              height={elem.height}
              scale={scale}
              interactive={interactive}
              isSelected={selectedElementId === elem.id}
              label={elem.label || 'Ad Banner'}
              onSelect={() => onSelectElementId?.(elem.id)}
              onChange={(coords) => onUpdateElement?.('canvas_element', coords, elem.id)}
              onDelete={() => onDeleteElement?.(elem.id)}
              zIndex={elem.zIndex || 22}
            >
              <div className="w-full h-full overflow-hidden">
                {elem.imageUrl && (
                  <img
                    src={elem.imageUrl}
                    crossOrigin={elem.imageUrl.startsWith('data:') ? undefined : 'anonymous'}
                    alt="Ad Banner"
                    className="w-full h-full block select-none"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: elem.objectFit || 'fill',
                    }}
                    draggable={false}
                  />
                )}
              </div>
            </DraggableResizableBox>
          ))}
        </div>
      </div>
    </div>
  );
};

interface AdSlotRendererProps {
  ad: PageAd;
  interactive?: boolean;
}

export const AdSlotRenderer: React.FC<AdSlotRendererProps> = ({ ad, interactive }) => {
  if (ad?.imageUrl) {
    const fit = ad.fit || 'fill';
    const isContain = fit === 'contain';
    const isCover = fit === 'cover';

    return (
      <div className="w-full h-full overflow-hidden flex items-center justify-center bg-transparent">
        <img
          src={ad.imageUrl}
          crossOrigin={ad.imageUrl.startsWith('data:') ? undefined : 'anonymous'}
          alt={ad.name || 'Advertisement Banner'}
          className={
            isContain
              ? 'max-w-full max-h-full w-auto h-auto object-contain block m-auto select-none'
              : 'w-full h-full block select-none'
          }
          style={{
            width: isContain ? 'auto' : '100%',
            height: isContain ? 'auto' : '100%',
            maxWidth: isContain ? '100%' : undefined,
            maxHeight: isContain ? '100%' : undefined,
            objectFit: isContain ? 'contain' : isCover ? 'cover' : 'fill',
          }}
          draggable={false}
        />
      </div>
    );
  }

  // Placeholder when empty
  if (interactive) {
    return (
      <div className="w-full h-full border-2 border-dashed border-amber-300 rounded-md bg-amber-50/50 flex flex-col items-center justify-center p-3 text-amber-800 gap-1 select-none">
        <span className="text-xs font-bold uppercase tracking-wider">Advertisement Banner</span>
        <span className="text-[11px] text-stone-500">Assign an image in the Ad inspector</span>
      </div>
    );
  }

  return null;
};
