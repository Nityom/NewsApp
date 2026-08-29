import type { Reporter } from '../types';

const CARD_WIDTH = 640;
const CARD_HEIGHT = 920;

async function loadImage(source: string): Promise<ImageBitmap | null> {
  if (!source) return null;
  try {
    const response = await fetch(source, { cache: 'force-cache', mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCircularIconBadge(ctx: CanvasRenderingContext2D, x: number, y: number, radius = 20) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#fee2e2';
  ctx.fill();
  ctx.restore();
}

function drawMailIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size = 20, color = '#dc2626') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const w = size;
  const h = size * 0.74;
  const x = cx - w / 2;
  const y = cy - h / 2;

  roundRect(ctx, x, y, w, h, 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 1, y + 2);
  ctx.lineTo(cx, cy + h * 0.2);
  ctx.lineTo(x + w - 1, y + 2);
  ctx.stroke();
  ctx.restore();
}

function drawPhoneIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, _size = 20, color = '#dc2626') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const x = cx - 9;
  const y = cy - 9;

  ctx.beginPath();
  ctx.moveTo(x + 3.5, y + 2.5);
  ctx.bezierCurveTo(x + 1, y + 4.5, x + 1, y + 8, x + 4.5, y + 11.5);
  ctx.bezierCurveTo(x + 8, y + 15, x + 12.5, y + 17, x + 15, y + 15.5);
  ctx.lineTo(x + 17, y + 13.5);
  ctx.bezierCurveTo(x + 17.5, y + 13, x + 17.5, y + 11.5, x + 16, y + 10.5);
  ctx.lineTo(x + 13.5, y + 9);
  ctx.bezierCurveTo(x + 12.5, y + 8.5, x + 11, y + 8.5, x + 11, y + 10);
  ctx.lineTo(x + 9, y + 9);
  ctx.bezierCurveTo(x + 7.5, y + 7.5, x + 7, y + 6.5, x + 7.5, y + 6);
  ctx.lineTo(x + 8.5, y + 3.5);
  ctx.bezierCurveTo(x + 8.5, y + 2, x + 7, y + 2, x + 6, y + 1.5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawPinIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size = 20, color = '#dc2626') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const topY = cy - size / 2;
  const radius = size * 0.36;

  ctx.beginPath();
  ctx.arc(cx, topY + radius, radius, Math.PI * 0.85, Math.PI * 0.15, false);
  ctx.lineTo(cx, topY + size);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, topY + radius, radius * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export async function exportReporterIdCardAsPng(reporter: Reporter): Promise<string> {
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is not available.');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Dual-Layer Outer Card Container (Clean luxury card)
  roundRect(ctx, 3, 3, CARD_WIDTH - 6, CARD_HEIGHT - 6, 24);
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  bgGrad.addColorStop(0, '#ffffff');
  bgGrad.addColorStop(1, '#fdfbf7');
  ctx.fillStyle = bgGrad;
  ctx.fill();

  ctx.strokeStyle = '#d1cdc4';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  roundRect(ctx, 3, 3, CARD_WIDTH - 6, CARD_HEIGHT - 6, 24);
  ctx.clip();

  // 2. Header (Midnight gradient with logo and official typography)
  const headerHeight = 140;
  const headerGrad = ctx.createLinearGradient(0, 0, CARD_WIDTH, headerHeight);
  headerGrad.addColorStop(0, '#111317');
  headerGrad.addColorStop(1, '#1f242d');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, headerHeight);

  // Logo in white badge with gold border
  const logo = await loadImage('/app-logo.png');
  if (logo) {
    roundRect(ctx, 32, 24, 92, 92, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#f3b72c';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.save();
    roundRect(ctx, 34, 26, 88, 88, 10);
    ctx.clip();
    ctx.drawImage(logo, 34, 26, 88, 88);
    ctx.restore();
  }

  const textStartX = logo ? 144 : 36;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px "Newsreader", Georgia, "Times New Roman", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('EDUCATION NEWS', textStartX, 58);

  ctx.fillStyle = '#f3b72c';
  ctx.font = '800 16px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('PRESS IDENTITY CARD', textStartX, 96);
  ctx.letterSpacing = '0px';

  // 3. Accent Ribbon (Gold band with crimson border)
  ctx.fillStyle = '#f3b72c';
  ctx.fillRect(0, headerHeight, CARD_WIDTH, 14);
  ctx.fillStyle = '#c82333';
  ctx.fillRect(0, headerHeight + 9, CARD_WIDTH, 5);

  // 4. Portrait Photo (Crisp large portrait frame)
  const photoW = 260;
  const photoH = 312;
  const photoX = (CARD_WIDTH - photoW) / 2;
  const photoY = headerHeight + 14 + 20;

  // Photo frame shadow & outline
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, photoX - 6, photoY - 6, photoW + 12, photoH + 12, 14);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2.5;
  roundRect(ctx, photoX - 6, photoY - 6, photoW + 12, photoH + 12, 14);
  ctx.stroke();

  const photoSource = reporter.photo || reporter.avatar;
  const photoImg = photoSource ? await loadImage(photoSource) : null;

  if (photoImg) {
    ctx.save();
    roundRect(ctx, photoX, photoY, photoW, photoH, 10);
    ctx.clip();
    const scale = Math.max(photoW / photoImg.width, photoH / photoImg.height);
    const renderW = photoImg.width * scale;
    const renderH = photoImg.height * scale;
    ctx.drawImage(
      photoImg,
      photoX + (photoW - renderW) / 2,
      photoY + (photoH - renderH) / 2,
      renderW,
      renderH,
    );
    ctx.restore();
  } else {
    ctx.fillStyle = '#e1ded7';
    roundRect(ctx, photoX, photoY, photoW, photoH, 10);
    ctx.fill();
    ctx.fillStyle = '#88847d';
    ctx.beginPath();
    ctx.arc(photoX + photoW / 2, photoY + 115, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(photoX + photoW / 2, photoY + 295, 100, Math.PI, 0);
    ctx.fill();
  }

  // 5. Reporter Name
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 50px "Newsreader", Georgia, "Times New Roman", serif';
  const nameY = photoY + photoH + 16;
  ctx.fillText(reporter.name, CARD_WIDTH / 2, nameY);

  // 6. Designation (Luxury pill badge)
  const designation = (reporter.designation || 'News Reporter').toUpperCase();
  ctx.font = '800 20px system-ui, -apple-system, sans-serif';
  const desigWidth = ctx.measureText(designation).width + 42;
  const desigHeight = 36;
  const desigX = (CARD_WIDTH - desigWidth) / 2;
  const desigY = nameY + 58;

  roundRect(ctx, desigX, desigY, desigWidth, desigHeight, 18);
  ctx.fillStyle = '#fef2f2';
  ctx.fill();
  ctx.strokeStyle = '#fecaca';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#dc2626';
  ctx.letterSpacing = '2px';
  ctx.fillText(designation, CARD_WIDTH / 2, desigY + 8);
  ctx.letterSpacing = '0px';

  // 7. Reporter Code Box (Executive clean badge)
  const codeY = desigY + 46;
  const codeBoxW = 500;
  const codeBoxX = (CARD_WIDTH - codeBoxW) / 2;
  const codeBoxH = 46;

  roundRect(ctx, codeBoxX, codeY, codeBoxW, codeBoxH, 8);
  ctx.fillStyle = '#f5f3ec';
  ctx.fill();
  ctx.strokeStyle = '#e3dfd5';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '800 16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.letterSpacing = '1.2px';
  ctx.fillText('REPORTER ID', codeBoxX + 18, codeY + 14);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 22px monospace, Courier, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(reporter.reporterCode || reporter.id, codeBoxX + codeBoxW - 18, codeY + 12);

  // 8. Divider Line
  const dividerY = codeY + codeBoxH + 18;
  const dividerMargin = 36;
  ctx.strokeStyle = '#dcdad3';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(dividerMargin, dividerY);
  ctx.lineTo(CARD_WIDTH - dividerMargin, dividerY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 9. Contact Details (Left aligned with crisp circular icon badges)
  let contactCursorY = dividerY + 22;
  const iconCenterX = 56;
  const textLeftX = iconCenterX + 32;
  const lineSpacing = 40;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1e293b';
  ctx.font = '600 21px system-ui, -apple-system, sans-serif';

  if (reporter.email) {
    drawCircularIconBadge(ctx, iconCenterX, contactCursorY, 18);
    drawMailIcon(ctx, iconCenterX, contactCursorY, 19, '#dc2626');
    ctx.fillText(reporter.email, textLeftX, contactCursorY);
    contactCursorY += lineSpacing;
  }

  if (reporter.phone) {
    drawCircularIconBadge(ctx, iconCenterX, contactCursorY, 18);
    drawPhoneIcon(ctx, iconCenterX, contactCursorY, 19, '#dc2626');
    ctx.fillText(reporter.phone, textLeftX, contactCursorY);
    contactCursorY += lineSpacing;
  }

  const location = [reporter.village, reporter.city].filter(Boolean).join(', ');
  if (location) {
    drawCircularIconBadge(ctx, iconCenterX, contactCursorY, 18);
    drawPinIcon(ctx, iconCenterX, contactCursorY, 19, '#dc2626');
    ctx.fillText(location, textLeftX, contactCursorY);
  }

  // 10. Footer Bar (Tight to content)
  const footerH = 68;
  const footerY = CARD_HEIGHT - footerH;
  ctx.fillStyle = '#f0eee8';
  ctx.fillRect(0, footerY, CARD_WIDTH, footerH);
  ctx.strokeStyle = '#e0ddd5';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(CARD_WIDTH, footerY);
  ctx.stroke();

  const isActive = Boolean(reporter.isActive);
  const dotX = 36;
  const dotCenterY = footerY + footerH / 2;

  // Dot glow
  if (isActive) {
    ctx.beginPath();
    ctx.arc(dotX, dotCenterY, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30, 139, 82, 0.2)';
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(dotX, dotCenterY, 7, 0, Math.PI * 2);
  ctx.fillStyle = isActive ? '#1e8b52' : '#aaa69e';
  ctx.fill();

  ctx.fillStyle = isActive ? '#1e8b52' : '#64748b';
  ctx.font = '800 16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '1px';
  ctx.fillText(isActive ? 'ACTIVE CREDENTIAL' : 'INACTIVE CREDENTIAL', dotX + 20, dotCenterY);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 18px "Newsreader", Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText('educationnews.com', CARD_WIDTH - 36, dotCenterY);

  ctx.restore();
  return canvas.toDataURL('image/png');
}

export async function downloadReporterIdCard(reporter: Reporter) {
  const safeName = (reporter.name || 'reporter').trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'reporter';
  const dataUrl = await exportReporterIdCardAsPng(reporter);
  const link = document.createElement('a');
  link.download = `${safeName}-press-id-card.png`;
  link.href = dataUrl;
  link.click();
}
