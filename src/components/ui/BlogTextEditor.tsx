import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { actions, RichEditor, RichToolbar } from 'react-native-pell-rich-editor';

import { useAppTheme } from '@/theme';

const TOOLBAR_ACTIONS = [
  actions.undo,
  actions.redo,
  actions.setBold,
  actions.setItalic,
  actions.heading1,
  actions.insertBulletsList,
  actions.blockquote,
  actions.removeFormat,
];

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const decodeHtml = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));

const inlineTextToHtml = (value: string) =>
  escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');

const inlineHtmlToText = (value: string) =>
  decodeHtml(
    value
      .replace(/<(?:strong|b)(?:\s[^>]*)?>/gi, '**')
      .replace(/<\/(?:strong|b)>/gi, '**')
      .replace(/<(?:em|i)(?:\s[^>]*)?>/gi, '_')
      .replace(/<\/(?:em|i)>/gi, '_')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  ).replace(/\u200B/g, '');

export function articleTextToHtml(value: string) {
  if (!value.trim()) return '';
  const lines = value.split('\n');
  const blocks: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (index < lines.length && lines[index].startsWith('- ')) {
        items.push(`<li>${inlineTextToHtml(lines[index].slice(2))}</li>`);
        index += 1;
      }
      index -= 1;
      blocks.push(`<ul>${items.join('')}</ul>`);
    } else if (line.startsWith('# ')) {
      blocks.push(`<h1>${inlineTextToHtml(line.slice(2))}</h1>`);
    } else if (line.startsWith('> ')) {
      blocks.push(`<blockquote>${inlineTextToHtml(line.slice(2))}</blockquote>`);
    } else {
      blocks.push(`<div>${line ? inlineTextToHtml(line) : '<br>'}</div>`);
    }
  }

  return blocks.join('');
}

export function htmlToArticleText(html: string) {
  const blocks = html
    .replace(/<h[1-6](?:\s[^>]*)?>([\s\S]*?)<\/h[1-6]>/gi, (_, text: string) => `\n# ${inlineHtmlToText(text)}\n`)
    .replace(/<blockquote(?:\s[^>]*)?>([\s\S]*?)<\/blockquote>/gi, (_, text: string) => `\n> ${inlineHtmlToText(text)}\n`)
    .replace(/<li(?:\s[^>]*)?>([\s\S]*?)<\/li>/gi, (_, text: string) => `\n- ${inlineHtmlToText(text)}`)
    .replace(/<\/?(?:ul|ol)(?:\s[^>]*)?>/gi, '\n')
    .replace(/<(?:div|p)(?:\s[^>]*)?>([\s\S]*?)<\/(?:div|p)>/gi, (_, text: string) => `\n${inlineHtmlToText(text)}\n`)
    .replace(/<br\s*\/?>/gi, '\n');

  return inlineHtmlToText(blocks)
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

export function countArticleWords(value: string) {
  return value.match(WORD_PATTERN)?.length ?? 0;
}

export function limitArticleWords(value: string, maxWords: number) {
  const matches = Array.from(value.matchAll(WORD_PATTERN));
  if (matches.length <= maxWords) return value;
  const lastWord = matches[maxWords - 1];
  return value.slice(0, (lastWord.index ?? 0) + lastWord[0].length).trimEnd();
}

interface BlogTextEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  onCursorPosition?: (offsetY: number) => void;
  maxWords?: number;
}

export function BlogTextEditor({ initialValue, onChange, onCursorPosition, maxWords }: BlogTextEditorProps) {
  const theme = useAppTheme();
  const editorRef = useRef<RichEditor>(null);
  const initialHtml = useRef(articleTextToHtml(initialValue)).current;

  return (
    <View style={[styles.container, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}>
      <RichToolbar
        getEditor={() => editorRef.current as RichEditor}
        actions={TOOLBAR_ACTIONS}
        style={[styles.toolbar, { backgroundColor: theme.colors.backgroundSubtle }]}
        selectedIconTint={theme.colors.primary}
        iconTint={theme.colors.textSecondary}
        disabledIconTint={theme.colors.textMuted}
      />
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      <RichEditor
        ref={editorRef}
        initialContentHTML={initialHtml}
        initialHeight={240}
        placeholder="Start writing your story..."
        pasteAsPlainText
        autoCorrect
        autoCapitalize="sentences"
        defaultParagraphSeparator="div"
        onChange={(html) => {
          const nextValue = htmlToArticleText(html);
          const acceptedValue = maxWords ? limitArticleWords(nextValue, maxWords) : nextValue;
          if (acceptedValue !== nextValue) {
            editorRef.current?.setContentHTML(articleTextToHtml(acceptedValue));
          }
          onChange(acceptedValue);
        }}
        onCursorPosition={onCursorPosition}
        editorStyle={{
          backgroundColor: theme.colors.background,
          color: theme.colors.text,
          caretColor: theme.colors.primary,
          placeholderColor: theme.colors.textMuted,
          contentCSSText: `font-size: 16px; line-height: 1.55; padding: 12px; min-height: 216px; font-family: sans-serif; letter-spacing: 0;`,
          cssText: `h1 { font-size: 24px; line-height: 1.25; margin: 12px 0 8px; } blockquote { border-left: 3px solid ${theme.colors.primary}; margin: 10px 0; padding-left: 12px; color: ${theme.colors.textSecondary}; } ul { padding-left: 24px; }`,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  toolbar: {
    height: 48,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});