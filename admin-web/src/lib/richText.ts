export interface RichTextMarks {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  href?: string;
  color?: string;
}

export interface RichTextRun {
  text: string;
  marks: RichTextMarks;
}

export interface RichTextBlock {
  type: 'paragraph' | 'heading' | 'quote' | 'bullet' | 'ordered';
  runs: RichTextRun[];
  number?: number;
  align?: 'left' | 'center' | 'right';
}

export function isCenterAligned(value: string): boolean {
  if (!value) return false;
  return /\[center\][\s\S]*?\[\/center\]/i.test(value)
    || /<center[\s\S]*?>/i.test(value)
    || /text-align\s*:\s*center/i.test(value);
}

export function stripAlignmentTags(value: string): string {
  return value
    .replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '$1')
    .replace(/<\/?center>/gi, '');
}

function decodePlainText(value: string) {
  const element = document.createElement('textarea');
  element.innerHTML = value;
  return element.value;
}

export function parseRichText(value: string): RichTextBlock[] {
  if (!value.trim()) return [];
  if (!/<[a-z][\s\S]*>/i.test(value)) {
    return value.split(/\n+/).filter(Boolean).map((source) => {
      let isCenter = false;
      let textLine = source.trim();
      if (/^\[center\]([\s\S]*)\[\/center\]$/i.test(textLine)) {
        isCenter = true;
        textLine = textLine.replace(/^\[center\]([\s\S]*)\[\/center\]$/i, '$1').trim();
      }
      const ordered = textLine.match(/^(\d+)\.\s+(.*)$/);
      const type = textLine.startsWith('# ') ? 'heading'
        : textLine.startsWith('> ') ? 'quote'
          : textLine.startsWith('- ') ? 'bullet'
            : ordered ? 'ordered' : 'paragraph';
      const text = ordered?.[2] ?? textLine.replace(/^(?:# |> |- )/, '');
      return {
        type,
        runs: parseInlineMarkup(decodePlainText(text)),
        number: ordered ? Number(ordered[1]) : undefined,
        align: isCenter ? 'center' : undefined,
      };
    });
  }

  const documentNode = new DOMParser().parseFromString(value, 'text/html');
  const blocks: RichTextBlock[] = [];

  function inlineRuns(node: Node, marks: RichTextMarks = {}): RichTextRun[] {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      return text ? [{ text, marks }] : [];
    }
    if (!(node instanceof HTMLElement)) return [];
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') return [{ text: '\n', marks }];
    const nextMarks = {
      ...marks,
      ...(tag === 'strong' || tag === 'b' ? { bold: true } : {}),
      ...(tag === 'em' || tag === 'i' ? { italic: true } : {}),
      ...(tag === 'u' ? { underline: true } : {}),
      ...(tag === 's' || tag === 'strike' ? { strike: true } : {}),
      ...(tag === 'a' && safeHref(node.getAttribute('href')) ? { href: node.getAttribute('href') ?? undefined } : {}),
      ...(normalizeColor(node.style.color) ? { color: normalizeColor(node.style.color) } : {}),
    };
    return [...node.childNodes].flatMap((child) => inlineRuns(child, nextMarks));
  }

  function addBlock(element: HTMLElement, type: RichTextBlock['type'], number?: number) {
    const runs = inlineRuns(element);
    const isCenter = element.style.textAlign === 'center'
      || element.getAttribute('align') === 'center'
      || element.tagName.toLowerCase() === 'center'
      || /text-align\s*:\s*center/i.test(element.getAttribute('style') || '');
    if (runs.some((run) => run.text.trim())) {
      blocks.push({ type, runs, number, align: isCenter ? 'center' : undefined });
    }
  }

  for (const node of documentNode.body.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) blocks.push({ type: 'paragraph', runs: [{ text, marks: {} }] });
      continue;
    }
    if (!(node instanceof HTMLElement)) continue;
    const tag = node.tagName.toLowerCase();
    if (tag === 'ul' || tag === 'ol') {
      [...node.children].forEach((item, index) => addBlock(item as HTMLElement, tag === 'ul' ? 'bullet' : 'ordered', index + 1));
    } else if (tag === 'blockquote') {
      addBlock(node, 'quote');
    } else if (/^h[1-6]$/.test(tag)) {
      addBlock(node, 'heading');
    } else {
      addBlock(node, 'paragraph');
    }
  }
  return blocks;
}

function parseInlineMarkup(value: string, inherited: RichTextMarks = {}): RichTextRun[] {
  const pattern = /(\[center\][\s\S]*?\[\/center\]|\[color=#[0-9a-f]{6}\][\s\S]*?\[\/color\]|\*\*[^*]+\*\*|_[^_]+_|~~[^~]+~~|<u>[^<]+<\/u>|\[[^\]]+\]\([^)]+\))/gi;
  return value.split(pattern).filter(Boolean).flatMap((text): RichTextRun[] => {
    const centered = text.match(/^\[center\]([\s\S]*)\[\/center\]$/i);
    if (centered) return parseInlineMarkup(centered[1], inherited);
    const colored = text.match(/^\[color=(#[0-9a-f]{6})\]([\s\S]*)\[\/color\]$/i);
    if (colored) return parseInlineMarkup(colored[2], { ...inherited, color: colored[1] });
    if (text.startsWith('**')) return parseInlineMarkup(text.slice(2, -2), { ...inherited, bold: true });
    if (text.startsWith('_')) return parseInlineMarkup(text.slice(1, -1), { ...inherited, italic: true });
    if (text.startsWith('~~')) return parseInlineMarkup(text.slice(2, -2), { ...inherited, strike: true });
    if (text.startsWith('<u>')) return parseInlineMarkup(text.slice(3, -4), { ...inherited, underline: true });
    const link = text.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return [{ text: link[1], marks: { ...inherited, href: safeHref(link[2]) } }];
    return [{ text, marks: inherited }];
  });
}

export function htmlToArticleMarkup(value: string) {
  if (!/<[a-z][\s\S]*>/i.test(value)) return value.trim();
  const documentNode = new DOMParser().parseFromString(value, 'text/html');

  function inlineMarkup(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (!(node instanceof HTMLElement)) return '';
    const content = [...node.childNodes].map(inlineMarkup).join('');
    switch (node.tagName.toLowerCase()) {
      case 'strong': case 'b': return `**${content}**`;
      case 'em': case 'i': return `_${content}_`;
      case 'u': return `<u>${content}</u>`;
      case 's': case 'strike': return `~~${content}~~`;
      case 'a': return safeHref(node.getAttribute('href')) ? `[${content}](${node.getAttribute('href')})` : content;
      case 'span': {
        const color = normalizeColor(node.style.color);
        return color ? `[color=${color}]${content}[/color]` : content;
      }
      case 'center': return `[center]${content}[/center]`;
      case 'br': return '\n';
      default: return content;
    }
  }

  const lines: string[] = [];
  for (const node of documentNode.body.children) {
    const tag = node.tagName.toLowerCase();
    const isCenter = node instanceof HTMLElement && (
      node.style.textAlign === 'center'
      || node.getAttribute('align') === 'center'
      || tag === 'center'
      || /text-align\s*:\s*center/i.test(node.getAttribute('style') || '')
    );
    if (tag === 'ul' || tag === 'ol') {
      [...node.children].forEach((item, index) => {
        const itemMarkup = `${tag === 'ul' ? '-' : `${index + 1}.`} ${inlineMarkup(item)}`;
        lines.push(isCenter ? `[center]${itemMarkup}[/center]` : itemMarkup);
      });
    } else {
      const prefix = /^h[1-6]$/.test(tag) ? '# ' : tag === 'blockquote' ? '> ' : '';
      const lineMarkup = `${prefix}${inlineMarkup(node)}`;
      lines.push(isCenter ? `[center]${lineMarkup}[/center]` : lineMarkup);
    }
  }
  return lines.filter((line) => line.trim()).join('\n\n');
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function articleMarkupToHtml(value: string) {
  if (!value.trim() || /<[a-z][\s\S]*>/i.test(value)) return value;
  return parseRichText(value).map((block) => {
    const content = block.runs.map((run) => {
      let text = escapeHtml(run.text);
      if (run.marks.bold) text = `<strong>${text}</strong>`;
      if (run.marks.italic) text = `<em>${text}</em>`;
      if (run.marks.underline) text = `<u>${text}</u>`;
      if (run.marks.strike) text = `<s>${text}</s>`;
      if (run.marks.href) text = `<a href="${escapeHtml(run.marks.href)}">${text}</a>`;
      if (run.marks.color) text = `<span style="color: ${run.marks.color}">${text}</span>`;
      return text;
    }).join('');
    const style = block.align === 'center' ? ' style="text-align: center"' : '';
    if (block.type === 'heading') return `<h2${style}>${content}</h2>`;
    if (block.type === 'quote') return `<blockquote${style}>${content}</blockquote>`;
    if (block.type === 'bullet') return `<ul${style}><li>${content}</li></ul>`;
    if (block.type === 'ordered') return `<ol start="${block.number ?? 1}"${style}><li>${content}</li></ol>`;
    return `<p${style}>${content}</p>`;
  }).join('');
}

export function plainRichText(value: string) {
  return parseRichText(value)
    .flatMap((block) => block.runs.map((run) => run.text))
    .join(' ')
    .replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '$1')
    .trim();
}

function normalizeColor(value: string) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  const rgb = value.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (!rgb) return undefined;
  return `#${rgb.slice(1).map((channel) => Number(channel).toString(16).padStart(2, '0')).join('')}`;
}

export function safeHref(value: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value, window.location.origin);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}
