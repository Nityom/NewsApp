import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { GestureResponderEvent, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
];

const TITLE_TOOLBAR_ACTIONS = [
  actions.setBold,
  actions.setItalic,
];

const COLOR_FIELD_SIZE = 216;
const HUE_TRACK_WIDTH = 280;

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

const inlineTextToHtml = (value: string): string => {
  const tokens = /(\[color=#[0-9a-f]{6}\][\s\S]*?\[\/color\]|\*\*[^*]+\*\*|_[^_]+_)/gi;
  return value.split(tokens).filter(Boolean).map((part) => {
    const colored = part.match(/^\[color=(#[0-9a-f]{6})\]([\s\S]*)\[\/color\]$/i);
    if (colored) return `<span style="color: ${colored[1]}">${inlineTextToHtml(colored[2])}</span>`;
    if (part.startsWith('**') && part.endsWith('**')) return `<strong>${inlineTextToHtml(part.slice(2, -2))}</strong>`;
    if (part.startsWith('_') && part.endsWith('_')) return `<em>${inlineTextToHtml(part.slice(1, -1))}</em>`;
    return escapeHtml(part);
  }).join('');
};

const inlineHtmlToText = (value: string): string => {
  const withColorMarkup: string = value
    .replace(/<font[^>]*\bcolor=["']?(#[0-9a-f]{6})["']?[^>]*>([\s\S]*?)<\/font>/gi, (_, color: string, text: string) => `[color=${color}]${inlineHtmlToText(text)}[/color]`)
    .replace(/<span[^>]*\bstyle=["'][^"']*\bcolor\s*:\s*(#[0-9a-f]{6})[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi, (_, color: string, text: string) => `[color=${color}]${inlineHtmlToText(text)}[/color]`);

  return decodeHtml(
    withColorMarkup
      .replace(/<(?:strong|b)(?:\s[^>]*)?>/gi, '**')
      .replace(/<\/(?:strong|b)>/gi, '**')
      .replace(/<(?:em|i)(?:\s[^>]*)?>/gi, '_')
      .replace(/<\/(?:em|i)>/gi, '_')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  ).replace(/\u200B/g, '');
};

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

type HsvColor = { hue: number; saturation: number; value: number };

function hsvToHex({ hue, saturation, value }: HsvColor) {
  const chroma = value * saturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] = segment < 1 ? [chroma, secondary, 0]
    : segment < 2 ? [secondary, chroma, 0]
      : segment < 3 ? [0, chroma, secondary]
        : segment < 4 ? [0, secondary, chroma]
          : segment < 5 ? [secondary, 0, chroma]
            : [chroma, 0, secondary];
  const match = value - chroma;
  return `#${[red, green, blue].map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, '0')).join('')}`;
}

function hexToHsv(hex: string): HsvColor {
  const normalized = hex.replace('#', '');
  const [red, green, blue] = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const hue = delta === 0 ? 0
    : maximum === red ? 60 * (((green - blue) / delta + 6) % 6)
      : maximum === green ? 60 * ((blue - red) / delta + 2)
        : 60 * ((red - green) / delta + 4);
  return { hue, saturation: maximum === 0 ? 0 : delta / maximum, value: maximum };
}

function ColorPicker({ visible, color, onChange, onClose }: {
  visible: boolean;
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
}) {
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(color));
  const selectedColor = hsvToHex(hsv);

  useEffect(() => {
    if (visible) setHsv(hexToHsv(color));
  }, [color, visible]);

  const updateWheel = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    setHsv((current) => ({
      ...current,
      saturation: Math.max(0, Math.min(1, locationX / COLOR_FIELD_SIZE)),
      value: 1 - Math.max(0, Math.min(1, locationY / COLOR_FIELD_SIZE)),
    }));
  };

  const updateHue = (event: GestureResponderEvent) => {
    const hue = Math.max(0, Math.min(360, event.nativeEvent.locationX / HUE_TRACK_WIDTH * 360));
    setHsv((current) => ({ ...current, hue }));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.pickerBackdrop}>
        <View style={styles.pickerCard}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Choose text color</Text>
            <View style={[styles.selectedColor, { backgroundColor: selectedColor }]} />
          </View>
          <View
            style={styles.colorField}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={updateWheel}
            onResponderMove={updateWheel}>
            <LinearGradient colors={['#FFFFFF', hsvToHex({ hue: hsv.hue, saturation: 1, value: 1 })]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['transparent', '#000000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={[styles.colorFieldThumb, { left: `${hsv.saturation * 100}%`, top: `${(1 - hsv.value) * 100}%` }]} />
          </View>
          <Text style={styles.brightnessLabel}>Hue</Text>
          <View
            style={styles.brightnessTrack}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={updateHue}
            onResponderMove={updateHue}>
            <LinearGradient colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <View style={[styles.brightnessThumb, { left: `${hsv.hue / 360 * 100}%` }]} />
          </View>
          <Text style={styles.hexValue}>{selectedColor.toUpperCase()}</Text>
          <View style={styles.pickerActions}>
            <Pressable onPress={onClose} style={styles.pickerCancel}><Text style={styles.pickerCancelText}>Cancel</Text></Pressable>
            <Pressable onPress={() => { onChange(selectedColor); onClose(); }} style={styles.pickerApply}><Text style={styles.pickerApplyText}>Apply</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface BlogTextEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  onCursorPosition?: (offsetY: number) => void;
  maxWords?: number;
  variant?: 'body' | 'title';
}

export function BlogTextEditor({ initialValue, onChange, onCursorPosition, maxWords, variant = 'body' }: BlogTextEditorProps) {
  const theme = useAppTheme();
  const editorRef = useRef<RichEditor>(null);
  const initialHtml = articleTextToHtml(initialValue);
  const isTitle = variant === 'title';
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [chosenColor, setChosenColor] = useState('#bd3029');

  return (
    <View style={[styles.container, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}>
      <RichToolbar
        getEditor={() => editorRef.current as RichEditor}
        actions={isTitle ? TITLE_TOOLBAR_ACTIONS : TOOLBAR_ACTIONS}
        style={[styles.toolbar, { backgroundColor: theme.colors.backgroundSubtle }]}
        selectedIconTint={theme.colors.primary}
        iconTint={theme.colors.textSecondary}
        disabledIconTint={theme.colors.textMuted}
      />
      {isTitle ? (
        <View style={styles.titleColors}>
          <Pressable onPress={() => setColorPickerVisible(true)} style={[styles.colorPickerButton, { borderColor: theme.colors.border }]} accessibilityRole="button" accessibilityLabel="Choose headline text color">
            <View style={[styles.colorSwatch, { backgroundColor: chosenColor }]} />
            <Text style={[styles.colorPickerText, { color: theme.colors.text }]}>Color</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      <RichEditor
        ref={editorRef}
        initialContentHTML={initialHtml}
        initialHeight={isTitle ? 58 : 240}
        placeholder={isTitle ? 'Enter a compelling headline' : 'Start writing your story...'}
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
          contentCSSText: `font-size: ${isTitle ? 19 : 16}px; font-weight: ${isTitle ? 700 : 400}; line-height: ${isTitle ? 1.35 : 1.55}; padding: 12px; min-height: ${isTitle ? 34 : 216}px; font-family: sans-serif; letter-spacing: 0;`,
          cssText: `h1 { font-size: 24px; line-height: 1.25; margin: 12px 0 8px; } blockquote { border-left: 3px solid ${theme.colors.primary}; margin: 10px 0; padding-left: 12px; color: ${theme.colors.textSecondary}; } ul { padding-left: 24px; }`,
        }}
      />
      <ColorPicker
        visible={colorPickerVisible}
        color={chosenColor}
        onChange={(color) => {
          setChosenColor(color);
          editorRef.current?.setForeColor(color);
        }}
        onClose={() => setColorPickerVisible(false)}
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
  titleColors: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  colorPickerButton: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 8,
  },
  colorPickerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  colorSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  pickerBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  pickerCard: {
    width: '100%',
    maxWidth: 328,
    alignItems: 'center',
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  pickerHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pickerTitle: {
    color: '#171717',
    fontSize: 17,
    fontWeight: '800',
  },
  selectedColor: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E2E2',
  },
  colorField: {
    width: COLOR_FIELD_SIZE,
    height: COLOR_FIELD_SIZE,
    overflow: 'hidden',
    borderRadius: 12,
  },
  colorFieldThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  brightnessLabel: {
    alignSelf: 'flex-start',
    marginTop: 18,
    marginBottom: 7,
    color: '#606060',
    fontSize: 13,
    fontWeight: '700',
  },
  brightnessTrack: {
    width: HUE_TRACK_WIDTH,
    height: 18,
    overflow: 'visible',
    borderRadius: 9,
  },
  brightnessThumb: {
    position: 'absolute',
    top: -4,
    width: 26,
    height: 26,
    marginLeft: -13,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  hexValue: {
    marginTop: 14,
    color: '#606060',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pickerActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  pickerCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pickerCancelText: {
    color: '#606060',
    fontSize: 14,
    fontWeight: '800',
  },
  pickerApply: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#171717',
  },
  pickerApplyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
