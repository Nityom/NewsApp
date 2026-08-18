import type { Article, PublicationInfo } from '../types';
import { articleByline } from './admin';
import { parseRichText, type RichTextBlock, type RichTextMarks } from './richText';

const PAGE_WIDTH = 1200;
const APK_LAYOUT_WIDTH = 768;
const APK_SCALE = PAGE_WIDTH / APK_LAYOUT_WIDTH;
const px = (value: number) => value * APK_SCALE;
const MARGIN = px(12);
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

async function loadImage(source: string) {
  const response = await fetch(source, { cache: 'force-cache', mode: 'cors' });
  if (!response.ok) throw new Error(`Could not load an article image (${response.status}).`);
  return createImageBitmap(await response.blob());
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawLines(context: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number) {
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function richTextFont(marks: RichTextMarks, size: number, heading = false, quote = false) {
  const style = marks.italic || quote ? 'italic ' : '';
  const weight = marks.bold || heading ? '800 ' : '';
  return `${style}${weight}${size}px Arial, sans-serif`;
}

function drawRichText(context: CanvasRenderingContext2D, blocks: RichTextBlock[], x: number, y: number, maxWidth: number) {
  for (const block of blocks) {
    const heading = block.type === 'heading';
    const quote = block.type === 'quote';
    const list = block.type === 'bullet' || block.type === 'ordered';
    const size = heading ? px(19) : px(14);
    const lineHeight = heading ? px(25) : px(21);
    const indent = quote ? px(11) : list ? px(20) : 0;
    const blockX = x + indent;
    const blockWidth = maxWidth - indent;
    let cursorX = blockX;
    let lineY = y;

    if (quote) {
      context.fillRect(x, y, px(3), lineHeight);
    }
    if (list) {
      context.font = richTextFont({ bold: true }, size);
      context.fillText(block.type === 'bullet' ? '•' : `${block.number}.`, x, lineY);
    }

    for (const run of block.runs) {
      const tokens = run.text.match(/\n|\S+\s*/g) ?? [];
      for (const token of tokens) {
        context.font = richTextFont(run.marks, size, heading, quote);
        context.fillStyle = run.marks.color ?? '#171717';
        const tokenWidth = context.measureText(token).width;
        if (token === '\n' || (cursorX > blockX && cursorX + tokenWidth > blockX + blockWidth)) {
          lineY += lineHeight;
          cursorX = blockX;
          if (token === '\n') continue;
        }
        context.fillText(token, cursorX, lineY);
        const visibleWidth = context.measureText(token.trimEnd()).width;
        if (run.marks.underline || run.marks.href) context.fillRect(cursorX, lineY + size + 3, visibleWidth, 1.5);
        if (run.marks.strike) context.fillRect(cursorX, lineY + size * .55, visibleWidth, 1.5);
        cursorX += tokenWidth;
      }
    }
    y = lineY + lineHeight + px(8);
  }
  return y;
}

function drawRichTitle(context: CanvasRenderingContext2D, blocks: RichTextBlock[], x: number, y: number, maxWidth: number) {
  const size = px(26);
  const lineHeight = px(32);
  let cursorX = x;
  let lineY = y;
  for (const run of blocks.flatMap((block) => block.runs)) {
    for (const token of run.text.toUpperCase().match(/\S+\s*/g) ?? []) {
      context.font = richTextFont(run.marks, size, true);
      context.fillStyle = run.marks.color ?? '#171717';
      const tokenWidth = context.measureText(token).width;
      if (cursorX > x && cursorX + tokenWidth > x + maxWidth) {
        lineY += lineHeight;
        cursorX = x;
      }
      context.fillText(token, cursorX, lineY);
      cursorX += tokenWidth;
    }
  }
  context.fillStyle = '#171717';
  return lineY + lineHeight;
}

function drawContainedImage(context: CanvasRenderingContext2D, image: ImageBitmap, x: number, y: number, width: number, maxHeight: number) {
  const scale = Math.min(width / image.width, maxHeight / image.height);
  const renderedWidth = image.width * scale;
  const renderedHeight = image.height * scale;
  context.drawImage(image, x + (width - renderedWidth) / 2, y, renderedWidth, renderedHeight);
  return renderedHeight;
}

async function bitmapOrNull(source?: string) {
  if (!source) return null;
  try { return await loadImage(source); } catch { return null; }
}

export async function exportArticleAsPng(article: Article, publication?: PublicationInfo | null) {
  const byline = articleByline(article);
  await document.fonts.ready;
  const masthead = await loadImage('/logoBanner.jpeg');
  const banner = await bitmapOrNull(article.banner);
  const sectionImages = await Promise.all((article.sections ?? []).map((section) => bitmapOrNull(section.image)));
  const gallery = await Promise.all(article.images.map(bitmapOrNull));
  const advertisements = await Promise.all(article.advertisements.map(bitmapOrNull));

  const canvas = document.createElement('canvas');
  canvas.width = PAGE_WIDTH;
  canvas.height = 10000;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas export is not supported in this browser.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#171717';
  context.textBaseline = 'top';
  let y = 0;

  y += drawContainedImage(context, masthead, 0, y, PAGE_WIDTH, PAGE_WIDTH * (451 / 2564)) + px(4);
  context.fillStyle = '#ffe600';
  context.fillRect(MARGIN, y, CONTENT_WIDTH, px(36));
  context.strokeStyle = '#171717';
  context.strokeRect(MARGIN, y, CONTENT_WIDTH, 44);
  context.fillStyle = '#171717';
  context.font = `700 ${px(13)}px Arial, sans-serif`;
  context.textAlign = 'center';
  const pageCount = Math.max(1, article.sections?.length ?? 0);
  context.fillText(`वर्ष : ${publication?.year ?? '—'}  |  अंक : ${publication?.issueNumber ?? '—'}  |  पृष्ठ : ${pageCount}  |  दिनांक ${article.registrationDate ?? '—'}  |  मूल्य : ${publication?.price ?? '—'}`, PAGE_WIDTH / 2, y + px(10));
  context.textAlign = 'left';
  y += px(44);

  y = drawRichTitle(context, parseRichText(article.title), MARGIN, y, CONTENT_WIDTH) + px(8);
  context.fillRect(MARGIN, y, CONTENT_WIDTH, 1);
  y += px(8);

  if (banner) {
    const imageWidth = PAGE_WIDTH * .68;
    y += drawContainedImage(context, banner, (PAGE_WIDTH - imageWidth) / 2, y, imageWidth, px(500)) + px(10);
  }
  y = drawRichText(context, parseRichText(article.content), MARGIN, y, CONTENT_WIDTH);

  const sections = article.sections ?? [];
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    y += px(6);
    context.fillRect(0, y, PAGE_WIDTH, px(2));
    y += px(12);
    const image = sectionImages[index];
    if (image) {
      const imageWidth = PAGE_WIDTH * .68;
      y += drawContainedImage(context, image, (PAGE_WIDTH - imageWidth) / 2, y, imageWidth, px(460)) + px(8);
    }
    context.font = `900 ${px(20)}px Arial, sans-serif`;
    y = drawLines(context, wrapText(context, section.title.toUpperCase(), CONTENT_WIDTH), MARGIN, y, px(26)) + px(8);
    y = drawRichText(context, parseRichText(section.content), MARGIN, y, CONTENT_WIDTH);
  }

  const galleryImages = gallery.filter((image): image is ImageBitmap => Boolean(image));
  if (galleryImages.length) {
    y += 12;
    const gap = 12;
    const width = (CONTENT_WIDTH - gap) / 2;
    for (let index = 0; index < galleryImages.length; index += 2) {
      const row = galleryImages.slice(index, index + 2);
      const heights = row.map((image, column) => drawContainedImage(context, image, MARGIN + column * (width + gap), y, width, 420));
      y += Math.max(...heights) + gap;
    }
  }

  const adImages = advertisements.filter((image): image is ImageBitmap => Boolean(image));
  if (adImages.length) {
    y += 16;
    for (const image of adImages) y += drawContainedImage(context, image, MARGIN + 10, y, CONTENT_WIDTH - 20, 560) + 14;
  }

  y += px(16);
  context.fillStyle = '#171717';
  const footerMargin = px(24);
  context.fillRect(footerMargin, y, PAGE_WIDTH - footerMargin * 2, px(2));
  y += px(14);
  context.textAlign = 'center';
  context.font = `700 ${px(12)}px Arial, sans-serif`;
  context.fillStyle = '#606060';
  context.fillText('NEWS REPORTER', PAGE_WIDTH / 2, y);
  y += px(20);
  context.font = `800 ${px(17)}px Arial, sans-serif`;
  context.fillStyle = '#171717';
  context.fillText(`${byline.name}${byline.phone ? ` : ${byline.phone}` : ''}`, PAGE_WIDTH / 2, y);
  y += px(29);

  const output = document.createElement('canvas');
  output.width = PAGE_WIDTH;
  output.height = Math.ceil(y);
  output.getContext('2d')?.drawImage(canvas, 0, 0);
  return output.toDataURL('image/png');
}
