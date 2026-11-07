/**
 * Utilities for formatting and normalizing rich text and verse content
 * in publications and TipTap RichTextEditor.
 */

export function uncollapseVersesToHtml(plainText: string): string {
  if (!plainText || !plainText.trim()) return '';

  const uncollapsed = plainText
    // 1. Tag stanza ends like ॥ १ ॥ or ॥ धृ. ॥ or ॥ २ ॥ with double newline
    .replace(/(॥\s*[\d०-९धृa-zA-Z\s.]+\s*॥)/g, '$1\n\n')
    // 2. Tag verse lines ending with ॥ (not followed by number/refrain) with single newline
    .replace(/(॥)(?!\s*[\d०-९धृ\n])/g, '॥\n')
    // 3. Tag verse lines ending with । with single newline
    .replace(/(।)(?!\s*[\d०-९])/g, '।\n')
    .split('\n')
    .map((l: string) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return uncollapsed
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<p><br></p>';
      return `<p>${line}</p>`;
    })
    .join('');
}

export function toEditorHtml(value: string): string {
  if (!value || !value.trim()) return '';

  const hasBlockHtml = /<(p|div|h[1-6]|ul|ol|blockquote)[\s>]/i.test(value);

  if (hasBlockHtml) {
    const plain = value.replace(/<[^>]*>/g, '').trim();
    const paragraphCount = value.match(/<p[\s>]/gi)?.length ?? 0;
    const dandaCount = plain.match(/[।॥]/g)?.length ?? 0;

    // Detect if verses got collapsed into a single or double paragraph without line breaks
    if (paragraphCount <= 2 && !value.includes('<br') && dandaCount >= 2 && !value.includes('\n')) {
      return uncollapseVersesToHtml(plain);
    }

    // If HTML contains raw newlines inside paragraphs, convert them to proper paragraph/break elements
    if (value.includes('\n')) {
      return value.replace(/(<p[^>]*>)([\s\S]*?)(<\/p>)/gi, (match, openTag, inner, closeTag) => {
        if (!inner.includes('\n')) return match;
        return inner
          .split('\n')
          .map((line: string) => {
            const trimmed = line.trim();
            return trimmed ? `${openTag}${line}${closeTag}` : `${openTag}<br>${closeTag}`;
          })
          .join('');
      });
    }

    return value;
  }

  let text = value;

  // If plain text contains verse markers (। or ॥) but no newlines, uncollapse it
  if (!text.includes('\n') && (text.match(/[।॥]/g)?.length ?? 0) >= 2) {
    return uncollapseVersesToHtml(text);
  }

  // Convert raw newlines into paragraph blocks, with empty lines as empty paragraphs
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<p><br></p>';
      return `<p>${line}</p>`;
    })
    .join('');
}

export function cleanSplitHtml(html: string, attrs?: Record<string, any>): string {
  let h = html.trim();
  if (!h) return '';
  const styleAttr = attrs?.textAlign ? ` style="text-align: ${attrs.textAlign}"` : '';

  // If html starts with text before a tag (e.g. "text<p>foo</p>")
  if (!h.startsWith('<')) {
    const firstTagIdx = h.indexOf('<');
    if (firstTagIdx === -1) {
      return `<p${styleAttr}>${h}</p>`;
    }
    const leadText = h.slice(0, firstTagIdx).trim();
    const rest = h.slice(firstTagIdx);
    h = leadText ? `<p${styleAttr}>${leadText}</p>${rest}` : rest;
  }

  // If html ends with text after the last tag (e.g. "<p>foo</p>trailing text")
  if (!h.endsWith('>')) {
    const lastTagIdx = h.lastIndexOf('>');
    if (lastTagIdx !== -1) {
      const lead = h.slice(0, lastTagIdx + 1);
      const trail = h.slice(lastTagIdx + 1).trim();
      h = trail ? `${lead}<p${styleAttr}>${trail}</p>` : lead;
    }
  }

  return h;
}

