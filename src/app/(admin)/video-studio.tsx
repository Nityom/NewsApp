import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

    .export-btn {
      position: fixed;
      bottom: 14px;
      left: 14px;
      right: 14px;
      padding: 15px;
      font-size: 15px;
      font-weight: 800;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      z-index: 999;
    }
    .export-btn:disabled {
      background: #cbd5e1;
      color: #64748b;
      box-shadow: none;
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
    <div class="btn-file" id="dropArea">
      <input type="file" id="videoInput" accept="video/*" />
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

  <!-- 4. SPONSOR ADS SECTION (TEXT & IMAGE BANNER) -->
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

  <!-- FIXED BURN & SHARE BUTTON -->
  <button type="button" class="export-btn" id="exportBtn" onclick="burnAndShare()" disabled>
    Share to WhatsApp
  </button>

  <!-- PROGRESS OVERLAY -->
  <div class="progress-overlay" id="progressOverlay">
    <h3 style="font-size:18px; margin-bottom: 6px; color:#0f172a;">Processing Video...</h3>
    <p id="progressStatus" style="font-size:13px; color:#475569; font-weight:600;">Burning overlays onto frames...</p>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" id="progressBar"></div>
    </div>
    <span id="progressText" style="font-weight:800; color:#d97706; font-size:16px;">0%</span>
  </div>

  <video id="hiddenVideo" playsinline style="display:none"></video>

  <script>
    let currentAspect = 'portrait'; // 'portrait' | 'landscape'
    let currentAdMode = 'scroll'; // 'scroll' | 'rotate'
    let currentScrollSpeed = 120;
    let isExportMuted = false;
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

    videoInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      videoFile = file;
      filePrompt.innerText = '✅ ' + file.name;
      hiddenVideo.src = URL.createObjectURL(file);
      hiddenVideo.load();
      hiddenVideo.onloadedmetadata = () => {
        if (hiddenVideo.videoWidth > hiddenVideo.videoHeight) {
          setAspect('landscape');
        } else {
          setAspect('portrait');
        }
        exportBtn.disabled = false;
        hiddenVideo.currentTime = 0;
        updateCanvasDimensions();
      };
    });

    function togglePlay() {
      if (!videoFile) return;
      if (isPlaying) {
        hiddenVideo.pause();
        isPlaying = false;
        playBtn.innerText = '▶ Play';
      } else {
        hiddenVideo.play();
        isPlaying = true;
        playBtn.innerText = '⏸ Pause';
        startLoop();
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
      if (!isPlaying) {
        hiddenVideo.play();
        isPlaying = true;
        playBtn.innerText = '⏸ Pause';
        startLoop();
      }
    }

    hiddenVideo.onended = () => {
      isPlaying = false;
      playBtn.innerText = '▶ Play';
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
      if (hiddenVideo.readyState >= 2) {
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
        ctx.drawImage(hiddenVideo, dx, dy, dw, dh);
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

      const topBarHeight = (lines.length > 0 || hasBadge)
        ? headlineStartY + (numLines * lineHeight) + Math.round(18 * scale)
        : Math.round(70 * scale);

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

      // Default or Custom Channel Logo watermark in top-right
      const logoToDraw = customLogoImg || defaultLogoImg;
      if (logoToDraw && (logoToDraw.complete || logoToDraw.naturalWidth > 0)) {
        const logoSize = Math.max(38, Math.round(56 * scale));
        const logoX = w - logoSize - Math.round(20 * scale);
        const logoY = Math.round(14 * scale);
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
      const bottomAdHeight = Math.max(85, Math.round(155 * scale));
      const bottomAdY = h - bottomAdHeight;

      if (repName) {
        const repY = bottomAdY - repHeight;
        ctx.fillStyle = 'rgba(15, 15, 15, 0.92)';
        ctx.fillRect(0, repY, w, repHeight);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(0, repY, Math.round(6 * scale), repHeight);
        ctx.font = 'bold ' + Math.max(13, Math.round(20 * scale)) + "px 'Mukta', Arial, sans-serif";
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText('बातमीदार: ' + repName, Math.round(20 * scale), repY + repHeight / 2);
      }

      // Bottom Sponsor Bar Background
      const adGrad = ctx.createLinearGradient(0, bottomAdY, 0, h);
      adGrad.addColorStop(0, '#1E293B');
      adGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = adGrad;
      ctx.fillRect(0, bottomAdY, w, bottomAdHeight);

      // Gold accent line
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(0, bottomAdY, w, Math.round(5 * scale));

      // Filter valid ads
      const validAds = ads.filter(a => a.type === 'image' ? (a.imageUrl || loadedImages[a.id]) : (a.businessName || a.tagline));
      const activeList = validAds.length > 0 ? validAds : ads;
      const currentTime = hiddenVideo.currentTime || 0;

      if (currentAdMode === 'rotate' || activeList.length <= 1) {
        // ROTATION MODE: Slide swap every 5s
        const activeAd = activeList[Math.floor(currentTime / 5) % activeList.length];
        drawFullSlotAd(activeAd, 0, bottomAdY, w, bottomAdHeight, scale);
      } else {
        // CONTINUOUS MARQUEE TICKER MODE
        const pinnedWidth = Math.round(135 * scale);
        ctx.fillStyle = '#B71C1C';
        ctx.fillRect(0, bottomAdY, pinnedWidth, bottomAdHeight);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(pinnedWidth - Math.round(4 * scale), bottomAdY, Math.round(4 * scale), bottomAdHeight);

        ctx.font = 'bold ' + Math.max(12, Math.round(17 * scale)) + "px 'Mukta', sans-serif";
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐ जाहिराती', Math.round(10 * scale), bottomAdY + bottomAdHeight / 2 - Math.round(8 * scale));
        ctx.font = 'bold ' + Math.max(10, Math.round(13 * scale)) + "px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = '#FFD700';
        ctx.fillText('SPONSORS', Math.round(10 * scale), bottomAdY + bottomAdHeight / 2 + Math.round(12 * scale));

        const trackX = pinnedWidth;
        const trackW = w - trackX;
        ctx.save();
        ctx.beginPath();
        ctx.rect(trackX, bottomAdY, trackW, bottomAdHeight);
        ctx.clip();

        // Calculate card widths for each ad
        const measuredAds = activeList.map(ad => {
          const img = ad.type === 'image' ? loadedImages[ad.id] : null;
          let itemW = Math.round(420 * scale);
          const cardH = bottomAdHeight - Math.round(20 * scale);
          if (ad.type === 'image' && img) {
            const aspect = img.width / Math.max(1, img.height);
            itemW = Math.max(Math.round(220 * scale), Math.round(cardH * aspect));
          }
          return { ad, itemW, img };
        });

        const gap = Math.round(20 * scale);
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
      const cardH = height - Math.round(20 * scale);
      const cardY = y + Math.round(10 * scale);

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(x, cardY, width, cardH, Math.round(8 * scale));
      ctx.fill();

      // Yellow indicator line on card left
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(x, cardY, Math.max(3, Math.round(5 * scale)), cardH);

      if (ad.type === 'image' && img) {
        // Render Image Banner inside card
        const pad = Math.round(4 * scale);
        ctx.drawImage(img, x + pad + Math.round(5 * scale), cardY + pad, width - pad * 2 - Math.round(5 * scale), cardH - pad * 2);
      } else {
        // Render Text Card
        ctx.font = '800 ' + Math.max(14, Math.round(20 * scale)) + "px 'Mukta', Arial, sans-serif";
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'top';
        ctx.fillText(ad.businessName || '', x + Math.round(14 * scale), cardY + Math.round(12 * scale));

        ctx.font = '500 ' + Math.max(11, Math.round(15 * scale)) + "px 'Mukta', Arial, sans-serif";
        ctx.fillStyle = '#94a3b8';
        const sub = [ad.tagline, ad.phone ? '📞 ' + ad.phone : ''].filter(Boolean).join(' • ');
        ctx.fillText(sub, x + Math.round(14 * scale), cardY + Math.round(42 * scale));
      }
    }

    // BURN & SHARE
    async function burnAndShare() {
      if (!videoFile) return;
      if (isPlaying) togglePlay();

      const progressOverlay = document.getElementById('progressOverlay');
      const progressBar = document.getElementById('progressBar');
      const progressText = document.getElementById('progressText');
      const progressStatus = document.getElementById('progressStatus');

      progressOverlay.style.display = 'flex';
      progressBar.style.width = '5%';
      progressText.innerText = '5%';
      progressStatus.innerText = 'Initializing burner engine...';

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
        const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
        const chosenType = types.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

        const recorder = new MediaRecorder(combinedStream, { mimeType: chosenType, videoBitsPerSecond: 3500000 });
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
            const blob = new Blob(chunks, { type: chosenType });
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
            progressStatus.innerText = 'Rendering video frames with overlays... ' + pct + '%';

            burnLoopId = requestAnimationFrame(step);
          }
          burnLoopId = requestAnimationFrame(step);
        });

        const finalBlob = await burnPromise;
        progressStatus.innerText = 'Preparing video for WhatsApp share...';
        progressBar.style.width = '100%';
        progressText.innerText = '100%';

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result.split(',')[1];
          const ext = chosenType.includes('mp4') ? 'mp4' : 'webm';
          const filename = 'news_reel_' + Date.now() + '.' + ext;

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'VIDEO_EXPORTED',
              base64: base64Data,
              filename: filename,
              mimeType: chosenType
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
        
        // Stored completely in device local storage cache directory
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;

        await FileSystem.writeAsStringAsync(fileUri, data.base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setExporting(false);

        // Native device share dialog (WhatsApp, Status, Photos, etc.)
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: data.mimeType || 'video/mp4',
            dialogTitle: 'Share News Reel to WhatsApp',
          });
        } else {
          Alert.alert('Video Saved', `Video saved to local device: ${filename}`);
        }
      } else if (data.type === 'ALERT') {
        Alert.alert('Video Studio', data.message || '');
      }
    } catch (err: any) {
      setExporting(false);
      Alert.alert('Export Error', err.message || 'Failed to process exported video.');
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
        <View style={{ width: 40 }} />
      </View>

      {/* Light Theme Studio WebView Container */}
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: buildVideoStudioHtml(DEFAULT_LOGO_BASE64) }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
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
