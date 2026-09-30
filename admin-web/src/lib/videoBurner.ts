export interface SponsorAdItem {
  id: string;
  type: 'text' | 'image';
  imageUrl?: string;
  businessName?: string;
  tagline?: string;
  phone?: string;
}

export interface VideoBurnerConfig {
  videoFile: File;
  headline: string;
  badgeText: string;
  headlineFontSize?: number;
  badgeColor?: string;
  reporterName?: string;
  reporterPhone?: string;
  showLogo?: boolean;
  ads?: SponsorAdItem[];
  adScrollMode?: 'scroll' | 'rotate'; // 'scroll' = continuous marquee ticker, 'rotate' = slide rotation
  adRotateInterval?: number; // seconds per ad (default 6)
  adScrollSpeed?: number; // pixels per second (default 140)
  aspectRatio?: 'auto' | 'portrait' | 'landscape'; // video orientation
  muteAudio?: boolean; // mute/unmute exported video audio
  footerHeight?: number; // base height in px
  footerWidth?: number; // percentage (50 - 100)
  videoYShift?: number; // vertical shift in px
  sponsorBannerUrl?: string;
  sponsorName?: string;
  sponsorPhone?: string;
  sponsorTagline?: string;
  onProgress?: (percent: number, statusText: string) => void;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export async function burnAndExportVideo(config: VideoBurnerConfig): Promise<Blob> {
  const {
    videoFile,
    headline,
    badgeText,
    headlineFontSize,
    reporterName,
    reporterPhone,
    showLogo = true,
    ads,
    adScrollMode = 'scroll',
    adRotateInterval = 6,
    adScrollSpeed = 140,
    aspectRatio = 'auto',
    muteAudio = false,
    footerHeight = 180,
    footerWidth = 100,
    videoYShift = 0,
    sponsorBannerUrl,
    sponsorName,
    sponsorPhone,
    sponsorTagline,
    onProgress,
  } = config;

  onProgress?.(5, 'Loading video file...');

  // Create offscreen video element
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = false; // We want audio
  video.playsInline = true;
  video.preload = 'auto';

  const videoUrl = URL.createObjectURL(videoFile);
  video.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video file.'));
  });

  const duration = video.duration || 60;
  const originalWidth = video.videoWidth || 1080;
  const originalHeight = video.videoHeight || 1920;
  const isVideoLandscape = originalWidth >= originalHeight;

  let targetLandscape: boolean;
  if (aspectRatio === 'landscape') {
    targetLandscape = true;
  } else if (aspectRatio === 'portrait') {
    targetLandscape = false;
  } else {
    targetLandscape = isVideoLandscape;
  }

  // Set export canvas dimensions
  let canvasWidth = targetLandscape ? 1920 : 1080;
  let canvasHeight = targetLandscape ? 1080 : 1920;

  if (targetLandscape && originalWidth <= 1280 && originalHeight <= 720) {
    canvasWidth = 1280;
    canvasHeight = 720;
  } else if (!targetLandscape && originalWidth <= 720 && originalHeight <= 1280) {
    canvasWidth = 720;
    canvasHeight = 1280;
  }

  // Ensure even dimensions for video codecs
  if (canvasWidth % 2 !== 0) canvasWidth--;
  if (canvasHeight % 2 !== 0) canvasHeight--;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize 2D canvas context.');

  // Preload logo and sponsor banner if available
  let logoImg: HTMLImageElement | null = null;
  if (showLogo) {
    try {
      logoImg = await loadImage('/app-logo.png');
    } catch {
      // Non-fatal if logo fails to load
    }
  }

  const adImagesMap = new Map<string, HTMLImageElement>();
  if (sponsorBannerUrl) {
    try {
      const defaultImg = await loadImage(sponsorBannerUrl);
      adImagesMap.set('default', defaultImg);
    } catch {
      // Non-fatal
    }
  }

  if (ads && ads.length > 0) {
    for (const ad of ads) {
      if (ad.type === 'image' && ad.imageUrl) {
        try {
          const img = await loadImage(ad.imageUrl);
          adImagesMap.set(ad.id, img);
        } catch {
          // Non-fatal
        }
      }
    }
  }

  onProgress?.(15, 'Preparing audio & recording stream...');

  // Setup AudioContext to capture original video audio track
  let audioStreamDestination: MediaStreamAudioDestinationNode | null = null;
  let audioCtx: AudioContext | null = null;
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const sourceNode = audioCtx.createMediaElementSource(video);
      audioStreamDestination = audioCtx.createMediaStreamDestination();
      sourceNode.connect(audioStreamDestination);
      // Also connect to a silent gain or avoid feedback
    }
  } catch (err) {
    console.warn('Audio capture setup failed, continuing without custom audio node:', err);
  }

  // Setup Canvas Stream
  const canvasStream = canvas.captureStream(30);
  const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

  if (!muteAudio && audioStreamDestination && audioStreamDestination.stream.getAudioTracks().length > 0) {
    combinedTracks.push(...audioStreamDestination.stream.getAudioTracks());
  }

  const combinedStream = new MediaStream(combinedTracks);

  // Pick best supported MIME type
  const supportedTypes = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  let chosenMime = supportedTypes.find((t) => MediaRecorder.isTypeSupported(t)) || 'video/webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: chosenMime,
    videoBitsPerSecond: 4_000_000, // 4 Mbps high quality
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  onProgress?.(25, 'Burning overlays onto video frames...');

  return new Promise<Blob>((resolve, reject) => {
    let animationFrameId: number;
    let isFinished = false;

    recorder.onstop = () => {
      URL.revokeObjectURL(videoUrl);
      if (audioCtx && audioCtx.state !== 'closed') {
        void audioCtx.close();
      }
      const finalBlob = new Blob(chunks, { type: chosenMime });
      onProgress?.(100, 'Complete! Downloading video...');
      resolve(finalBlob);
    };

    recorder.onerror = (err) => {
      cleanup();
      reject(err);
    };

    function cleanup() {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      URL.revokeObjectURL(videoUrl);
      if (audioCtx && audioCtx.state !== 'closed') {
        void audioCtx.close();
      }
    }

    function renderOverlays() {
      if (!ctx) return;

      const isLandscape = canvasWidth > canvasHeight;
      const scaleFactor = isLandscape
        ? (canvasHeight / 1080) * 0.9
        : canvasWidth / 1080;

      // 1. Draw video frame with aspect-ratio awareness
      const videoAspect = originalWidth / Math.max(1, originalHeight);
      const canvasAspect = canvasWidth / Math.max(1, canvasHeight);

      let drawVideoX = 0;
      let drawVideoY = 0;
      let drawVideoW = canvasWidth;
      let drawVideoH = canvasHeight;

      if (Math.abs(videoAspect - canvasAspect) > 0.04) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        if (videoAspect > canvasAspect) {
          drawVideoW = canvasWidth;
          drawVideoH = Math.round(canvasWidth / videoAspect);
          drawVideoY = Math.round((canvasHeight - drawVideoH) / 2);
        } else {
          drawVideoH = canvasHeight;
          drawVideoW = Math.round(canvasHeight * videoAspect);
          drawVideoX = Math.round((canvasWidth - drawVideoW) / 2);
        }
      }

      ctx.drawImage(video, drawVideoX, drawVideoY + Math.round((videoYShift || 0) * scaleFactor), drawVideoW, drawVideoH);

      // Typography scaling: Target 1080p standards
      const baseHeadlineSize = headlineFontSize || 56;
      const calcHeadlineSize = Math.max(28, Math.round(baseHeadlineSize * scaleFactor));
      const lineHeight = Math.round(calcHeadlineSize * 1.25);
      const headlineFont = `900 ${calcHeadlineSize}px 'DM Sans', 'Mukta', 'Noto Sans Devanagari', Arial, sans-serif`;

      // 2. MEASURE HEADLINE TO CALCULATE DYNAMIC TOP BAR HEIGHT
      ctx.font = headlineFont;
      const maxHeadlineWidth = canvasWidth - Math.round(60 * scaleFactor);
      const headlineLines = headline ? wrapText(ctx, headline, maxHeadlineWidth).slice(0, 2) : [];
      const numLines = Math.max(1, headlineLines.length);

      // Badge dimensions
      const badgeFontSize = Math.max(16, Math.round(24 * scaleFactor));
      const badgeFont = `bold ${badgeFontSize}px 'DM Sans', 'Mukta', Arial, sans-serif`;
      ctx.font = badgeFont;
      const badgeMetrics = ctx.measureText(badgeText || 'BREAKING NEWS');
      const badgePaddingX = Math.round(16 * scaleFactor);
      const badgeWidth = badgeMetrics.width + badgePaddingX * 2;
      const badgeHeight = Math.max(28, Math.round(40 * scaleFactor));
      const badgeX = Math.round(24 * scaleFactor);
      const badgeY = Math.round(18 * scaleFactor);

      // Top Bar dynamic height based on lines and logo
      const logoSize = Math.max(80, Math.round(135 * scaleFactor));
      const logoX = canvasWidth - logoSize - Math.round(24 * scaleFactor);
      const logoY = Math.round(14 * scaleFactor);

      const calculatedBarHeight = badgeY + badgeHeight + Math.round(14 * scaleFactor) + (numLines * lineHeight) + Math.round(20 * scaleFactor);
      const minBarForLogo = logoImg ? (logoY + logoSize + Math.round(14 * scaleFactor)) : 0;
      const topBarHeight = Math.max(calculatedBarHeight, minBarForLogo);

      // Draw Top Bar background gradient
      const topGradient = ctx.createLinearGradient(0, 0, 0, topBarHeight);
      topGradient.addColorStop(0, '#B71C1C'); // Deep news red
      topGradient.addColorStop(0.7, '#D32F2F');
      topGradient.addColorStop(1, '#9A0007');
      ctx.fillStyle = topGradient;
      ctx.fillRect(0, 0, canvasWidth, topBarHeight);

      // Yellow bottom accent line
      const accentHeight = Math.max(4, Math.round(7 * scaleFactor));
      ctx.fillStyle = '#FFD700'; // Bright gold yellow
      ctx.fillRect(0, topBarHeight - accentHeight, canvasWidth, accentHeight);

      // Draw Badge background pill
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, Math.round(6 * scaleFactor));
      ctx.fill();

      // Draw Badge text
      ctx.fillStyle = '#111111';
      ctx.font = badgeFont;
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText || 'BREAKING NEWS', badgeX + badgePaddingX, badgeY + badgeHeight / 2);

      // Draw Channel Logo in top right
      if (logoImg) {
        // Circular white backing for contrast
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      }

      // Draw Headline Text (Bold, High Contrast, Marathi-ready)
      if (headlineLines.length > 0) {
        ctx.font = headlineFont;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        const headlineStartY = badgeY + badgeHeight + Math.round(16 * scaleFactor);
        ctx.textBaseline = 'top';

        headlineLines.forEach((line, idx) => {
          ctx.fillText(line, Math.round(24 * scaleFactor), headlineStartY + idx * lineHeight);
        });

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // 3. REPORTER INFO BADGE (above bottom sponsor ad)
      const hasReporter = Boolean(reporterName || reporterPhone);
      const reporterBadgeHeight = hasReporter ? Math.max(34, Math.round(48 * scaleFactor)) : 0;

      // 4. BOTTOM SPONSOR ADVERTISEMENT BANNER
      const baseFooterHeight = footerHeight || 180;
      const bottomAdHeight = Math.max(50, Math.round(baseFooterHeight * scaleFactor));
      const bottomAdY = canvasHeight - bottomAdHeight;
      const footerWidthPercent = footerWidth || 100;
      const footerW = Math.round(canvasWidth * (footerWidthPercent / 100));
      const footerX = Math.round((canvasWidth - footerW) / 2);

      if (hasReporter) {
        const repY = bottomAdY - reporterBadgeHeight;
        // Semi-transparent dark strip for reporter
        ctx.fillStyle = 'rgba(15, 15, 15, 0.92)';
        ctx.fillRect(footerX, repY, footerW, reporterBadgeHeight);

        // Yellow strip accent
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(footerX, repY, Math.max(5, Math.round(8 * scaleFactor)), reporterBadgeHeight);

        ctx.font = `bold ${Math.max(14, Math.round(22 * scaleFactor))}px 'DM Sans', Arial, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        const repText = `बातमीदार: ${reporterName || ''} ${reporterPhone ? ` | संपर्क: ${reporterPhone}` : ''}`.trim();
        ctx.fillText(repText, footerX + Math.round(24 * scaleFactor), repY + reporterBadgeHeight / 2);
      }

      // Base Sponsor Banner Background
      const adGradient = ctx.createLinearGradient(0, bottomAdY, 0, canvasHeight);
      adGradient.addColorStop(0, '#1E293B');
      adGradient.addColorStop(1, '#0F172A');
      ctx.fillStyle = adGradient;
      ctx.fillRect(footerX, bottomAdY, footerW, bottomAdHeight);

      // Top accent line on sponsor banner
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(footerX, bottomAdY, footerW, Math.max(3, Math.round(5 * scaleFactor)));

      // Normalized Ads List
      const activeAds: SponsorAdItem[] =
        ads && ads.length > 0
          ? ads
          : [
              {
                id: 'default',
                type: sponsorBannerUrl ? 'image' : 'text',
                imageUrl: sponsorBannerUrl,
                businessName: sponsorName || 'आपली जाहिरात येथे द्या (Contact for Ads)',
                tagline: sponsorTagline || 'Education News वर जाहिरातीसाठी संपर्क करा',
                phone: sponsorPhone || '९८५०५४१११',
              },
            ];

      // Draw Single Full Ad Helper
      function drawFullAd(ad: SponsorAdItem, xOffset = 0) {
        if (!ctx) return;
        const img = ad.imageUrl ? adImagesMap.get(ad.id) : null;
        if (ad.type === 'image' && img) {
          ctx.drawImage(img, xOffset, bottomAdY, canvasWidth, bottomAdHeight);
        } else {
          // Sponsor Tag
          const tagFontSize = Math.max(12, Math.round(17 * scaleFactor));
          ctx.font = `bold ${tagFontSize}px 'DM Sans', sans-serif`;
          ctx.fillStyle = '#FFD700';
          ctx.textBaseline = 'top';
          ctx.fillText('⭐ प्रायोजक / SPONSOR ADVERTISEMENT', xOffset + Math.round(24 * scaleFactor), bottomAdY + Math.round(12 * scaleFactor));

          // Sponsor Business Name
          const nameFontSize = Math.max(18, Math.round(30 * scaleFactor));
          ctx.font = `900 ${nameFontSize}px 'DM Sans', 'Mukta', Arial, sans-serif`;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(ad.businessName || 'आपली जाहिरात येथे द्या', xOffset + Math.round(24 * scaleFactor), bottomAdY + Math.round(40 * scaleFactor));

          // Sponsor Tagline / Contact
          const subFontSize = Math.max(13, Math.round(20 * scaleFactor));
          ctx.font = `600 ${subFontSize}px 'DM Sans', 'Mukta', Arial, sans-serif`;
          ctx.fillStyle = '#CBD5E1';
          const contactInfo = [ad.tagline, ad.phone ? `📞 ${ad.phone}` : ''].filter(Boolean).join(' | ');
          ctx.fillText(contactInfo || 'संपर्क: ९८५०५४१११', xOffset + Math.round(24 * scaleFactor), bottomAdY + Math.round(82 * scaleFactor));
        }
      }

      if (adScrollMode === 'rotate' || activeAds.length === 1) {
        // ROTATION MODE: Slide or swap every X seconds
        const interval = adRotateInterval || 6;
        const count = activeAds.length;
        const currentIndex = Math.floor(video.currentTime / interval) % count;
        const nextIndex = (currentIndex + 1) % count;
        const timeInSlot = video.currentTime % interval;
        const transitionDuration = 0.6;
        const isTransitioning = count > 1 && timeInSlot > interval - transitionDuration;

        if (isTransitioning) {
          const progress = (timeInSlot - (interval - transitionDuration)) / transitionDuration;
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, bottomAdY, canvasWidth, bottomAdHeight);
          ctx.clip();

          drawFullAd(activeAds[currentIndex], -canvasWidth * progress);
          drawFullAd(activeAds[nextIndex], canvasWidth * (1 - progress));
          ctx.restore();
        } else {
          drawFullAd(activeAds[currentIndex], 0);
        }
      } else {
        // CONTINUOUS AUTO-SCROLLING TICKER MODE
        const trackX = footerX;
        const trackWidth = footerW;

        ctx.save();
        ctx.beginPath();
        ctx.rect(trackX, bottomAdY, trackWidth, bottomAdHeight);
        ctx.clip();

        // Calculate card widths for each ad
        const adGap = Math.round(16 * scaleFactor);
        const cardHeights = bottomAdHeight - Math.round(18 * scaleFactor);

        const measuredAds = activeAds.map((ad) => {
          const img = ad.imageUrl ? adImagesMap.get(ad.id) : null;
          let width = Math.round(380 * scaleFactor);
          if (ad.type === 'image' && img) {
            const aspect = img.width / Math.max(1, img.height);
            width = Math.round(cardHeights * aspect);
          } else {
            ctx.font = `bold ${Math.max(16, Math.round(24 * scaleFactor))}px 'DM Sans', 'Mukta', Arial, sans-serif`;
            const nameW = ctx.measureText(ad.businessName || '').width;
            ctx.font = `500 ${Math.max(12, Math.round(18 * scaleFactor))}px 'DM Sans', 'Mukta', Arial, sans-serif`;
            const subW = ctx.measureText([ad.tagline, ad.phone ? `📞 ${ad.phone}` : ''].filter(Boolean).join(' | ')).width;
            width = Math.max(Math.round(320 * scaleFactor), Math.max(nameW, subW) + Math.round(48 * scaleFactor));
          }
          return { ad, width, img };
        });

        const singleSequenceWidth = measuredAds.reduce((sum, item) => sum + item.width + adGap, 0);

        // Ensure sequence is wide enough to loop smoothly
        const repeatCount = Math.max(2, Math.ceil((canvasWidth * 2) / Math.max(1, singleSequenceWidth)) + 1);

        const scrollSpeedPx = (adScrollSpeed || 140) * scaleFactor;
        const scrollOffset = (video.currentTime * scrollSpeedPx) % singleSequenceWidth;

        let currentDrawX = trackX - scrollOffset;

        for (let r = 0; r < repeatCount + 1; r++) {
          for (const item of measuredAds) {
            const { ad, width, img } = item;

            // Only draw if within visible viewport
            if (currentDrawX + width > trackX && currentDrawX < canvasWidth) {
              const cardY = bottomAdY + Math.round(9 * scaleFactor);

              if (ad.type === 'image' && img) {
                // Show image directly, NO yellow line, NO card background
                ctx.drawImage(
                  img,
                  currentDrawX,
                  cardY,
                  width,
                  cardHeights
                );
              } else {
                // Text Ad Card Container without yellow border line
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.beginPath();
                ctx.roundRect(currentDrawX, cardY, width, cardHeights, Math.round(8 * scaleFactor));
                ctx.fill();

                // Business Name
                ctx.font = `bold ${Math.max(15, Math.round(24 * scaleFactor))}px 'DM Sans', 'Mukta', Arial, sans-serif`;
                ctx.fillStyle = '#FFD700';
                ctx.textBaseline = 'top';
                ctx.fillText(ad.businessName || 'आपली जाहिरात', currentDrawX + Math.round(18 * scaleFactor), cardY + Math.round(14 * scaleFactor));

                // Tagline / Phone
                ctx.font = `500 ${Math.max(12, Math.round(18 * scaleFactor))}px 'DM Sans', 'Mukta', Arial, sans-serif`;
                ctx.fillStyle = '#F8FAFC';
                const sub = [ad.tagline, ad.phone ? `📞 ${ad.phone}` : ''].filter(Boolean).join(' | ');
                ctx.fillText(sub || 'संपर्क: ९८५०५४१११', currentDrawX + Math.round(18 * scaleFactor), cardY + Math.round(48 * scaleFactor));
              }
            }
            currentDrawX += width + adGap;
          }
        }

        ctx.restore();
      }
    }

    function processFrame() {
      if (isFinished) return;

      renderOverlays();

      const currentTime = video.currentTime;
      const progressPercent = Math.min(98, Math.round(25 + (currentTime / duration) * 73));
      onProgress?.(progressPercent, `Burning video frames... (${Math.round(currentTime)}s / ${Math.round(duration)}s)`);

      if (video.ended || currentTime >= duration) {
        isFinished = true;
        recorder.stop();
        return;
      }

      animationFrameId = requestAnimationFrame(processFrame);
    }

    recorder.start(100); // Collect data every 100ms
    video.currentTime = 0;
    video.play().then(() => {
      animationFrameId = requestAnimationFrame(processFrame);
    }).catch((err) => {
      cleanup();
      reject(err);
    });
  });
}
