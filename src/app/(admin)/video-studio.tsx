import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { IconButton } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { DEFAULT_LOGO_BASE64 } from '@/lib/defaultLogoBase64';
import { useAppTheme } from '@/theme';

function buildVideoStudioHtml(defaultLogoBase64: string): string {
  return `
<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Video Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      background-color: #f8fafc;
      color: #0f172a;
      font-family: 'Plus Jakarta Sans', 'Mukta', system-ui, -apple-system, sans-serif;
      padding: 14px;
      padding-bottom: 95px;
    }
    h1, h2, h3, h4 { font-weight: 700; color: #0f172a; }
    
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .card-title {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 5px;
    }
    input[type="text"], textarea, select {
      width: 100%;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #0f172a;
      padding: 10px 12px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      margin-bottom: 12px;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus, textarea:focus, select:focus {
      border-color: #f59e0b;
      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
    }

    .row {
      display: flex;
      gap: 10px;
    }
    .col { flex: 1; }

    .btn-file {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 22px 14px;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      background: #f8fafc;
      cursor: pointer;
      text-align: center;
      transition: background 0.2s;
    }
    .btn-file:hover { background: #f1f5f9; }
    .btn-file input[type="file"] {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      opacity: 0;
      cursor: pointer;
    }
    .btn-file span { font-size: 13px; color: #334155; margin-top: 6px; font-weight: 600; }

    .segmented {
      display: flex;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 3px;
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
    }
    .segmented button {
      flex: 1;
      padding: 8px 4px;
      font-size: 12px;
      font-weight: 600;
      background: transparent;
      border: none;
      color: #64748b;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .segmented button.active {
      background: #ffffff;
      color: #0f172a;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .ad-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 12px;
      position: relative;
    }
    .ad-card .remove-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #fee2e2;
      border: 1px solid #fecaca;
      color: #dc2626;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }

    .image-upload-box {
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 14px;
      text-align: center;
      background: #ffffff;
      cursor: pointer;
      position: relative;
      margin-bottom: 10px;
    }
    .image-upload-box input[type="file"] {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      opacity: 0;
      cursor: pointer;
    }

    .btn-secondary {
      width: 100%;
      padding: 10px;
      font-size: 13px;
      font-weight: 700;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #1e293b;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 10px;
      transition: background 0.2s;
    }
    .btn-secondary:hover { background: #e2e8f0; }

    .preview-box {
      width: 100%;
      background: #000000;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      border: 1px solid #cbd5e1;
      min-height: 280px;
    }
    canvas#previewCanvas {
      max-width: 100%;
      max-height: 380px;
      display: block;
      object-fit: contain;
    }

    .controls-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
    }
    .ctrl-btn {
      flex: 1;
      padding: 9px 8px;
      font-size: 12px;
      font-weight: 700;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      border-radius: 8px;
      cursor: pointer;
      text-align: center;
    }
    .ctrl-btn:active { background: #e2e8f0; }

    body {
      padding-bottom: 96px;
    }

    .action-btn-row {
      position: fixed;
      bottom: 14px;
      left: 14px;
      right: 14px;
      display: flex;
      gap: 10px;
      z-index: 999;
    }
    .export-btn {
      flex: 1;
      padding: 14px 8px;
      font-size: 14px;
      font-weight: 800;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      text-align: center;
    }
    .btn-download {
      background: #0f172a;
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.35);
    }
    .btn-share {
      background: linear-gradient(135deg, #16a34a, #15803d);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);
    }
    .export-btn:disabled {
      background: #cbd5e1 !important;
      color: #64748b !important;
      box-shadow: none !important;
      cursor: not-allowed;
    }

    .progress-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(6px);
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 24px;
      z-index: 1000;
      text-align: center;
    }
    .progress-bar-bg {
      width: 100%;
      max-width: 300px;
      height: 12px;
      background: #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      margin: 16px 0;
    }
    .progress-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #f59e0b, #ef4444);
      transition: width 0.2s ease;
    }
  </style>
</head>
<body>

  <!-- 1. VIDEO SOURCE -->
  <div class="card">
    <div class="card-title">📹 Select Video File (1 min / Reel)</div>
    <div class="btn-file" id="dropArea" onclick="handleVideoBoxClick(event)">
      <input type="file" id="videoInput" accept="video/mp4,video/quicktime,video/webm,video/*" />
      <div style="font-size:28px">🎬</div>
      <span id="filePrompt">Tap to choose video from phone gallery</span>
    </div>
  </div>

  <!-- 2. ORIENTATION & AUDIO CONTROLS -->
  <div class="card">
    <div class="card-title">📐 Orientation & Audio Settings</div>
    
    <label>Video Orientation / Aspect Ratio</label>
    <div class="segmented" id="aspectSelector">
      <button type="button" class="active" onclick="setAspect('portrait')">📱 Portrait 9:16 (Reel / Status)</button>
      <button type="button" onclick="setAspect('landscape')">📺 Landscape 16:9 (TV / News)</button>
    </div>

    <label>Export Video Sound</label>
    <div class="segmented" id="exportAudioSelector">
      <button type="button" class="active" onclick="setExportAudio(false)">🔊 Keep Video Sound</button>
      <button type="button" onclick="setExportAudio(true)">🔇 Mute Audio in Video</button>
    </div>
  </div>

  <!-- 3. TOP BREAKING NEWS HEADER -->
  <div class="card">
    <div class="card-title">📰 Top Breaking News Headline</div>

    <label>Badge Category Tag</label>
    <input type="text" id="badgeText" placeholder="उदा. BREAKING NEWS / ताज्या बातम्या (किंवा रिकामे ठेवा)" value="" oninput="drawFrame()" />

    <label>News Headline Text (Marathi / English)</label>
    <textarea id="headlineText" rows="2" placeholder="येथे बातमीचे शीर्षक टाईप करा... (उदा. दहावी-बारावी परीक्षेच्या वेळापत्रकात मोठा बदल)" oninput="drawFrame()"></textarea>

    <div class="row">
      <div class="col">
        <label>Headline Font Size</label>
        <select id="fontSizeSelect" onchange="drawFrame()">
          <option value="44">Normal (44px)</option>
          <option value="56" selected>Large (56px)</option>
          <option value="68">Extra Large (68px)</option>
          <option value="80">Huge (80px)</option>
        </select>
      </div>
      <div class="col">
        <label>Reporter Name</label>
        <input type="text" id="reporterName" placeholder="उदा. रमेश सावंत (पर्यायी)" value="" oninput="drawFrame()" />
      </div>
    </div>

    <!-- Default Channel Watermark Logo -->
    <div style="margin-top: 4px;">
      <label>Watermark Logo</label>
      <div style="display:flex; align-items:center; gap:10px; background:#f1f5f9; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
        <img id="logoPreviewImg" src="${defaultLogoBase64}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid #cbd5e1; background:#fff;" />
        <div style="flex:1;">
          <div style="font-size:12px; font-weight:700; color:#0f172a;">Education News (Default Logo)</div>
          <div id="logoSubText" style="font-size:11px; color:#64748b;">Automatically placed in top-right watermark</div>
        </div>
        <label style="font-size:11px; font-weight:700; color:#d97706; cursor:pointer; margin:0; padding:4px 8px; background:#fff; border:1px solid #cbd5e1; border-radius:6px;">
          Change
          <input type="file" id="logoInput" accept="image/*" style="display:none;" onchange="handleLogoUpload(event)" />
        </label>
      </div>
    </div>
  </div>

  <!-- 4. SHORT NEWS TICKER / RUNNING MARQUEE -->
  <div class="card">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
      <div>
        <div class="card-title" style="margin-bottom:4px;">🔴 Running Short News Ticker (Marquee)</div>
        <div style="font-size:12px; color:#64748b; line-height:1.4;">
          TV न्यूज चॅनेलप्रमाणे स्क्रीनवर सतत धावणारी ताजी / संक्षिप्त बातमी (Live Scrolling Ticker)
        </div>
      </div>
      <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; background:#f1f5f9; padding:5px 10px; border-radius:6px; font-weight:700; font-size:12px; border:1px solid #cbd5e1;">
        <input type="checkbox" id="enableTickerCheckbox" onchange="toggleTicker(this.checked)" style="width:16px; height:16px;" />
        <span>Enable</span>
      </label>
    </div>

    <div id="tickerConfigWrap" style="display:none;">
      <label>Ticker Badge / Label</label>
      <input type="text" id="tickerBadgeText" placeholder="उदा. 🔴 ताजी बातमी / FLASH NEWS (किंवा रिकामे ठेवा)" value="🔴 ताजी बातमी" oninput="drawFrame()" />

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; margin-bottom:6px;">
        <label style="margin:0; font-weight:700;">Short News Items (संक्षिप्त बातम्या)</label>
        <button type="button" onclick="addTickerItem()" style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; font-size:11px; font-weight:700; background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:6px; cursor:pointer;">
          + बातमी जोडा (+ Add News)
        </button>
      </div>

      <div id="tickerItemsContainer"></div>

      <div style="margin-top:12px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <label style="margin:0;">Ticker Bar Height</label>
          <span id="tickerHeightVal" style="font-size:12px; color:#64748b; font-weight:700;">36px</span>
        </div>
        <input type="range" id="tickerHeightSlider" min="26" max="54" value="36" oninput="updateTickerHeight(this.value)" style="width:100%;" />
      </div>

      <div class="row">
        <div class="col">
          <label>Marquee Scroll Speed</label>
          <div class="segmented" id="tickerSpeedSelector">
            <button type="button" onclick="setTickerSpeed(80)">Slow</button>
            <button type="button" class="active" onclick="setTickerSpeed(130)">Normal</button>
            <button type="button" onclick="setTickerSpeed(190)">Fast</button>
          </div>
        </div>
        <div class="col">
          <label>Ticker Position</label>
          <div class="segmented" id="tickerPosSelector">
            <button type="button" class="active" onclick="setTickerPosition('above_footer')">Above Footer</button>
            <button type="button" onclick="setTickerPosition('below_headline')">Below Headline</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 5. SPONSOR ADS SECTION (TEXT & IMAGE BANNER) -->
  <div class="card">
    <div class="card-title">📢 Bottom Sponsor Ads (Image / Text)</div>

    <label>Sponsor Display Mode</label>
    <div class="segmented" id="modeSelector">
      <button type="button" class="active" onclick="setAdMode('scroll')">⚡ Auto-Scrolling Marquee</button>
      <button type="button" onclick="setAdMode('rotate')">⏱️ 5s Rotating Slideshow</button>
    </div>

    <div id="scrollSpeedWrap">
      <label>Marquee Scroll Speed</label>
      <div class="segmented" id="speedSelector">
        <button type="button" onclick="setAdSpeed(80)">Slow</button>
        <button type="button" class="active" onclick="setAdSpeed(120)">Normal</button>
        <button type="button" onclick="setAdSpeed(180)">Fast</button>
      </div>
    </div>

    <!-- Footer Height, Width & Video Crop Sliders -->
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px; margin-bottom:14px;">
      <div style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
        <span>📐 Footer Size & Video Crop Adjustment</span>
      </div>

      <!-- Footer Height Slider -->
      <div style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#334155; font-weight:700; margin-bottom:4px;">
          <span>Footer Height (Bottom Coverage / Crop):</span>
          <span id="footerHeightVal" style="color:#d97706; font-weight:800;">180px</span>
        </div>
        <input type="range" id="footerHeightSlider" min="70" max="720" value="180" step="5" style="width:100%; accent-color:#d97706; margin:0;" oninput="updateFooterSize()" />
        <div style="display:flex; justify-content:space-between; font-size:10px; color:#94a3b8; margin-top:2px;">
          <span>70px (Slim)</span>
          <span>180px (Default)</span>
          <span>360px (Tall)</span>
          <span>720px (Max Crop)</span>
        </div>
      </div>

      <!-- Video Vertical Crop Position Slider -->
      <div>
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#334155; font-weight:700; margin-bottom:4px;">
          <span>Video Vertical Shift (Crop / Position):</span>
          <span id="videoYShiftVal" style="color:#d97706; font-weight:800;">0px</span>
        </div>
        <input type="range" id="videoYShiftSlider" min="-160" max="160" value="0" step="4" style="width:100%; accent-color:#d97706; margin:0;" oninput="updateFooterSize()" />
        <div style="display:flex; justify-content:space-between; font-size:10px; color:#94a3b8; margin-top:2px;">
          <span>Shift Up (-160px)</span>
          <span>Center (0px)</span>
          <span>Shift Down (+160px)</span>
        </div>
      </div>
    </div>

    <div id="adsContainer">
      <!-- Dynamic ads will be inserted here -->
    </div>

    <button type="button" class="btn-secondary" onclick="addAdItem()">➕ Add Another Sponsor Ad</button>
  </div>

  <!-- 5. LIVE PREVIEW CANVAS -->
  <div class="card">
    <div class="card-title">👀 Live Overlay Preview</div>
    <div class="preview-box">
      <canvas id="previewCanvas"></canvas>
    </div>
    <div class="controls-row">
      <button type="button" class="ctrl-btn" id="playBtn" onclick="togglePlay()">▶ Play</button>
      <button type="button" class="ctrl-btn" id="muteBtn" onclick="toggleMute()">🔊 Unmuted</button>
      <button type="button" class="ctrl-btn" onclick="restartVideo()">⏮ Restart</button>
    </div>
  </div>

  <div style="margin: 14px 0 16px 0; background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 14px; font-size: 12px; color: #92400e; line-height: 1.45;">
    💡 <strong>WhatsApp Tip:</strong> I WhatsApp shows <em>"Couldn't process video"</em> during direct sharing, tap <strong>"Download to Phone"</strong> to save to your Gallery/Files, then attach it from Gallery or send as a Document in WhatsApp.
  </div>

  <!-- FIXED ACTION BUTTONS ROW -->
  <div class="action-btn-row">
    <button type="button" class="export-btn btn-download" id="downloadBtn" onclick="burnAndExport('download')" disabled>
      💾 Download to Phone
    </button>
    <button type="button" class="export-btn btn-share" id="exportBtn" onclick="burnAndExport('share')" disabled>
      📲 Share to WhatsApp
    </button>
  </div>

  <!-- PROGRESS OVERLAY -->
  <div class="progress-overlay" id="progressOverlay">
    <h3 style="font-size:18px; margin-bottom: 6px; color:#0f172a;">Processing Video...</h3>
    <p id="progressStatus" style="font-size:13px; color:#475569; font-weight:600;">Burning overlays onto frames...</p>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" id="progressBar"></div>
    </div>
    <span id="progressText" style="font-weight:800; color:#d97706; font-size:16px;">0%</span>
  </div>

  <video id="hiddenVideo" playsinline muted preload="auto" style="position:fixed;top:-9999px;left:-9999px;width:10px;height:10px;opacity:0.01;pointer-events:none;"></video>

  <script>
    let currentAspect = 'portrait'; // 'portrait' | 'landscape'
    let currentAdMode = 'scroll'; // 'scroll' | 'rotate'
    let currentScrollSpeed = 120;
    let currentTickerSpeed = 130;
    let currentTickerPos = 'above_footer'; // 'above_footer' | 'below_headline'
    let enableTickerSetting = false;
    let tickerItems = [''];
    let tickerHeightSetting = 36;
    let isExportMuted = false;
    let footerHeightSetting = 180;
    let footerWidthSetting = 100;
    let videoYShiftSetting = 0;
    const loadedImages = {}; // id -> HTMLImageElement
    
    // Default Education News Logo
    let defaultLogoImg = new Image();
    defaultLogoImg.onload = () => { drawFrame(); };
    defaultLogoImg.src = "${defaultLogoBase64}";
    let customLogoImg = null;

    // Clean, empty initial state without dummy/sample text
    let ads = [
      {
        id: 'ad_1',
        type: 'text',
        imageUrl: '',
        businessName: '',
        tagline: '',
        phone: ''
      }
    ];

    const videoInput = document.getElementById('videoInput');
    const hiddenVideo = document.getElementById('hiddenVideo');
    const previewCanvas = document.getElementById('previewCanvas');
    const ctx = previewCanvas.getContext('2d');
    const exportBtn = document.getElementById('exportBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const playBtn = document.getElementById('playBtn');
    const muteBtn = document.getElementById('muteBtn');
    const filePrompt = document.getElementById('filePrompt');

    let videoFile = null;
    let isPlaying = false;
    let isPreviewMuted = false;
    let animFrameId = null;

    function handleLogoUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          customLogoImg = img;
          document.getElementById('logoPreviewImg').src = e.target.result;
          document.getElementById('logoSubText').innerHTML = 'Custom logo: ' + file.name;
          drawFrame();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    function renderAdsList() {
      const container = document.getElementById('adsContainer');
      container.innerHTML = '';
      ads.forEach((ad, index) => {
        const div = document.createElement('div');
        div.className = 'ad-card';

        const isImage = ad.type === 'image';
        div.innerHTML = \`
          <button type="button" class="remove-btn" onclick="removeAd('\${ad.id}')">✕ Delete</button>
          <div style="font-size:12px; font-weight:800; color:#d97706; margin-bottom:8px;">Sponsor #\${index + 1}</div>
          
          <div class="segmented" style="margin-bottom:10px;">
            <button type="button" class="\${!isImage ? 'active' : ''}" onclick="setAdType('\${ad.id}', 'text')">✍️ Text Details</button>
            <button type="button" class="\${isImage ? 'active' : ''}" onclick="setAdType('\${ad.id}', 'image')">🖼️ Image Banner</button>
          </div>

          \${isImage ? \`
            <div class="image-upload-box">
              \${ad.imageUrl ? \`
                <img src="\${ad.imageUrl}" style="max-height: 64px; max-width: 100%; border-radius: 6px; display: block; margin: 0 auto 6px auto; object-fit: contain;" />
                <span style="font-size: 11px; color: #d97706; font-weight: 700;">Tap to change banner image</span>
              \` : \`
                <div style="font-size: 26px; margin-bottom: 4px;">🖼️</div>
                <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Tap to upload Sponsor Image Banner</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Horizontal banner graphic / visiting card (JPG/PNG)</div>
              \`}
              <input type="file" accept="image/*" onchange="handleAdImageUpload('\${ad.id}', event)" />
            </div>
          \` : \`
            <input type="text" placeholder="Business Name (उदा. अपेक्स अकॅडमी)" value="\${ad.businessName || ''}" oninput="updateAd('\${ad.id}', 'businessName', this.value)" />
            <input type="text" placeholder="Offer / Tagline (उदा. नवीन बॅचेस सुरू!)" value="\${ad.tagline || ''}" oninput="updateAd('\${ad.id}', 'tagline', this.value)" />
            <input type="text" placeholder="Phone Number (उदा. 9850541111)" value="\${ad.phone || ''}" oninput="updateAd('\${ad.id}', 'phone', this.value)" />
          \`}
        \`;
        container.appendChild(div);
      });
    }

    function setAdType(id, type) {
      const target = ads.find(a => a.id === id);
      if (target) {
        target.type = type;
        renderAdsList();
        drawFrame();
      }
    }

    function handleAdImageUpload(id, event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const img = new Image();
        img.onload = () => {
          loadedImages[id] = img;
          const target = ads.find(a => a.id === id);
          if (target) {
            target.imageUrl = dataUrl;
            target.type = 'image';
          }
          renderAdsList();
          drawFrame();
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }

    function addAdItem() {
      ads.push({
        id: 'ad_' + Date.now(),
        type: 'text',
        imageUrl: '',
        businessName: '',
        tagline: '',
        phone: ''
      });
      renderAdsList();
    }

    function removeAd(id) {
      ads = ads.filter(a => a.id !== id);
      delete loadedImages[id];
      if (ads.length === 0) {
        ads.push({ id: 'ad_' + Date.now(), type: 'text', imageUrl: '', businessName: '', tagline: '', phone: '' });
      }
      renderAdsList();
      drawFrame();
    }

    function updateAd(id, field, val) {
      const target = ads.find(a => a.id === id);
      if (target) {
        target[field] = val;
      }
      drawFrame();
    }

    function setAspect(aspect) {
      currentAspect = aspect;
      document.querySelectorAll('#aspectSelector button').forEach((btn, idx) => {
        btn.classList.toggle('active', (aspect === 'portrait' && idx === 0) || (aspect === 'landscape' && idx === 1));
      });
      updateCanvasDimensions();
    }

    function setExportAudio(muted) {
      isExportMuted = muted;
      document.querySelectorAll('#exportAudioSelector button').forEach((btn, idx) => {
        btn.classList.toggle('active', (!muted && idx === 0) || (muted && idx === 1));
      });
    }

    function setAdMode(mode) {
      currentAdMode = mode;
      document.querySelectorAll('#modeSelector button').forEach((btn, idx) => {
        btn.classList.toggle('active', (mode === 'scroll' && idx === 0) || (mode === 'rotate' && idx === 1));
      });
      const speedWrap = document.getElementById('scrollSpeedWrap');
      if (speedWrap) speedWrap.style.display = mode === 'scroll' ? 'block' : 'none';
      drawFrame();
    }

    function setAdSpeed(speed) {
      currentScrollSpeed = speed;
      document.querySelectorAll('#speedSelector button').forEach((btn, idx) => {
        btn.classList.toggle('active', (speed === 80 && idx === 0) || (speed === 120 && idx === 1) || (speed === 180 && idx === 2));
      });
    }

    function setTickerSpeed(speed) {
      currentTickerSpeed = speed;
      document.querySelectorAll('#tickerSpeedSelector button').forEach((btn, idx) => {
        btn.classList.toggle('active', (speed === 80 && idx === 0) || (speed === 130 && idx === 1) || (speed === 190 && idx === 2));
      });
      drawFrame();
    }

    function setTickerPosition(pos) {
      currentTickerPos = pos;
      document.querySelectorAll('#tickerPosSelector button').forEach((btn, idx) => {
        btn.classList.toggle('active', (pos === 'above_footer' && idx === 0) || (pos === 'below_headline' && idx === 1));
      });
      drawFrame();
    }

    function toggleTicker(checked) {
      enableTickerSetting = checked;
      const wrap = document.getElementById('tickerConfigWrap');
      if (wrap) wrap.style.display = checked ? 'block' : 'none';
      if (checked) {
        renderTickerItems();
      }
      drawFrame();
    }

    function updateTickerHeight(val) {
      tickerHeightSetting = parseInt(val, 10) || 36;
      const el = document.getElementById('tickerHeightVal');
      if (el) el.innerText = tickerHeightSetting + 'px';
      drawFrame();
    }

    function renderTickerItems() {
      const container = document.getElementById('tickerItemsContainer');
      if (!container) return;
      container.innerHTML = tickerItems.map(function(item, idx) {
        const safeVal = (item || '').replace(/"/g, '&quot;');
        let html = '<div style="display:flex; gap:6px; align-items:center; margin-bottom:8px;">';
        html += '<span style="font-size:12px; color:#64748b; font-weight:700; width:18px; text-align:right;">' + (idx + 1) + '.</span>';
        html += '<input type="text" value="' + safeVal + '" placeholder="संक्षिप्त बातमी #' + (idx + 1) + ' टाईप करा..." oninput="updateTickerItem(' + idx + ', this.value)" style="flex:1; margin-bottom:0;" />';
        if (tickerItems.length > 1) {
          html += '<button type="button" onclick="removeTickerItem(' + idx + ')" style="background:#fee2e2; border:1px solid #fca5a5; color:#ef4444; border-radius:6px; padding:6px 10px; cursor:pointer; font-weight:700;">✕</button>';
        }
        html += '</div>';
        return html;
      }).join('');
    }

    function addTickerItem() {
      tickerItems.push('');
      renderTickerItems();
      drawFrame();
    }

    function removeTickerItem(idx) {
      if (tickerItems.length > 1) {
        tickerItems.splice(idx, 1);
        renderTickerItems();
        drawFrame();
      }
    }

    function updateTickerItem(idx, val) {
      tickerItems[idx] = val;
      drawFrame();
    }

    function updateCanvasDimensions() {
      if (currentAspect === 'landscape') {
        previewCanvas.width = 1280;
        previewCanvas.height = 720;
      } else {
        previewCanvas.width = 720;
        previewCanvas.height = 1280;
      }
      drawFrame();
    }

    function updateFooterSize() {
      const hEl = document.getElementById('footerHeightSlider');
      const yEl = document.getElementById('videoYShiftSlider');
      if (hEl) {
        footerHeightSetting = parseInt(hEl.value, 10);
        document.getElementById('footerHeightVal').innerText = footerHeightSetting + 'px';
      }
      if (yEl) {
        videoYShiftSetting = parseInt(yEl.value, 10);
        document.getElementById('videoYShiftVal').innerText = (videoYShiftSetting > 0 ? '+' : '') + videoYShiftSetting + 'px';
      }
      drawFrame();
    }

    function handleVideoBoxClick(event) {
      if (window.ReactNativeWebView) {
        event.preventDefault();
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PICK_VIDEO_NATIVE' }));
        return false;
      }
    }

    function base64ToBlob(b64Data, contentType) {
      contentType = contentType || 'video/mp4';
      const sliceSize = 512 * 1024;
      const byteCharacters = atob(b64Data);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        byteArrays.push(new Uint8Array(byteNumbers));
      }
      return new Blob(byteArrays, { type: contentType });
    }

    function setVideoSource(sourceUrl, name) {
      if (!sourceUrl) return;
      filePrompt.innerText = '⌛ Loading video...';
      hiddenVideo.src = sourceUrl;
      hiddenVideo.muted = true;
      hiddenVideo.load();

      const onMetadataReady = () => {
        filePrompt.innerText = '✅ ' + (name || 'Video Loaded');
        if (hiddenVideo.videoWidth > hiddenVideo.videoHeight) {
          setAspect('landscape');
        } else {
          setAspect('portrait');
        }
        exportBtn.disabled = false;
        if (downloadBtn) downloadBtn.disabled = false;
        videoFile = { name: name || 'news_video.mp4' };
        updateCanvasDimensions();

        // Seek to 0.001 to guarantee the video decoder prepares the first frame
        try {
          hiddenVideo.currentTime = 0.001;
        } catch (e) {}

        // Prime decoder pipeline
        hiddenVideo.play().then(() => {
          hiddenVideo.pause();
          drawFrame();
        }).catch(() => {
          drawFrame();
        });
      };

      hiddenVideo.onloadedmetadata = onMetadataReady;
      hiddenVideo.onloadeddata = () => { drawFrame(); };
      hiddenVideo.onseeked = () => { drawFrame(); };
      hiddenVideo.ontimeupdate = () => { if (isPlaying) drawFrame(); };

      hiddenVideo.onerror = (e) => {
        console.warn('hiddenVideo decode error:', hiddenVideo.error, e);
        filePrompt.innerText = '❌ Failed to decode video';
      };
    }

    window.loadNativeVideoUri = function(uri, name) {
      if (!uri) return;
      filePrompt.innerText = '⌛ Loading ' + (name || 'video') + '...';

      // 1. Try reading directly into an in-memory Blob (fastest on modern WebViews)
      fetch(uri)
        .then(r => {
          if (!r.ok && r.status !== 0) throw new Error('Fetch error: ' + r.status);
          return r.blob();
        })
        .then(blob => {
          if (blob && blob.size > 0) {
            const blobUrl = URL.createObjectURL(blob);
            setVideoSource(blobUrl, name);
          } else {
            throw new Error('Empty blob');
          }
        })
        .catch(fetchErr => {
          console.warn('fetch(uri) failed, trying XHR:', fetchErr);
          const xhr = new XMLHttpRequest();
          xhr.open('GET', uri, true);
          xhr.responseType = 'blob';
          xhr.onload = function() {
            if ((xhr.status === 200 || xhr.status === 0) && xhr.response && xhr.response.size > 0) {
              const blobUrl = URL.createObjectURL(xhr.response);
              setVideoSource(blobUrl, name);
            } else {
              requestFallbackChunks(uri, name);
            }
          };
          xhr.onerror = function() {
            requestFallbackChunks(uri, name);
          };
          xhr.send();
        });
    };

    function requestFallbackChunks(uri, name) {
      if (window.ReactNativeWebView) {
        filePrompt.innerText = '⌛ Reading video file...';
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'LOAD_VIDEO_CHUNKS',
          uri: uri,
          name: name
        }));
      } else {
        // Direct assignment as fallback
        setVideoSource(uri, name);
      }
    }

    let chunkBuffer = [];
    let chunkTotal = 0;
    let chunkName = '';
    let chunkMime = '';

    window.startChunkedTransfer = function(total, name, mime) {
      chunkTotal = total;
      chunkName = name;
      chunkMime = mime || 'video/mp4';
      chunkBuffer = new Array(total);
      filePrompt.innerText = '⌛ Loading video (0%)...';
    };

    window.receiveChunk = function(index, chunk) {
      chunkBuffer[index] = chunk;
      const pct = Math.round(((index + 1) / chunkTotal) * 100);
      filePrompt.innerText = '⌛ Loading video (' + pct + '%)...';
      if (index === chunkTotal - 1) {
        filePrompt.innerText = '⌛ Decoding video...';
        const fullBase64 = chunkBuffer.join('');
        chunkBuffer = [];
        try {
          const blob = base64ToBlob(fullBase64, chunkMime);
          const blobUrl = URL.createObjectURL(blob);
          setVideoSource(blobUrl, chunkName);
        } catch (err) {
          console.warn('Blob reassembly failed:', err);
          setVideoSource('data:' + chunkMime + ';base64,' + fullBase64, chunkName);
        }
      }
    };

    window.loadVideoDataUrl = function(dataUrl, name) {
      if (!dataUrl) return;
      try {
        const marker = ';base64,';
        const idx = dataUrl.indexOf(marker);
        if (idx !== -1) {
          const mime = dataUrl.substring(5, idx);
          const b64 = dataUrl.substring(idx + marker.length);
          const blob = base64ToBlob(b64, mime);
          const blobUrl = URL.createObjectURL(blob);
          setVideoSource(blobUrl, name);
          return;
        }
      } catch (e) {}
      setVideoSource(dataUrl, name);
    };

    videoInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const blobUrl = URL.createObjectURL(file);
        setVideoSource(blobUrl, file.name);
      } catch (err) {
        console.warn('URL.createObjectURL failed:', err);
      }
    });

    function togglePlay() {
      if (!videoFile) return;
      if (isPlaying) {
        hiddenVideo.pause();
        isPlaying = false;
        playBtn.innerText = '▶ Play';
      } else {
        hiddenVideo.muted = isPreviewMuted;
        hiddenVideo.play().then(() => {
          isPlaying = true;
          playBtn.innerText = '⏸ Pause';
          startLoop();
        }).catch(err => {
          console.warn('Play error:', err);
          hiddenVideo.muted = true;
          hiddenVideo.play().then(() => {
            isPlaying = true;
            playBtn.innerText = '⏸ Pause';
            startLoop();
          });
        });
      }
    }

    function toggleMute() {
      isPreviewMuted = !isPreviewMuted;
      hiddenVideo.muted = isPreviewMuted;
      muteBtn.innerText = isPreviewMuted ? '🔇 Muted' : '🔊 Unmuted';
    }

    function restartVideo() {
      if (!videoFile) return;
      hiddenVideo.currentTime = 0;
      hiddenVideo.muted = isPreviewMuted;
      hiddenVideo.play().then(() => {
        isPlaying = true;
        playBtn.innerText = '⏸ Pause';
        startLoop();
      }).catch(() => {
        hiddenVideo.muted = true;
        hiddenVideo.play().then(() => {
          isPlaying = true;
          playBtn.innerText = '⏸ Pause';
          startLoop();
        });
      });
    }

    hiddenVideo.onended = () => {
      isPlaying = false;
      playBtn.innerText = '▶ Play';
    };
    hiddenVideo.onseeked = () => {
      drawFrame();
    };
    hiddenVideo.onloadeddata = () => {
      drawFrame();
    };

    function startLoop() {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      function loop() {
        if (isPlaying) {
          drawFrame();
          animFrameId = requestAnimationFrame(loop);
        }
      }
      loop();
    }

    function wrapText(context, text, maxWidth) {
      const words = (text || '').split(/\\s+/);
      const lines = [];
      let currentLine = '';
      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
        if (context.measureText(testLine).width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    }

    function drawFrame() {
      const w = previewCanvas.width;
      const h = previewCanvas.height;
      const isLandscape = w > h;
      const scale = isLandscape ? (h / 1080) * 0.9 : w / 1080;

      // Clear & Background
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      // Draw Video if loaded (Aspect Fit with letterboxing)
      if (hiddenVideo.readyState >= 1 || hiddenVideo.videoWidth > 0) {
        try {
          const vw = hiddenVideo.videoWidth || w;
          const vh = hiddenVideo.videoHeight || h;
          const vAspect = vw / vh;
          const cAspect = w / h;
          let dw = w, dh = h, dx = 0, dy = 0;
          if (vAspect > cAspect) {
            dh = w / vAspect;
            dy = (h - dh) / 2;
          } else {
            dw = h * vAspect;
            dx = (w - dw) / 2;
          }
          // Adjust vertical position with slider
          dy += Math.round(videoYShiftSetting * scale);
          ctx.drawImage(hiddenVideo, dx, dy, dw, dh);
        } catch (err) {
          console.warn('Frame draw note:', err);
        }
      } else if (videoFile) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold ' + Math.round(26 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⏳ Preparing video frames...', w / 2, h / 2);
        ctx.textAlign = 'left';
      }

      // Draw Top Breaking News Header
      const badgeText = (document.getElementById('badgeText') && document.getElementById('badgeText').value.trim()) || '';
      const hasBadge = Boolean(badgeText);

      const headline = (document.getElementById('headlineText') && document.getElementById('headlineText').value) || '';
      const baseFontSize = parseInt((document.getElementById('fontSizeSelect') && document.getElementById('fontSizeSelect').value) || '56', 10);
      const calcHeadlineSize = Math.max(22, Math.round(baseFontSize * scale));
      const lineHeight = Math.round(calcHeadlineSize * 1.25);
      const headlineFont = '900 ' + calcHeadlineSize + "px 'Mukta', 'Plus Jakarta Sans', Arial, sans-serif";

      ctx.font = headlineFont;
      const maxHeadlineWidth = w - Math.round(60 * scale);
      const lines = headline ? wrapText(ctx, headline, maxHeadlineWidth).slice(0, 2) : [];
      const numLines = Math.max(1, lines.length);

      let badgeHeight = 0;
      let badgeWidth = 0;
      let badgePadX = 0;
      let badgeX = Math.round(20 * scale);
      let badgeY = Math.round(16 * scale);
      let badgeFont = '';

      if (hasBadge) {
        const badgeFontSize = Math.max(14, Math.round(22 * scale));
        badgeFont = 'bold ' + badgeFontSize + "px 'Plus Jakarta Sans', Arial, sans-serif";
        ctx.font = badgeFont;
        const badgeMetrics = ctx.measureText(badgeText);
        badgePadX = Math.round(14 * scale);
        badgeWidth = badgeMetrics.width + badgePadX * 2;
        badgeHeight = Math.max(26, Math.round(38 * scale));
      }

      const headlineStartY = hasBadge
        ? badgeY + badgeHeight + Math.round(14 * scale)
        : Math.round(18 * scale);

      // Default or Custom Channel Logo watermark in top-right
      const logoToDraw = customLogoImg || defaultLogoImg;
      const logoSize = Math.max(76, Math.round(130 * scale));
      const logoX = w - logoSize - Math.round(18 * scale);
      const logoY = Math.round(14 * scale);

      const calculatedBarHeight = (lines.length > 0 || hasBadge)
        ? headlineStartY + (numLines * lineHeight) + Math.round(18 * scale)
        : Math.round(70 * scale);
      const minBarForLogo = logoY + logoSize + Math.round(14 * scale);
      const topBarHeight = Math.max(calculatedBarHeight, minBarForLogo);

      // Gradient top bar (Rich News Red)
      const grad = ctx.createLinearGradient(0, 0, 0, topBarHeight);
      grad.addColorStop(0, '#B71C1C');
      grad.addColorStop(0.7, '#D32F2F');
      grad.addColorStop(1, '#9A0007');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, topBarHeight);

      // Gold bottom accent line
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(0, topBarHeight - Math.round(6 * scale), w, Math.round(6 * scale));

      // Badge pill (only draw if badge text is provided)
      if (hasBadge) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, Math.round(6 * scale));
        ctx.fill();

        // Badge text
        ctx.fillStyle = '#111';
        ctx.font = badgeFont;
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, badgeX + badgePadX, badgeY + badgeHeight / 2);
      }

      if (logoToDraw && (logoToDraw.complete || logoToDraw.naturalWidth > 0)) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(logoToDraw, logoX, logoY, logoSize, logoSize);
      }

      // Headlines text
      if (lines.length > 0) {
        ctx.font = headlineFont;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.textBaseline = 'top';
        const startY = badgeY + badgeHeight + Math.round(14 * scale);
        lines.forEach((l, idx) => {
          ctx.fillText(l, Math.round(20 * scale), startY + idx * lineHeight);
        });
        ctx.shadowColor = 'transparent';
      }

      // Reporter Strip (Optional)
      const repName = (document.getElementById('reporterName') && document.getElementById('reporterName').value.trim()) || '';
      const repHeight = repName ? Math.max(30, Math.round(42 * scale)) : 0;
      const bottomAdHeight = Math.max(50, Math.round(footerHeightSetting * scale));
      const bottomAdY = h - bottomAdHeight;
      const footerW = Math.round(w * (footerWidthSetting / 100));
      const footerX = Math.round((w - footerW) / 2);
      const currentTime = hiddenVideo.currentTime || 0;

      // Short News Marquee Ticker (संक्षिप्त बातम्या धावती पट्टी)
      const tickerBadge = (document.getElementById('tickerBadgeText') && document.getElementById('tickerBadgeText').value.trim()) || '';
      const combinedTicker = enableTickerSetting ? tickerItems.map(t => t.trim()).filter(Boolean).join('   ◆   ') : '';

      if (enableTickerSetting && combinedTicker) {
        const userH = tickerHeightSetting || 36;
        const tickerBarHeight = Math.max(24, Math.round(userH * 1.35 * scale));
        let tickerY = 0;
        if (currentTickerPos === 'below_headline') {
          tickerY = topBarHeight;
        } else {
          const bottomBaseY = repName ? (bottomAdY - repHeight) : bottomAdY;
          tickerY = bottomBaseY - tickerBarHeight;
        }

        // Ticker background: Glossy deep slate/navy
        const tGrad = ctx.createLinearGradient(0, tickerY, 0, tickerY + tickerBarHeight);
        tGrad.addColorStop(0, '#0F172A');
        tGrad.addColorStop(1, '#020617');
        ctx.fillStyle = tGrad;
        ctx.fillRect(0, tickerY, w, tickerBarHeight);

        // Vibrant accent top line
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(0, tickerY, w, Math.max(2, Math.round(3 * scale)));

        // Measure badge first so we calculate trackStartX
        let trackStartX = Math.round(12 * scale);
        const bPadX = Math.round(14 * scale);
        const bFontSize = Math.max(10, Math.round(userH * 0.44 * scale));
        const bFont = 'bold ' + bFontSize + "px 'Plus Jakarta Sans', 'Mukta', Arial, sans-serif";
        ctx.font = bFont;
        const bWidth = tickerBadge ? (Math.ceil(ctx.measureText(tickerBadge).width) + (bPadX * 2)) : 0;
        const bHeight = tickerBarHeight - Math.round(8 * scale);
        const bX = Math.round(8 * scale);
        const bY = tickerY + Math.round(4 * scale);

        if (tickerBadge) {
          trackStartX = bX + bWidth + Math.round(14 * scale);
        }

        // 1. Scrolling Marquee Track (strictly clipped to the right of the badge area)
        const trackW = w - trackStartX;
        ctx.save();
        ctx.beginPath();
        ctx.rect(trackStartX, tickerY, trackW, tickerBarHeight);
        ctx.clip();

        const tFontSize = Math.max(12, Math.round(userH * 0.52 * scale));
        const tFont = '800 ' + tFontSize + "px 'Mukta', 'Plus Jakarta Sans', Arial, sans-serif";
        ctx.font = tFont;
        const textW = ctx.measureText(combinedTicker).width;
        const gap = Math.round(130 * scale);
        const cycleW = textW + gap;
        const speed = (currentTickerSpeed || 130) * scale;
        const offset = (currentTime * speed) % cycleW;

        let curX = trackStartX - offset;
        const midY = tickerY + (tickerBarHeight / 2);
        ctx.textBaseline = 'middle';

        while (curX < w) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(combinedTicker, curX, midY);

          // Diamond broadcast separator between loops
          ctx.fillStyle = '#F59E0B';
          ctx.fillText('   ◆   ', curX + textW + Math.round(10 * scale), midY);

          curX += cycleW;
        }
        ctx.restore();

        // 2. Fixed Badge on left (rendered AFTER marquee to guarantee zero overlap)
        if (tickerBadge) {
          // Solid base fill over badge area to cleanly mask any scrolling text boundary
          ctx.fillStyle = tGrad;
          ctx.fillRect(0, tickerY, trackStartX, tickerBarHeight);

          // Top red accent on the solid backing
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(0, tickerY, trackStartX, Math.max(2, Math.round(3 * scale)));

          const bGrad = ctx.createLinearGradient(bX, bY, bX + bWidth, bY + bHeight);
          bGrad.addColorStop(0, '#DC2626');
          bGrad.addColorStop(1, '#991B1B');
          ctx.fillStyle = bGrad;
          ctx.beginPath();
          ctx.roundRect(bX, bY, bWidth, bHeight, Math.round(6 * scale));
          ctx.fill();

          ctx.strokeStyle = '#FEF08A';
          ctx.lineWidth = Math.max(1, Math.round(1.5 * scale));
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = bFont;
          ctx.textBaseline = 'middle';
          ctx.fillText(tickerBadge, bX + bPadX, bY + bHeight / 2);
        }
      }

      if (repName) {
        const repY = bottomAdY - repHeight;
        ctx.fillStyle = 'rgba(15, 15, 15, 0.92)';
        ctx.fillRect(footerX, repY, footerW, repHeight);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(footerX, repY, Math.round(6 * scale), repHeight);
        ctx.font = 'bold ' + Math.max(13, Math.round(20 * scale)) + "px 'Mukta', Arial, sans-serif";
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText('बातमीदार: ' + repName, footerX + Math.round(20 * scale), repY + repHeight / 2);
      }

      // Bottom Sponsor Bar Background
      const adGrad = ctx.createLinearGradient(0, bottomAdY, 0, h);
      adGrad.addColorStop(0, '#1E293B');
      adGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = adGrad;
      ctx.fillRect(footerX, bottomAdY, footerW, bottomAdHeight);

      // Gold accent line
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(footerX, bottomAdY, footerW, Math.round(5 * scale));

      // Filter valid ads
      const validAds = ads.filter(a => a.type === 'image' ? (a.imageUrl || loadedImages[a.id]) : (a.businessName || a.tagline));
      const activeList = validAds.length > 0 ? validAds : ads;

      if (currentAdMode === 'rotate' || activeList.length <= 1) {
        // ROTATION MODE: Slide swap every 5s
        const activeAd = activeList[Math.floor(currentTime / 5) % activeList.length];
        drawFullSlotAd(activeAd, footerX, bottomAdY, footerW, bottomAdHeight, scale);
      } else {
        // CONTINUOUS MARQUEE TICKER MODE
        const trackX = footerX;
        const trackW = footerW;
        ctx.save();
        ctx.beginPath();
        ctx.rect(trackX, bottomAdY, trackW, bottomAdHeight);
        ctx.clip();

        // Calculate card widths for each ad
        const measuredAds = activeList.map(ad => {
          const img = ad.type === 'image' ? loadedImages[ad.id] : null;
          let itemW = Math.round(420 * scale);
          const cardH = bottomAdHeight - Math.round(18 * scale);
          if (ad.type === 'image' && img) {
            const aspect = (img.width || 1) / Math.max(1, img.height || 1);
            itemW = Math.round(cardH * aspect);
          }
          return { ad, itemW, img };
        });

        const gap = Math.round(16 * scale);
        const totalItemsWidth = measuredAds.reduce((acc, m) => acc + m.itemW + gap, 0) || 500;
        const speed = (currentScrollSpeed || 120) * scale;
        const scrollOffset = (currentTime * speed) % totalItemsWidth;

        let curX = trackX - scrollOffset;
        for (let r = 0; r < 2; r++) {
          measuredAds.forEach(item => {
            drawMarqueeCard(item.ad, curX, bottomAdY, item.itemW, bottomAdHeight, scale, item.img);
            curX += item.itemW + gap;
          });
        }
        ctx.restore();
      }
    }

    function drawFullSlotAd(ad, x, y, width, height, scale) {
      const img = ad.type === 'image' ? loadedImages[ad.id] : null;
      if (ad.type === 'image' && img) {
        // IMAGE BANNER IN ROTATION MODE: Fit image nicely inside slot
        const imgAspect = img.width / Math.max(1, img.height);
        let drawW = width;
        let drawH = width / imgAspect;
        let drawX = x;
        let drawY = y;
        if (drawH > height) {
          drawH = height;
          drawW = height * imgAspect;
          drawX = x + (width - drawW) / 2;
        } else {
          drawY = y + (height - drawH) / 2;
        }
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      } else {
        // TEXT BANNER IN ROTATION MODE
        ctx.font = 'bold ' + Math.max(12, Math.round(16 * scale)) + "px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = '#FFD700';
        ctx.textBaseline = 'top';
        ctx.fillText('⭐ प्रायोजक / SPONSOR ADVERTISEMENT', x + Math.round(20 * scale), y + Math.round(12 * scale));

        ctx.font = '900 ' + Math.max(17, Math.round(26 * scale)) + "px 'Mukta', Arial, sans-serif";
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(ad.businessName || '', x + Math.round(20 * scale), y + Math.round(38 * scale));

        ctx.font = '600 ' + Math.max(13, Math.round(18 * scale)) + "px 'Mukta', Arial, sans-serif";
        ctx.fillStyle = '#CBD5E1';
        const contact = [ad.tagline, ad.phone ? '📞 ' + ad.phone : ''].filter(Boolean).join(' | ');
        ctx.fillText(contact || '', x + Math.round(20 * scale), y + Math.round(76 * scale));
      }
    }

    function drawMarqueeCard(ad, x, y, width, height, scale, img) {
      const cardH = height - Math.round(18 * scale);
      const cardY = y + Math.round(9 * scale);

      if (ad.type === 'image' && img) {
        // Show Image directly without background card or yellow line
        ctx.drawImage(img, x, cardY, width, cardH);
      } else {
        // Render Text Card without yellow line
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(x, cardY, width, cardH, Math.round(8 * scale));
        ctx.fill();

        ctx.font = '800 ' + Math.max(16, Math.round(24 * scale)) + "px 'Mukta', Arial, sans-serif";
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'top';
        ctx.fillText(ad.businessName || '', x + Math.round(16 * scale), cardY + Math.round(14 * scale));

        ctx.font = '500 ' + Math.max(12, Math.round(18 * scale)) + "px 'Mukta', Arial, sans-serif";
        ctx.fillStyle = '#94a3b8';
        const sub = [ad.tagline, ad.phone ? '📞 ' + ad.phone : ''].filter(Boolean).join(' • ');
        ctx.fillText(sub, x + Math.round(16 * scale), cardY + Math.round(48 * scale));
      }
    }

    // BURN & EXPORT (DOWNLOAD OR SHARE)
    async function burnAndExport(action = 'share') {
      if (!videoFile) return;
      if (isPlaying) togglePlay();

      const progressOverlay = document.getElementById('progressOverlay');
      const progressBar = document.getElementById('progressBar');
      const progressText = document.getElementById('progressText');
      const progressStatus = document.getElementById('progressStatus');

      progressOverlay.style.display = 'flex';
      progressBar.style.width = '5%';
      progressText.innerText = '5%';
      progressStatus.innerText = action === 'download' ? 'Initializing video download...' : 'Initializing video for WhatsApp...';

      let audioCtx = null;

      try {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = currentAspect === 'landscape' ? 1280 : 720;
        offCanvas.height = currentAspect === 'landscape' ? 720 : 1280;
        const offCtx = offCanvas.getContext('2d');

        const canvasStream = offCanvas.captureStream(30);
        let combinedTracks = [...canvasStream.getVideoTracks()];

        // Audio Handling for Export
        if (!isExportMuted) {
          try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
              audioCtx = new AudioContextClass();
              if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
              }
              const sourceNode = audioCtx.createMediaElementSource(hiddenVideo);
              const destNode = audioCtx.createMediaStreamDestination();
              sourceNode.connect(destNode);
              const audioTracks = destNode.stream.getAudioTracks();
              if (audioTracks.length > 0) {
                combinedTracks.push(...audioTracks);
              }
            }
          } catch (audioErr) {
            console.warn('Audio capture note:', audioErr);
          }
        }

        const combinedStream = new MediaStream(combinedTracks);
        const types = [
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4;codecs=avc1',
          'video/mp4;codecs=h264',
          'video/mp4',
          'video/webm;codecs=h264,opus',
          'video/webm;codecs=h264',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp8',
          'video/webm'
        ];
        const chosenType = types.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

        const recorder = new MediaRecorder(combinedStream, { mimeType: chosenType, videoBitsPerSecond: 2500000 });
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

        const duration = hiddenVideo.duration || 60;
        hiddenVideo.currentTime = 0;
        await new Promise(r => { hiddenVideo.onseeked = r; });

        recorder.start(100);
        hiddenVideo.muted = isExportMuted;
        await hiddenVideo.play();

        let burnLoopId = null;
        const burnPromise = new Promise((resolve, reject) => {
          recorder.onstop = () => {
            if (audioCtx && audioCtx.state !== 'closed') {
              void audioCtx.close();
            }
            const cleanBlobType = (chosenType.split(';')[0] || 'video/mp4').trim();
            const blob = new Blob(chunks, { type: cleanBlobType });
            resolve(blob);
          };
          recorder.onerror = (err) => {
            if (audioCtx && audioCtx.state !== 'closed') {
              void audioCtx.close();
            }
            reject(err);
          };

          function step() {
            if (hiddenVideo.ended || hiddenVideo.currentTime >= duration) {
              recorder.stop();
              cancelAnimationFrame(burnLoopId);
              return;
            }
            // Mirror current preview frame onto offCanvas
            drawFrame();
            offCtx.drawImage(previewCanvas, 0, 0, offCanvas.width, offCanvas.height);

            const pct = Math.min(99, Math.round((hiddenVideo.currentTime / duration) * 100));
            progressBar.style.width = pct + '%';
            progressText.innerText = pct + '%';
            progressStatus.innerText = 'Rendering frames with overlays... ' + pct + '%';

            burnLoopId = requestAnimationFrame(step);
          }
          burnLoopId = requestAnimationFrame(step);
        });

        const finalBlob = await burnPromise;
        progressStatus.innerText = action === 'download' ? 'Saving video file...' : 'Preparing video for WhatsApp share...';
        progressBar.style.width = '100%';
        progressText.innerText = '100%';

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const rawResult = String(reader.result || '');
          const base64Marker = ';base64,';
          const markerIdx = rawResult.indexOf(base64Marker);
          let base64Data = '';
          if (markerIdx !== -1) {
            base64Data = rawResult.substring(markerIdx + base64Marker.length);
          } else {
            const lastComma = rawResult.lastIndexOf(',');
            base64Data = lastComma !== -1 ? rawResult.substring(lastComma + 1) : rawResult;
          }
          base64Data = base64Data.replace(/[\\r\\n\\s]+/g, '');

          const cleanMime = (chosenType.split(';')[0] || 'video/mp4').trim();
          const ext = cleanMime.includes('mp4') ? 'mp4' : 'webm';
          const filename = 'news_reel_' + Date.now() + '.' + ext;

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_EXPORTED',
              action: action,
              base64: base64Data,
              filename: filename,
              mimeType: cleanMime
            }));
          } else {
            // Browser fallback
            const url = URL.createObjectURL(finalBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
          }
          progressOverlay.style.display = 'none';
        };
        reader.readAsDataURL(finalBlob);

      } catch (err) {
        if (audioCtx && audioCtx.state !== 'closed') {
          void audioCtx.close();
        }
        alert('Burning error: ' + err.message);
        progressOverlay.style.display = 'none';
      }
    }

    // Init
    renderAdsList();
    updateCanvasDimensions();
  </script>
</body>
</html>
  `;
}

export default function AdminVideoStudioScreen() {
  const theme = useAppTheme();
  const webViewRef = useRef<WebView>(null);
  const [exporting, setExporting] = useState(false);

  // 100% Local Device Storage - Zero Cloudinary / Zero External API calls
  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'VIDEO_EXPORTED') {
        setExporting(true);
        const filename = data.filename || `news_reel_${Date.now()}.mp4`;
        const cleanMime = data.mimeType || 'video/mp4';

        let cleanBase64 = String(data.base64 || '');
        const marker = ';base64,';
        const markerIdx = cleanBase64.indexOf(marker);
        if (markerIdx !== -1) {
          cleanBase64 = cleanBase64.substring(markerIdx + marker.length);
        } else if (cleanBase64.startsWith('data:')) {
          const lastComma = cleanBase64.lastIndexOf(',');
          if (lastComma !== -1) {
            cleanBase64 = cleanBase64.substring(lastComma + 1);
          }
        }
        cleanBase64 = cleanBase64.replace(/[\r\n\s]+/g, '');

        if (!cleanBase64) {
          throw new Error('Video data is empty. Please try recording again.');
        }

        // Stored completely in device local storage cache directory
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;

        await FileSystem.writeAsStringAsync(fileUri, cleanBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setExporting(false);

        const performDownload = async () => {
          if (Platform.OS === 'android') {
            try {
              const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
              if (permissions.granted) {
                const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
                  permissions.directoryUri,
                  filename,
                  cleanMime
                );
                await FileSystem.writeAsStringAsync(destUri, cleanBase64, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                Alert.alert(
                  'Video Downloaded! 🎉',
                  'Video has been saved successfully to your selected folder. You can now view it in your Gallery or Files app, and attach it directly to WhatsApp.',
                  [
                    { text: 'OK' },
                    {
                      text: 'Share to WhatsApp',
                      onPress: () => void performShare(),
                    },
                  ]
                );
                return;
              }
            } catch (err: any) {
              console.warn('StorageAccessFramework note:', err);
            }
          }

          // iOS or fallback if folder picker was dismissed
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: cleanMime,
              dialogTitle: 'Save Video to Device',
              UTI: 'public.movie',
            });
          } else {
            Alert.alert('Video Saved', `Video saved to app local storage: ${filename}`);
          }
        };

        const performShare = async () => {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: cleanMime,
              dialogTitle: 'Share News Reel to WhatsApp',
              UTI: 'public.movie',
            });
          } else {
            Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
          }
        };

        if (data.action === 'download') {
          await performDownload();
        } else if (data.action === 'share') {
          await performShare();
        } else {
          Alert.alert(
            'Video Ready! 🎬',
            'Choose how you want to use this video. Tip: I WhatsApp shows "Couldn\'t process video", choose "Download to Phone" first, then attach the video from your Gallery or send as a Document in WhatsApp.',
            [
              {
                text: '💾 Download to Phone',
                onPress: () => void performDownload(),
              },
              {
                text: '📲 Share to WhatsApp',
                onPress: () => void performShare(),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }
      } else if (data.type === 'PICK_VIDEO_NATIVE') {
        void pickVideoNatively();
      } else if (data.type === 'LOAD_VIDEO_CHUNKS' || data.type === 'LOAD_VIDEO_BASE64') {
        try {
          const base64 = await FileSystem.readAsStringAsync(data.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const mime = (data.name && data.name.toLowerCase().endsWith('.webm')) ? 'video/webm' : 'video/mp4';
          const CHUNK_SIZE = 250000;
          const totalChunks = Math.ceil(base64.length / CHUNK_SIZE);

          webViewRef.current?.injectJavaScript(`
            if (typeof window.startChunkedTransfer === 'function') {
              window.startChunkedTransfer(${totalChunks}, ${JSON.stringify(data.name || 'video.mp4')}, ${JSON.stringify(mime)});
            }
            true;
          `);

          for (let i = 0; i < totalChunks; i++) {
            const chunk = base64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            webViewRef.current?.injectJavaScript(`
              if (typeof window.receiveChunk === 'function') {
                window.receiveChunk(${i}, ${JSON.stringify(chunk)});
              }
              true;
            `);
          }
        } catch (err: any) {
          Alert.alert('Load Video Error', 'Could not read video file: ' + err.message);
        }
      } else if (data.type === 'ALERT') {
        Alert.alert('Video Studio', data.message || '');
      }
    } catch (err: any) {
      setExporting(false);
      Alert.alert('Export Error', err.message || 'Failed to process exported video.');
    }
  };

  const pickVideoNatively = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow gallery access to select your video reel.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled || !result.assets || !result.assets[0]) return;
      const asset = result.assets[0];
      const filename = asset.fileName || `video_${Date.now()}.mp4`;

      // Copy to app's cache directory so it's a solid, local file:/// path with standard extension
      let localUri = asset.uri;
      const cleanExt = filename.toLowerCase().endsWith('.webm') ? '.webm' : '.mp4';
      const cachePath = `${FileSystem.cacheDirectory}studio_picked_${Date.now()}${cleanExt}`;
      try {
        await FileSystem.copyAsync({
          from: asset.uri,
          to: cachePath,
        });
        localUri = cachePath;
      } catch (copyErr) {
        console.warn('Cache copy note:', copyErr);
      }

      webViewRef.current?.injectJavaScript(`
        if (typeof window.loadNativeVideoUri === 'function') {
          window.loadNativeVideoUri(${JSON.stringify(localUri)}, ${JSON.stringify(filename)});
        }
        true;
      `);
    } catch (err: any) {
      Alert.alert('Video Selection Error', err.message || 'Could not pick video.');
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      {/* Light Theme Native App Bar */}
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Video Studio</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Burn Headlines, Image Banners & Ads
          </Text>
        </View>
        <IconButton icon="videocam-outline" onPress={pickVideoNatively} accessibilityLabel="Choose Video from Gallery" />
      </View>

      {/* Light Theme Studio WebView Container */}
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{
            html: buildVideoStudioHtml(DEFAULT_LOGO_BASE64),
            baseUrl: 'file:///',
          }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="always"
          onMessage={handleMessage}
          style={styles.webView}
        />
      </View>

      {exporting && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.savingText}>Opening Share Sheet for WhatsApp...</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  webView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  savingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  savingText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
  },
});
