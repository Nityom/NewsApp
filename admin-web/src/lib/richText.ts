export interface RichTextMarks {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  href?: string;
}

export interface RichTextRun {
  text: string;
  marks: RichTextMarks;
}

export interface RichTextBlock {
  type: 'paragraph' | 'heading' | 'quote' | 'bullet' | 'ordered';
  runs: RichTextRun[];
  number?: number;
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
      const ordered = source.match(/^(\d+)\.\s+(.*)$/);
      const type = source.startsWith('# ') ? 'heading'
        : source.startsWith('> ') ? 'quote'
          : source.startsWith('- ') ? 'bullet'
            : ordered ? 'ordered' : 'paragraph';
      const text = ordered?.[2] ?? source.replace(/^(?:# |> |- )/, '');
      return { type, runs: parseInlineMarkup(decodePlainText(text)), number: ordered ? Number(ordered[1]) : undefined };
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
    };
    return [...node.childNodes].flatMap((child) => inlineRuns(child, nextMarks));
  }

  function addBlock(element: HTMLElement, type: RichTextBlock['type'], number?: number) {
    const runs = inlineRuns(element);
    if (runs.some((run) => run.text.trim())) blocks.push({ type, runs, number });
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

function parseInlineMarkup(value: string) {
  const pattern = /(\*\*[^*]+\*\*|_[^_]+_|~~[^~]+~~|<u>[^<]+<\/u>|\[[^\]]+\]\([^)]+\))/g;
  return value.split(pattern).filter(Boolean).map((text): RichTextRun => {
    if (text.startsWith('**')) return { text: text.slice(2, -2), marks: { bold: true } };
    if (text.startsWith('_')) return { text: text.slice(1, -1), marks: { italic: true } };
    if (text.startsWith('~~')) return { text: text.slice(2, -2), marks: { strike: true } };
    if (text.startsWith('<u>')) return { text: text.slice(3, -4), marks: { underline: true } };
    const link = text.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return { text: link[1], marks: { href: safeHref(link[2]) } };
    return { text, marks: {} };
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
      case 'br': return '\n';
      default: return content;
    }
  }

  const lines: string[] = [];
  for (const node of documentNode.body.children) {
    const tag = node.tagName.toLowerCase();
    if (tag === 'ul' || tag === 'ol') {
      [...node.children].forEach((item, index) => lines.push(`${tag === 'ul' ? '-' : `${index + 1}.`} ${inlineMarkup(item)}`));
    } else {
      const prefix = /^h[1-6]$/.test(tag) ? '# ' : tag === 'blockquote' ? '> ' : '';
      lines.push(`${prefix}${inlineMarkup(node)}`);
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
      return text;
    }).join('');
    if (block.type === 'heading') return `<h2>${content}</h2>`;
    if (block.type === 'quote') return `<blockquote>${content}</blockquote>`;
    if (block.type === 'bullet') return `<ul><li>${content}</li></ul>`;
    if (block.type === 'ordered') return `<ol start="${block.number ?? 1}"><li>${content}</li></ol>`;
    return `<p>${content}</p>`;
  }).join('');
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
