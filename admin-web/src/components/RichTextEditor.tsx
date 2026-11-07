import { cleanSplitHtml, toEditorHtml } from '../lib/richTextFormat';
import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { DOMSerializer } from '@tiptap/pm/model';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    Heading2,
    Italic,
    Link2,
    List,
    ListOrdered,
    Palette,
    Quote,
    Redo2,
    RemoveFormatting,
    Scissors,
    Strikethrough,
    Underline as UnderlineIcon,
    Undo2,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  variant?: 'body' | 'title' | 'subtitle';
  maxWords?: number;
  toolbarPosition?: 'top' | 'bottom';
  onCutToNextPage?: (firstPart: string, nextPart: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 260,
  variant = 'body',
  maxWords,
  toolbarPosition = 'top',
  onCutToNextPage,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: RichTextEditorProps) {
  const lastAcceptedHtml = useRef(value);
  const maxWordsRef = useRef(maxWords);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false, underline: false }),
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        class: `rich-text-surface ${
          variant === 'title' ? 'rich-title-surface' : variant === 'subtitle' ? 'rich-subtitle-surface' : ''
        }`,
        'data-placeholder': placeholder ?? 'Write the article body...',
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const nextHtml = currentEditor.isEmpty ? '' : currentEditor.getHTML();
      const wordCount = currentEditor.getText().match(WORD_PATTERN)?.length ?? 0;
      if (maxWordsRef.current && wordCount > maxWordsRef.current) {
        currentEditor.commands.setContent(lastAcceptedHtml.current, { emitUpdate: false });
        return;
      }
      lastAcceptedHtml.current = nextHtml;
      onChange(nextHtml);
    },
  });

  useEffect(() => {
    maxWordsRef.current = maxWords;
  }, [maxWords]);

  useEffect(() => {
    if (!editor) return;
    const formatted = toEditorHtml(value);
    if (editor.getHTML() === formatted || editor.getHTML() === value) return;
    editor.commands.setContent(formatted, { emitUpdate: false });
    lastAcceptedHtml.current = formatted;
  }, [editor, value]);

  if (!editor) return null;

  function setLink() {
    const previousUrl = editor?.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter link URL', previousUrl ?? 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  const inlineTools = [
    { label: 'Bold', icon: Bold, active: editor.isActive('bold'), disabled: false, action: () => editor.chain().focus().toggleBold().run() },
    { label: 'Italic', icon: Italic, active: editor.isActive('italic'), disabled: false, action: () => editor.chain().focus().toggleItalic().run() },
    { label: 'Underline', icon: UnderlineIcon, active: editor.isActive('underline'), disabled: false, action: () => editor.chain().focus().toggleUnderline().run() },
    {
      label: 'Align Left',
      icon: AlignLeft,
      active: editor.isActive({ textAlign: 'left' }),
      disabled: false,
      action: () => editor.chain().focus().setTextAlign('left').run(),
    },
    {
      label: 'Align Center',
      icon: AlignCenter,
      active: editor.isActive({ textAlign: 'center' }),
      disabled: false,
      action: () => editor.chain().focus().setTextAlign('center').run(),
    },
    {
      label: 'Align Right',
      icon: AlignRight,
      active: editor.isActive({ textAlign: 'right' }),
      disabled: false,
      action: () => editor.chain().focus().setTextAlign('right').run(),
    },
  ];
  const bodyTools = [
    {
      label: 'Justify',
      icon: AlignJustify,
      active: editor.isActive({ textAlign: 'justify' }),
      disabled: false,
      action: () => editor.chain().focus().setTextAlign('justify').run(),
    },
    { label: 'Strikethrough', icon: Strikethrough, active: editor.isActive('strike'), action: () => editor.chain().focus().toggleStrike().run() },
    { label: 'Subheading', icon: Heading2, active: editor.isActive('heading', { level: 2 }), action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Bulleted list', icon: List, active: editor.isActive('bulletList'), action: () => editor.chain().focus().toggleBulletList().run() },
    { label: 'Numbered list', icon: ListOrdered, active: editor.isActive('orderedList'), action: () => editor.chain().focus().toggleOrderedList().run() },
    { label: 'Quote', icon: Quote, active: editor.isActive('blockquote'), action: () => editor.chain().focus().toggleBlockquote().run() },
    { label: 'Link', icon: Link2, active: editor.isActive('link'), action: setLink },
  ];
  const historyTools = [
    { label: 'Clear formatting', icon: RemoveFormatting, active: false, action: () => editor.chain().focus().unsetColor().unsetAllMarks().clearNodes().run() },
    {
      label: 'Undo',
      icon: Undo2,
      active: false,
      disabled: !editor.can().undo() && !canUndo,
      action: () => {
        if (editor.can().undo()) {
          editor.chain().focus().undo().run();
        } else if (onUndo) {
          onUndo();
        }
      },
    },
    {
      label: 'Redo',
      icon: Redo2,
      active: false,
      disabled: !editor.can().redo() && !canRedo,
      action: () => {
        if (editor.can().redo()) {
          editor.chain().focus().redo().run();
        } else if (onRedo) {
          onRedo();
        }
      },
    },
  ];

  function handleScissorCut() {
    if (!editor || !onCutToNextPage) return;
    const { from, to, empty } = editor.state.selection;
    const docSize = editor.state.doc.content.size;

    try {
      const serializer = DOMSerializer.fromSchema(editor.schema);
      let firstHtml = '';
      let nextHtml = '';

      if (!empty && from < to) {
        // User highlighted a specific portion of text to cut to the next page
        const $pos = editor.state.doc.resolve(from);
        const parentAttrs = $pos.parent?.attrs;
        const selectedSlice = editor.state.doc.slice(from, to);
        const divNext = document.createElement('div');
        divNext.appendChild(serializer.serializeFragment(selectedSlice.content));
        nextHtml = cleanSplitHtml(divNext.innerHTML.trim(), parentAttrs);

        const sliceBefore = editor.state.doc.slice(0, from);
        const sliceAfter = editor.state.doc.slice(to, docSize);
        const divFirst = document.createElement('div');
        divFirst.appendChild(serializer.serializeFragment(sliceBefore.content));
        divFirst.appendChild(serializer.serializeFragment(sliceAfter.content));
        firstHtml = cleanSplitHtml(divFirst.innerHTML.trim(), parentAttrs);
      } else {
        // Cursor placed at a point
        let cutPos = from;

        // If cursor is at very start or very end of document, split cleanly at middle paragraph
        if (cutPos <= 2 || cutPos >= docSize - 2) {
          const totalChildren = editor.state.doc.childCount;
          if (totalChildren > 1) {
            let currentPos = 0;
            const halfIndex = Math.ceil(totalChildren / 2);
            for (let i = 0; i < halfIndex; i++) {
              currentPos += editor.state.doc.child(i).nodeSize;
            }
            cutPos = currentPos;
          } else {
            cutPos = Math.max(1, Math.floor(docSize / 2));
          }
        }

        const $pos = editor.state.doc.resolve(cutPos);
        const parentAttrs = $pos.parent?.attrs;

        const slice1 = editor.state.doc.slice(0, cutPos);
        const div1 = document.createElement('div');
        div1.appendChild(serializer.serializeFragment(slice1.content));
        firstHtml = cleanSplitHtml(div1.innerHTML.trim(), parentAttrs);

        const slice2 = editor.state.doc.slice(cutPos, docSize);
        const div2 = document.createElement('div');
        div2.appendChild(serializer.serializeFragment(slice2.content));
        nextHtml = cleanSplitHtml(div2.innerHTML.trim(), parentAttrs);
      }

      // Verify that nextHtml actually contains text
      const plainNext = nextHtml.replace(/<[^>]*>/g, '').trim();
      if (!plainNext) {
        return;
      }

      onCutToNextPage(firstHtml, nextHtml);
    } catch (err) {
      console.error('Failed to cut at cursor:', err);
    }
  }

  return (
    <div className={`rich-text-editor ${toolbarPosition === 'bottom' ? 'toolbar-bottom' : ''}`}>
      {toolbarPosition === 'top' && <div className="rich-text-toolbar" role="toolbar" aria-label="Text formatting">
        {[...inlineTools, ...(variant === 'body' ? bodyTools : []), ...historyTools].map((tool) => {
          const Icon = tool.icon;
          return (
          <button
            key={tool.label}
            type="button"
            className={tool.active ? 'active' : ''}
            disabled={Boolean('disabled' in tool && tool.disabled)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={tool.action}
            aria-label={tool.label}
            title={tool.label}
          >
            <Icon size={16} />
          </button>
          );
        })}
        <label className="rich-text-color" title="Text color" aria-label="Text color">
          <Palette size={16} />
          <input
            type="color"
            value={editor.getAttributes('textStyle').color ?? '#bd3029'}
            onInput={(event) => editor.chain().focus().setColor(event.currentTarget.value).run()}
          />
        </label>
        {onCutToNextPage && (
          <button
            type="button"
            className="rich-text-tool-btn"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleScissorCut}
            aria-label="Cut at cursor & bring to next page"
            title="✂️ Cut at cursor & bring to next page"
            style={{
              width: '31px',
              height: '31px',
              color: '#dc2626',
              backgroundColor: '#fee2e2',
              borderRadius: '2px',
              border: '1px solid #fca5a5',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Scissors size={16} />
          </button>
        )}
      </div>}
      <EditorContent editor={editor} />
      {toolbarPosition === 'bottom' && <div className="rich-text-toolbar" role="toolbar" aria-label="Text formatting">
        {[...inlineTools, ...(variant === 'body' ? bodyTools : []), ...historyTools].map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.label}
              type="button"
              className={tool.active ? 'active' : ''}
              disabled={Boolean('disabled' in tool && tool.disabled)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={tool.action}
              aria-label={tool.label}
              title={tool.label}
            >
              <Icon size={16} />
            </button>
          );
        })}
        <label className="rich-text-color" title="Text color" aria-label="Text color">
          <Palette size={16} />
          <input
            type="color"
            value={editor.getAttributes('textStyle').color ?? '#bd3029'}
            onInput={(event) => editor.chain().focus().setColor(event.currentTarget.value).run()}
          />
        </label>
        {onCutToNextPage && (
          <button
            type="button"
            className="rich-text-tool-btn"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleScissorCut}
            aria-label="Cut at cursor & bring to next page"
            title="✂️ Cut at cursor & bring to next page"
            style={{
              width: '31px',
              height: '31px',
              color: '#dc2626',
              backgroundColor: '#fee2e2',
              borderRadius: '2px',
              border: '1px solid #fca5a5',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Scissors size={16} />
          </button>
        )}
      </div>}
    </div>
  );
}
