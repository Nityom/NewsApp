import React from 'react';
import type { PageAd, PublicationMasterHeader, PublicationPage } from '../../types/publication';
import { toEditorHtml } from '../../lib/richTextFormat';
import { DraggableResizableBox } from './DraggableResizableBox';

interface PublicationPageSheetProps {
  page: PublicationPage;
  masterHeader: PublicationMasterHeader;
  totalPages?: number;
  settings?: {
    year?: string;
    issueNumber?: string;
    price?: string;
    pageLabel?: string;
  } | null;
  scale?: number;
  interactive?: boolean;
  selectedElementId?: string | null;
  onSelectElementId?: (id: string | null) => void;
  onUpdateElement?: (
    type: 'feature_image' | 'main_ad' | 'canvas_element' | 'reporter_name' | 'section2_reporter_name' | 'subtitle' | 'section2_subtitle',
    coords: { x: number; y: number; width: number; height: number },
    elementId?: string
  ) => void;
  onDeleteElement?: (elementId: string) => void;
  id?: string;
}

const formatMarathiDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const monthMap: Record<string, string> = {
    January: 'जानेवारी',
    February: 'फेब्रुवारी',
    March: 'मार्च',
    April: 'एप्रिल',
    May: 'मे',
    June: 'जून',
    July: 'जुलै',
    August: 'ऑगस्ट',
    September: 'सप्टेंबर',
    October: 'ऑक्टोबर',
    November: 'नोव्हेंबर',
    December: 'डिसेंबर',
    Jan: 'जानेवारी',
    Feb: 'फेब्रुवारी',
    Mar: 'मार्च',
    Apr: 'एप्रिल',
    Jun: 'जून',
    Jul: 'जुलै',
    Aug: 'ऑगस्ट',
    Sep: 'सप्टेंबर',
    Sept: 'सप्टेंबर',
    Oct: 'ऑक्टोबर',
    Nov: 'नोव्हेंबर',
    Dec: 'डिसेंबर',
  };

  let result = dateStr;
  for (const [en, mr] of Object.entries(monthMap)) {
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    result = result.replace(regex, mr);
  }
  return result;
};

export const PublicationPageSheet: React.FC<PublicationPageSheetProps> = ({
  page,
  masterHeader,
  totalPages,
  settings,
  scale = 1,
  interactive = false,
  selectedElementId,
  onSelectElementId,
  onUpdateElement,
  onDeleteElement,
  id,
}) => {
  const isCover = page.type === 'cover';
  const isFrontPage = page.pageNumber === 1 || isCover;
  const hasAd = page.ad && page.ad.type !== 'none';

  // Resolved values connected to global settings
  const effYear = masterHeader.year || settings?.year || '3';
  const effIssue = masterHeader.issueNumber || settings?.issueNumber || '38';
  const effPrice = masterHeader.price || settings?.price || 'निःशुल्क';
  const effPage = page.pageLabel || (page.pageNumber === 1 && settings?.pageLabel ? settings.pageLabel : page.pageNumber || 1);
  const rawDate = masterHeader.volumeDate || masterHeader.issueDate || '7/11/2026';
  const effDate = formatMarathiDate(rawDate);

  // Resolved publication name in Marathi
  const rawPubName = masterHeader.publicationName?.trim();
  const displayPubName =
    !rawPubName || rawPubName.toLowerCase() === 'education news'
      ? 'एज्युकेशन न्युज'
      : rawPubName;

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

  // Reporter Name Coordinates (defaults if not yet set)
  const isSplitCol1 = page.isSplitPage && (page.splitDirection === 'horizontal' || !page.splitDirection);
  const repW = page.reporterWidth ?? (isSplitCol1 ? 220 : 220);
  const repH = page.reporterHeight ?? 34;
  const repX = page.reporterX ?? (isSplitCol1 ? 75 : 365);
  const repY = page.reporterY ?? (
    page.isSplitPage && page.splitDirection === 'vertical'
      ? 355
      : (!isCover && hasAd && !isAdFree ? Math.max(350, 814 - (page.adHeight || 175) - 34) : 765)
  );

  // Story 2 Reporter Name Coordinates (defaults if not yet set)
  const sec2RepW = page.section2ReporterWidth ?? (isSplitCol1 ? 220 : 220);
  const sec2RepH = page.section2ReporterHeight ?? 34;
  const sec2RepX = page.section2ReporterX ?? 365;
  const sec2RepY = page.section2ReporterY ?? (
    !isCover && hasAd && !isAdFree ? Math.max(350, 814 - (page.adHeight || 175) - 34) : 765
  );

  // Subtitle Coordinates (defaults if not yet set)
  const isSubtitleFree = page.subtitleMode === 'free';
  const subW = page.subtitleWidth ?? (isSplitCol1 ? 230 : 340);
  const subH = page.subtitleHeight ?? 32;
  const subX = page.subtitleX ?? (isSplitCol1 ? 75 : 127);
  const subY = page.subtitleY ?? (104 + (page.title ? 28 : 0));

  // Story 2 Subtitle Coordinates (defaults if not yet set)
  const isSec2SubtitleFree = page.section2SubtitleMode === 'free';
  const sec2SubW = page.section2SubtitleWidth ?? (isSplitCol1 ? 230 : 340);
  const sec2SubH = page.section2SubtitleHeight ?? 32;
  const sec2SubX = page.section2SubtitleX ?? (isSplitCol1 ? 330 : 127);
  const sec2SubY = page.section2SubtitleY ?? 400;

  // Header banner is 86px tall + 4px margin = 90px
  // Yellow strip (frontpage) is ~26px; inner page subheader is ~22px
  const stripHeight = isFrontPage
    ? (masterHeader.showYellowStrip !== false ? 26 : 0)
    : (masterHeader.showPageNumbers !== false ? 22 : 0);
  const headerHeight = 90 + stripHeight;
  const titleHeight = page.title ? 28 : 0;
  const subtitleHeight = (page.subtitle && !isSubtitleFree) ? 18 : 0;
  const textTop = isCover ? 0 : (headerHeight + 4 + titleHeight + subtitleHeight);
  const adSlotHeight = (!isCover && hasAd && !isAdFree) ? (page.adHeight || 175) : 0;
  const textBottom = isCover ? 0 : (842 - 16 - adSlotHeight);

  const imageOverlapsText = !isCover
    && isFeatureFree
    && !!page.featureImageUrl
    && featY + featH > textTop
    && featY < textBottom;

  const imageCenter = featX + featW / 2;
  const isLeft = imageCenter <= 297;

  // Clear width: how wide the spacer needs to be to clear the image
  // Text content area spans from X=20px to X=575px (width 555px)
  const clearWidth = isLeft
    ? Math.max(40, Math.min(500, Math.round((featX + featW) - 20 + 12)))
    : Math.max(40, Math.min(500, Math.round((575 - featX) + 12)));

  const topOffset = Math.max(0, Math.round(featY - textTop));
  const bottomInText = Math.min(textBottom, featY + featH);
  const effectiveTopInText = Math.max(textTop, featY);
  const overlapHeight = Math.max(0, Math.round(bottomInText - effectiveTopInText));
  const totalSpacerHeight = topOffset + overlapHeight + 8;

  // Split-page (2 stories) calculations
  const isSplitHorizontal = Boolean(page.isSplitPage && (page.splitDirection === 'horizontal' || !page.splitDirection));
  const splitMidY = textTop + (textBottom - textTop) / 2;
  const imageOverlapsSection1 = Boolean(page.isSplitPage && imageOverlapsText && featY < splitMidY && featY + featH > textTop);
  const imageOverlapsSection2 = Boolean(page.isSplitPage && imageOverlapsText && featY + featH > splitMidY && featY < textBottom);

  const sec1TopOffset = Math.max(0, Math.round(featY - textTop));
  const sec1Bottom = Math.min(splitMidY, featY + featH);
  const sec1Overlap = Math.max(0, Math.round(sec1Bottom - Math.max(textTop, featY)));
  const sec1SpacerHeight = sec1TopOffset + sec1Overlap + 6;

  const sec2TopOffset = Math.max(0, Math.round(featY - splitMidY));
  const sec2Bottom = Math.min(textBottom, featY + featH);
  const sec2Overlap = Math.max(0, Math.round(sec2Bottom - Math.max(splitMidY, featY)));
  const sec2SpacerHeight = sec2TopOffset + sec2Overlap + 6;

  const renderContentBody = (contentStr?: string) => {
    if (!contentStr || !contentStr.trim()) return null;
    const normalized = toEditorHtml(contentStr);
    if (normalized.includes('<')) {
      return (
        <div
          className="pub-rich-page-content"
          dangerouslySetInnerHTML={{ __html: normalized }}
        />
      );
    }
    return contentStr.split('\n').map((line, idx) => {
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
        >
          {trimmed || '\u00A0'}
        </p>
      );
    });
  };

  const renderTitle = (
    titleStr?: string,
    color?: string,
    align?: 'left' | 'center' | 'right',
    size: 'lg' | 'md' | 'sm' = 'lg'
  ) => {
    if (!titleStr || !titleStr.trim()) return null;
    const isHtml = titleStr.includes('<');
    const sizeClass = size === 'lg' ? 'text-[18px]' : size === 'md' ? 'text-[17px]' : 'text-[16px]';
    return (
      <h2
        className={`pub-matter-title font-serif ${sizeClass} font-black tracking-wide leading-tight m-0 mb-1 border-b border-dashed border-red-200 pb-1 shrink-0`}
        style={{
          color: color || '#b91c1c',
          textAlign: align || 'center',
        }}
      >
        {isHtml ? (
          <span
            className="pub-rich-title inline-block w-full"
            dangerouslySetInnerHTML={{ __html: titleStr }}
          />
        ) : (
          titleStr
        )}
      </h2>
    );
  };

  const renderSubtitle = (
    subtitleStr?: string,
    color?: string,
    align?: 'left' | 'center' | 'right',
    size: 'lg' | 'md' | 'sm' = 'lg',
    isFree = false
  ) => {
    if (isFree) return null;
    if (!subtitleStr || !subtitleStr.trim()) return null;
    const isHtml = subtitleStr.includes('<');
    const sizeClass = size === 'lg' ? 'text-[13px]' : 'text-[12px]';
    return (
      <h3
        className={`pub-matter-subtitle font-serif ${sizeClass} font-bold m-0 mb-1 shrink-0`}
        style={{
          color: color || '#92400e',
          textAlign: align || 'center',
        }}
      >
        {isHtml ? (
          <span
            className="pub-rich-subtitle inline-block w-full"
            dangerouslySetInnerHTML={{ __html: subtitleStr }}
          />
        ) : (
          subtitleStr
        )}
      </h3>
    );
  };

  const renderReporterByline = (
    name?: string,
    fontSize?: number,
    color?: string,
    align?: 'left' | 'center' | 'right'
  ) => {
    if (!name || !name.trim()) return null;
    return (
      <div
        className="pub-reporter-byline select-none mt-1.5 shrink-0 overflow-visible"
        style={{
          fontSize: `${fontSize || 12}px`,
          color: color || '#57534e',
          textAlign: align || 'right',
          lineHeight: 1.5,
          paddingTop: '2px',
          paddingBottom: '2px',
        }}
      >
        — {name.trim()}
      </div>
    );
  };

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

          {/* Yellow Masthead Registration Strip - Frontpage Only */}
          {isFrontPage && masterHeader.showYellowStrip !== false && (
            <div
              className="pub-meta-strip w-full bg-[#ffe600] border-y border-black py-1 px-3 mb-1 text-center font-bold text-black tracking-wide shrink-0 select-none overflow-hidden"
              style={{ minHeight: '23px', boxSizing: 'border-box' }}
            >
              {masterHeader.customStripText?.trim() ? (
                <span className="text-[11.5px] font-bold block">{masterHeader.customStripText.trim()}</span>
              ) : (
                <span className="text-[11.5px] font-bold whitespace-nowrap block">
                  वर्ष : {effYear} &nbsp;|&nbsp; अंक : {effIssue} &nbsp;|&nbsp; पृष्ठ : {effPage} &nbsp;|&nbsp; दिनांक {effDate} &nbsp;|&nbsp; मूल्य : {effPrice}
                </span>
              )}
            </div>
          )}

          {/* Running Sub-Header Strip with Page Number - Inner & Back Pages */}
          {!isFrontPage && masterHeader.showPageNumbers !== false && (
            <div
              className="pub-inner-meta-strip w-full border-b border-stone-300 py-0.5 px-3 mb-1 flex items-center justify-between text-[11px] font-semibold text-stone-700 shrink-0 select-none"
              style={{ minHeight: '20px', boxSizing: 'border-box' }}
            >
              <span className="font-bold text-stone-800">
                {displayPubName}
              </span>
              <span className="text-stone-500 font-medium">
                {effDate}
              </span>
              <span className="font-bold text-red-700 bg-red-50/90 px-2 py-0.5 rounded border border-red-200">
                {page.pageLabel || `पृष्ठ : ${page.pageNumber}`}
              </span>
            </div>
          )}

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
                    {page.reporterMode === 'bottom' && renderReporterByline(page.reporterName, page.reporterNameSize, page.reporterNameColor, page.reporterNameAlign)}
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
                {isSplitHorizontal ? (
                  /* ===== HORIZONTAL (SIDE-BY-SIDE / 2 COLUMNS) ===== */
                  <div className="pub-matter-split-columns flex-1 min-h-0 flex flex-row overflow-hidden gap-2.5">
                    {/* Story 1 (Left Column) */}
                    <div className="pub-split-col flex-1 min-w-0 flex flex-col overflow-hidden">
                      {renderTitle(page.title, page.titleColor, page.titleAlign, 'sm')}
                      {renderSubtitle(page.subtitle, page.subtitleColor, page.subtitleAlign, 'sm', isSubtitleFree)}
                      <div className="pub-matter-body-wrap flex-1 min-h-0 relative flex flex-col overflow-hidden">
                        <div
                          className="pub-matter-text font-serif text-stone-900 overflow-hidden flex-1"
                          style={{
                            fontSize: `${page.fontSize || 13.5}px`,
                            lineHeight: page.lineHeight || 1.6,
                            textAlign: page.textAlign || 'center',
                          }}
                        >
                          {imageOverlapsText && isLeft && (
                            <div
                              className="pub-feature-wrap-spacer select-none"
                              aria-hidden="true"
                              style={{
                                float: featX > 140 ? 'right' : 'left',
                                width: `${Math.min(230, Math.max(40, featW + 8))}px`,
                                height: `${totalSpacerHeight}px`,
                                shapeOutside: topOffset > 6
                                  ? `polygon(0 ${topOffset}px, ${Math.min(230, Math.max(40, featW + 8))}px ${topOffset}px, ${Math.min(230, Math.max(40, featW + 8))}px ${totalSpacerHeight}px, 0 ${totalSpacerHeight}px)`
                                  : undefined,
                                clipPath: topOffset > 6
                                  ? `polygon(0 ${topOffset}px, 100% ${topOffset}px, 100% ${totalSpacerHeight}px, 0 ${totalSpacerHeight}px)`
                                  : undefined,
                                pointerEvents: 'none',
                                opacity: 0,
                                clear: 'none',
                              }}
                            />
                          )}
                          {renderContentBody(page.content)}
                        </div>
                        {page.reporterMode === 'bottom' && renderReporterByline(page.reporterName, page.reporterNameSize, page.reporterNameColor, page.reporterNameAlign)}
                      </div>
                    </div>

                    {/* Vertical Column Dividing Line */}
                    <div className="pub-col-divider flex flex-col items-center justify-center shrink-0 select-none px-0.5">
                      <div className="flex-1 w-[1px] border-r border-dashed border-red-300" />
                      <span className="text-[10px] text-amber-800 my-1 font-serif font-bold">❖</span>
                      <div className="flex-1 w-[1px] border-r border-dashed border-red-300" />
                    </div>

                    {/* Story 2 (Right Column) */}
                    <div className="pub-split-col flex-1 min-w-0 flex flex-col overflow-hidden">
                      {renderTitle(page.section2Title, page.section2TitleColor, page.section2TitleAlign, 'sm')}
                      {renderSubtitle(page.section2Subtitle, page.section2SubtitleColor, page.section2SubtitleAlign, 'sm', isSec2SubtitleFree)}
                      <div className="pub-matter-body-wrap flex-1 min-h-0 relative flex flex-col overflow-hidden">
                        <div
                          className="pub-matter-text font-serif text-stone-900 overflow-hidden flex-1"
                          style={{
                            fontSize: `${page.fontSize || 13.5}px`,
                            lineHeight: page.lineHeight || 1.6,
                            textAlign: page.textAlign || 'center',
                          }}
                        >
                          {imageOverlapsText && !isLeft && (
                            <div
                              className="pub-feature-wrap-spacer select-none"
                              aria-hidden="true"
                              style={{
                                float: featX < 430 ? 'left' : 'right',
                                width: `${Math.min(230, Math.max(40, featW + 8))}px`,
                                height: `${totalSpacerHeight}px`,
                                shapeOutside: topOffset > 6
                                  ? `polygon(0 ${topOffset}px, ${Math.min(230, Math.max(40, featW + 8))}px ${topOffset}px, ${Math.min(230, Math.max(40, featW + 8))}px ${totalSpacerHeight}px, 0 ${totalSpacerHeight}px)`
                                  : undefined,
                                clipPath: topOffset > 6
                                  ? `polygon(0 ${topOffset}px, 100% ${topOffset}px, 100% ${totalSpacerHeight}px, 0 ${totalSpacerHeight}px)`
                                  : undefined,
                                pointerEvents: 'none',
                                opacity: 0,
                                clear: 'none',
                              }}
                            />
                          )}
                          {renderContentBody(page.section2Content || '')}
                        </div>
                        {page.section2ReporterMode === 'bottom' && renderReporterByline(page.section2ReporterName, page.section2ReporterNameSize, page.section2ReporterNameColor, page.section2ReporterNameAlign)}
                      </div>
                    </div>
                  </div>
                ) : page.isSplitPage ? (
                  /* ===== VERTICAL (TOP & BOTTOM / 2 ROWS) ===== */
                  <div className="pub-matter-split-wrap flex-1 min-h-0 flex flex-col overflow-hidden">
                    {/* Story 1 (Top Section) */}
                    <div className="pub-split-section flex-1 min-h-0 flex flex-col overflow-hidden pb-1">
                      {renderTitle(page.title, page.titleColor, page.titleAlign, 'md')}
                      {renderSubtitle(page.subtitle, page.subtitleColor, page.subtitleAlign, 'md', isSubtitleFree)}
                      <div className="pub-matter-body-wrap flex-1 min-h-0 relative flex flex-col overflow-hidden">
                        <div
                          className="pub-matter-text font-serif text-stone-900 overflow-hidden flex-1"
                          style={{
                            fontSize: `${Math.max(11, (page.fontSize || 14) * 0.92)}px`,
                            lineHeight: page.lineHeight || 1.55,
                            textAlign: page.textAlign || 'center',
                          }}
                        >
                          {imageOverlapsSection1 && (
                            <div
                              className="pub-feature-wrap-spacer select-none"
                              aria-hidden="true"
                              style={{
                                float: isLeft ? 'left' : 'right',
                                width: `${clearWidth}px`,
                                height: `${sec1SpacerHeight}px`,
                                shapeOutside: sec1TopOffset > 6
                                  ? `polygon(0 ${sec1TopOffset}px, ${clearWidth}px ${sec1TopOffset}px, ${clearWidth}px ${sec1SpacerHeight}px, 0 ${sec1SpacerHeight}px)`
                                  : undefined,
                                clipPath: sec1TopOffset > 6
                                  ? `polygon(0 ${sec1TopOffset}px, 100% ${sec1TopOffset}px, 100% ${sec1SpacerHeight}px, 0 ${sec1SpacerHeight}px)`
                                  : undefined,
                                pointerEvents: 'none',
                                opacity: 0,
                                clear: 'none',
                              }}
                            />
                          )}
                          {renderContentBody(page.content)}
                        </div>
                        {page.reporterMode === 'bottom' && renderReporterByline(page.reporterName, page.reporterNameSize, page.reporterNameColor, page.reporterNameAlign)}
                      </div>
                    </div>

                    {/* Newspaper Story Separator */}
                    <div className="pub-split-divider my-1.5 py-0.5 flex items-center justify-center gap-2 select-none shrink-0">
                      <div className="flex-1 border-b border-dashed border-red-300" />
                      <span className="text-[11px] text-amber-800 tracking-widest font-serif font-bold">❖ ❖ ❖</span>
                      <div className="flex-1 border-b border-dashed border-red-300" />
                    </div>

                    {/* Story 2 (Bottom Section) */}
                    <div className="pub-split-section flex-1 min-h-0 flex flex-col overflow-hidden pt-0.5">
                      {renderTitle(page.section2Title, page.section2TitleColor, page.section2TitleAlign, 'md')}
                      {renderSubtitle(page.section2Subtitle, page.section2SubtitleColor, page.section2SubtitleAlign, 'md', isSec2SubtitleFree)}
                      <div className="pub-matter-body-wrap flex-1 min-h-0 relative flex flex-col overflow-hidden">
                        <div
                          className="pub-matter-text font-serif text-stone-900 overflow-hidden flex-1"
                          style={{
                            fontSize: `${Math.max(11, (page.fontSize || 14) * 0.92)}px`,
                            lineHeight: page.lineHeight || 1.55,
                            textAlign: page.textAlign || 'center',
                          }}
                        >
                          {imageOverlapsSection2 && (
                            <div
                              className="pub-feature-wrap-spacer select-none"
                              aria-hidden="true"
                              style={{
                                float: isLeft ? 'left' : 'right',
                                width: `${clearWidth}px`,
                                height: `${sec2SpacerHeight}px`,
                                shapeOutside: sec2TopOffset > 6
                                  ? `polygon(0 ${sec2TopOffset}px, ${clearWidth}px ${sec2TopOffset}px, ${clearWidth}px ${sec2SpacerHeight}px, 0 ${sec2SpacerHeight}px)`
                                  : undefined,
                                clipPath: sec2TopOffset > 6
                                  ? `polygon(0 ${sec2TopOffset}px, 100% ${sec2TopOffset}px, 100% ${sec2SpacerHeight}px, 0 ${sec2SpacerHeight}px)`
                                  : undefined,
                                pointerEvents: 'none',
                                opacity: 0,
                                clear: 'none',
                              }}
                            />
                          )}
                          {renderContentBody(page.section2Content || '')}
                        </div>
                        {page.section2ReporterMode === 'bottom' && renderReporterByline(page.section2ReporterName, page.section2ReporterNameSize, page.section2ReporterNameColor, page.section2ReporterNameAlign)}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ===== SINGLE SECTION (FULL PAGE ARTICLE) ===== */
                  <>
                    {/* Title */}
                    {renderTitle(page.title, page.titleColor, page.titleAlign, 'lg')}

                    {/* Subtitle */}
                    {renderSubtitle(page.subtitle, page.subtitleColor, page.subtitleAlign, 'lg', isSubtitleFree)}

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
                        className="pub-matter-text font-serif text-stone-900 overflow-hidden flex-1"
                        style={{
                          fontSize: `${page.fontSize || 14}px`,
                          lineHeight: page.lineHeight || 1.6,
                          textAlign: page.textAlign || 'center',
                        }}
                      >
                        {/* Auto-wrapping Float Spacer for Canva Free-drag Image */}
                        {imageOverlapsText && overlapHeight > 0 && (
                          <div
                            className="pub-feature-wrap-spacer select-none"
                            aria-hidden="true"
                            style={{
                              float: isLeft ? 'left' : 'right',
                              width: `${clearWidth}px`,
                              height: `${totalSpacerHeight}px`,
                              shapeOutside: topOffset > 6
                                ? `polygon(0 ${topOffset}px, ${clearWidth}px ${topOffset}px, ${clearWidth}px ${totalSpacerHeight}px, 0 ${totalSpacerHeight}px)`
                                : undefined,
                              clipPath: topOffset > 6
                                ? `polygon(0 ${topOffset}px, 100% ${topOffset}px, 100% ${totalSpacerHeight}px, 0 ${totalSpacerHeight}px)`
                                : undefined,
                              pointerEvents: 'none',
                              opacity: 0,
                              clear: 'none',
                            }}
                          />
                        )}

                        {renderContentBody(page.content)}
                      </div>
                      {page.reporterMode === 'bottom' && renderReporterByline(page.reporterName, page.reporterNameSize, page.reporterNameColor, page.reporterNameAlign)}
                    </div>
                  </>
                )}
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

              {/* Bottom Page Numbering for Inner Pages (when no bottom ad or freeform ad) */}
              {(!hasAd || isAdFree) && masterHeader.showPageNumbers !== false && (
                <div className="pub-page-bottom-number mt-auto pt-1 pb-0.5 text-center text-[10.5px] font-bold text-stone-600 select-none shrink-0 border-t border-stone-200/60">
                  — {displayPubName} • {page.pageLabel || `पृष्ठ : ${page.pageNumber}`} {totalPages ? ` / ${totalPages}` : ''} —
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

          {/* 4. Reporter Name Byline (Free Draggable & Resizable) */}
          {page.reporterMode !== 'bottom' && page.reporterName?.trim() && (
            <DraggableResizableBox
              id="reporter_name_box"
              x={repX}
              y={repY}
              width={repW}
              height={repH}
              scale={scale}
              interactive={interactive}
              isSelected={selectedElementId === 'reporter_name'}
              label="Reporter Name"
              onSelect={() => onSelectElementId?.('reporter_name')}
              onChange={(coords) => onUpdateElement?.('reporter_name', coords)}
              onDelete={() => onDeleteElement?.('reporter_name')}
              minWidth={60}
              minHeight={24}
              zIndex={26}
              overflowVisible={true}
            >
              <div
                className="w-full h-full flex items-center px-1 overflow-visible"
                style={{
                  justifyContent:
                    page.reporterNameAlign === 'center'
                      ? 'center'
                      : page.reporterNameAlign === 'left'
                      ? 'flex-start'
                      : 'flex-end',
                }}
              >
                <span
                  className="pub-reporter-byline select-none block overflow-visible"
                  style={{
                    fontSize: `${page.reporterNameSize || 12}px`,
                    color: page.reporterNameColor || '#57534e',
                    textAlign: page.reporterNameAlign || 'right',
                    lineHeight: 1.5,
                    paddingTop: '2px',
                    paddingBottom: '2px',
                    whiteSpace: 'nowrap',
                  }}
                  title={page.reporterName}
                >
                  {page.reporterName.trim().startsWith('—') || page.reporterName.trim().startsWith('-')
                    ? page.reporterName.trim()
                    : `— ${page.reporterName.trim()}`}
                </span>
              </div>
            </DraggableResizableBox>
          )}

          {/* 5. Section 2 Reporter Name Byline (Free Draggable & Resizable) */}
          {page.section2ReporterMode !== 'bottom' && page.isSplitPage && page.section2ReporterName?.trim() && (
            <DraggableResizableBox
              id="section2_reporter_name_box"
              x={sec2RepX}
              y={sec2RepY}
              width={sec2RepW}
              height={sec2RepH}
              scale={scale}
              interactive={interactive}
              isSelected={selectedElementId === 'section2_reporter_name'}
              label="Story 2 Reporter"
              onSelect={() => onSelectElementId?.('section2_reporter_name')}
              onChange={(coords) => onUpdateElement?.('section2_reporter_name', coords)}
              onDelete={() => onDeleteElement?.('section2_reporter_name')}
              minWidth={60}
              minHeight={24}
              zIndex={26}
              overflowVisible={true}
            >
              <div
                className="w-full h-full flex items-center px-1 overflow-visible"
                style={{
                  justifyContent:
                    page.section2ReporterNameAlign === 'center'
                      ? 'center'
                      : page.section2ReporterNameAlign === 'left'
                      ? 'flex-start'
                      : 'flex-end',
                }}
              >
                <span
                  className="pub-reporter-byline select-none block overflow-visible"
                  style={{
                    fontSize: `${page.section2ReporterNameSize || 12}px`,
                    color: page.section2ReporterNameColor || '#57534e',
                    textAlign: page.section2ReporterNameAlign || 'right',
                    lineHeight: 1.5,
                    paddingTop: '2px',
                    paddingBottom: '2px',
                    whiteSpace: 'nowrap',
                  }}
                  title={page.section2ReporterName}
                >
                  {page.section2ReporterName.trim().startsWith('—') || page.section2ReporterName.trim().startsWith('-')
                    ? page.section2ReporterName.trim()
                    : `— ${page.section2ReporterName.trim()}`}
                </span>
              </div>
            </DraggableResizableBox>
          )}

          {/* 6. Subtitle (Canva Free Draggable & Resizable) */}
          {page.subtitleMode === 'free' && page.subtitle?.trim() && (
            <DraggableResizableBox
              id="subtitle_box"
              x={subX}
              y={subY}
              width={subW}
              height={subH}
              scale={scale}
              interactive={interactive}
              isSelected={selectedElementId === 'subtitle'}
              label="Subtitle (उपशीर्षक)"
              onSelect={() => onSelectElementId?.('subtitle')}
              onChange={(coords) => onUpdateElement?.('subtitle', coords)}
              onDelete={() => onDeleteElement?.('subtitle')}
              minWidth={60}
              minHeight={20}
              zIndex={28}
              overflowVisible={true}
            >
              <div
                className="w-full h-full flex items-center px-1 overflow-visible"
                style={{
                  justifyContent:
                    page.subtitleAlign === 'center'
                      ? 'center'
                      : page.subtitleAlign === 'right'
                      ? 'flex-end'
                      : 'flex-start',
                }}
              >
                <div
                  className="pub-matter-subtitle font-serif font-bold block select-none overflow-visible w-full"
                  style={{
                    fontSize: `${page.subtitleSize || 13}px`,
                    color: page.subtitleColor || '#92400e',
                    textAlign: page.subtitleAlign || 'center',
                    lineHeight: 1.3,
                  }}
                  dangerouslySetInnerHTML={
                    page.subtitle.includes('<') ? { __html: page.subtitle } : undefined
                  }
                >
                  {!page.subtitle.includes('<') ? page.subtitle : undefined}
                </div>
              </div>
            </DraggableResizableBox>
          )}

          {/* 7. Story 2 Subtitle (Canva Free Draggable & Resizable) */}
          {page.isSplitPage && page.section2SubtitleMode === 'free' && page.section2Subtitle?.trim() && (
            <DraggableResizableBox
              id="section2_subtitle_box"
              x={sec2SubX}
              y={sec2SubY}
              width={sec2SubW}
              height={sec2SubH}
              scale={scale}
              interactive={interactive}
              isSelected={selectedElementId === 'section2_subtitle'}
              label="Story 2 Subtitle"
              onSelect={() => onSelectElementId?.('section2_subtitle')}
              onChange={(coords) => onUpdateElement?.('section2_subtitle', coords)}
              onDelete={() => onDeleteElement?.('section2_subtitle')}
              minWidth={60}
              minHeight={20}
              zIndex={28}
              overflowVisible={true}
            >
              <div
                className="w-full h-full flex items-center px-1 overflow-visible"
                style={{
                  justifyContent:
                    page.section2SubtitleAlign === 'center'
                      ? 'center'
                      : page.section2SubtitleAlign === 'right'
                      ? 'flex-end'
                      : 'flex-start',
                }}
              >
                <div
                  className="pub-matter-subtitle font-serif font-bold block select-none overflow-visible w-full"
                  style={{
                    fontSize: `${page.section2SubtitleSize || 13}px`,
                    color: page.section2SubtitleColor || '#92400e',
                    textAlign: page.section2SubtitleAlign || 'center',
                    lineHeight: 1.3,
                  }}
                  dangerouslySetInnerHTML={
                    page.section2Subtitle.includes('<') ? { __html: page.section2Subtitle } : undefined
                  }
                >
                  {!page.section2Subtitle.includes('<') ? page.section2Subtitle : undefined}
                </div>
              </div>
            </DraggableResizableBox>
          )}
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
