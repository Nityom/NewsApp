import {
  AlertCircle,
  CheckCircle2,
  Download,
  Film,
  Image as ImageIcon,
  Monitor,
  Play,
  Plus,
  RotateCcw,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import { uploadImage } from '../lib/upload';
import type { SponsorAdItem } from '../lib/videoBurner';
import { burnAndExportVideo } from '../lib/videoBurner';

export function VideoStudioPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Customization State
  const [badgeText, setBadgeText] = useState('');
  const [headline, setHeadline] = useState('');
  const [headlineSize, setHeadlineSize] = useState<number>(56);
  const [showLogo, setShowLogo] = useState(true);
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');

  // Short News Ticker Marquee State (Optional toggle, multiple items, height slider)
  const [showTicker, setShowTicker] = useState(false);
  const [tickerItems, setTickerItems] = useState<string[]>(['']);
  const [tickerBadge, setTickerBadge] = useState('🔴 ताजी बातमी');
  const [tickerHeight, setTickerHeight] = useState<number>(34);
  const [tickerSpeed, setTickerSpeed] = useState<number>(130);
  const [tickerPosition, setTickerPosition] = useState<'above_footer' | 'below_headline'>('above_footer');

  const validTickerItems = tickerItems.map((t) => t.trim()).filter(Boolean);
  const combinedTickerText = validTickerItems.join('   ◆   ');

  // Orientation & Audio State
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [isPreviewMuted, setIsPreviewMuted] = useState(false);
  const [muteAudioInExport, setMuteAudioInExport] = useState(false);

  const detectedLandscape = videoDimensions.width > videoDimensions.height;
  const effectiveLandscape = orientation === 'landscape' || (orientation === 'auto' && detectedLandscape);

  function togglePreviewMute() {
    if (previewVideoRef.current) {
      previewVideoRef.current.muted = !previewVideoRef.current.muted;
      setIsPreviewMuted(previewVideoRef.current.muted);
    } else {
      setIsPreviewMuted((prev) => !prev);
    }
  }

  // Multiple Sponsor Ads State
  const [ads, setAds] = useState<SponsorAdItem[]>([
    {
      id: 'ad-1',
      type: 'text',
      businessName: '',
      tagline: '',
      phone: '',
    },
  ]);
  const [adScrollMode, setAdScrollMode] = useState<'scroll' | 'rotate'>('scroll');
  const [adRotateInterval, setAdRotateInterval] = useState<number>(6);
  const [adScrollSpeed, setAdScrollSpeed] = useState<number>(140);
  const [activePreviewAdIndex, setActivePreviewAdIndex] = useState<number>(0);

  // Footer Dimensions & Video Crop Adjustment State
  const [footerHeight, setFooterHeight] = useState<number>(180);
  const footerWidth = 100; // Fixed full width edge-to-edge
  const [videoYShift, setVideoYShift] = useState<number>(0);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [videoUrl, downloadUrl]);

  // Preview Rotation Timer if in rotate mode
  useEffect(() => {
    if (adScrollMode !== 'rotate' || ads.length <= 1) return;
    const interval = setInterval(() => {
      setActivePreviewAdIndex((prev) => (prev + 1) % ads.length);
    }, adRotateInterval * 1000);
    return () => clearInterval(interval);
  }, [adScrollMode, ads.length, adRotateInterval]);

  function handleVideoSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl('');

    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);

    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      setDuration(Math.round(tempVideo.duration));
      setVideoDimensions({ width: tempVideo.videoWidth, height: tempVideo.videoHeight });
    };
  }

  function addAd() {
    setAds((prev) => [
      ...prev,
      {
        id: `ad-${Date.now()}`,
        type: 'text',
        businessName: '',
        tagline: '',
        phone: '',
      },
    ]);
  }

  function removeAd(id: string) {
    if (ads.length <= 1) return;
    setAds((prev) => prev.filter((ad) => ad.id !== id));
  }

  function updateAd(id: string, patch: Partial<SponsorAdItem>) {
    setAds((prev) => prev.map((ad) => (ad.id === id ? { ...ad, ...patch } : ad)));
  }

  async function handleAdImageUpload(id: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, 'education-news/advertisements');
      updateAd(id, { imageUrl: url });
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) updateAd(id, { imageUrl: event.target.result as string });
      };
      reader.readAsDataURL(file);
    }
  }

  async function startBurning() {
    if (!videoFile) {
      setErrorMsg('Please select a video file first.');
      return;
    }

    setIsExporting(true);
    setErrorMsg('');
    setProgressPercent(5);
    setProgressStatus('Starting video processing...');

    try {
      const exportedBlob = await burnAndExportVideo({
        videoFile,
        headline,
        badgeText,
        headlineFontSize: headlineSize,
        reporterName,
        reporterPhone,
        showLogo,
        ads,
        adScrollMode,
        adRotateInterval,
        adScrollSpeed,
        aspectRatio: orientation,
        muteAudio: muteAudioInExport,
        footerHeight,
        footerWidth,
        videoYShift,
        enableTicker: showTicker,
        tickerText: showTicker ? combinedTickerText : '',
        tickerItems: showTicker ? validTickerItems : [],
        tickerBadge: showTicker ? tickerBadge : '',
        tickerHeight: showTicker ? tickerHeight : 34,
        tickerSpeed,
        tickerPosition,
        onProgress: (percent, statusText) => {
          setProgressPercent(percent);
          setProgressStatus(statusText);
        },
      });

      const url = URL.createObjectURL(exportedBlob);
      setDownloadUrl(url);

      const a = document.createElement('a');
      a.href = url;
      a.download = `education-news-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: unknown) {
      console.error('Video burning failed:', err);
      const msg = err instanceof Error ? err.message : 'Video processing failed.';
      setErrorMsg(`Error during video burn: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  }

  const isOverOneMinute = duration > 60;
  const previewFooterH = Math.max(45, Math.round(footerHeight * (effectiveLandscape ? 0.41 : 0.52)));
  const previewVideoY = Math.round(videoYShift * (effectiveLandscape ? 0.41 : 0.52));
  const footerLeftPct = Math.max(0, (100 - footerWidth) / 2);

  return (
    <div className="page video-studio-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Video Marketing & Social Share</span>
          <h1>Video Studio</h1>
          <p>
            Upload a 1-minute video clip, customize headlines, reporter badges, and run multiple auto-scrolling sponsor ads,
            then burn them directly into a downloadable MP4 video ready for WhatsApp and social media.
          </p>
        </div>
      </div>

      {errorMsg ? (
        <div className="form-error" style={{ marginBottom: 20 }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(440px, 1fr) minmax(360px, 480px)', gap: 24, alignItems: 'start' }}>
        {/* LEFT COLUMN: Controls & Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Step 1: Upload Video */}
          <div className="panel">
            <header style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Film size={20} color="var(--red)" />
                <h2 style={{ fontSize: 18 }}>1. Select News Video (Max 1 Min)</h2>
              </div>
              <p>Upload a recorded video from your phone or camera (MP4, MOV, or WebM).</p>
            </header>

            {!videoFile ? (
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed var(--line)',
                  borderRadius: 8,
                  padding: '36px 20px',
                  cursor: 'pointer',
                  background: 'var(--canvas)',
                  textAlign: 'center',
                  transition: 'border-color .2s',
                }}>
                <Upload size={32} style={{ color: 'var(--muted)', marginBottom: 12 }} />
                <strong style={{ fontSize: 15, marginBottom: 4 }}>Click or drag video here to upload</strong>
                <span className="muted" style={{ fontSize: 12 }}>Supports MP4, MOV, WebM • Recommended: Under 60 seconds</span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/*"
                  style={{ display: 'none' }}
                  onChange={handleVideoSelect}
                />
              </label>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--canvas)', borderRadius: 6, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, background: 'var(--yellow)', borderRadius: 4, display: 'grid', placeItems: 'center' }}>
                    <Video size={20} color="#111" />
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: 14 }}>{videoFile.name}</strong>
                    <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      <span>Duration: {duration}s</span>
                      {videoDimensions.width ? <span>{videoDimensions.width}x{videoDimensions.height}</span> : null}
                      <span>{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <label className="button button-secondary" style={{ padding: '0 10px', fontSize: 12 }}>
                    Change
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/*"
                      style={{ display: 'none' }}
                      onChange={handleVideoSelect}
                    />
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => {
                      setVideoFile(null);
                      setVideoUrl('');
                      setDuration(0);
                    }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Orientation & Audio Settings */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'start' }}>
                <div>
                  <label style={{ marginBottom: 6, fontWeight: 700, fontSize: 12 }}>Video Orientation / Format</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`composer-mode-btn ${orientation === 'auto' ? 'active' : ''}`}
                      style={{ padding: '6px 10px', fontSize: 11 }}
                      onClick={() => setOrientation('auto')}>
                      ✨ Auto
                    </button>
                    <button
                      type="button"
                      className={`composer-mode-btn ${orientation === 'portrait' ? 'active' : ''}`}
                      style={{ padding: '6px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => setOrientation('portrait')}>
                      <Smartphone size={13} />
                      <span>Portrait (9:16)</span>
                    </button>
                    <button
                      type="button"
                      className={`composer-mode-btn ${orientation === 'landscape' ? 'active' : ''}`}
                      style={{ padding: '6px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => setOrientation('landscape')}>
                      <Monitor size={13} />
                      <span>Landscape (16:9)</span>
                    </button>
                  </div>
                  <span className="muted" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                    {effectiveLandscape ? '🖥️ Landscape 16:9 (YouTube & TV News)' : '📱 Portrait 9:16 (WhatsApp Status & Reels)'}
                  </span>
                </div>

                <div>
                  <label style={{ marginBottom: 6, fontWeight: 700, fontSize: 12 }}>Export Audio</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
                    <input
                      type="checkbox"
                      checked={muteAudioInExport}
                      onChange={(e) => setMuteAudioInExport(e.target.checked)}
                      style={{ width: 'auto' }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Mute audio in exported video</span>
                  </label>
                  <span className="muted" style={{ fontSize: 11, marginTop: 3, display: 'block' }}>
                    {muteAudioInExport ? 'Exported MP4 will be silent' : 'Original video audio will be preserved'}
                  </span>
                </div>
              </div>
            </div>

            {isOverOneMinute ? (
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#FEF3C7', color: '#92400E', borderRadius: 4, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={15} />
                <span>Notice: Video is {duration} seconds. WhatsApp status limit is 60s, but we will burn the entire video for you.</span>
              </div>
            ) : null}
          </div>

          {/* Step 2: Top Breaking News Headline Bar */}
          <div className="panel">
            <header style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} color="var(--red)" />
                <h2 style={{ fontSize: 18 }}>2. Top Breaking News Headline</h2>
              </div>
              <p>Burn a high-impact news ribbon across the top of the video.</p>
            </header>

            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12 }}>
                <label>
                  Badge Text
                  <select
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    style={{
                      height: 38,
                      border: '1px solid var(--line)',
                      background: 'white',
                      borderRadius: 3,
                      padding: '0 8px',
                      fontWeight: 600,
                    }}>
                    <option value="BREAKING NEWS">BREAKING NEWS</option>
                    <option value="ठळक बातमी">ठळक बातमी</option>
                    <option value="महत्त्वाची बातमी">महत्त्वाची बातमी</option>
                    <option value="विशेष बातमी">विशेष बातमी</option>
                    <option value="मोठी बातमी">मोठी बातमी</option>
                  </select>
                </label>

                <label>
                  Custom Badge (Optional)
                  <input
                    type="text"
                    placeholder="Or type custom badge..."
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                  />
                </label>
              </div>

              <label>
                News Headline (Marathi / English)
                <textarea
                  rows={2}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. नाशिकमध्ये नैसर्गिक शेती कार्यशाळा उत्साहात संपन्न..."
                  style={{ fontSize: 15, fontWeight: 700 }}
                />
              </label>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ margin: 0 }}>Headline Text Size</label>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--red)' }}>{headlineSize}px (Standard TV News)</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Normal (44px)', size: 44 },
                    { label: 'Large (56px)', size: 56 },
                    { label: 'Extra Large (68px)', size: 68 },
                    { label: 'Mega (80px)', size: 80 },
                  ].map((preset) => (
                    <button
                      key={preset.size}
                      type="button"
                      className={`composer-mode-btn ${headlineSize === preset.size ? 'active' : ''}`}
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => setHeadlineSize(preset.size)}>
                      {preset.label}
                    </button>
                  ))}
                  <input
                    type="range"
                    min="36"
                    max="96"
                    step="2"
                    value={headlineSize}
                    onChange={(e) => setHeadlineSize(Number(e.target.value))}
                    style={{ flex: 1, minWidth: 100, accentColor: 'var(--red)', margin: 0 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  <span>Show Education News Logo in top corner</span>
                </label>
              </div>
            </div>
          </div>

          {/* Step 3: Reporter Badge Details */}
          <div className="panel">
            <header style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={20} color="var(--red)" />
                <h2 style={{ fontSize: 18 }}>3. Reporter Badge</h2>
              </div>
              <p>Display your reporter name & phone number badge above the sponsor ad.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>
                Reporter Name
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Madhav Bhalerao"
                />
              </label>
              <label>
                Reporter Phone Number
                <input
                  type="text"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  placeholder="9850541111"
                />
              </label>
            </div>
          </div>

          {/* Step 4: Running Short News Ticker (Marquee) */}
          <div className="panel">
            <header style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={20} color="var(--red)" />
                  <h2 style={{ fontSize: 18 }}>4. Running Short News Ticker (Marquee)</h2>
                </div>
                <p>Add continuous scrolling breaking updates / short news (ताजी बातमी / संक्षिप्त बातम्या) running across the screen like TV news channels.</p>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--surface-hover, #f1f5f9)', padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13, border: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  checked={showTicker}
                  onChange={(e) => setShowTicker(e.target.checked)}
                  style={{ accentColor: 'var(--red)', width: 16, height: 16, cursor: 'pointer' }}
                />
                <span>Enable Ticker</span>
              </label>
            </header>

            {showTicker ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14, marginBottom: 16 }}>
                  <label>
                    Ticker Badge / Tag
                    <input
                      type="text"
                      value={tickerBadge}
                      onChange={(e) => setTickerBadge(e.target.value)}
                      placeholder="उदा. 🔴 ताजी बातमी / FLASH NEWS (किंवा रिकामे ठेवा)"
                    />
                  </label>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <strong style={{ fontSize: 12, fontWeight: 600 }}>Short News Items ({tickerItems.length})</strong>
                      <button
                        type="button"
                        onClick={() => setTickerItems([...tickerItems, ''])}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '4px 10px',
                          fontSize: 12,
                          background: 'var(--red-light, #fee2e2)',
                          color: 'var(--red, #dc2626)',
                          border: '1px solid var(--red, #dc2626)',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}>
                        <Plus size={14} /> बातमी जोडा (+ Add News)
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {tickerItems.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', width: 20, textAlign: 'right', fontWeight: 700 }}>
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => {
                              const next = [...tickerItems];
                              next[idx] = e.target.value;
                              setTickerItems(next);
                            }}
                            placeholder={`संक्षिप्त बातमी #${idx + 1} टाईप करा... (उदा. शाळांना १५ मे पर्यंत सुट्टी जाहीर)`}
                            style={{ flex: 1 }}
                          />
                          {tickerItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setTickerItems(tickerItems.filter((_, i) => i !== idx))}
                              style={{
                                border: 'none',
                                background: '#fee2e2',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: 6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Delete news item">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <strong style={{ fontSize: 12, fontWeight: 600 }}>Ticker Bar Height</strong>
                      <span style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>{tickerHeight}px</span>
                    </div>
                    <input
                      type="range"
                      min={26}
                      max={54}
                      value={tickerHeight}
                      onChange={(e) => setTickerHeight(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--red)', cursor: 'pointer' }}
                    />
                  </div>

                  <div>
                    <strong style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Scroll Speed</strong>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[
                        { label: 'Slow', speed: 80 },
                        { label: 'Normal', speed: 130 },
                        { label: 'Fast', speed: 190 },
                      ].map((s) => (
                        <button
                          key={s.speed}
                          type="button"
                          className={`composer-mode-btn ${tickerSpeed === s.speed ? 'active' : ''}`}
                          style={{ padding: '6px 10px', fontSize: 12, flex: 1 }}
                          onClick={() => setTickerSpeed(s.speed)}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <strong style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Ticker Position</strong>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className={`composer-mode-btn ${tickerPosition === 'above_footer' ? 'active' : ''}`}
                        style={{ padding: '6px 10px', fontSize: 12, flex: 1 }}
                        onClick={() => setTickerPosition('above_footer')}>
                        Above Footer
                      </button>
                      <button
                        type="button"
                        className={`composer-mode-btn ${tickerPosition === 'below_headline' ? 'active' : ''}`}
                        style={{ padding: '6px 10px', fontSize: 12, flex: 1 }}
                        onClick={() => setTickerPosition('below_headline')}>
                        Below Headline
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: '12px 14px', background: 'var(--surface-hover, #f8fafc)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted, #64748b)' }}>
                ℹ️ Short news ticker is currently <strong>disabled</strong>. Check "Enable Ticker" above to add scrolling flash news items.
              </div>
            )}
          </div>

          {/* Step 5: Multiple Sponsor Advertisements & Scrolling */}
          <div className="panel">
            <header style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ImageIcon size={20} color="var(--red)" />
                  <h2 style={{ fontSize: 18 }}>5. Sponsor Advertisements ({ads.length})</h2>
                </div>
                <p>Run multiple sponsor ads with auto-scrolling ticker or slide rotation.</p>
              </div>
              <button
                type="button"
                className="button button-secondary"
                style={{ fontSize: 12, padding: '0 12px', minHeight: 34 }}
                onClick={addAd}>
                <Plus size={15} /> Add Another Ad
              </button>
            </header>

            {/* Scrolling Mode Settings */}
            <div style={{ background: 'var(--canvas)', border: '1px solid var(--line)', borderRadius: 6, padding: '14px 16px', marginBottom: 16 }}>
              <strong style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>Ad Display & Animation Mode:</strong>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <button
                  type="button"
                  className={`composer-mode-btn ${adScrollMode === 'scroll' ? 'active' : ''}`}
                  onClick={() => setAdScrollMode('scroll')}>
                  ⭐ Continuous Auto-Scrolling Ticker (Marquee)
                </button>
                <button
                  type="button"
                  className={`composer-mode-btn ${adScrollMode === 'rotate' ? 'active' : ''}`}
                  onClick={() => setAdScrollMode('rotate')}>
                  🔄 Rotate Every Few Seconds (Slideshow)
                </button>
              </div>

              {adScrollMode === 'scroll' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Scrolling Speed:</span>
                  {[
                    { label: 'Normal', speed: 140 },
                    { label: 'Fast', speed: 200 },
                    { label: 'Relaxed', speed: 100 },
                  ].map((sp) => (
                    <button
                      key={sp.speed}
                      type="button"
                      className={`composer-mode-btn ${adScrollSpeed === sp.speed ? 'active' : ''}`}
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => setAdScrollSpeed(sp.speed)}>
                      {sp.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Slide Duration:</span>
                  {[4, 6, 8, 10].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      className={`composer-mode-btn ${adRotateInterval === sec ? 'active' : ''}`}
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => setAdRotateInterval(sec)}>
                      {sec} seconds
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Height, Width & Video Crop Adjustment Sliders */}
            <div
              style={{
                background: 'var(--canvas)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: '16px',
                marginBottom: 16,
              }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <strong style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  📐 Footer Size & Video Crop Adjustment
                </strong>
                <button
                  type="button"
                  className="button button-ghost"
                  style={{ fontSize: 11, padding: '2px 8px', height: 26 }}
                  onClick={() => {
                    setFooterHeight(180);
                    setVideoYShift(0);
                  }}>
                  Reset to Default
                </button>
              </div>

              {/* Footer Height */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span>Footer Height (Bottom Coverage / Crop):</span>
                  <span style={{ color: 'var(--yellow)', fontWeight: 800 }}>{footerHeight}px</span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={720}
                  step={5}
                  value={footerHeight}
                  onChange={(e) => setFooterHeight(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--yellow)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                  <span>70px (Slim)</span>
                  <span>180px (Standard)</span>
                  <span>360px (Tall)</span>
                  <span>720px (Maximum Crop)</span>
                </div>
              </div>

              {/* Video Vertical Crop Shift */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span>Video Vertical Shift (Crop / Nudge Position):</span>
                  <span style={{ color: 'var(--yellow)', fontWeight: 800 }}>
                    {videoYShift > 0 ? `+${videoYShift}px` : `${videoYShift}px`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-160}
                  max={160}
                  step={4}
                  value={videoYShift}
                  onChange={(e) => setVideoYShift(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--yellow)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                  <span>-160px (Shift Up)</span>
                  <span>0px (Centered)</span>
                  <span>+160px (Shift Down)</span>
                </div>
              </div>
            </div>

            {/* List of Ads */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ads.map((ad, index) => (
                <div
                  key={ad.id}
                  style={{
                    border: '1px solid var(--line)',
                    background: 'white',
                    borderRadius: 6,
                    padding: 14,
                    position: 'relative',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: 'var(--yellow)', color: '#111', fontWeight: 800, fontSize: 11, padding: '2px 8px', borderRadius: 3 }}>
                        AD #{index + 1}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className={`composer-mode-btn ${ad.type === 'text' ? 'active' : ''}`}
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => updateAd(ad.id, { type: 'text' })}>
                          Text Card
                        </button>
                        <button
                          type="button"
                          className={`composer-mode-btn ${ad.type === 'image' ? 'active' : ''}`}
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => updateAd(ad.id, { type: 'image' })}>
                          Image Banner
                        </button>
                      </div>
                    </div>

                    {ads.length > 1 ? (
                      <button
                        type="button"
                        className="icon-button"
                        style={{ color: 'var(--red)', width: 28, height: 28 }}
                        onClick={() => removeAd(ad.id)}
                        title="Remove this ad">
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </div>

                  {ad.type === 'text' ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      <label>
                        Sponsor Business / Class / Shop Name
                        <input
                          type="text"
                          value={ad.businessName || ''}
                          onChange={(e) => updateAd(ad.id, { businessName: e.target.value })}
                          placeholder="e.g. श्री गणेश कोचिंग क्लासेस"
                        />
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                        <label>
                          Offer / Tagline
                          <input
                            type="text"
                            value={ad.tagline || ''}
                            onChange={(e) => updateAd(ad.id, { tagline: e.target.value })}
                            placeholder="e.g. नवीन प्रवेश सुरू"
                          />
                        </label>
                        <label>
                          Contact Phone
                          <input
                            type="text"
                            value={ad.phone || ''}
                            onChange={(e) => updateAd(ad.id, { phone: e.target.value })}
                            placeholder="e.g. ९८५०५४११११"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px dashed var(--line)',
                          borderRadius: 6,
                          padding: '16px',
                          cursor: 'pointer',
                          background: 'var(--canvas)',
                          textAlign: 'center',
                        }}>
                        {ad.imageUrl ? (
                          <img
                            src={ad.imageUrl}
                            alt={`Ad #${index + 1}`}
                            style={{ maxHeight: 60, objectFit: 'contain', marginBottom: 6 }}
                          />
                        ) : (
                          <>
                            <ImageIcon size={22} style={{ color: 'var(--muted)', marginBottom: 4 }} />
                            <strong style={{ fontSize: 12 }}>Click to upload sponsor graphic banner</strong>
                            <span className="muted" style={{ fontSize: 10 }}>Aspect ratio: 16:3 or 16:4 horizontal banner</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleAdImageUpload(ad.id, e)}
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Export Action Card */}
          <div className="panel" style={{ background: '#191918', color: 'white', borderColor: '#333' }}>
            <h2 style={{ fontSize: 18, color: 'white', marginBottom: 8 }}>Download Video</h2>
            <p style={{ color: '#aaa', fontSize: 13, marginBottom: 16 }}>
              This composites the video frames, top breaking news headline, channel logo, reporter badge, and all{' '}
              <strong>{ads.length} sponsor ads ({adScrollMode === 'scroll' ? 'auto-scrolling ticker' : 'slideshow'})</strong> into a permanent MP4 video directly in your browser.
            </p>

            {isExporting ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span>{progressStatus || 'Processing video...'}</span>
                  <strong>{progressPercent}%</strong>
                </div>
                <div style={{ height: 8, background: '#333', borderRadius: 99, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      background: 'var(--yellow)',
                      width: `${progressPercent}%`,
                      transition: 'width .2s ease',
                    }}
                  />
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                type="button"
                className="button button-primary"
                style={{
                  background: 'var(--yellow)',
                  color: '#111',
                  borderColor: 'var(--yellow)',
                  fontSize: 14,
                  minHeight: 44,
                  padding: '0 20px',
                  fontWeight: 800,
                }}
                disabled={!videoFile || isExporting}
                onClick={startBurning}>
                {isExporting ? (
                  <>
                    <RotateCcw size={16} className="spin" />
                    <span>Burning Video ({progressPercent}%)...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>Download MP4 for WhatsApp</span>
                  </>
                )}
              </button>

              {downloadUrl && !isExporting ? (
                <a
                  href={downloadUrl}
                  download={`education-news-video-${Date.now()}.mp4`}
                  className="button button-secondary"
                  style={{ minHeight: 44, fontSize: 13 }}>
                  <Download size={16} /> Re-download MP4
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Interactive Mockup / Player */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div className="panel" style={{ padding: 16, background: '#0F172A', color: 'white', borderColor: '#1E293B' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ fontSize: 14, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Play size={16} color="var(--yellow)" /> Live Overlay Preview
              </strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* MUTE / UNMUTE BUTTON */}
                <button
                  type="button"
                  onClick={togglePreviewMute}
                  className="icon-button"
                  style={{
                    width: 32,
                    height: 32,
                    background: isPreviewMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.12)',
                    color: isPreviewMuted ? '#EF4444' : 'var(--yellow)',
                    borderRadius: 4,
                  }}
                  title={isPreviewMuted ? 'Unmute Audio' : 'Mute Audio'}>
                  {isPreviewMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>
                  {effectiveLandscape ? '🖥️ Landscape 16:9' : '📱 Portrait 9:16'}
                </span>
              </div>
            </div>

            {/* Video Player Box with Visual Overlays */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: effectiveLandscape ? '16 / 9' : '9 / 16',
                maxHeight: effectiveLandscape ? '380px' : '620px',
                background: '#000',
                borderRadius: 8,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                transition: 'aspect-ratio .3s ease, max-height .3s ease',
              }}>
              {videoUrl ? (
                <video
                  ref={previewVideoRef}
                  src={videoUrl}
                  controls
                  muted={isPreviewMuted}
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    transform: `translateY(${previewVideoY}px)`,
                    transition: 'transform 0.15s ease-out',
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#64748B', padding: 20 }}>
                  <Film size={44} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ fontSize: 13, margin: 0 }}>Select a video to see live overlay preview</p>
                </div>
              )}

              {/* OVERLAY: Top Breaking News Header Bar */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(to bottom, #B71C1C, #9A0007)',
                  borderBottom: '4px solid #FFD700',
                  padding: effectiveLandscape ? '8px 12px 10px' : '10px 14px 12px',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div
                    style={{
                      background: '#FFD700',
                      color: '#111',
                      padding: '3px 10px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: '.05em',
                      textTransform: 'uppercase',
                    }}>
                    {badgeText || 'BREAKING NEWS'}
                  </div>
                  {showLogo ? (
                    <img
                      src="/app-logo.png"
                      alt="Logo"
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: '50%',
                        background: 'white',
                        objectFit: 'contain',
                        padding: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                      }}
                    />
                  ) : null}
                </div>
                <div
                  style={{
                    color: '#FFFFFF',
                    fontSize: `${Math.max(16, Math.round(headlineSize * 0.36))}px`,
                    fontWeight: 900,
                    lineHeight: 1.22,
                    fontFamily: "'DM Sans', 'Mukta', sans-serif",
                    textShadow: '0 2px 5px rgba(0,0,0,0.85)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                  {headline || 'Enter headline to preview...'}
                </div>
              </div>

              {/* OVERLAY: Running Short News Ticker Marquee */}
              {showTicker && combinedTickerText ? (
                <div
                  style={{
                    position: 'absolute',
                    ...(tickerPosition === 'below_headline'
                      ? { top: '80px' }
                      : { bottom: `${previewFooterH + (reporterName || reporterPhone ? 28 : 0)}px` }),
                    left: 0,
                    right: 0,
                    height: `${tickerHeight}px`,
                    background: 'linear-gradient(to bottom, #0F172A, #020617)',
                    borderTop: '2px solid #EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'hidden',
                    zIndex: 3,
                    boxSizing: 'border-box',
                    pointerEvents: 'none',
                  }}>
                  {tickerBadge ? (
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 10,
                        background: 'linear-gradient(135deg, #DC2626, #991B1B)',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: `${Math.max(10, Math.round(tickerHeight * 0.32))}px`,
                        padding: '3px 10px',
                        borderRadius: '4px',
                        margin: '0 8px 0 8px',
                        border: '1px solid #FEF08A',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        boxShadow: '4px 0 10px rgba(0,0,0,0.8)',
                      }}>
                      {tickerBadge}
                    </div>
                  ) : null}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: '100%',
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                    }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        whiteSpace: 'nowrap',
                        animation: `previewTicker ${Math.max(8, 200 / (tickerSpeed / 10))}s linear infinite`,
                        color: '#FFFFFF',
                        fontSize: `${Math.max(11, Math.round(tickerHeight * 0.36))}px`,
                        fontWeight: 800,
                        gap: '24px',
                        paddingLeft: '12px',
                      }}>
                      {[...validTickerItems, ...validTickerItems, ...validTickerItems, ...validTickerItems].map((t, idx) => (
                        <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                          <span>{t}</span>
                          <span style={{ color: '#F59E0B', fontSize: '11px', opacity: 0.9 }}>◆</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* OVERLAY: Reporter Badge */}
              {reporterName || reporterPhone ? (
                <div
                  style={{
                    position: 'absolute',
                    bottom: `${previewFooterH}px`,
                    left: `${footerLeftPct}%`,
                    width: `${footerWidth}%`,
                    background: 'rgba(15, 15, 15, 0.92)',
                    borderLeft: '4px solid #FFD700',
                    padding: '5px 12px',
                    fontSize: 12,
                    color: 'white',
                    fontWeight: 700,
                    pointerEvents: 'none',
                    zIndex: 2,
                    boxSizing: 'border-box',
                    transition: 'bottom 0.15s ease-out, width 0.15s ease-out, left 0.15s ease-out',
                  }}>
                  बातमीदार: {reporterName} {reporterPhone ? ` | संपर्क: ${reporterPhone}` : ''}
                </div>
              ) : null}

              {/* OVERLAY: Bottom Multiple Sponsor Advertisements */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: `${footerLeftPct}%`,
                  width: `${footerWidth}%`,
                  height: `${previewFooterH}px`,
                  background: 'linear-gradient(to bottom, #1E293B, #0F172A)',
                  borderTop: '3px solid #FFD700',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                  zIndex: 2,
                  boxSizing: 'border-box',
                  transition: 'height 0.15s ease-out, width 0.15s ease-out, left 0.15s ease-out',
                }}>
                {adScrollMode === 'scroll' ? (
                  // Continuous Auto-Scrolling Ticker (Full Width - Red box removed)
                  <div style={{ display: 'flex', width: '100%', alignItems: 'center', height: '100%' }}>
                    {/* Marquee Ticker Track */}
                    <div
                      style={{
                        display: 'flex',
                        gap: 16,
                        alignItems: 'center',
                        whiteSpace: 'nowrap',
                        animation: `previewTicker ${Math.max(10, 240 / (adScrollSpeed / 10))}s linear infinite`,
                        paddingLeft: 8,
                      }}>
                      {/* Repeat list for continuous scrolling look */}
                      {[...ads, ...ads, ...ads].map((ad, idx) => {
                        if (ad.type === 'image' && ad.imageUrl) {
                          return (
                            <img
                              key={`${ad.id}-${idx}`}
                              src={ad.imageUrl}
                              alt="Ad"
                              style={{
                                height: `${Math.max(40, previewFooterH - 10)}px`,
                                objectFit: 'contain',
                                borderRadius: 4,
                                flexShrink: 0,
                                margin: '0 4px',
                              }}
                            />
                          );
                        }
                        return (
                          <div
                            key={`${ad.id}-${idx}`}
                            style={{
                              background: 'rgba(255, 255, 255, 0.08)',
                              borderRadius: 6,
                              padding: '6px 14px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              height: `${Math.max(42, previewFooterH - 18)}px`,
                              flexShrink: 0,
                            }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#FFD700' }}>
                              {ad.businessName || 'आपली जाहिरात'}
                            </div>
                            <div style={{ fontSize: 11, color: '#F1F5F9', marginTop: 2 }}>
                              {[ad.tagline, ad.phone ? `📞 ${ad.phone}` : ''].filter(Boolean).join(' | ') || 'संपर्क: ९८५०५४१११'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Timed Rotating Slideshow
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
                    {ads[activePreviewAdIndex]?.type === 'image' && ads[activePreviewAdIndex]?.imageUrl ? (
                      <img
                        src={ads[activePreviewAdIndex]?.imageUrl}
                        alt="Ad"
                        style={{ height: `${Math.max(40, previewFooterH - 10)}px`, maxWidth: '100%', objectFit: 'contain', borderRadius: 4 }}
                      />
                    ) : (
                      <div>
                        <div style={{ fontSize: 8, color: '#FFD700', fontWeight: 800, letterSpacing: '.05em' }}>
                          ⭐ प्रायोजक #{activePreviewAdIndex + 1}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>
                          {ads[activePreviewAdIndex]?.businessName || 'आपली जाहिरात'}
                        </div>
                        <div style={{ fontSize: 9, color: '#CBD5E1' }}>
                          {[ads[activePreviewAdIndex]?.tagline, ads[activePreviewAdIndex]?.phone ? `📞 ${ads[activePreviewAdIndex]?.phone}` : '']
                            .filter(Boolean)
                            .join(' | ') || 'संपर्क: ९८५०५४१११'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
              💡 {adScrollMode === 'scroll' ? (
                <span>
                  <strong>{ads.length} Ads</strong> will continuously auto-scroll across the bottom banner throughout the video.
                </span>
              ) : (
                <span>
                  <strong>{ads.length} Ads</strong> will rotate every {adRotateInterval} seconds.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes previewTicker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
